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

func (app *application) CreateBookHandler(w http.ResponseWriter, r *http.Request) {
	name := r.FormValue("name")
	description := r.FormValue("description")
	yearStr := r.FormValue("year")
	season := r.FormValue("season")
	degree := 0
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid year"))
		return
	}
	if r.FormValue("degree") != "" {
		degreestr := r.FormValue("degree")

		degree, err = strconv.Atoi(degreestr)
		if err != nil {
			app.badRequestResponse(w, r, errors.New("invalid degree"))
			return
		}
	}
	// Initialize maps to track added IDs and prevent duplicates
	addedStudentIDs := make(map[uuid.UUID]bool)
	addedAdvisorIDs := make(map[uuid.UUID]bool)
	addedDiscussantIDs := make(map[uuid.UUID]bool)

	// Initialize slices to store user IDs
	var studentIDs, advisorIDs, discussantIDs []uuid.UUID

	// Parse and validate students
	if r.FormValue("students") != "" {
		studentsEmails := strings.Split(r.FormValue("students"), ",")
		for _, email := range studentsEmails {
			email = strings.TrimSpace(email)
			student, err := app.Model.UserDB.GetUserByEmail(email)
			if err != nil {
				app.handleRetrievalError(w, r, err)
				return
			}

			// Only add if not already added
			if !addedStudentIDs[student.ID] {
				studentIDs = append(studentIDs, student.ID)
				addedStudentIDs[student.ID] = true
			}
		}
	}

	// Parse and validate advisors
	if r.FormValue("advisors") != "" {
		advisorsEmails := strings.Split(r.FormValue("advisors"), ",")
		for _, email := range advisorsEmails {
			email = strings.TrimSpace(email)
			advisor, err := app.Model.UserDB.GetUserByEmail(email)
			if err != nil {
				app.handleRetrievalError(w, r, err)
				return
			}

			// Only add if not already added
			if !addedAdvisorIDs[advisor.ID] {
				advisorIDs = append(advisorIDs, advisor.ID)
				addedAdvisorIDs[advisor.ID] = true
			}
		}
	}

	// Parse and validate discutants
	if r.FormValue("discutants") != "" {
		discutantsEmails := strings.Split(r.FormValue("discutants"), ",")
		for _, email := range discutantsEmails {
			email = strings.TrimSpace(email)
			discussant, err := app.Model.UserDB.GetUserByEmail(email)
			if err != nil {
				app.handleRetrievalError(w, r, err)
				return
			}

			// Only add if not already added
			if !addedDiscussantIDs[discussant.ID] {
				discussantIDs = append(discussantIDs, discussant.ID)
				addedDiscussantIDs[discussant.ID] = true
			}
		}
	}

	var descriptionPtr *string
	if description != "" {
		descriptionPtr = &description
	}

	book := &data.Book{
		Name:        name,
		Description: descriptionPtr,
		Year:        year,
		Season:      strings.ToLower(season),
		Degree:      &degree,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Handle file upload
	if file, fileHeader, err := r.FormFile("file"); err == nil {
		defer file.Close()
		fileName, err := utils.SaveFile(file, "books", fileHeader.Filename)
		if err != nil {
			app.errorResponse(w, r, http.StatusBadRequest, "invalid file")
			return
		}
		book.File = &fileName
	} else if err != http.ErrMissingFile {
		app.errorResponse(w, r, http.StatusBadRequest, "invalid file upload")
		return
	}

	// Validate the book
	v := validator.New()
	data.ValidateBook(v, book, studentIDs, advisorIDs, discussantIDs, false)
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}
	similarityCheckResp, err := utils.CheckProjectSimilarity(name, description)
	if err != nil {
		if err.Error() == "server is offline or unreachable" {

			app.errorResponse(w, r, http.StatusServiceUnavailable, "يتم تشغيل السيرفر, يرجى المحاوله بعد قليل")
			return
		}

		app.serverErrorResponse(w, r, err)
		return
	}
	// Initialize a slice to hold high similarity projects
	var highSimilarityProjects []map[string]interface{}

	// Process the similar projects returned from the similarity check
	for _, project := range similarityCheckResp.SimilarProjects {
		similarityScore, ok := project["similarity_score"].(float64)
		sourceTable, tableOk := project["source_table"].(string)
		if !ok || !tableOk {
			continue
		}

		// Only consider projects with a similarity score above a certain threshold
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
		if r.FormValue("confirm") != "true" {
			response := utils.Envelope{
				"error":            "Similar projects found",
				"similar_projects": highSimilarityProjects,
				"message":          "Project is too similar to existing projects. Please modify your project.",
			}
			app.errorResponse(w, r, http.StatusConflict, response)
			return
		}
	}
	// Insert the book
	err = app.Model.BookDB.InsertBook(book, discussantIDs, advisorIDs, studentIDs)
	if err != nil {
		if book.File != nil {
			utils.DeleteFile(*book.File)
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	// Fetch the created book with details to return
	createdBookWithDetails, err := app.Model.BookDB.GetBook(book.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusCreated, utils.Envelope{"book": createdBookWithDetails})
}

func (app *application) GetBookHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid book ID"))
		return
	}

	bookWithDetails, err := app.Model.BookDB.GetBook(id)
	if err != nil {
		if errors.Is(err, data.ErrRecordNotFound) {
			app.handleRetrievalError(w, r, err)
			return
		}

		utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"book": bookWithDetails})
	}
}

