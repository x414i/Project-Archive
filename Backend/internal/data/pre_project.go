package data

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/url"
	"project/utils"
	"project/utils/validator"
	"time"

	"github.com/Masterminds/squirrel"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

type PreProjectDB struct {
	db *sqlx.DB
}
type PreProject struct {
	ID              uuid.UUID  `db:"id" json:"id"`
	Name            string     `db:"name" json:"name"`
	Description     *string    `db:"description" json:"description,omitempty"`
	File            *string    `db:"file" json:"file,omitempty"`
	FileDescription *string    `db:"file_description" json:"file_description"`
	ProjectOwner    uuid.UUID  `db:"project_owner" json:"project_owner"`
	AcceptedAdvisor *uuid.UUID `db:"accepted_advisor" json:"accepted_advisor"`
	Year            int        `db:"year" json:"year"`
	Season          string     `db:"season" json:"season"`
	CanUpdate       bool       `db:"can_update" json:"can_update"`
	Degree          *int       `db:"degree" json:"degree,omitempty"`
	CreatedAt       time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time  `db:"updated_at" json:"updated_at"`
}

func ValidatePreProject(v *validator.Validator, preProject *PreProject, students, advisors []uuid.UUID) {
	v.Check(preProject.Name != "", "name", "اسم المشروع مطلوب")
	v.Check(len(preProject.Name) >= 3, "name", "يجب أن يكون اسم المشروع على الأقل 3 أحرف")
	v.Check(len(preProject.Name) <= 600, "name", "يجب أن يكون اسم المشروع أقل من 600 حرف")

	v.Check(*preProject.Description != "", "name", "اسم المشروع مطلوب")

	v.Check(len(*preProject.Description) >= 60, "description", "يجب أن يكون وصف المشروع على الأقل 10 أحرف")
	v.Check(len(*preProject.Description) <= 3000, "description", "لا يمكن لوصف المشروع أن يكون أكثر من 3000 حرف")
	v.Check(preProject.Season != "", "season", "الموسم مطلوب")
	v.Check(preProject.Season == "spring" || preProject.Season == "fall", "season", "يجب اختيار موسم ربيع أو خريف")
	v.Check(preProject.Year >= time.Now().Year(), "year", "يجب ان تكون سنة المشروع اما السنة الحاليه او قادمة")
	v.Check(preProject.ProjectOwner != uuid.Nil, "project_owner", "مالك المشروع مطلوب")

	if preProject.File != nil {
		v.Check(len(*preProject.File) > 0, "file", "مسار الملف غير صالح")

	}
	v.Check(len(students) > 0, "students", "يجب إضافة طالب واحد على الأقل")
	v.Check(len(students) <= 3, "students", "لا يمكن إضافة أكثر من 3 طلاب")

	v.Check(len(advisors) > 0, "advisors", "يجب إضافة مشرف واحد على الأقل")
	v.Check(len(advisors) <= 3, "advisors", "لا يمكن إضافة أكثر من 3 مشرفين")
}

type UUIDArray []uuid.UUID

func (u *UUIDArray) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("unexpected type for UUIDArray: %T", value)
	}

	var stringArray []string
	err := pq.Array(&stringArray).Scan(bytes)
	if err != nil {
		return fmt.Errorf("error parsing UUIDArray: %w", err)
	}

	uuids := make([]uuid.UUID, len(stringArray))
	for i, s := range stringArray {
		uuids[i], err = uuid.Parse(s)
		if err != nil {
			return fmt.Errorf("error parsing UUID string: %w", err)
		}
	}

	*u = uuids
	return nil
}

