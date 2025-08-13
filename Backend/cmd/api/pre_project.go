package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"project/internal/data"
	"project/utils"
	"project/utils/validator"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

func (app *application) CreatePreProjectHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(UserIDKey).(string)
	usersID, err := uuid.Parse(userID)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	const AdminRole = "admin"

	userRoles, ok := r.Context().Value(UserRoleKey).([]string)
	if !ok {
		app.badRequestResponse(w, r, fmt.Errorf("invalid user roles"))
		return
	}
	user, err := app.Model.UserDB.GetUser(usersID)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}
	isAdmin := slices.Contains(userRoles, AdminRole)

	if !isAdmin {
		existingPreProject, err := app.Model.PreProjectDB.CheckExistingPreProject(user.ID)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
		if existingPreProject != nil {
			app.errorResponse(w, r, http.StatusConflict, "You already have an existing pre-project")
			return
		}
	}
	name := r.FormValue("name")
	description := r.FormValue("description")
	year, err := strconv.Atoi(r.FormValue("year"))
	if err != nil {
		app.errorResponse(w, r, http.StatusBadRequest, "Invalid year")
		return
	}
	season := r.FormValue("season")

	var file *string
	if uploadedFile, fileHeader, err := r.FormFile("file"); err == nil {
		defer uploadedFile.Close()
		fileName, err := utils.SaveFile(uploadedFile, "pre_projects", fileHeader.Filename)
		if err != nil {
			app.errorResponse(w, r, http.StatusBadRequest, "Invalid file")
			return
		}
		file = &fileName
	} else if err != http.ErrMissingFile {
		app.errorResponse(w, r, http.StatusBadRequest, "Invalid file upload")
		return
	}

	advisorsEmails := strings.Split(r.FormValue("advisors"), ",")
	var advisorIDs []uuid.UUID
	for _, email := range advisorsEmails {
		advisor, err := app.Model.UserDB.GetUserByEmail(email)
		if err != nil {
			app.errorResponse(w, r, http.StatusBadRequest, "Invalid advisor email")
			return
		}
		advisorIDs = append(advisorIDs, advisor.ID)
	}

	var studentIDs []uuid.UUID
	studentIDs = append(studentIDs, user.ID)

	addedStudentIDs := map[uuid.UUID]bool{
		user.ID: true,
	}
	if r.FormValue("students") != "" {
		studentsEmails := strings.Split(r.FormValue("students"), ",")
		for _, email := range studentsEmails {
			student, err := app.Model.UserDB.GetUserByEmail(email)
			if err != nil {
				app.errorResponse(w, r, http.StatusBadRequest, "البريد الإلكتروني للطالب غير صالح")
				return
			}

			existingStudentPreProject, err := app.Model.PreProjectDB.CheckExistingPreProject(student.ID)
			if err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}
			if existingStudentPreProject != nil {
				app.errorResponse(w, r, http.StatusConflict, fmt.Sprintf("الطالب %s لديه مشروع مقدم موجود بالفعل", student.Name))
				return
			}

			if !addedStudentIDs[student.ID] {
				studentIDs = append(studentIDs, student.ID)
				addedStudentIDs[student.ID] = true
			}
		}
	}
	fileDescription := r.FormValue("file_description")

	preProject := data.PreProject{
		ID:              uuid.New(),
		Name:            name,
		Description:     &description,
		File:            file,
		FileDescription: &fileDescription,
		Year:            year,
		Season:          season,
		ProjectOwner:    usersID,
		CanUpdate:       true,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	v := validator.New()
	data.ValidatePreProject(v, &preProject, studentIDs, advisorIDs)
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	skipSimilarityCheck := false
	if userRoles, ok := r.Context().Value(UserRoleKey).([]string); ok {
		for _, role := range userRoles {
			if role == "admin" || role == "teacher" {
				if r.FormValue("confirm") == "true" {
					skipSimilarityCheck = true
				}
				break
			}
		}
	}

	if !skipSimilarityCheck {
		similarityCheckResp, err := utils.CheckProjectSimilarity(name, description)
		if err != nil {
			if err.Error() == "server is offline or unreachable" {
				app.errorResponse(w, r, http.StatusServiceUnavailable, "يتم تشغيل السيرفر, يرجى المحاوله بعد قليل")
				return
			}
			app.serverErrorResponse(w, r, err)
			return
		}

		var highSimilarityProjects []map[string]interface{}
		for _, project := range similarityCheckResp.SimilarProjects {
			similarityScore, ok := project["similarity_score"].(float64)
			sourceTable, tableOk := project["source_table"].(string)
			if !ok || !tableOk {
				continue
			}

			if similarityScore > 50 {
				similarProject := map[string]interface{}{
					"project_id":          project["project_id"],
					"project_name":        project["name"],
					"project_description": project["description"],
					"similarity_score":    similarityScore,
					"source_table":        sourceTable,
				}
				highSimilarityProjects = append(highSimilarityProjects, similarProject)
			}
		}

		if len(highSimilarityProjects) > 0 {
			response := utils.Envelope{
				"error":            "Similar projects found",
				"similar_projects": highSimilarityProjects,
				"message":          "Project is too similar to existing projects. Please modify your project.",
			}
			app.errorResponse(w, r, http.StatusConflict, response)
			return
		}
	}

	err = app.Model.PreProjectDB.InsertPreProject(&preProject, studentIDs, advisorIDs)
	if err != nil {
		if preProject.File != nil {
			utils.DeleteFile(*preProject.File)
		}
		app.serverErrorResponse(w, r, err)
		return
	}
	utils.SendJSONResponse(w, http.StatusCreated, utils.Envelope{"pre_project": preProject})
}

