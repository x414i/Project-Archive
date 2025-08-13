package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"project/internal/data"
	"project/utils"
	"project/utils/validator"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

func (app *application) SigninHandler(w http.ResponseWriter, r *http.Request) {

	email := strings.ToLower(r.FormValue("email"))
	password := r.FormValue("password")

	if email == "" || password == "" {
		app.errorResponse(w, r, http.StatusBadRequest, "Email and password must be provided")
		return
	}

	user, err := app.Model.UserDB.GetUserByEmail(email)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}

	if !user.Verified {
		if time.Now().After(user.VerificationCodeExpiry) {
			verificationCode := utils.GenerateRandomCode()
			user.VerificationCode = verificationCode
			user.VerificationCodeExpiry = time.Now().Add(5 * time.Minute)
			user.LastVerificationCodeSent = time.Now()

			if err := app.Model.UserDB.UpdateUser(user); err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}

			err = SendVerificationEmail(user.Email, verificationCode)
			if err != nil {
				log.Printf("Error sending verification email to %s: %v", user.Email, err)
				app.errorResponse(w, r, http.StatusInternalServerError, "Failed to send verification email")
				return
			}

			app.errorResponse(w, r, http.StatusForbidden, "Your verification code has expired. A new verification email has been sent.")
			return
		}

		app.errorResponse(w, r, http.StatusForbidden, "Please verify your email before signing in")
		return
	}
	if !utils.CheckPassword(user.Password, password) {
		app.errorResponse(w, r, http.StatusNotFound, data.ErrRecordNotFound.Error())
		return
	}
	userroles, err := app.Model.UserRoleDB.GetUserRoles(user.ID)
	if err != nil {
		app.handleRetrievalError(w, r, err)
	}
	token, err := utils.GenerateToken(user.ID.String(), userroles)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	utils.SetTokenCookie(w, token)

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"expires": "24 hours",
		"token":   token,
	})
}
func (app *application) GetUserHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid user ID"))
		return
	}

	user, err := app.Model.UserDB.GetUser(id)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}
	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"user": user})

}
func (app *application) UpdateUserHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid user ID"))
		return
	}

	user, err := app.Model.UserDB.GetUser(id)
	if err != nil {
		if errors.Is(err, data.ErrRecordNotFound) {
			app.errorResponse(w, r, http.StatusNotFound, "User  not found")
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// Check if the requester is an admin
	userRoles, _ := r.Context().Value(UserRoleKey).([]string)
	isAdmin := false
	for _, role := range userRoles {
		if role == "admin" {
			isAdmin = true
			break
		}
	}

	// Update user fields
	if name := r.FormValue("name"); name != "" {
		user.Name = name
	}
	if email := r.FormValue("email"); email != "" {
		user.Email = email
	}

	if user.Image != nil {
		*user.Image = strings.TrimPrefix(*user.Image, data.Domain+"/")
	}
	if file, fileHeader, err := r.FormFile("image"); err == nil {
		defer file.Close()
		newFileName, err := utils.SaveFile(file, "users", fileHeader.Filename)
		if err != nil {
			app.errorResponse(w, r, http.StatusBadRequest, "invalid file")
			return
		}

		if user.Image != nil {
			utils.DeleteFile(*user.Image)
		}
		user.Image = &newFileName
	}

	v := validator.New()

	password := r.FormValue("password")
	if password != "" {
		hashedPassword, err := utils.HashPassword(password)
		if err != nil {
			app.errorResponse(w, r, http.StatusInternalServerError, "error hashing password")
			return
		}
		user.Password = hashedPassword
	}

	// Validate user fields with conditional email validation
	data.ValidateUser(v, user, isAdmin, "name", "email", "password")
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.Model.UserDB.UpdateUser(user)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"user": user})
}
func (app *application) DeleteUserHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid user ID"))
		return
	}

	user, err := app.Model.UserDB.GetUser(id)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}

	err = app.Model.UserDB.DeleteUser(id)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if user.Image != nil {
		utils.DeleteFile(*user.Image)
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"message": "user deleted successfully"})
}
func (app *application) ListUsersHandler(w http.ResponseWriter, r *http.Request) {
	queryParams := r.URL.Query()

	users, meta, err := app.Model.UserDB.ListUsers(queryParams)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"users": users,
		"meta":  meta,
	})
}
func (app *application) SignupHandler(w http.ResponseWriter, r *http.Request) {
	userRoles, _ := r.Context().Value(UserRoleKey).([]string)

	isAdmin := false
	for _, role := range userRoles {
		if role == "admin" {
			isAdmin = true
			break
		}
	}

	v := validator.New()
	user := &data.User{
		Name:     r.FormValue("name"),
		Email:    strings.ToLower(r.FormValue("email")),
		Password: r.FormValue("password"),
		Verified: isAdmin,
	}

	if user.Name == "" || user.Email == "" || user.Password == "" {
		app.errorResponse(w, r, http.StatusBadRequest, "Must fill all the fields")
		return
	}

	hashedPassword, err := utils.HashPassword(user.Password)
	if err != nil {
		app.errorResponse(w, r, http.StatusInternalServerError, "Error hashing password")
		return
	}
	user.Password = hashedPassword

	if file, fileHeader, err := r.FormFile("img"); err == nil {
		defer file.Close()
		imageName, err := utils.SaveFile(file, "users", fileHeader.Filename)
		if err != nil {
			app.errorResponse(w, r, http.StatusBadRequest, "invalid image ")
			return
		}
		user.Image = &imageName
	}

	var role int
	roleStr := r.FormValue("role")

	if !isAdmin {
		role = 3
	} else {
		if roleStr == "" {
			role = 3
		} else {
			var err error
			role, err = strconv.Atoi(roleStr)
			if err != nil {
				app.errorResponse(w, r, http.StatusBadRequest, "invalid role")
				return
			}
		}
	}

	// Generate a verification code
	verificationCode := utils.GenerateRandomCode()
	user.VerificationCode = verificationCode
	user.VerificationCodeExpiry = time.Now().Add(5 * time.Minute)

	data.ValidateUser(v, user, isAdmin, "name", "email", "password")
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	// Store the user in the database
	if err := app.Model.UserDB.InsertUser(user); err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}

	// If the user is not an admin, send the verification email
	if !isAdmin {
		err = SendVerificationEmail(user.Email, verificationCode)
		if err != nil {
			log.Printf("Error sending verification email to %s: %v", user.Email, err)
			app.errorResponse(w, r, http.StatusInternalServerError, "Failed to send verification email")
			return
		}
	}

	err = app.Model.UserRoleDB.GrantRole(user.ID, role)
	if err != nil {
		app.handleRetrievalError(w, r, err)
	}

	// Respond to the client
	utils.SendJSONResponse(w, http.StatusCreated, utils.Envelope{
		"message": "Registration successful. Please check your email for the verification code.",
		"user":    user,
	})
}
func (app *application) MeHandler(w http.ResponseWriter, r *http.Request) {
	idstr := r.Context().Value(UserIDKey).(string)
	userid := uuid.MustParse(idstr)
	users, err := app.Model.UserDB.GetUser(userid)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"users": users,
	})
}

