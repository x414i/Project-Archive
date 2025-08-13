package main

import (
	"errors"
	"net/http"
	"project/internal/data"
	"project/utils"
	"project/utils/validator"
	"strings"
	"time"

	"github.com/google/uuid"
)

func (app *application) CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	description := r.FormValue("description")

	post := data.Post{
		ID:          uuid.New(),
		Description: description,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if file, fileHeader, err := r.FormFile("file"); err == nil {
		defer file.Close()
		fileName, err := utils.SaveFile(file, "posts", fileHeader.Filename)
		if err != nil {
			app.errorResponse(w, r, http.StatusBadRequest, "invalid file")
			return
		}
		post.File = &fileName
	} else if err != http.ErrMissingFile {
		app.errorResponse(w, r, http.StatusBadRequest, "invalid file upload")
		return
	}

	v := validator.New()
	data.ValidatePost(v, &post, "description")
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err := app.Model.PostDB.InsertPost(&post)
	if err != nil {
		if post.File != nil {
			utils.DeleteFile(*post.File)
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusCreated, utils.Envelope{"post": post})
}

func (app *application) GetPostHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid post ID"))
		return
	}

	post, err := app.Model.PostDB.GetPost(id)
	if err != nil {
		if errors.Is(err, data.ErrRecordNotFound) {
			app.errorResponse(w, r, http.StatusNotFound, "Post not found")
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"post": post})
}

func (app *application) UpdatePostHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid post ID"))
		return
	}

	post, err := app.Model.PostDB.GetPost(id)
	if err != nil {
		if errors.Is(err, data.ErrRecordNotFound) {
			app.errorResponse(w, r, http.StatusNotFound, "Post not found")
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if description := r.FormValue("description"); description != "" {
		post.Description = description
	}
	if post.File != nil {
		*post.File = strings.TrimPrefix(*post.File, data.Domain+"/")

	}
	if file, fileHeader, err := r.FormFile("file"); err == nil {
		defer file.Close()
		newFileName, err := utils.SaveFile(file, "posts", fileHeader.Filename)
		if err != nil {
			app.errorResponse(w, r, http.StatusBadRequest, "invalid file")
			return
		}

		if post.File != nil {
			utils.DeleteFile(*post.File)
		}
		post.File = &newFileName
	}

	v := validator.New()
	data.ValidatePost(v, post, "description")
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.Model.PostDB.UpdatePost(post)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"post": post})
}

func (app *application) DeletePostHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		app.badRequestResponse(w, r, errors.New("invalid post ID"))
		return
	}

	post, err := app.Model.PostDB.GetPost(id)
	if err != nil {
		if errors.Is(err, data.ErrRecordNotFound) {
			app.errorResponse(w, r, http.StatusNotFound, "Post not found")
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.Model.PostDB.DeletePost(id)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if post.File != nil {
		utils.DeleteFile(*post.File)
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{"message": "post deleted successfully"})
}

func (app *application) ListPostsHandler(w http.ResponseWriter, r *http.Request) {
	queryParams := r.URL.Query()

	posts, meta, err := app.Model.PostDB.ListPosts(queryParams)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, utils.Envelope{
		"posts": posts,
		"meta":  meta,
	})
}