func (p *PreProjectDB) InsertPreProject(preProject *PreProject, studentIDs []uuid.UUID, advisorIDs []uuid.UUID) error {
	// Start a transaction
	tx, err := p.db.Beginx()
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()
	query, args, err := QB.Insert("pre_project").
		Columns("name, description, file, file_description, project_owner, year, season, can_update").
		Values(
			preProject.Name,
			preProject.Description,
			preProject.File,
			preProject.FileDescription,
			preProject.ProjectOwner,
			preProject.Year,
			preProject.Season,
			true,
		).
		Suffix("RETURNING id, created_at, updated_at").
		ToSql()
	if err != nil {
		return fmt.Errorf("failed to build query: %w", err)
	}

	err = tx.QueryRowx(query, args...).StructScan(preProject)
	if err != nil {
		return fmt.Errorf("failed to insert pre-project: %w", err)
	}

	for _, studentID := range studentIDs {
		_, err := QB.Insert("pre_project_students").
			Columns("pre_project_id, student_id").
			Values(preProject.ID, studentID).
			RunWith(tx).
			Exec()
		if err != nil {
			return fmt.Errorf("failed to insert student association: %w", err)
		}
	}

	for _, advisorID := range advisorIDs {
		_, err := QB.Insert("advisor_responses").
			Columns("pre_project_id, advisor_id, status").
			Values(preProject.ID, advisorID, "pending").
			RunWith(tx).
			Exec()
		if err != nil {
			return fmt.Errorf("failed to insert advisor response: %w", err)
		}
	}

	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

type PreProjectWithAdvisorDetails struct {
	PreProject          PreProject               `json:"pre_project"`
	Advisors            []AdvisorResponseDetails `json:"advisors"`
	Students            []StudentDetails         `json:"students"`
	Discussants         []DiscussantDetails      `json:"discussants"` // Add this line
	AcceptedAdvisorInfo *AdvisorInfo             `json:"accepted_advisor_info,omitempty"`
}

type AdvisorInfo struct {
	ID    uuid.UUID `json:"id"`
	Name  string    `json:"name"`
	Email string    `json:"email"`
}
type StudentDetails struct {
	StudentID    uuid.UUID `db:"student_id" json:"student_id"` // Add this field
	StudentName  string    `db:"student_name" json:"student_name"`
	StudentEmail string    `db:"student_email" json:"student_email"`
}
type DiscussantDetails struct {
	DiscussantID    uuid.UUID `db:"discussant_id" json:"discussant_id"`
	DiscussantName  string    `db:"discussant_name" json:"discussant_name"`
	DiscussantEmail string    `db:"discussant_email" json:"discussant_email"`
}
type AdvisorResponseDetails struct {
	AdvisorID    uuid.UUID `db:"advisor_id" json:"advisor_id"`
	AdvisorName  string    `db:"advisor_name" json:"advisor_name"`
	AdvisorEmail string    `db:"advisor_email" json:"advisor_email"`
	Status       string    `db:"status" json:"status"`
}

func (p *PreProjectDB) GetPreProjectWithAdvisorDetails(preProjectID uuid.UUID) (*PreProjectWithAdvisorDetails, error) {
	query, args, err := QB.Select(
		preProjectJoinColumns...,
	).
		From("pre_project pp").
		LeftJoin("advisor_responses ar ON ar.pre_project_id = pp.id").
		LeftJoin("users u ON u.id = ar.advisor_id").
		LeftJoin("pre_project_students pps ON pps.pre_project_id = pp.id").
		LeftJoin("users student ON student.id = pps.student_id").
		LeftJoin("users accepted_advisor_user ON accepted_advisor_user.id = pp.accepted_advisor").
		LeftJoin("pre_project_discussants ppd ON ppd.pre_project_id = pp.id").
		LeftJoin("users discussant ON discussant.id = ppd.discussant_id").
		Where("pp.id = ?", preProjectID).
		ToSql()

	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	// Execute the query
	rows, err := p.db.Queryx(query, args...)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRecordNotFound
		}
		return nil, fmt.Errorf("failed to query pre-project: %w", err)
	}
	defer rows.Close()

	result := &PreProjectWithAdvisorDetails{
		Advisors: []AdvisorResponseDetails{},
		Students: []StudentDetails{},
	}

	preProjectPopulated := false
	studentSet := map[uuid.UUID]bool{}
	discussantSet := map[uuid.UUID]bool{}
	advisorSet := map[uuid.UUID]bool{}

	for rows.Next() {
		var row struct {
			PreProject
			AdvisorID            uuid.UUID `db:"advisor_id"`
			AdvisorName          string    `db:"advisor_name"`
			AdvisorEmail         string    `db:"advisor_email"`
			ResponseStatus       string    `db:"response_status"`
			ResponseCreatedAt    time.Time `db:"response_created_at"`
			ResponseUpdatedAt    time.Time `db:"response_updated_at"`
			StudentID            uuid.UUID `db:"student_id"`
			StudentName          string    `db:"student_name"`
			StudentEmail         string    `db:"student_email"`
			AcceptedAdvisorID    uuid.UUID `db:"accepted_advisor_id"`
			AcceptedAdvisorName  string    `db:"accepted_advisor_name"`
			AcceptedAdvisorEmail string    `db:"accepted_advisor_email"`
			DiscussantID         uuid.UUID `db:"discussant_id"`
			DiscussantName       string    `db:"discussant_name"`
			DiscussantEmail      string    `db:"discussant_email"`
		}

		if err := rows.StructScan(&row); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		// Populate PreProject details
		if !preProjectPopulated {
			result.PreProject = row.PreProject
			preProjectPopulated = true
		}

		// Populate advisor details, avoiding duplicates
		if row.AdvisorID != uuid.Nil && !advisorSet[row.AdvisorID] {
			result.Advisors = append(result.Advisors, AdvisorResponseDetails{
				AdvisorID:    row.AdvisorID,
				AdvisorName:  row.AdvisorName,
				AdvisorEmail: row.AdvisorEmail,
				Status:       row.ResponseStatus,
			})
			advisorSet[row.AdvisorID] = true // Mark this advisor as added
		}
		// Add accepted advisor info if exists
		if row.AcceptedAdvisorID != uuid.Nil {
			result.AcceptedAdvisorInfo = &AdvisorInfo{
				ID:    row.AcceptedAdvisorID,
				Name:  row.AcceptedAdvisorName,
				Email: row.AcceptedAdvisorEmail,
			}
		}
		if row.StudentID != uuid.Nil && !studentSet[row.StudentID] {
			result.Students = append(result.Students, StudentDetails{
				StudentID:    row.StudentID,
				StudentName:  row.StudentName,
				StudentEmail: row.StudentEmail,
			})
			studentSet[row.StudentID] = true
		}
		if row.DiscussantID != uuid.Nil && !discussantSet[row.DiscussantID] {
			result.Discussants = append(result.Discussants, DiscussantDetails{
				DiscussantID:    row.DiscussantID,
				DiscussantName:  row.DiscussantName,
				DiscussantEmail: row.DiscussantEmail,
			})
			discussantSet[row.DiscussantID] = true // Mark this discussant as added
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error processing rows: %w", err)
	}
	if !preProjectPopulated {
		return nil, ErrRecordNotFound
	}

	return result, nil
}

