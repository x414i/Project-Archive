package data

import (
	"fmt"
	"net/url"
	"project/utils"

	"github.com/Masterminds/squirrel"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

// Book represents a book record in the system.
type UserRole struct {
	User_id uuid.UUID `db:"user_id" json:"user_id"`
	Role_id int64     `db:"role_id" json:"role_id"`
}

// BookDB handles all operations related to books.
type UserRoleDB struct {
	db *sqlx.DB
}

// GrantRole assigns a specific role to a user

func (u *UserRoleDB) GrantRole(userID uuid.UUID, roleID int) error {
	query, args, err := QB.Insert("user_roles").
		Columns("user_id", "role_id").
		Values(userID, roleID).
		ToSql()
	if err != nil {
		return fmt.Errorf("error building query: %v", err)
	}

	_, err = u.db.Exec(query, args...)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" { // 23505 is the code for unique violation
			return ErrHasRole
		}
		return fmt.Errorf("error executing query: %v", err)
	}
	return nil
}

// RevokeRole removes a specific role from a user
func (u *UserRoleDB) RevokeRole(userID uuid.UUID, roleID int) error {
	query, args, err := QB.Delete("user_roles").
		Where(squirrel.Eq{"user_id": userID, "role_id": roleID}).
		ToSql()
	if err != nil {
		return fmt.Errorf("error building query: %v", err)
	}

	_, err = u.db.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("error executing query: %v", err)
	}

	return nil
}

// GetUserRoles retrieves all roles assigned to a user
func (u *UserRoleDB) GetUserRoles(userID uuid.UUID) ([]string, error) {
	var roles []string
	query, args, err := QB.Select("roles.name").
		From("user_roles").
		Join("roles ON user_roles.role_id = roles.id").
		Where(squirrel.Eq{"user_roles.user_id": userID}).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("error building query: %v", err)
	}

	err = u.db.Select(&roles, query, args...)
	if err != nil {
		return nil, fmt.Errorf("error executing query: %v", err)
	}

	return roles, nil
}
func (u *UserRoleDB) GetTeachers(queryParams url.Values) ([]User, *utils.Meta, error) {
	// Define the base table, joins, columns, and searchable columns
	table := "user_roles"
	joins := []string{"users ON user_roles.user_id = users.id"} // Example join
	columns := []string{
		"users.id",
		"users.name",
		"users.email",
		"users.image",
		"users.created_at",
		"users.updated_at",
		fmt.Sprintf("CASE WHEN NULLIF(users.image, '') IS NOT NULL THEN FORMAT('%s/%%s', users.image) ELSE NULL END AS image", Domain),
	}
	searchCols := []string{"users.name", "users.email"}     // Fields for search functionality
	additionalFilters := []string{"user_roles.role_id = 2"} // Ensure only teachers are retrieved

	// Prepare destination for query results
	var users []User

	// Use BuildQuery to construct and execute the query
	meta, err := utils.BuildQuery(&users, table, joins, columns, searchCols, queryParams, additionalFilters)
	if err != nil {
		return nil, nil, fmt.Errorf("error building query: %v", err)
	}

	return users, meta, nil
}
func (u *UserRoleDB) GetStudents(queryParams url.Values) ([]User, *utils.Meta, error) {
	// Define the base table, joins, columns, and searchable columns
	table := "user_roles"
	joins := []string{"users ON user_roles.user_id = users.id"} // Example join
	columns := []string{
		"users.id",
		"users.name",
		"users.email",
		"users.image",
		"users.created_at",
		"users.updated_at",
		fmt.Sprintf("CASE WHEN NULLIF(users.image, '') IS NOT NULL THEN FORMAT('%s/%%s', users.image) ELSE NULL END AS image", Domain),
	}
	searchCols := []string{"users.name", "users.email"}     // Fields for search functionality
	additionalFilters := []string{"user_roles.role_id = 3"} // Ensure only teachers are retrieved

	// Prepare destination for query results
	var users []User

	// Use BuildQuery to construct and execute the query
	meta, err := utils.BuildQuery(&users, table, joins, columns, searchCols, queryParams, additionalFilters)
	if err != nil {
		return nil, nil, fmt.Errorf("error building query: %v", err)
	}

	return users, meta, nil
}
func (u *UserRoleDB) GetGraduationStudents(queryParams url.Values) ([]User, *utils.Meta, error) {
	// Define the base table, joins, columns, and searchable columns
	table := "user_roles"
	joins := []string{"users ON user_roles.user_id = users.id"} // Example join
	columns := []string{
		"users.id",
		"users.name",
		"users.email",
		"users.image",
		"users.created_at",
		"users.updated_at",
		fmt.Sprintf("CASE WHEN NULLIF(users.image, '') IS NOT NULL THEN FORMAT('%s/%%s', users.image) ELSE NULL END AS image", Domain),
	}
	searchCols := []string{"users.name", "users.email"}
	additionalFilters := []string{}
	roleIds := queryParams.Get("role_ids")
	if roleIds != "" {
		// Construct the filter for role IDs using IN clause
		additionalFilters = append(additionalFilters, fmt.Sprintf("user_roles.role_id IN (%s)", roleIds))
	}
	var users []User

	// Use BuildQuery to construct and execute the query
	meta, err := utils.BuildQuery(&users, table, joins, columns, searchCols, queryParams, additionalFilters)
	if err != nil {
		return nil, nil, fmt.Errorf("error building query: %v", err)
	}

	return users, meta, nil
}
func (u *UserRoleDB) CountUsersWithRole(roleID int) (int, error) {
	var count int

	// Build the query using squirrel
	query, args, err := QB.Select("COUNT(users.id)").
		From("user_roles").
		Join("users ON user_roles.user_id = users.id").
		Where(squirrel.Eq{"user_roles.role_id": roleID}).
		ToSql()
	if err != nil {
		return 0, fmt.Errorf("error building query: %v", err)
	}

	// Execute the query
	err = u.db.Get(&count, query, args...)
	if err != nil {
		return 0, fmt.Errorf("error executing query: %v", err)
	}

	return count, nil
}
func (u *UserRoleDB) CountGraduationStudents(role int) (int, error) {
	query, args, err := QB.Select("COUNT(*)").
		From("user_roles").
		Where(squirrel.Eq{"role_id": role}).
		ToSql()

	if err != nil {
		return 0, fmt.Errorf("error preparing query: %v", err)
	}

	var count int
	err = u.db.Get(&count, query, args...)
	if err != nil {
		return 0, fmt.Errorf("error executing count query: %v", err)
	}

	return count, nil
}