func (app *application) GetNumderOfStudents(w http.ResponseWriter, r *http.Request) {
	// Count graduation students
	count, err := app.Model.UserRoleDB.CountUsersWithRole(3)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	CountGraduationStudents, err := app.Model.UserRoleDB.CountGraduationStudents(4)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	CountBooks, err := app.Model.PreProjectDB.CountBooks()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	CountGraduatedStudents, err := app.Model.UserRoleDB.CountGraduationStudents(5)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Send response
	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"StudentsCount":             count,
		"graduation_students_count": CountGraduationStudents,
		"books_count":               CountBooks,
		"graduated_students_count":  CountGraduatedStudents,
	})
}
func (app *application) GetGraduationStudentsHandler(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters from the request
	queryParams := r.URL.Query()

	// Fetch teachers using the query parameters
	users, meta, err := app.Model.UserRoleDB.GetGraduationStudents(queryParams)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Prepare the response envelope with metadata and user data
	response := utils.Envelope{
		"students": users,
		"meta":     meta,
	}

	// Send the response as JSON
	utils.SendJSONResponse(w, http.StatusOK, response)
}
func (app *application) VerifyEmailHandler(w http.ResponseWriter, r *http.Request) {
	email := r.FormValue("email")
	verificationCode := r.FormValue("verification_code")
	if email == "" || verificationCode == "" {
		app.errorResponse(w, r, http.StatusBadRequest, " والبريد الإلكتروني ورمز التحقق مطلوبين")
		return
	}

	user, err := app.Model.UserDB.GetUserByEmail(email)
	if err != nil {
		app.errorResponse(w, r, http.StatusNotFound, "المستخدم غير موجود")
		return
	}

	token, err := utils.GenerateToken(user.ID.String(), user.Roles)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.Model.UserDB.VerifyUser(user.ID, verificationCode)
	if err != nil {
		app.errorResponse(w, r, http.StatusForbidden, err.Error())
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"message": "Email verified",
		"token":   token,
	})
}
func (app *application) ResendVerificationCodeHandler(w http.ResponseWriter, r *http.Request) {
	email := r.FormValue("email")

	// Check if the email is provided
	if email == "" {
		app.errorResponse(w, r, http.StatusBadRequest, "يجب إدخال البريد الإلكتروني")
		return
	}

	// Get user by email
	user, err := app.Model.UserDB.GetUserByEmail(email)
	if err != nil {
		app.errorResponse(w, r, http.StatusNotFound, "لم يتم العثور على المستخدم")
		return
	}
	if user.Verified {
		app.errorResponse(w, r, http.StatusBadRequest, "المستخدم موثق بالعفل")
		return
	}

	// Check if the user can resend the verification code
	if time.Since(user.LastVerificationCodeSent) < 5*time.Minute {
		// Calculate the remaining time
		timeLeft := 5*time.Minute - time.Since(user.LastVerificationCodeSent)
		minutes := int(timeLeft.Minutes())
		seconds := int(timeLeft.Seconds()) % 60

		// Respond with the remaining time
		app.errorResponse(w, r, http.StatusTooManyRequests, fmt.Sprintf("يرجى انتظار %d دقيقة و %d ثانية قبل ارسال رسالة تاكيد", minutes, seconds))
		return
	}

	verificationCode := utils.GenerateRandomCode()
	user.VerificationCode = verificationCode
	user.VerificationCodeExpiry = time.Now().Add(5 * time.Minute)
	user.LastVerificationCodeSent = time.Now()

	// Store the updated user in the database
	if err := app.Model.UserDB.UpdateUser(user); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Send the new verification email
	err = SendVerificationEmail(user.Email, verificationCode)
	if err != nil {
		log.Printf("Error sending verification email to %s: %v", user.Email, err)
		app.errorResponse(w, r, http.StatusInternalServerError, "فشل في ارسال رسالة تاكيد")
		return
	}

	// Respond to the client
	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"message": "رسالة تاكيد تم ارسالها.",
	})
}

