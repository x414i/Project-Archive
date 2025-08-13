package data

import (
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"project/utils"
	"project/utils/validator"
	"time"

	"github.com/Masterminds/squirrel"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type BookDB struct {
	db *sqlx.DB
}

type Book struct {
	ID          uuid.UUID `db:"id" json:"id"`
	Name        string    `db:"name" json:"name"`
	Description *string   `db:"description" json:"description,omitempty"`
	File        *string   `db:"file" json:"file,omitempty"`
	Year        int       `db:"year" json:"year"`
	Season      string    `db:"season" json:"season"`
	Degree      *int      `db:"degree" json:"degree,omitempty"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

func ValidateBook(v *validator.Validator, book *Book,
	studentIDs, advisorIDs, discussantIDs []uuid.UUID, isUpdate bool) {
	v.Check(book.Name != "", "name", "اسم المشروع مطلوب")

	v.Check(len(book.Name) >= 3, "name", "يجب أن يكون اسم المشروع على الأقل 3 أحرف")
	v.Check(len(book.Name) <= 600, "name", "يجب أن يكون اسم المشروع أقل من 600 حرف")

	v.Check(len(*book.Description) >= 60, "description", "يجب أن يكون وصف المشروع على الأقل 60 أحرف")
	v.Check(len(*book.Description) <= 3000, "description", "لا يمكن لوصف المشروع أن يكون أكثر من 300 حرف")

	v.Check(book.Year > 0, "year", "السنة مطلوبة")
	v.Check(book.Season != "", "season", "الموسم مطلوب")
	v.Check(book.Season == "spring" || book.Season == "fall", "season", "يجب اختيار موسم ربيع أو خريف")

	v.Check(len(studentIDs) > 0, "students", "يجب إضافة طالب واحد على الأقل")
	v.Check(len(studentIDs) <= 5, "students", "لا يمكن إضافة أكثر من 5 طلاب")

	v.Check(len(advisorIDs) > 0, "advisors", "يجب إضافة مشرف واحد على الأقل")
	v.Check(len(advisorIDs) <= 3, "advisors", "لا يمكن إضافة أكثر من 3 مشرفين")
	v.Check(len(discussantIDs) > 0, "discutant", "يجب إضافة مناقش واحد على الأقل")
	v.Check(len(discussantIDs) <= 3, "discutant", "لا يمكن إضافة أكثر من 3 مناقشين")

	// if !isUpdate || (len(studentIDs) > 0 || len(advisorIDs) > 0 || len(discussantIDs) > 0) {
	// 	if len(studentIDs) > 0 {
	// 		v.Check(len(studentIDs) > 0, "students", "At least one student is required")
	// 	}

	// }
}

type BookWithDetails struct {
	Book
	Discussants []UserDetails `json:"discutants"`
	Advisors    []UserDetails `json:"advisors"`
	Students    []UserDetails `json:"students"`
}

type UserDetails struct {
	ID    uuid.UUID `json:"id"`
	Name  string    `json:"name"`
	Email string    `json:"email"`
}

func (b *BookDB) InsertBook(book *Book, discussantIDs, advisorIDs, studentIDs []uuid.UUID) error {
	tx, err := b.db.Beginx()
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()
	if book.ID == uuid.Nil {
		book.ID, err = uuid.NewUUID()
		if err != nil {
			return err
		}
	}

	query, args, err := QB.Insert("book").
		Columns("id,name, description, file, year, season", "degree").
		Values(
			book.ID,
			book.Name,
			book.Description,
			book.File,
			book.Year,
			book.Season,
			book.Degree,
		).
		Suffix("RETURNING id, created_at, updated_at").
		ToSql()
	if err != nil {
		return fmt.Errorf("failed to build query: %w", err)
	}

	err = tx.QueryRowx(query, args...).StructScan(book)
	if err != nil {
		return fmt.Errorf("failed to insert book: %w", err)
	}

	for _, discussantID := range discussantIDs {
		_, err := QB.Insert("book_discussants").
			Columns("book_id, discussant_id").
			Values(book.ID, discussantID).
			RunWith(tx).
			Exec()
		if err != nil {
			return fmt.Errorf("failed to insert discussant: %w", err)
		}
	}
	for _, advisorID := range advisorIDs {
		_, err := QB.Insert("book_advisors").
			Columns("book_id, advisor_id").
			Values(book.ID, advisorID).
			RunWith(tx).
			Exec()
		if err != nil {
			return fmt.Errorf("failed to insert advisor: %w", err)
		}
	}
	for _, studentID := range studentIDs {
		_, err := QB.Insert("book_students").
			Columns("book_id, student_id").
			Values(book.ID, studentID).
			RunWith(tx).
			Exec()
		if err != nil {
			return fmt.Errorf("failed to insert student: %w", err)
		}
	}

	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func (b *BookDB) GetBookWithDetails(bookID uuid.UUID) (*BookWithDetails, error) {
	if bookID == uuid.Nil {
		return nil, fmt.Errorf("invalid book ID")
	}

	query, args, err := QB.Select(
		"b.id",
		"b.name",
		"b.description",
		fmt.Sprintf("CASE WHEN NULLIF(b.file, '') IS NOT NULL THEN FORMAT('%s/%%s', b.file) ELSE NULL END AS file", Domain),
		"b.year",
		"b.season",
		"b.created_at",
		"COALESCE(b.degree, NULL) AS degree",
		"b.updated_at",
		"discussant.id AS discussant_id",
		"COALESCE(discussant.name, '') AS discussant_name",
		"COALESCE(discussant.email, '') AS discussant_email",
		"advisor.id AS advisor_id",
		"COALESCE(advisor.name, '') AS advisor_name",
		"COALESCE(advisor.email, '') AS advisor_email",
		"student.id AS student_id",
		"COALESCE(student.name, '') AS student_name",
		"COALESCE(student.email, '') AS student_email",
	).
		From("book b").
		LeftJoin("book_discussants bd ON bd.book_id = b.id").
		LeftJoin("users discussant ON discussant.id = bd.discussant_id").
		LeftJoin("book_advisors ba ON ba.book_id = b.id").
		LeftJoin("users advisor ON advisor.id = ba.advisor_id").
		LeftJoin("book_students bs ON bs.book_id = b.id").
		LeftJoin("users student ON student.id = bs.student_id").
		Where("b.id = ?", bookID).
		ToSql()

	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	// Execute query
	rows, err := b.db.Queryx(query, args...)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("book not found")
		}
		return nil, fmt.Errorf("failed to query book: %w", err)
	}
	defer rows.Close()

	result := &BookWithDetails{
		Discussants: []UserDetails{},
		Advisors:    []UserDetails{},
		Students:    []UserDetails{},
	}
	discussantSet := make(map[uuid.UUID]bool)
	advisorSet := make(map[uuid.UUID]bool)
	studentSet := make(map[uuid.UUID]bool)

	// Scan rows
	for rows.Next() {
		var row struct {
			Book
			DiscussantID    uuid.UUID `db:"discussant_id"`
			DiscussantName  string    `db:"discussant_name"`
			DiscussantEmail string    `db:"discussant_email"`
			AdvisorID       uuid.UUID `db:"advisor_id"`
			AdvisorName     string    `db:"advisor_name"`
			AdvisorEmail    string    `db:"advisor_email"`
			StudentID       uuid.UUID `db:"student_id"`
			StudentName     string    `db:"student_name"`
			StudentEmail    string    `db:"student_email"`
		}

		if err := rows.StructScan(&row); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		if result.Book.ID == uuid.Nil {
			result.Book = row.Book
		}

		if row.DiscussantID != uuid.Nil && !discussantSet[row.DiscussantID] {
			result.Discussants = append(result.Discussants, UserDetails{
				ID:    row.DiscussantID,
				Name:  row.DiscussantName,
				Email: row.DiscussantEmail,
			})
			discussantSet[row.DiscussantID] = true
		}

		if row.AdvisorID != uuid.Nil && !advisorSet[row.AdvisorID] {
			result.Advisors = append(result.Advisors, UserDetails{
				ID:    row.AdvisorID,
				Name:  row.AdvisorName,
				Email: row.AdvisorEmail,
			})
			advisorSet[row.AdvisorID] = true
		}

		if row.StudentID != uuid.Nil && !studentSet[row.StudentID] {
			result.Students = append(result.Students, UserDetails{
				ID:    row.StudentID,
				Name:  row.StudentName,
				Email: row.StudentEmail,
			})
			studentSet[row.StudentID] = true
		}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error processing rows: %w", err)
	}

	if result.Book.ID == uuid.Nil {
		return nil, fmt.Errorf("book not found")
	}

	return result, nil
}
func (b *BookDB) UpdateBook(book *Book, discussantIDs, advisorIDs, studentIDs []uuid.UUID) error {
	tx, err := b.db.Beginx()
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	updateQuery, updateArgs, err := QB.Update("book").
		Set("name", book.Name).
		Set("description", book.Description).
		Set("file", book.File).
		Set("year", book.Year).
		Set("degree", book.Degree).
		Set("season", book.Season).
		Set("updated_at", time.Now()).
		Where(squirrel.Eq{"id": book.ID}).
		ToSql()
	if err != nil {
		return fmt.Errorf("failed to build update query: %w", err)
	}

	result, err := tx.Exec(updateQuery, updateArgs...)
	if err != nil {
		return fmt.Errorf("failed to update book: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no book found to update")
	}

	_, err = tx.Exec("DELETE FROM book_discussants WHERE book_id = $1", book.ID)
	if err != nil {
		return fmt.Errorf("failed to remove existing discussants: %w", err)
	}

	for _, discussantID := range discussantIDs {
		_, err := tx.Exec("INSERT INTO book_discussants (book_id, discussant_id) VALUES ($1, $2)", book.ID, discussantID)
		if err != nil {
			return fmt.Errorf("failed to insert discussant %s: %w", discussantID, err)
		}
	}
	_, err = tx.Exec("DELETE FROM book_advisors WHERE book_id = $1", book.ID)
	if err != nil {
		return fmt.Errorf("failed to remove existing advisors: %w", err)
	}

	for _, advisorID := range advisorIDs {
		_, err := tx.Exec("INSERT INTO book_advisors (book_id, advisor_id) VALUES ($1, $2)", book.ID, advisorID)
		if err != nil {
			return fmt.Errorf("failed to insert advisor %s: %w", advisorID, err)
		}
	}
	_, err = tx.Exec("DELETE FROM book_students WHERE book_id = $1", book.ID)
	if err != nil {
		return fmt.Errorf("failed to remove existing students: %w", err)
	}

	for _, studentID := range studentIDs {
		_, err := tx.Exec("INSERT INTO book_students (book_id, student_id) VALUES ($1, $2)", book.ID, studentID)
		if err != nil {
			return fmt.Errorf("failed to insert student %s: %w", studentID, err)
		}
	}

	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func (b *BookDB) DeleteBook(bookID uuid.UUID) error {
	_, err := b.db.Exec("DELETE FROM book WHERE id = $1", bookID)
	if err != nil {
		return fmt.Errorf("failed to delete book: %w", err)
	}
	return nil
}
func (b *BookDB) DeleteDiscussantFromBook(bookID uuid.UUID, discussantID uuid.UUID) error {
	tx, err := b.db.Beginx()
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer func() {
		if err != nil {
			tx.Rollback()
			return
		}
		err = tx.Commit()
	}()

	_, err = tx.Exec("DELETE FROM book_discussants WHERE book_id = $1 AND discussant_id = $2", bookID, discussantID)
	if err != nil {
		return fmt.Errorf("failed to delete discussant %s from book %s: %w", discussantID, bookID, err)
	}

	return nil
}

func (b *BookDB) DeleteAdvisorFromBook(bookID uuid.UUID, advisorID uuid.UUID) error {
	tx, err := b.db.Beginx()
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer func() {
		if err != nil {
			tx.Rollback()
			return
		}
		err = tx.Commit()
	}()

	_, err = tx.Exec("DELETE FROM book_advisors WHERE book_id = $1 AND advisor_id = $2", bookID, advisorID)
	if err != nil {
		return fmt.Errorf("failed to delete advisor %s from book %s: %w", advisorID, bookID, err)
	}

	return nil
}

func (b *BookDB) DeleteStudentFromBook(bookID uuid.UUID, studentID uuid.UUID) error {
	tx, err := b.db.Beginx()
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer func() {
		if err != nil {
			tx.Rollback()
			return
		}
		err = tx.Commit()
	}()

	_, err = tx.Exec("DELETE FROM book_students WHERE book_id = $1 AND student_id = $2", bookID, studentID)
	if err != nil {
		return fmt.Errorf("failed to delete student %s from book %s: %w", studentID, bookID, err)
	}

	return nil
}

// Modify the Book struct to include individual fields for students, advisors, discussants
type BookJoin struct {
	ID          uuid.UUID `db:"id"`
	Name        string    `db:"name"`
	Description *string   `db:"description"`
	File        *string   `db:"file"`
	Year        int       `db:"year"`
	Season      string    `db:"season"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`

	// Student fields
	StudentID    uuid.UUID `db:"student_id"`
	StudentName  string    `db:"student_name"`
	StudentEmail string    `db:"student_email"`

	// Advisor fields
	AdvisorID    uuid.UUID `db:"advisor_id"`
	AdvisorName  string    `db:"advisor_name"`
	AdvisorEmail string    `db:"advisor_email"`

	// Discussant fields
	DiscussantID    uuid.UUID `db:"discussant_id"`
	DiscussantName  string    `db:"discussant_name"`
	DiscussantEmail string    `db:"discussant_email"`
}

func (b *BookDB) ListBooks(queryParams url.Values) ([]Book, *utils.Meta, error) {
	var books []Book
	searchCols := []string{"b.name", "b.description"}
	table := "book b"

	// Define columns to include in the result
	bookJoinColumns := []string{
		"b.id",
		"b.name",
		"COALESCE(b.description, '') AS description",
		"COALESCE(b.degree, NULL) AS degree",
	}

	meta, err := utils.BuildQuery(&books, table, nil, bookJoinColumns, searchCols, queryParams, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("error building query: %v", err)
	}

	return books, meta, nil
}
func (b *BookDB) GetBook(bookID uuid.UUID) (*BookWithDetails, error) {
	query, args, err := QB.Select(
		"b.id", "b.name", "b.description",
		fmt.Sprintf("CASE WHEN NULLIF(b.file, '') IS NOT NULL THEN FORMAT('%s/%%s', b.file) ELSE NULL END AS file", Domain),
		"b.year", "b.season", "b.created_at", "b.updated_at",
		"COALESCE(discussant.id, '00000000-0000-0000-0000-000000000000') AS discussant_id",
		"COALESCE(discussant.name, '') AS discussant_name",
		"COALESCE(discussant.email, '') AS discussant_email",
		"COALESCE(advisor.id, '00000000-0000-0000-0000-000000000000') AS advisor_id",
		"COALESCE(advisor.name, '') AS advisor_name",
		"COALESCE(advisor.email, '') AS advisor_email",
		"COALESCE(student.id, '00000000-0000-0000-0000-000000000000') AS student_id",
		"COALESCE(student.name, '') AS student_name",
		"COALESCE(student.email, '') AS student_email",
	).
		From("book b").
		LeftJoin("book_discussants bd ON bd.book_id = b.id").
		LeftJoin("users discussant ON discussant.id = bd.discussant_id").
		LeftJoin("book_advisors ba ON ba.book_id = b.id").
		LeftJoin("users advisor ON advisor.id = ba.advisor_id").
		LeftJoin("book_students bs ON bs.book_id = b.id").
		LeftJoin("users student ON student.id = bs.student_id").
		Where("b.id = ?", bookID).
		ToSql()

	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	rows, err := b.db.Queryx(query, args...)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRecordNotFound
		}
		return nil, fmt.Errorf("failed to query book: %w", err)
	}
	defer rows.Close()

	result := &BookWithDetails{
		Discussants: []UserDetails{},
		Advisors:    []UserDetails{},
		Students:    []UserDetails{},
	}

	bookPopulated := false
	discussantSet := map[uuid.UUID]bool{}
	advisorSet := map[uuid.UUID]bool{}
	studentSet := map[uuid.UUID]bool{}

	for rows.Next() {
		var row struct {
			Book
			DiscussantID    uuid.UUID `db:"discussant_id"`
			DiscussantName  string    `db:"discussant_name"`
			DiscussantEmail string    `db:"discussant_email"`
			AdvisorID       uuid.UUID `db:"advisor_id"`
			AdvisorName     string    `db:"advisor_name"`
			AdvisorEmail    string    `db:"advisor_email"`
			StudentID       uuid.UUID `db:"student_id"`
			StudentName     string    `db:"student_name"`
			StudentEmail    string    `db:"student_email"`
		}

		if err := rows.StructScan(&row); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		// Populate Book details
		if !bookPopulated {
			result.Book = row.Book
			bookPopulated = true
		}

		// Populate discussant details
		if row.DiscussantID != uuid.Nil && !discussantSet[row.DiscussantID] {
			result.Discussants = append(result.Discussants, UserDetails{
				ID:    row.DiscussantID,
				Name:  row.DiscussantName,
				Email: row.DiscussantEmail,
			})
			discussantSet[row.DiscussantID] = true
		}

		// Populate advisor details
		if row.AdvisorID != uuid.Nil && !advisorSet[row.AdvisorID] {
			result.Advisors = append(result.Advisors, UserDetails{
				ID:    row.AdvisorID,
				Name:  row.AdvisorName,
				Email: row.AdvisorEmail,
			})
			advisorSet[row.AdvisorID] = true
		}

		// Populate student details
		if row.StudentID != uuid.Nil && !studentSet[row.StudentID] {
			result.Students = append(result.Students, UserDetails{
				ID:    row.StudentID,
				Name:  row.StudentName,
				Email: row.StudentEmail,
			})
			studentSet[row.StudentID] = true
		}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error processing rows: %w", err)
	}

	if !bookPopulated {
		return nil, ErrRecordNotFound
	}

	return result, nil
}
func (p *PreProjectDB) CountBooks() (int, error) {
	query, args, err := QB.Select("COUNT(*)").From("book").ToSql()
	if err != nil {
		return 0, fmt.Errorf("failed to build count query: %w", err)
	}

	var count int
	err = p.db.Get(&count, query, args...)
	if err != nil {
		return 0, fmt.Errorf("failed to execute count query: %w", err)
	}

	return count, nil
}