func (app *application) GetPreProjectsHandler(w http.ResponseWriter, r *http.Request) {
	queryParams := r.URL.Query()
	id := queryParams.Get("id")
	if id != "" {
		filters := queryParams.Get("filters")
		if filters == "" {
			queryParams.Set("filters", fmt.Sprintf("id:%s", id))
		} else {
			queryParams.Set("filters", fmt.Sprintf("%s,id:%s", filters, id))
		}
	}

	preProjects, meta, err := app.Model.PreProjectDB.ListPreProjects(queryParams)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"pre_projects": preProjects, "meta": meta})
}
func (app *application) GetAssociatedPreProjectsHandler(w http.ResponseWriter, r *http.Request) {
	queryParams := r.URL.Query()
	id := queryParams.Get("id")
	if id != "" {
		// Validate the UUID
		if _, err := uuid.Parse(id); err != nil {
			app.errorResponse(w, r, http.StatusBadRequest, fmt.Sprintf("invalid UUID format: %s", id))
			return
		}

		// Append the id to the filters without extra quotes.
		filters := queryParams.Get("filters")
		if filters == "" {
			queryParams.Set("filters", fmt.Sprintf("id:%s", id))
		} else {
			queryParams.Set("filters", fmt.Sprintf("%s,id:%s", filters, id))
		}
	}

	preProjects, err := app.Model.PreProjectDB.ListAssociatedPreProjects(uuid.MustParse(id))
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"pre_projects": preProjects})
}