type PreProjectWithStudentAdvisorDetails struct {
	ID              string  `db:"id"`
	Name            string  `db:"name"`
	Description     string  `db:"description"`
	File            *string `db:"file"`
	FileDescription *string `db:"file_description"`

	ProjectOwner      string    `db:"project_owner"`
	AcceptedAdvisor   *string   `db:"accepted_advisor"`
	Year              int       `db:"year"`
	Season            string    `db:"season"`
	CreatedAt         time.Time `db:"created_at"`
	UpdatedAt         time.Time `db:"updated_at"`
	AdvisorID         *string   `db:"advisor_id"`
	AdvisorName       *string   `db:"advisor_name"`
	AdvisorEmail      *string   `db:"advisor_email"`
	StudentID         *string   `db:"student_id"`
	StudentName       string    `db:"student_name"`
	StudentEmail      string    `db:"student_email"`
	ResponseStatus    string    `db:"response_status"`
	ResponseCreatedAt time.Time `db:"response_created_at"`
	ResponseUpdatedAt time.Time `db:"response_updated_at"`
}

func (p *PreProjectDB) ListPreProjects(queryParams url.Values) ([]PreProjectWithAdvisorDetails, *utils.Meta, error) {
	var preProjects []PreProject
	searchCols := []string{"b.name", "b.description"}
	table := "pre_project b"

	// Define columns to include in the result
	bookJoinColumns := []string{
		"b.id",
		"b.name",
		"COALESCE(b.description, '') AS description",
	}

	meta, err := utils.BuildQuery(&preProjects, table, nil, bookJoinColumns, searchCols, queryParams, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("error building query: %v", err)
	}
	result := make([]PreProjectWithAdvisorDetails, len(preProjects))
	for i, pp := range preProjects {
		advisors, err := p.getAdvisorsForPreProject(pp.ID)
		if err != nil {
			return nil, nil, fmt.Errorf("error fetching advisors: %v", err)
		}
		students, err := p.getStudentsForPreProject(pp.ID)
		if err != nil {
			return nil, nil, fmt.Errorf("error fetching students: %v", err)
		}
		discussants, err := p.getDiscussantsForPreProject(pp.ID)
		if err != nil {
			return nil, nil, fmt.Errorf("error fetching discussants: %v", err)
		}

		result[i] = PreProjectWithAdvisorDetails{
			PreProject:  pp,
			Advisors:    advisors,
			Students:    students,
			Discussants: discussants,
		}
	}

	return result, meta, nil
}
func (p *PreProjectDB) ListAssociatedPreProjects(userID uuid.UUID) ([]PreProject, error) {

	var preProjects []PreProject

	queryBuilder := QB.
		Select(
			"pp.id",
			"pp.name",
			"pp.description",
			"pp.project_owner",
			"pp.accepted_advisor",
		).
		From("pre_project pp").
		LeftJoin("advisor_responses ar ON ar.pre_project_id = pp.id").
		LeftJoin("pre_project_students s ON s.pre_project_id = pp.id").
		LeftJoin("pre_project_discussants d ON d.pre_project_id = pp.id").
		Where(squirrel.Or{
			squirrel.Eq{"pp.project_owner": userID},
			squirrel.Eq{"pp.accepted_advisor": userID},
			squirrel.Eq{"ar.advisor_id": userID},
			squirrel.Eq{"s.student_id": userID},
			squirrel.Eq{"d.discussant_id": userID},
		}).
		Distinct()

	// Generate SQL query and arguments
	query, args, err := queryBuilder.ToSql()
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	// Debugging: log the query and arguments

	// Execute the query
	err = p.db.Select(&preProjects, query, args...)
	if err != nil {
		return nil, fmt.Errorf("error executing query: %w", err)
	}

	// Debugging: log the number of pre-projects fetched

	return preProjects, nil
}
func (p *PreProjectDB) getAdvisorsForPreProject(id uuid.UUID) ([]AdvisorResponseDetails, error) {
	query, args, err := QB.Select(
		"ar.advisor_id",
		"u.name AS advisor_name",
		"u.email AS advisor_email",
		"ar.status",
	).
		From("advisor_responses ar").
		LeftJoin("users u ON ar.advisor_id = u.id").
		Where(squirrel.Eq{"ar.pre_project_id": id}).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	var advisors []AdvisorResponseDetails
	if err := p.db.Select(&advisors, query, args...); err != nil {
		return nil, fmt.Errorf("failed to execute advisor query: %w", err)
	}
	return advisors, nil
}

