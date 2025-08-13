package data

import (
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"os"
	"project/utils"
	"project/utils/validator"
	"strings"
	"time"

	"github.com/Masterminds/squirrel"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Post struct {
	ID          uuid.UUID `db:"id" json:"id"`
	Description string    `db:"description" json:"description"`
	File        *string   `db:"file" json:"file"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

type PostDB struct {
	db *sqlx.DB
}

func ValidatePost(v *validator.Validator, post *Post, fields ...string) {
	// Check if at least one of the fields is provided
	if post.File != nil && post.Description == "" {
		return
	}
	if post.Description == "" && post.File == nil {
		v.Check(post.Description != "", "description", "يجب اضافة وصف او ملف للمنشور")
		v.Check(post.File != nil, "file", "يجب اضافة وصف او ملف في المنشور")
		return
	}

	// If description is provided, validate its length
	if post.Description != "" {
		v.Check(post.Description != "", "description", "يجب اضافة وصف او ملف للمنشور")
		v.Check(len(post.Description) >= 20, "description", "يجب ان يكون وصف المنشور على الاقل من 20 حرفاً")
		v.Check(len(post.Description) <= 4000, "description", "يجب ان يكون وصف المنشور على الاكثر 4000 حرفا")
	}
}
func (p *PostDB) InsertPost(post *Post) error {
	query, args, err := QB.Insert("post").
		Columns("description", "file").
		Values(post.Description, post.File).
		Suffix("RETURNING id, created_at, updated_at").
		ToSql()
	if err != nil {
		return err
	}

	err = p.db.QueryRowx(query, args...).StructScan(post)
	if err != nil {
		return fmt.Errorf("error while inserting post: %v", err)
	}
	return nil
}

func (p *PostDB) GetPost(postID uuid.UUID) (*Post, error) {
	var post Post
	query, args, err := QB.Select(post_column...).
		From("post").Where(squirrel.Eq{"id": postID}).ToSql()
	if err != nil {
		return nil, err
	}

	err = p.db.Get(&post, query, args...)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRecordNotFound
		}
		return nil, err
	}

	return &post, nil
}

func (p *PostDB) UpdatePost(post *Post) error {
	query, args, err := QB.Update("post").
		SetMap(map[string]interface{}{
			"description": post.Description,
			"file":        post.File,
			"updated_at":  time.Now(),
		}).
		Where(squirrel.Eq{"id": post.ID}).
		ToSql()
	if err != nil {
		return err
	}

	_, err = p.db.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("error while updating post: %v", err)
	}

	return nil
}

func (p *PostDB) DeletePost(postID uuid.UUID) error {
	post, err := p.GetPost(postID)
	if err != nil {
		return err
	}

	query, args, err := QB.Delete("post").Where(squirrel.Eq{"id": postID}).ToSql()
	if err != nil {
		return err
	}

	_, err = p.db.Exec(query, args...)
	if err != nil {
		return err
	}

	if post.File != nil {
		filePath := strings.TrimPrefix(*post.File, Domain+"/")
		if _, err := os.Stat(filePath); err == nil {
			err = utils.DeleteFile(filePath)
			if err != nil {
				return fmt.Errorf("failed to delete file %s: %w", filePath, err)
			}
		} else if !os.IsNotExist(err) {
			return fmt.Errorf("error checking file %s: %w", filePath, err)
		}
	}

	return nil
}

func (p *PostDB) ListPosts(queryParams url.Values) ([]Post, *utils.Meta, error) {
	var posts []Post
	searchCols := []string{"description"}
	table := "post"

	meta, err := utils.BuildQuery(&posts, table, nil, post_column, searchCols, queryParams, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("error building query: %v", err)
	}

	return posts, meta, nil
}