func (app *application) RequestPasswordResetHandler(w http.ResponseWriter, r *http.Request) {
	email := r.FormValue("email")

	// Validate email
	if email == "" {
		app.errorResponse(w, r, http.StatusBadRequest, "البريد الإلكتروني مطلوب")
		return
	}

	// Find user by email
	user, err := app.Model.UserDB.GetUserByEmail(email)
	if err != nil {
		app.errorResponse(w, r, http.StatusNotFound, "المستخدم غير موجود")
		return
	}
	if time.Since(user.LastVerificationCodeSent) < 5*time.Minute {
		// Calculate the remaining time
		timeLeft := 5*time.Minute - time.Since(user.LastVerificationCodeSent)
		minutes := int(timeLeft.Minutes())
		seconds := int(timeLeft.Seconds()) % 60

		// Respond with the remaining time
		app.errorResponse(w, r, http.StatusTooManyRequests, fmt.Sprintf("يرجى انتظار %d دقيقة و %d ثانية قبل ارسال رسالة تاكيد", minutes, seconds))
		return
	}

	verificationCode := utils.GenerateRandomCode()
	user.VerificationCode = verificationCode
	user.VerificationCodeExpiry = time.Now().Add(5 * time.Minute)
	user.LastVerificationCodeSent = time.Now()

	// Update the user with the new verification code and expiry time
	if err := app.Model.UserDB.UpdateUser(user); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Send the verification code via email
	err = SendVerificationEmail(user.Email, verificationCode)
	if err != nil {
		log.Printf("Error sending verification email to %s: %v", user.Email, err)
		app.errorResponse(w, r, http.StatusInternalServerError, "فشل في إرسال رسالة التحقق")
		return
	}

	// Respond to the client
	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"message": "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
	})
}

