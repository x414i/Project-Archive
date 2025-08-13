package data

import (
	"errors"
	"fmt"

	"github.com/Masterminds/squirrel"
	"github.com/jmoiron/sqlx"
	_ "github.com/joho/godotenv/autoload"
)

var (
	ErrRecordNotFound        = errors.New("السجل غير موجود")
	ErrDuplicatedKey         = errors.New("المستخدم لديه القيمة بالفعل")
	ErrDuplicatedRole        = errors.New("المستخدم لديه الدور بالفعل")
	ErrHasRole               = errors.New("المستخدم لديه دور بالفعل")
	ErrHasNoRoles            = errors.New("المستخدم ليس لديه أدوار")
	ErrForeignKeyViolation   = errors.New("انتهاك قيد المفتاح الخارجي")
	ErrUserNotFound          = errors.New("المستخدم غير موجود")
	ErrUserAlreadyhaveatable = errors.New("المستخدم لديه جدول بالفعل")
	ErrUserHasNoTable        = errors.New("المستخدم ليس لديه جدول")
	ErrEmailAlreadyInserted  = errors.New("البريد الإلكتروني موجود بالفعل")
	ErrInvalidQuantity       = errors.New("الكمية المطلوبة غير متاحة")
	ErrRecordNotFoundOrders  = errors.New("لا توجد طلبات متاحة")
	ErrDescriptionMissing    = errors.New("الوصف مطلوب")
	ErrDuplicatedPhone       = errors.New("رقم الهاتف موجود بالفعل")
	QB                       = squirrel.StatementBuilder.PlaceholderFormat(squirrel.Dollar)
	Domain                   = "http://localhost:8080"

	// book_column = []string{
	// 	"id",
	// 	"name",
	// 	"description",
	// 	"student",
	// 	"advisor",
	// 	"discutant",
	// 	"year",
	// 	"season",
	// 	"file",
	// 	"created_at",
	// 	"updated_at",
	// 	fmt.Sprintf("CASE WHEN NULLIF(file, '') IS NOT NULL THEN FORMAT('%s/%%s', file) ELSE NULL END AS file", Domain),
	// }

	chatColumns = []string{
		"chats.id AS chat_id",              // Specify the table for the id
		"chats.sender_id",                  // No ambiguity here
		"chats.receiver_id",                // No ambiguity here
		"chats.message",                    // No ambiguity here
		"chats.file",                       // No ambiguity here
		"chats.created_at",                 // No ambiguity here
		"sender.name AS sender_name",       // Specify the alias for clarity
		"sender.email AS sender_email",     // Specify the alias for clarity
		"receiver.name AS receiver_name",   // Specify the alias for clarity
		"receiver.email AS receiver_email", // Specify the alias for clarity
	}
	post_column = []string{
		"id",
		"description",
		"file",
		"created_at",
		"updated_at",
		fmt.Sprintf("CASE WHEN NULLIF(file, '') IS NOT NULL THEN FORMAT('%s/%%s', file) ELSE NULL END AS file", Domain),
	}
	users_column = []string{
		"id",
		"name",
		"email",
		"password",
		"image",
		"COALESCE(verification_code, '') AS verification_code",
		"COALESCE(verification_code_expiry, '2008-01-01 00:00:00') AS verification_code_expiry",
		"COALESCE(last_verification_code_sent, '2008-01-01 00:00:00') AS last_verification_code_sent",
		"verified",
		"created_at",
		"updated_at",
		fmt.Sprintf("CASE WHEN NULLIF(image, '') IS NOT NULL THEN FORMAT('%s/%%s', image) ELSE NULL END AS image", Domain),
	}
	preProjectJoinColumns = []string{
		"pp.id",
		"pp.name",
		"pp.description",
		"pp.file_description",
		fmt.Sprintf("CASE WHEN NULLIF(pp.file, '') IS NOT NULL THEN FORMAT('%s/%%s', pp.file) ELSE NULL END AS file", Domain),
		"pp.project_owner",
		"pp.accepted_advisor",
		"pp.year",
		"COALESCE(pp.degree, NULL) AS degree",
		"pp.season",
		"pp.can_update",
		"pp.created_at",
		"pp.updated_at",
		"u.id AS advisor_id",
		"COALESCE(u.name, '') AS advisor_name",
		"COALESCE(u.email, '') AS advisor_email",
		"student.id AS student_id",
		"COALESCE(accepted_advisor_user.id, '00000000-0000-0000-0000-000000000000') AS accepted_advisor_id",
		"COALESCE(accepted_advisor_user.name, '') AS accepted_advisor_name",
		"COALESCE(accepted_advisor_user.email, '') AS accepted_advisor_email",
		"COALESCE(student.name, '') AS student_name",
		"COALESCE(student.email, '') AS student_email",
		"COALESCE(ar.status, 'pending') AS response_status",
		"COALESCE(ar.created_at, pp.created_at) AS response_created_at",
		"COALESCE(discussant.id,'00000000-0000-0000-0000-000000000000') AS discussant_id",
		"COALESCE(discussant.name, '') AS discussant_name",
		"COALESCE(discussant.email, '') AS discussant_email",
		"COALESCE(ar.updated_at, pp.updated_at) AS response_updated_at",
	}
	// Define joins

	// Define columns to include in the result

)

type Model struct {
	BookDB         BookDB
	PostDB         PostDB
	UserDB         UserDB
	UserRoleDB     UserRoleDB
	ConversationDB ConversationDB
	PreProjectDB   PreProjectDB
	ChatDB         ChatDB
}

func NewModels(db *sqlx.DB) Model {

	return Model{
		BookDB:       BookDB{db},
		PostDB:       PostDB{db},
		UserDB:       UserDB{db},
		UserRoleDB:   UserRoleDB{db},
		ChatDB:       ChatDB{db},
		PreProjectDB: PreProjectDB{db},

		ConversationDB: ConversationDB{db},
	}
}