func (p *PreProjectDB) getStudentsForPreProject(id uuid.UUID) ([]StudentDetails, error) {
	query, args, err := QB.Select(
		"pps.student_id",
		"u.name AS student_name",
		"u.email AS student_email",
	).
		From("pre_project_students pps").
		Join("users u ON pps.student_id = u.id").
		Where(squirrel.Eq{"pps.pre_project_id": id}).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	var students []StudentDetails
	err = p.db.Select(&students, query, args...)
	return students, err
}

func (p *PreProjectDB) getDiscussantsForPreProject(id uuid.UUID) ([]DiscussantDetails, error) {
	query, args, err := QB.Select(
		"ppd.discussant_id",
		"u.name AS discussant_name",
		"u.email AS discussant_email",
	).
		From("pre_project_discussants ppd").
		Join("users u ON ppd.discussant_id = u.id").
		Where(squirrel.Eq{"ppd.pre_project_id": id}).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	var discussants []DiscussantDetails
	err = p.db.Select(&discussants, query, args...)
	return discussants, err
}

type AdvisorResponse struct {
	ID           uuid.UUID `db:"id" json:"id"`
	PreProjectID uuid.UUID `db:"pre_project_id" json:"pre_project_id"`
	AdvisorID    uuid.UUID `db:"advisor_id" json:"advisor_id"`
	Status       string    `db:"status" json:"status"` // "pending", "accepted", "rejected"

}

