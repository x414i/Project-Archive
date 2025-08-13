package data

import (
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"project/utils"
	"project/utils/validator"

	"github.com/Masterminds/squirrel"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

type User struct {
	ID                       uuid.UUID   `db:"id" json:"id"`
	Name                     string      `db:"name" json:"name"`
	Email                    string      `db:"email" json:"email"`
	Password                 string      `db:"password" json:"-"` // Don't include password in JSON
	Image                    *string     `db:"image" json:"image,omitempty"`
	CreatedAt                time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt                time.Time   `db:"updated_at" json:"updated_at"`
	Roles                    StringArray `json:"roles,omitempty"`                 // Custom type for roles
	Verified                 bool        `db:"verified" json:"verified"`          // New field for email verification
	VerificationCode         string      `db:"verification_code" json:"-"`        // Field for verification code
	VerificationCodeExpiry   time.Time   `db:"verification_code_expiry" json:"-"` // Expiry timestamp for email verification
	LastVerificationCodeSent time.Time   `db:"last_verification_code_sent" json:"-"`
}

type StringArray []string

// Scan implements the sql.Scanner interface.
func (s *StringArray) Scan(value interface{}) error {
	if value == nil {
		*s = StringArray{}
		return nil
	}

	// Convert the value to a byte slice
	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("failed to scan StringArray: %v", value)
	}

	// Convert the byte slice to a string and split by commas
	// Assuming the array is returned as a string like "{value1,value2,value3}"
	str := string(bytes)
	str = str[1 : len(str)-1] // Remove the curly braces
	*s = StringArray(strings.Split(str, ","))

	return nil
}

// UserDB handles database operations related to users.
type UserDB struct {
	db *sqlx.DB
}

// ValidateUser validates fields in the User struct.
func ValidateUser(v *validator.Validator, user *User, isAdmin bool, fields ...string) {
	for _, field := range fields {
		switch field {
		case "name":
			v.Check(len(user.Name) >= 3, "name", "يجب أن يتكون الاسم من 3 أحرف على الأقل")
			v.Check(user.Name != "", "name", "الاسم مطلوب")
			v.Check(len(user.Name) <= 100, "name", "يجب أن يكون الاسم أقل من 100 حرف")
		case "email":
			v.Check(user.Email != "", "email", "البريد الإلكتروني مطلوب")
			if isAdmin {
				v.Check(validator.Matches(user.Email, validator.GeneralEmailRX), "email", "تنسيق البريد الإلكتروني غير صالح")
			} else {
				v.Check(validator.Matches(user.Email, validator.EmailRX), "email", "يجب أن يكون البريد الإلكتروني من نطاق uob.edu.ly")
			}
		case "password":
			if user.Password != "" {
				v.Check(len(user.Password) >= 8, "password", "كلمة المرور قصيرة جداً")
			}
		}
	}
}
func (u *UserDB) InsertUser(user *User) error {
	// Set expiration time for verification code (24 hours from now)
	user.VerificationCodeExpiry = time.Now().Add(24 * time.Hour)
	user.LastVerificationCodeSent = time.Now() // Set the last sent time

	query, args, err := QB.Insert("users").
		Columns("name", "email", "password", "image", "verified", "verification_code_expiry", "verification_code", "last_verification_code_sent").
		Values(user.Name, user.Email, user.Password, user.Image, user.Verified, user.VerificationCodeExpiry, user.VerificationCode, user.LastVerificationCodeSent).
		Suffix("RETURNING id, created_at").
		ToSql()
	if err != nil {
		return err
	}

	err = u.db.QueryRowx(query, args...).StructScan(user)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" {

				return ErrEmailAlreadyInserted
			}
		}
		return fmt.Errorf("error while inserting user: %v", err)
	}

	return nil
}

// GetUser ByEmail retrieves a user by their email.
func (u *UserDB) GetUserByEmail(email string) (*User, error) {
	var user User
	query, args, err := QB.Select(users_column...).From("users").Where(squirrel.Eq{"email": email}).ToSql()
	if err != nil {
		return nil, err
	}

	err = u.db.Get(&user, query, args...)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &user, nil
}