func (app *application) GetBookWithDetailsHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid book ID"))
		return
	}
	fmt.Print(id)
	bookWithDetails, err := app.Model.BookDB.GetBook(id)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}
	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"book": bookWithDetails})
}

func (app *application) UpdateBookHandler(w http.ResponseWriter, r *http.Request) {
	// Parse book ID from path
	idStr := r.PathValue("id")
	bookID, err := uuid.Parse(idStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid book ID"))
		return
	}

	// Retrieve existing book
	existingBookWithDetails, err := app.Model.BookDB.GetBook(bookID)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}

	// Prepare book for update
	book := &data.Book{
		ID:        bookID,
		CreatedAt: existingBookWithDetails.Book.CreatedAt,
		UpdatedAt: time.Now(),
	}

	// Parse and update name if provided
	name := r.FormValue("name")
	if name != "" {
		book.Name = name
	} else {
		book.Name = existingBookWithDetails.Book.Name
	}

	// Parse and update description if provided
	description := r.FormValue("description")
	if description != "" {
		descPtr := description
		book.Description = &descPtr
	} else {
		book.Description = existingBookWithDetails.Book.Description
	}

	// Parse and update year if provided
	yearStr := r.FormValue("year")
	if yearStr != "" {
		year, err := strconv.Atoi(yearStr)
		if err != nil {
			app.badRequestResponse(w, r, errors.New("invalid year"))
			return
		}
		book.Year = year
	} else {
		book.Year = existingBookWithDetails.Book.Year
	}
	// Parse and update year if provided
	degreeStr := r.FormValue("degree")
	if degreeStr != "" {
		Degree, err := strconv.Atoi(degreeStr)
		if err != nil {
			app.badRequestResponse(w, r, errors.New("invalid Degree"))
			return
		}
		book.Degree = &Degree
	} else {
		book.Degree = existingBookWithDetails.Book.Degree
	}
	// Parse and update season if provided
	season := r.FormValue("season")
	if season != "" {
		book.Season = strings.ToLower(season)
	} else {
		book.Season = existingBookWithDetails.Book.Season
	}

	// Handle file upload
	var file *string
	var oldFile *string
	if uploadedFile, fileHeader, err := r.FormFile("file"); err == nil {
		defer uploadedFile.Close()
		fileName, err := utils.SaveFile(uploadedFile, "books", fileHeader.Filename)
		if err != nil {
			app.errorResponse(w, r, http.StatusBadRequest, "invalid file")
			return
		}
		file = &fileName
		oldFile = existingBookWithDetails.Book.File
		book.File = file
	} else if err != http.ErrMissingFile {
		app.errorResponse(w, r, http.StatusBadRequest, "invalid file upload")
		return
	} else {
		if existingBookWithDetails.Book.File != nil {
			*existingBookWithDetails.Book.File = strings.TrimPrefix(*existingBookWithDetails.Book.File, data.Domain+"/")
		}

		existingBookWithDetails.File = existingBookWithDetails.Book.File
	}

	// Determine if user lists are being updated
	studentsProvided := r.FormValue("students") != ""
	advisorsProvided := r.FormValue("advisors") != ""
	discutantsProvided := r.FormValue("discutants") != ""

	// Parse students
	var students []uuid.UUID
	if studentsProvided {
		studentEmails := r.FormValue("students")
		studentEmailList := strings.Split(studentEmails, ",")
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
			students = append(students, student.ID)
		}
		// Ensure at least one student is provided when updating
		if len(students) == 0 {
			app.badRequestResponse(w, r, errors.New("at least one student is required"))
			return
		}
	} else {
		// Use existing students if no new students are provided
		for _, student := range existingBookWithDetails.Students {
			students = append(students, student.ID)
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
		for _, advisor := range existingBookWithDetails.Advisors {
			advisors = append(advisors, advisor.ID)
		}
	}

	// Parse discutants
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
		// Ensure at least one discussant is provided when updating
		if len(discutants) == 0 {
			app.badRequestResponse(w, r, errors.New("at least one discussant is required"))
			return
		}
	} else {
		// Use existing discutants if no new discutants are provided
		for _, discussant := range existingBookWithDetails.Discussants {
			discutants = append(discutants, discussant.ID)
		}
	}

	// Validate book
	v := validator.New()
	data.ValidateBook(v, book, students, advisors, discutants, true)
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}
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
	if book.Name != existingBookWithDetails.Book.Name && book.Description != existingBookWithDetails.Book.Description {
		if len(highSimilarityProjects) > 0 {
			if r.FormValue("confirm") != "true" {
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
	// Perform update
	err = app.Model.BookDB.UpdateBook(book, discutants, advisors, students)
	if err != nil {
		if book.File != nil {
			utils.DeleteFile(*book.File)
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	// Delete old file if a new file was uploaded
	if oldFile != nil {
		*oldFile = strings.TrimPrefix(*oldFile, data.Domain+"/")

		if err := utils.DeleteFile(*oldFile); err != nil {

			log.Printf("Failed to delete old file %s: %v", *oldFile, err)
		}
	}

	// Retrieve updated book to return
	updatedBookWithDetails, err := app.Model.BookDB.GetBook(bookID)
	if err != nil {
		app.handleRetrievalError(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"book": updatedBookWithDetails,
	})
}

func (app *application) DeleteBookHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid book ID"))
		return
	}

	// Check if book exists
	_, err = app.Model.BookDB.GetBook(id)
	if err != nil {
		if errors.Is(err, data.ErrRecordNotFound) {
			app.errorResponse(w, r, 404, "Book was not found")
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.Model.BookDB.DeleteBook(id)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"message": "book deleted successfully"})
}

func (app *application) ListBooksHandler(w http.ResponseWriter, r *http.Request) {
	queryParams := r.URL.Query()
	id := queryParams.Get("id")
	if id != "" {
		// Dynamically add the ID to the filters
		filters := queryParams.Get("filters")
		if filters == "" {
			queryParams.Set("filters", fmt.Sprintf("id:%s", id))
		} else {
			queryParams.Set("filters", fmt.Sprintf("%s,id:%s", filters, id))
		}
	}
	books, meta, err := app.Model.BookDB.ListBooks(queryParams)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"meta":  meta,
		"books": books,
	})
}