func (p *PreProjectDB) DeletePreProject(preProjectID, studentID uuid.UUID) error {
	tx, err := p.db.Beginx()
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
	lockQuery, lockArgs, err := QB.Select("*").
		From("pre_project").
		Where(squirrel.Eq{"id": preProjectID}).
		ToSql()
	if err != nil {
		return fmt.Errorf("failed to build lock query: %w", err)
	}

	_, err = tx.Exec(lockQuery+" FOR UPDATE", lockArgs...)
	if err != nil {
		return fmt.Errorf("failed to lock pre-project: %w", err)
	}
	existenceQuery, existenceArgs, err := QB.Select("COUNT(*) > 0").
		From("pre_project").
		Where(squirrel.Eq{"id": preProjectID}).
		ToSql()
	if err != nil {
		return fmt.Errorf("failed to build existence check query: %w", err)
	}

	var preProjectExists bool
	err = p.db.Get(&preProjectExists, existenceQuery, existenceArgs...)
	if err != nil {
		return fmt.Errorf("failed to check pre-project existence: %w", err)
	}

	if !preProjectExists {
		return fmt.Errorf("pre-project not found")
	}

	ownerQuery, ownerArgs, err := QB.Select("COUNT(*) > 0").
		From("pre_project").
		Where(squirrel.And{
			squirrel.Eq{"id": preProjectID},
			squirrel.Eq{"project_owner": studentID},
		}).
		ToSql()
	if err != nil {
		return fmt.Errorf("failed to build owner check query: %w", err)
	}

	var isProjectOwner bool
	err = p.db.Get(&isProjectOwner, ownerQuery, ownerArgs...)
	if err != nil {
		return fmt.Errorf("failed to check project owner: %w", err)
	}

	fileQuery, fileArgs, err := QB.Select("file").
		From("pre_project").
		Where(squirrel.Eq{"id": preProjectID}).
		ToSql()
	if err != nil {
		return fmt.Errorf("failed to build file query: %w", err)
	}

	var existingFile *string
	err = tx.Get(&existingFile, fileQuery, fileArgs...)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("failed to retrieve file information: %w", err)
	}

	deleteQuery, deleteArgs, err := QB.Delete("pre_project").
		Where(squirrel.Eq{"id": preProjectID}).
		ToSql()
	if err != nil {
		return fmt.Errorf("failed to build delete query: %w", err)
	}

	result, err := tx.Exec(deleteQuery, deleteArgs...)
	if err != nil {
		return fmt.Errorf("failed to delete pre-project: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no pre-project found")
	}

	if existingFile != nil && *existingFile != "" {
		if err := utils.DeleteFile(*existingFile); err != nil {
			log.Printf("Failed to delete file %s: %v", *existingFile, err)
		}
	}

	return nil
}