// GetUser retrieves a user by their ID.
func (u *UserDB) GetUser(userID uuid.UUID) (*User, error) {
	var user User

	// Query to get user data along with roles
	query, args, err := QB.Select(
		"u.id", "u.name", "u.email", "u.password", "u.verified", "u.verification_code", "u.verification_code_expiry",
		fmt.Sprintf("CASE WHEN NULLIF(u.image, '') IS NOT NULL THEN FORMAT('%s/%%s', u.image) ELSE NULL END AS image", Domain), // Include domain before file
		"u.created_at", "u.updated_at",
		"ARRAY_AGG(r.name) AS roles",
	).
		From("users u").
		LeftJoin("user_roles ur ON u.id = ur.user_id").
		LeftJoin("roles r ON ur.role_id = r.id").
		Where(squirrel.Eq{"u.id": userID}).
		GroupBy("u.id").
		ToSql()

	if err != nil {
		return nil, err
	}

	err = u.db.Get(&user, query, args...)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &user, nil
}
func (u *UserDB) UpdateUser(user *User) error {
	query, args, err := QB.Update("users").
		SetMap(map[string]interface{}{
			"name":                        user.Name,
			"email":                       user.Email,
			"password":                    user.Password,
			"image":                       user.Image,
			"updated_at":                  time.Now(),
			"verified":                    user.Verified,
			"last_verification_code_sent": user.LastVerificationCodeSent, // Update the last sent time
			"verification_code":           user.VerificationCode,         // Update the verification code
			"verification_code_expiry":    user.VerificationCodeExpiry,   // Update the verification code expiry
		}).
		Where(squirrel.Eq{"id": user.ID}).
		ToSql()
	if err != nil {
		return err
	}

	result, err := u.db.Exec(query, args...)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" { // Unique violation code for PostgreSQL
				return ErrEmailAlreadyInserted
			}
		}
		return fmt.Errorf("error while updating user: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error getting rows affected: %v", err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("no rows affected, user might not exist")
	}

	return nil
}

// DeleteUser deletes a user by their ID.
func (u *UserDB) DeleteUser(userID uuid.UUID) error {
	query, args, err := QB.Delete("users").Where(squirrel.Eq{"id": userID}).ToSql()
	if err != nil {
		return err
	}

	_, err = u.db.Exec(query, args...)
	return err
}
func (p *UserDB) ListUsers(queryParams url.Values) ([]User, *utils.Meta, error) {
	var users []User
	searchCols := []string{"name", "email"}
	table := "users"

	// Call BuildQuery to construct and execute the query
	meta, err := utils.BuildQuery(&users, table, nil, users_column, searchCols, queryParams, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("error building query: %v", err)
	}

	return users, meta, nil
}

// CountGraduationStudents returns the number of students in their graduation semester

// CheckVerificationCodeExpiry checks if the user's verification code has expired.
func (u *UserDB) CheckVerificationCodeExpiry(userID uuid.UUID) (bool, error) {
	var user User
	query, args, err := QB.Select("verification_code_expiry").From("users").Where(squirrel.Eq{"id": userID}).ToSql()
	if err != nil {
		return false, err
	}

	err = u.db.Get(&user, query, args...)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, ErrUserNotFound
		}
		return false, err
	}

	// Check if the verification code has expired
	if user.VerificationCodeExpiry.Before(time.Now()) {
		return false, nil // Expired
	}

	return true, nil // Valid
}
func (u *UserDB) VerifyUser(userID uuid.UUID, code string) error {
	// Retrieve the user from the database
	user, err := u.GetUser(userID)
	if err != nil {
		return err
	}

	// Check if the verification code has expired
	if user.VerificationCodeExpiry.Before(time.Now()) {
		return fmt.Errorf("رمز التاكيد انتهت صلاحية")
	}

	// Check if the code matches
	if user.VerificationCode != code {
		return fmt.Errorf("رمز التاكيد خاطئ")
	}

	// Mark the user as verified
	query, args, err := QB.Update("users").
		Set("verified", true).
		Where(squirrel.Eq{"id": userID}).
		ToSql()
	if err != nil {
		return err
	}

	_, err = u.db.Exec(query, args...)
	return err
}