func (app *application) VerifyPasswordResetCodeHandler(w http.ResponseWriter, r *http.Request) {
	email := r.FormValue("email")
	verificationCode := r.FormValue("verification_code")

	// Validate input
	if email == "" || verificationCode == "" {
		app.errorResponse(w, r, http.StatusBadRequest, "البريد الإلكتروني ورمز التحقق مطلوبين")
		return
	}

	// Find user by email
	user, err := app.Model.UserDB.GetUserByEmail(email)
	if err != nil {
		app.errorResponse(w, r, http.StatusNotFound, "المستخدم غير موجود")
		return
	}

	// Check if the verification code matches and hasn't expired
	if user.VerificationCode != verificationCode {
		app.errorResponse(w, r, http.StatusForbidden, "رمز التحقق غير صالح")
		return
	}

	if time.Now().After(user.VerificationCodeExpiry) {
		app.errorResponse(w, r, http.StatusForbidden, "رمز التحقق منتهي الصلاحية")
		return
	}

	// Respond with success
	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"message": "تم التحقق بنجاح، يمكنك الآن إعادة تعيين كلمة المرور",
	})
}

func (app *application) ResetPasswordHandler(w http.ResponseWriter, r *http.Request) {
	email := r.FormValue("email")
	verificationCode := r.FormValue("verification_code")
	newPassword := r.FormValue("new_password")

	// Validate input
	if email == "" || verificationCode == "" || newPassword == "" {
		app.errorResponse(w, r, http.StatusBadRequest, "البريد الإلكتروني ورمز التحقق وكلمة المرور الجديدة مطلوبين")
		return
	}

	// Find user by email
	user, err := app.Model.UserDB.GetUserByEmail(email)
	if err != nil {
		app.errorResponse(w, r, http.StatusNotFound, "المستخدم غير موجود")
		return
	}

	// Check if the verification code matches and hasn't expired
	if user.VerificationCode != verificationCode {
		app.errorResponse(w, r, http.StatusForbidden, "رمز التحقق غير صالح")
		return
	}

	if time.Now().After(user.VerificationCodeExpiry) {
		app.errorResponse(w, r, http.StatusForbidden, "رمز التحقق منتهي الصلاحية")
		return
	}

	// Hash the new password
	hashedPassword, err := utils.HashPassword(newPassword)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Update user's password
	user.Password = hashedPassword
	user.VerificationCode = ""
	user.VerificationCodeExpiry = time.Time{}

	// Save the updated user in the database
	if err := app.Model.UserDB.UpdateUser(user); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Respond to the client
	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"message": "تم إعادة تعيين كلمة المرور بنجاح",
	})
}