func (app *application) GetPreProjectsHandlerByID(w http.ResponseWriter, r *http.Request) {
	preProjectID := uuid.MustParse(r.PathValue("id"))

	preProject, err := app.Model.PreProjectDB.GetPreProjectWithAdvisorDetails(preProjectID)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"pre_project": preProject,
	})
}
func (app *application) UpdatePreProjectHandler(w http.ResponseWriter, r *http.Request) {
	userRoles, ok := r.Context().Value(UserRoleKey).([]string)
	if !ok {
		app.unauthorizedResponse(w, r)
		return
	}
	isAdmin := false
	for _, role := range userRoles {
		if role == "admin" {
			isAdmin = true
			break
		}
	}

	preProjectID := uuid.MustParse(r.PathValue("id"))

	existingPreProject, err := app.Model.PreProjectDB.GetPreProjectWithAdvisorDetails(preProjectID)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}

	preProject := &data.PreProject{
		ID:           preProjectID,
		ProjectOwner: existingPreProject.PreProject.ProjectOwner,
		UpdatedAt:    time.Now(),
	}
	nameChanged := false
	descriptionChanged := false

	name := r.FormValue("name")
	if name != existingPreProject.PreProject.Name {
		preProject.Name = name
		nameChanged = true
	} else {
		nameChanged = false
		preProject.Name = existingPreProject.PreProject.Name
	}
	canUpdateStr := r.FormValue("can_update")
	var canUpdate bool
	if canUpdateStr != "" {
		var err error
		canUpdate, err = strconv.ParseBool(canUpdateStr)
		if err != nil {
			app.errorResponse(w, r, http.StatusBadRequest, "Invalid can_update value")
			return
		}
		preProject.CanUpdate = canUpdate
	} else {
		preProject.CanUpdate = existingPreProject.PreProject.CanUpdate
	}
	description := r.FormValue("description")
	if description != *existingPreProject.PreProject.Description {
		preProject.Description = &description
		descriptionChanged = true
	} else {
		preProject.Description = existingPreProject.PreProject.Description
		descriptionChanged = false
	}

	yearStr := r.FormValue("year")
	var year int
	if yearStr != "" {
		year, err = strconv.Atoi(yearStr)
		if err != nil {
			app.errorResponse(w, r, http.StatusBadRequest, "Invalid year")
			return
		}
		preProject.Year = year
	} else {
		preProject.Year = existingPreProject.PreProject.Year
	}

	season := r.FormValue("season")
	if season != "" {
		preProject.Season = season
	} else {
		preProject.Season = existingPreProject.PreProject.Season
	}

	degree := r.FormValue("degree")
	if degree != "" && isAdmin {
		intDegree, err := strconv.Atoi(degree)
		if err != nil {
			app.errorResponse(w, r, http.StatusBadRequest, "Invalid degree")
			return
		}
		preProject.Degree = &intDegree
	} else {
		preProject.Degree = existingPreProject.PreProject.Degree
	}
	var file *string
	var oldFile *string
	if uploadedFile, fileHeader, err := r.FormFile("file"); err == nil {
		defer uploadedFile.Close()
		fileName, err := utils.SaveFile(uploadedFile, "pre_projects", fileHeader.Filename)
		if err != nil {
			app.errorResponse(w, r, http.StatusBadRequest, "Invalid file")
			return
		}
		file = &fileName
		oldFile = existingPreProject.PreProject.File
		preProject.File = file
	} else if err != http.ErrMissingFile {
		app.errorResponse(w, r, http.StatusBadRequest, "Invalid file upload")
		return
	} else {
		if existingPreProject.PreProject.File != nil {
			*existingPreProject.PreProject.File = strings.TrimPrefix(*existingPreProject.PreProject.File, data.Domain+"/")
		}

		preProject.File = existingPreProject.PreProject.File
	}
	fileDescription := r.FormValue("file_description")
	if fileDescription != "" {
		preProject.FileDescription = &fileDescription
	} else if existingPreProject.PreProject.FileDescription != nil {
		preProject.FileDescription = existingPreProject.PreProject.FileDescription
	}
	// Determine if user lists are being updated
	studentsProvided := r.FormValue("students") != ""
	advisorsProvided := r.FormValue("advisors") != ""

	var students []uuid.UUID
	if studentsProvided {
		studentEmails := r.FormValue("students")
		studentEmailList := strings.Split(studentEmails, ",")

		// Get existing students
		existingStudents := make(map[uuid.UUID]bool)
		for _, student := range existingPreProject.Students {
			existingStudents[student.StudentID] = true
		}

		// Check new students for existing pre-projects
		for _, email := range studentEmailList {
			email = strings.TrimSpace(email)
			if email == "" {
				continue
			}

			student, err := app.Model.UserDB.GetUserByEmail(email)
			if err != nil {
				app.errorResponse(w, r, http.StatusBadRequest, "Invalid student email")
				return
			}

			// Skip if the student is already part of the project
			if existingStudents[student.ID] {
				students = append(students, student.ID)
				continue
			}

			// Check if the student has an existing pre-project (excluding the current one)
			existingPreProject, err := app.Model.PreProjectDB.CheckExistingPreProject(student.ID)
			if err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}

			if existingPreProject != nil && existingPreProject.ID != preProjectID {
				app.errorResponse(w, r, http.StatusConflict, fmt.Sprintf("الطالب %s لديه مشروع مقدم موجود بالفعل", student.Name))
				return
			}

			students = append(students, student.ID)
		}

		// Ensure at least one student is provided when updating
		if len(students) == 0 {
			app.badRequestResponse(w, r, errors.New("at least one student is required"))
			return
		}
	} else {
		// Use existing students if no new students are provided
		for _, student := range existingPreProject.Students {
			students = append(students, student.StudentID)
		}
	}

	// Parse advisors
	var advisors []uuid.UUID
	if advisorsProvided {
		advisorEmails := r.FormValue("advisors")
		advisorEmailList := strings.Split(advisorEmails, ",")
		for _, email := range advisorEmailList {
			email = strings.TrimSpace(email)
			if email == "" {
				continue
			}
			advisor, err := app.Model.UserDB.GetUserByEmail(email)
			if err != nil {
				app.errorResponse(w, r, http.StatusBadRequest, "Invalid advisor email")
				return
			}
			advisors = append(advisors, advisor.ID)
		}
		// Ensure at least one advisor is provided when updating
		if len(advisors) == 0 {
			app.badRequestResponse(w, r, errors.New("at least one advisor is required"))
			return
		}
	} else {
		// Use existing advisors if no new advisors are provided
		for _, advisor := range existingPreProject.Advisors {
			advisors = append(advisors, advisor.AdvisorID)
		}
	}
	discutantsProvided := r.FormValue("discutants") != ""

	// Parse discussants
	var discutants []uuid.UUID
	if discutantsProvided {
		discussantEmails := r.FormValue("discutants")
		discussantEmailList := strings.Split(discussantEmails, ",")
		for _, email := range discussantEmailList {
			email = strings.TrimSpace(email)
			if email == "" {
				continue
			}
			discussant, err := app.Model.UserDB.GetUserByEmail(email)
			if err != nil {
				app.errorResponse(w, r, http.StatusBadRequest, "Invalid discussant email")
				return
			}
			discutants = append(discutants, discussant.ID)
		}
	} else {
		// Use existing discussants if no new discussants are provided
		for _, discussant := range existingPreProject.Discussants {
			discutants = append(discutants, discussant.DiscussantID)
		}
	}

	if !discutantsProvided {
		err := app.Model.PreProjectDB.RemoveAllDiscussants(preProject.ID)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
		// Avoid re-adding the removed discussants
		discutants = []uuid.UUID{}
	}

	v := validator.New()
	data.ValidatePreProject(v, preProject, students, advisors)
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if nameChanged || descriptionChanged {
		similarityCheckResp, err := utils.CheckProjectSimilarity(preProject.Name, *preProject.Description)

		if err != nil {
			if err.Error() == "server is offline or unreachable" {

				app.errorResponse(w, r, http.StatusServiceUnavailable, "يتم تشغيل السيرفر, يرجى المحاوله بعد قليل")
				return
			}

			app.serverErrorResponse(w, r, err)
			return
		}
		var highSimilarityProjects []map[string]interface{}

		for _, project := range similarityCheckResp.SimilarProjects {
			similarityScore, ok := project["similarity_score"].(float64)
			sourceTable, tableOk := project["source_table"].(string)
			if !ok || !tableOk {
				continue
			}

			if similarityScore > 50 {
				similarProject := map[string]interface{}{
					"project_id":          project["project_id"],
					"project_name":        project["name"],
					"project_description": project["description"],
					"similarity_score":    similarityScore,
					"source_table":        sourceTable,
				}
				highSimilarityProjects = append(highSimilarityProjects, similarProject)
			}
		}

		if len(highSimilarityProjects) > 0 {
			highestSimilarityProjectIDStr, ok := highSimilarityProjects[0]["project_id"].(string)
			if !ok {
				log.Println("Error: project_id is not a string")
				return
			}

			highestSimilarityProjectID, err := uuid.Parse(highestSimilarityProjectIDStr)
			if err != nil {
				log.Println("Error parsing project_id to uuid:", err)
				return
			}

			if preProjectID != highestSimilarityProjectID {
				response := utils.Envelope{
					"error":            "Similar projects found",
					"similar_projects": highSimilarityProjects,
					"message":          "Project is too similar to existing projects. Please modify your project.",
				}
				app.errorResponse(w, r, http.StatusConflict, response)
				return
			}
		}
	}
	err = app.Model.PreProjectDB.UpdatePreProject(preProject, advisors, students, discutants)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if oldFile != nil {
		*oldFile = strings.TrimPrefix(*oldFile, data.Domain+"/")

		if err := utils.DeleteFile(*oldFile); err != nil {
			log.Printf("Failed to delete old file %s: %v", *oldFile, err)
		}
	}

	updatedPreProject, err := app.Model.PreProjectDB.GetPreProjectWithAdvisorDetails(preProjectID)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"pre_project": updatedPreProject,
	})
}