func (p *PreProjectDB) UpdatePreProject(preProject *PreProject, advisorIDs, studentIDs []uuid.UUID, discussantIDs []uuid.UUID) error {
	tx, err := p.db.Beginx()
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
	lockQuery, lockArgs, err := QB.Select("*").
		From("pre_project").
		Where(squirrel.Eq{"id": preProject.ID}).
		ToSql()
	if err != nil {
		return fmt.Errorf("failed to build lock query: %w", err)
	}
	// to prevent datarrace
	_, err = tx.Exec(lockQuery+" FOR UPDATE", lockArgs...)
	if err != nil {
		return fmt.Errorf("failed to lock pre-project: %w", err)
	}
	var fileValue interface{}
	if preProject.File != nil {
		fileValue = *preProject.File
	} else {
		fileValue = nil
	}
	updateQuery, updateArgs, err := QB.Update("pre_project").
		Set("name", preProject.Name).
		Set("description", preProject.Description).
		Set("file_description", preProject.FileDescription).
		Set("file", fileValue).
		Set("year", preProject.Year).
		Set("season", preProject.Season).
		Set("updated_at", time.Now()).
		Set("can_update", preProject.CanUpdate).
		Set("degree", preProject.Degree).
		Where(squirrel.Eq{"id": preProject.ID}).
		ToSql()
	if err != nil {
		return fmt.Errorf("failed to build update query: %w", err)
	}

	result, err := tx.Exec(updateQuery, updateArgs...)
	if err != nil {
		return fmt.Errorf("failed to update pre-project: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no pre-project found to update")
	}

	if len(studentIDs) > 0 {
		// Remove existing students
		_, err = tx.Exec("DELETE FROM pre_project_students WHERE pre_project_id = $1", preProject.ID)
		if err != nil {
			return fmt.Errorf("failed to remove existing students: %w", err)
		}
		// Insert new students
		for _, studentID := range studentIDs {
			_, err := tx.Exec("INSERT INTO pre_project_students (pre_project_id, student_id) VALUES ($1, $2)", preProject.ID, studentID)
			if err != nil {
				return fmt.Errorf("failed to insert student %s: %w", studentID, err)
			}
		}
	}

	if len(discussantIDs) > 0 {
		_, err = tx.Exec("DELETE FROM pre_project_discussants WHERE pre_project_id = $1", preProject.ID)
		if err != nil {
			return fmt.Errorf("failed to remove existing discussants: %w", err)
		}
		for _, discussantID := range discussantIDs {
			_, err := tx.Exec("INSERT INTO pre_project_discussants (pre_project_id, discussant_id) VALUES ($1, $2)", preProject.ID, discussantID)
			if err != nil {
				return fmt.Errorf("failed to insert discussant %s: %w", discussantID, err)
			}
		}
	}
	if len(advisorIDs) > 0 {

		// Remove existing advisors
		_, err = tx.Exec("DELETE FROM advisor_responses WHERE pre_project_id = $1", preProject.ID)
		if err != nil {
			return fmt.Errorf("failed to remove existing advisors: %w", err)
		}
		// Insert new advisors
		for _, advisorID := range advisorIDs {
			_, err := tx.Exec("INSERT INTO advisor_responses (pre_project_id, advisor_id) VALUES ($1, $2)", preProject.ID, advisorID)
			if err != nil {
				return fmt.Errorf("failed to insert advisor %s: %w", advisorID, err)
			}
		}
	}
	return nil
}

