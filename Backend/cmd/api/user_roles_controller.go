package main

import (
	"errors"
	"net/http"
	"project/utils"
	"strconv"

	"github.com/google/uuid"
)

func (app *application) GrantRoleHandler(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.FormValue("user_id")
	roleIDStr := r.FormValue("role_id")

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid user ID"))
		return
	}

	roleID, err := strconv.Atoi(roleIDStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid role ID"))
		return
	}

	// Check if the user currently has role 3
	roles, err := app.Model.UserRoleDB.GetUserRoles(userID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	hasRoleStudent := false
	for _, role := range roles {
		if role == "student" {
			hasRoleStudent = true
			break
		}
	}

	// If the user has role 'student' and is trying to grant role 'admin' or 'teacher', revoke role 'student'
	if hasRoleStudent && (roleID == 1 || roleID == 2) {
		err = app.Model.UserRoleDB.RevokeRole(userID, 3)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
	}

	// Grant the new role
	err = app.Model.UserRoleDB.GrantRole(userID, roleID)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"message": "role granted successfully"})
}

//if u want the granting by email :D
/*

func (app *application) GrantRoleHandler(w http.ResponseWriter, r *http.Request) {
	email := r.FormValue("email")
	roleIDStr := r.FormValue("role_id")

	user, err := app.Model.UserDB.GetUserByEmail(email)
	if err != nil {
		app.errorResponse(w, r, http.StatusBadRequest, "Invalid student email")
		return
	}

	userID := user.ID

	roleID, err := strconv.Atoi(roleIDStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid role ID"))
		return
	}

	roles, err := app.Model.UserRoleDB.GetUserRoles(userID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	hasRoleStudent := false
	for _, role := range roles {
		if role == "student" {
			hasRoleStudent = true
			break
		}
	}

	// If the user has role 'student' and is trying to grant role 'admin' or 'teacher', revoke role 'student'
	if hasRoleStudent && (roleID == 1 || roleID == 2) {
		err = app.Model.UserRoleDB.RevokeRole(userID, 3)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
	}

	err = app.Model.UserRoleDB.GrantRole(userID, roleID)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"message": "role granted successfully"})
}
*/
// RevokeRoleHandler revokes a specific role from a user
func (app *application) RevokeRoleHandler(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.FormValue("user_id")
	roleIDStr := r.FormValue("role_id")

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid user ID"))
		return
	}

	roleID, err := strconv.Atoi(roleIDStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid role ID"))
		return
	}

	err = app.Model.UserRoleDB.RevokeRole(userID, roleID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"message": "role revoked successfully"})
}

// GetUserRolesHandler retrieves all roles assigned to a user
func (app *application) GetUserRolesHandler(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.PathValue("id")

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid user ID"))
		return
	}

	roles, err := app.Model.UserRoleDB.GetUserRoles(userID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"roles": roles})
}
func (app *application) GetTeachersHandler(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters from the request
	queryParams := r.URL.Query()

	// Fetch teachers using the query parameters
	users, meta, err := app.Model.UserRoleDB.GetTeachers(queryParams)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Prepare the response envelope with metadata and user data
	response := utils.Envelope{
		"teachers": users,
		"meta":     meta,
	}

	// Send the response as JSON
	utils.SendJSONResponse(w, http.StatusOK, response)
}
func (app *application) GetStudentHandler(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters from the request
	queryParams := r.URL.Query()

	// Fetch teachers using the query parameters
	users, meta, err := app.Model.UserRoleDB.GetStudents(queryParams)
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