func (app *application) DeletePreProjectHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(UserIDKey).(string)
	studentUUID, err := uuid.Parse(userID)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	preProjectID := uuid.MustParse(r.PathValue("id"))

	err = app.Model.PreProjectDB.DeletePreProject(preProjectID, studentUUID)
	if err != nil {
		switch {
		case strings.Contains(err.Error(), "pre-project not found"):
			app.errorResponse(w, r, http.StatusNotFound, "Pre-project not found")
		case strings.Contains(err.Error(), "unauthorized to delete"):
			app.errorResponse(w, r, http.StatusForbidden, "Unauthorized to delete this pre-project")
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"message": "Pre-project deleted successfully",
	})
}
func (app *application) RespondToPreProjectHandler(w http.ResponseWriter, r *http.Request) {

	advisorIDValue := r.Context().Value(UserIDKey)
	if advisorIDValue == nil {
		app.errorResponse(w, r, http.StatusUnauthorized, "User ID not found in context")
		return
	}
	advisorID, ok := advisorIDValue.(string)
	if !ok {
		app.errorResponse(w, r, http.StatusInternalServerError, "Invalid user ID type")
		return
	}

	advisorUUID, err := uuid.Parse(advisorID)
	if err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid advisor ID: %w", err))
		return
	}
	preProjectIDStr := r.FormValue("pre_project_id")
	status := r.FormValue("status")

	if preProjectIDStr == "" {
		app.errorResponse(w, r, http.StatusBadRequest, "Pre-project ID is required")
		return
	}
	if status == "" {
		app.errorResponse(w, r, http.StatusBadRequest, "Status is required")
		return
	}
	preProjectUUID, err := uuid.Parse(preProjectIDStr)
	if err != nil {
		app.errorResponse(w, r, http.StatusBadRequest, "Invalid pre-project ID")
		return
	}

	preProject, err := app.Model.PreProjectDB.GetPreProjectWithAdvisorDetails(preProjectUUID)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}

	if preProject.PreProject.AcceptedAdvisor != nil && *preProject.PreProject.AcceptedAdvisor == advisorUUID {
		app.errorResponse(w, r, http.StatusConflict, "You Already Accepeted the Project!")
		return
	}

	if preProject == nil {
		app.errorResponse(w, r, http.StatusNotFound, "Pre-project not found")
		return
	}
	v := validator.New()
	advisorIDs := make([]uuid.UUID, len(preProject.Advisors))
	for i, advisor := range preProject.Advisors {
		advisorIDs[i] = advisor.AdvisorID
	}

	data.ValidateAdvisorResponse(v, advisorUUID, status, advisorIDs)
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}
	err = app.Model.PreProjectDB.InsertAdvisorResponse(preProjectUUID, advisorUUID, status)
	if err != nil {
		switch {

		case strings.Contains(err.Error(), "already been accepted by another advisor"):
			app.errorResponse(w, r, http.StatusConflict, "Pre-project has already been accepted by another advisor")
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}
	message := "Advisor response recorded successfully"
	if status == "accepted" {
		message = "Pre-project accepted successfully"
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"message": message,
	})
}