func ValidateAdvisorResponse(v *validator.Validator, advisorID uuid.UUID, status string, advisors []uuid.UUID) {
	validStatuses := []string{"pending", "accepted", "rejected"}
	v.Check(validator.In(status, validStatuses...), "status", "Invalid status. Must be 'pending', 'accepted', or 'rejected'")
	v.Check(validator.InUUID(advisorID, advisors), "advisor", "The advisor is not assigned to this pre-project")
}
func (p *PreProjectDB) InsertAdvisorResponse(preProjectID, advisorID uuid.UUID, status string) error {
	tx, err := p.db.Beginx()
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

	var existingAcceptedAdvisor uuid.UUID
	checkQuery, checkArgs, err := QB.Select("accepted_advisor").
		From("pre_project").
		Where(squirrel.Eq{"id": preProjectID}).
		ToSql()
	if err != nil {
		return fmt.Errorf("failed to build check query: %w", err)
	}

	err = tx.Get(&existingAcceptedAdvisor, checkQuery, checkArgs...)
	if err != nil && err != sql.ErrNoRows {
		return fmt.Errorf("failed to check existing accepted advisor: %w", err)
	}

	if existingAcceptedAdvisor != uuid.Nil {
		return fmt.Errorf("pre-project has already been accepted by another advisor")
	}

	responseQuery, responseArgs, err := QB.Insert("advisor_responses").
		Columns("pre_project_id", "advisor_id", "status").
		Values(preProjectID, advisorID, status).
		Suffix(`
            ON CONFLICT (pre_project_id, advisor_id) 
            DO UPDATE SET 
                status = EXCLUDED.status, 
                updated_at = CURRENT_TIMESTAMP
        `).
		ToSql()
	if err != nil {
		return fmt.Errorf("failed to build response query: %w", err)
	}

	_, err = tx.Exec(responseQuery, responseArgs...)
	if err != nil {
		return fmt.Errorf("failed to insert or update advisor response: %w", err)
	}

	if status == "accepted" {
		updateQuery, updateArgs, err := QB.Update("pre_project").
			Set("accepted_advisor", advisorID).
			Set("updated_at", time.Now()).
			Where(squirrel.And{
				squirrel.Eq{"id": preProjectID},
				squirrel.Eq{"accepted_advisor": nil},
			}).
			ToSql()
		if err != nil {
			return fmt.Errorf("failed to build update query: %w", err)
		}

		result, err := tx.Exec(updateQuery, updateArgs...)
		if err != nil {
			return fmt.Errorf("failed to set accepted advisor: %w", err)
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil {
			return fmt.Errorf("failed to check rows affected: %w", err)
		}

		if rowsAffected == 0 {
			return fmt.Errorf("pre-project has already been accepted by another advisor")
		}

		updateOtherResponsesQuery, updateOtherResponsesArgs, err := QB.Update("advisor_responses").
			Set("status", "rejected").
			Where(squirrel.And{
				squirrel.Eq{"pre_project_id": preProjectID},
				squirrel.NotEq{"advisor_id": advisorID},
			}).
			ToSql()
		if err != nil {
			return fmt.Errorf("failed to build update other responses query: %w", err)
		}

		_, err = tx.Exec(updateOtherResponsesQuery, updateOtherResponsesArgs...)
		if err != nil {
			return fmt.Errorf("failed to update other advisors' responses: %w", err)
		}
	}

	return nil
}
func (p *PreProjectDB) CheckExistingPreProject(studentID uuid.UUID) (*PreProject, error) {
	query, args, err := QB.Select("pp.*").
		From("pre_project_students ps").
		Join("pre_project pp ON ps.pre_project_id = pp.id").
		Where(squirrel.Eq{"ps.student_id": studentID}).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	var preProject PreProject
	err = p.db.Get(&preProject, query, args...)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to check existing pre-project: %w", err)
	}

	return &preProject, nil
}
func (p *PreProjectDB) ResetPreProjectAdvisors(preProjectID uuid.UUID) error {
	tx, err := p.db.Beginx()
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

	removeAdvisorsQuery, removeAdvisorsArgs, err := QB.Delete("advisor_responses").
		Where(squirrel.Eq{"pre_project_id": preProjectID}).
		ToSql()
	if err != nil {
		return fmt.Errorf("failed to build remove advisors query: %w", err)
	}

	_, err = tx.Exec(removeAdvisorsQuery, removeAdvisorsArgs...)
	if err != nil {
		return fmt.Errorf("failed to remove advisors from pre-project: %w", err)
	}

	resetAcceptedAdvisorQuery, resetArgs, err := QB.Update("pre_project").
		Set("accepted_advisor", nil).
		Where(squirrel.Eq{"id": preProjectID}).
		ToSql()
	if err != nil {
		return fmt.Errorf("failed to build reset accepted advisor query: %w", err)
	}

	_, err = tx.Exec(resetAcceptedAdvisorQuery, resetArgs...)
	if err != nil {
		return fmt.Errorf("failed to reset accepted advisor: %w", err)
	}

	return nil
}
func (p *PreProjectDB) RemoveAllDiscussants(preProjectID uuid.UUID) error {
	_, err := p.db.Exec("DELETE FROM pre_project_discussants WHERE pre_project_id = $1", preProjectID)
	if err != nil {
		return fmt.Errorf("failed to remove discussants: %w", err)
	}
	return nil
}

func (p *PreProjectDB) UpdateCanUpdate(canUpdate bool, id uuid.UUID) error {
	tx, err := p.db.Beginx()
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
	lockQuery, lockArgs, err := QB.Select("*").
		From("pre_project").
		Where(squirrel.Eq{"id": id}).
		ToSql()
	if err != nil {
		return fmt.Errorf("failed to build lock query: %w", err)
	}
	// to prevent datarrace
	_, err = tx.Exec(lockQuery+" FOR UPDATE", lockArgs...)
	if err != nil {
		return fmt.Errorf("failed to lock pre-project: %w", err)
	}
	updateQuery, updateArgs, err := QB.Update("pre_project").
		Set("can_update", canUpdate).
		Set("updated_at", time.Now()).
		Where(squirrel.Eq{"id": id}).
		ToSql()
	if err != nil {
		return fmt.Errorf("failed to build update query: %w", err)
	}

	result, err := tx.Exec(updateQuery, updateArgs...)
	if err != nil {
		return fmt.Errorf("failed to update pre-project: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no pre-project found to update")
	}
	return nil
}