func (app *application) ResetPreProjectAdvisorsHandler(w http.ResponseWriter, r *http.Request) {

	preProjectID := uuid.MustParse(r.PathValue("id"))
	err := app.Model.PreProjectDB.ResetPreProjectAdvisors(preProjectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	updatedPreProject, err := app.Model.PreProjectDB.GetPreProjectWithAdvisorDetails(preProjectID)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"pre_project": updatedPreProject,
		"message":     "Pre-project advisors reset successfully",
	})
}
func (app *application) MovePreProjectToBookHandler(w http.ResponseWriter, r *http.Request) {
	preProjectID := uuid.MustParse(r.PathValue("id"))
	preProject, err := app.Model.PreProjectDB.GetPreProjectWithAdvisorDetails(preProjectID)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}
	degreeStr := r.FormValue("degree")
	Degree, err := strconv.Atoi(degreeStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid Degree"))
		return
	}
	if Degree == 0 {
		app.badRequestResponse(w, r, errors.New("لا يمكن ترك الدرجة فارغة"))
		return
	}

	cleanedFilePath := ""
	if preProject.PreProject.File != nil {
		cleanedFilePath = strings.TrimPrefix(*preProject.PreProject.File, data.Domain+"/")

	}

	book := &data.Book{
		ID:          uuid.New(),
		Name:        preProject.PreProject.Name,
		Description: preProject.PreProject.Description,
		File:        &cleanedFilePath,
		Year:        preProject.PreProject.Year,
		Season:      preProject.PreProject.Season,
		Degree:      preProject.PreProject.Degree,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	studentIDs := make([]uuid.UUID, len(preProject.Students))
	for i, student := range preProject.Students {
		studentIDs[i] = student.StudentID
	}
	discussantsStr := r.FormValue("discussants")
	discussantIDs := strings.Split(discussantsStr, ",")

	Discussants := make([]uuid.UUID, 0, len(discussantIDs))
	for _, id := range discussantIDs {
		if id != "" {
			Discussants = append(Discussants, uuid.MustParse(id))
		}
	}

	advisorIDs := []uuid.UUID{*preProject.PreProject.AcceptedAdvisor}

	v := validator.New()
	data.ValidateBook(v, book, studentIDs, advisorIDs, Discussants, false)
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.Model.BookDB.InsertBook(book, Discussants, advisorIDs, studentIDs)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	for _, student := range preProject.Students {
		if err = app.Model.UserRoleDB.RevokeRole(student.StudentID, 4); err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
		if err = app.Model.UserRoleDB.GrantRole(student.StudentID, 5); err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
	}
	err = app.Model.PreProjectDB.DeletePreProject(preProjectID, preProject.PreProject.ProjectOwner)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	createdBook, err := app.Model.BookDB.GetBookWithDetails(book.ID)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusCreated, utils.Envelope{
		"book":    createdBook,
		"message": "Pre-project successfully moved to book",
	})
}
func (app *application) CanUpdate(w http.ResponseWriter, r *http.Request) {
	canupdate := r.FormValue("Can_update")
	var canUpdate bool

	canUpdate, err := strconv.ParseBool(canupdate)
	if err != nil {
		app.errorResponse(w, r, http.StatusBadRequest, "Invalid can_update value")
		return
	}

	id := uuid.MustParse(r.PathValue("id"))

	err = app.Model.PreProjectDB.UpdateCanUpdate(canUpdate, id)
	if err != nil {
		app.errorResponse(w, r, http.StatusBadRequest, "Error while updating the pre project canUpdate!")
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"message": "Pre-project successfully updated!",
	})
}
