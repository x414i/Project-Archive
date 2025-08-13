package main

import (
	"net/http"
	"time"

	"github.com/go-michi/michi"
)

func (app *application) Router() *michi.Router {
	r := michi.NewRouter()
	r.Use(app.logRequest)
	r.Use(app.recoverPanic)
	r.Use(secureHeaders)
	r.Use(app.ErrorHandlerMiddleware)
	rateLimiter := NewRateLimiter(RateLimiterConfig{
		Skipper: func(r *http.Request) bool {
			return false
		},
		Rate:      600,
		Burst:     100,
		ExpiresIn: 1 * time.Minute,
		IdentifierExtractor: func(r *http.Request) (string, error) {
			return r.RemoteAddr, nil
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		},
		DenyHandler: func(w http.ResponseWriter, r *http.Request, identifier string, err error) {
			http.Error(w, http.StatusText(http.StatusTooManyRequests), http.StatusTooManyRequests)
		},
	})

	r.Use(rateLimiter.Limit)

	r.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("/app/cmd/api/uploads"))))
	// r.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))

	r.Route("/", func(sub *michi.Router) {
		sub.HandleFunc("GET book", http.HandlerFunc(app.ListBooksHandler))
		sub.HandleFunc("GET book/{id}", http.HandlerFunc(app.GetBookWithDetailsHandler))
		sub.HandleFunc("POST book", app.AuthMiddleware(app.AdminOnlyMiddleware(http.HandlerFunc(app.CreateBookHandler))))
		sub.HandleFunc("DELETE book/{id}", app.AuthMiddleware(app.AdminOnlyMiddleware(http.HandlerFunc(app.DeleteBookHandler))))
		sub.HandleFunc("PUT book/{id}", app.AuthMiddleware(app.AdminOnlyMiddleware(http.HandlerFunc(app.UpdateBookHandler))))
		sub.HandleFunc("GET post", http.HandlerFunc(app.ListPostsHandler))
		sub.HandleFunc("GET post/{id}", http.HandlerFunc(app.GetPostHandler))
		sub.HandleFunc("POST post", app.AuthMiddleware(app.AdminOrTeacherMiddleware(http.HandlerFunc(app.CreatePostHandler))))
		sub.HandleFunc("DELETE post/{id}", app.AuthMiddleware(app.AdminOrTeacherMiddleware(http.HandlerFunc(app.DeletePostHandler))))
		sub.HandleFunc("PUT post/{id}", app.AuthMiddleware(app.AdminOrTeacherMiddleware(http.HandlerFunc(app.UpdatePostHandler))))

		sub.HandleFunc("GET users", app.AuthMiddleware(app.AdminOnlyMiddleware(http.HandlerFunc(app.ListUsersHandler))))

		sub.HandleFunc("GET users/{id}", app.AuthMiddleware(app.AdminOnlyMiddleware(http.HandlerFunc(app.GetUserHandler))))
		sub.HandleFunc("PUT users/{id}", app.AuthMiddleware(app.AdminOrSelfMiddleware(http.HandlerFunc(app.UpdateUserHandler))))
		sub.HandleFunc("DELETE users/{id}", app.AuthMiddleware(app.AdminOnlyMiddleware(http.HandlerFunc(app.DeleteUserHandler))))
		sub.HandleFunc("POST login", http.HandlerFunc((app.SigninHandler)))
		sub.HandleFunc("POST signup", app.PassTokenMiddleware(app.SignupHandler))
		sub.HandleFunc("POST verifyemail", app.VerifyEmailHandler)
		sub.HandleFunc("POST resendverification", app.ResendVerificationCodeHandler)
		sub.HandleFunc("POST /password-reset/request", app.RequestPasswordResetHandler)
		sub.HandleFunc("POST /password-reset/verify", app.VerifyPasswordResetCodeHandler)
		sub.HandleFunc("POST /password-reset", app.ResetPasswordHandler)

		sub.HandleFunc("POST roles/grant", app.AuthMiddleware(app.AdminOnlyMiddleware(http.HandlerFunc(app.GrantRoleHandler))))
		sub.HandleFunc("DELETE roles/revoke", app.AuthMiddleware(app.AdminOnlyMiddleware(http.HandlerFunc(app.RevokeRoleHandler))))
		sub.HandleFunc("GET roles/{id}", app.GetUserRolesHandler)
		sub.HandleFunc("GET teachers", app.GetTeachersHandler)
		sub.HandleFunc("GET student", app.AuthMiddleware(app.AdminOrStudentMiddleware(http.HandlerFunc(app.GetStudentHandler))))
		sub.HandleFunc("GET graduationstudents", app.AuthMiddleware(app.AdminOrStudentMiddleware(http.HandlerFunc(app.GetGraduationStudentsHandler))))
		sub.HandleFunc("GET statistics", app.GetNumderOfStudents)

		sub.HandleFunc("GET students", app.GetNumderOfStudents)

		sub.HandleFunc("GET me", app.AuthMiddleware(http.HandlerFunc((app.MeHandler))))
		sub.HandleFunc("POST preproject", app.AuthMiddleware(app.GradStudentOnlyMiddleware(http.HandlerFunc(app.CreatePreProjectHandler))))
		sub.HandleFunc("GET preproject", http.HandlerFunc(app.GetPreProjectsHandler))
		sub.HandleFunc("GET preproject/associated", http.HandlerFunc(app.GetAssociatedPreProjectsHandler))

		sub.HandleFunc("GET preproject/{id}", http.HandlerFunc(app.GetPreProjectsHandlerByID))
		sub.HandleFunc("PUT preproject/{id}", app.AuthMiddleware(app.AdminOrProjectOwnerOnlyMiddleware(http.HandlerFunc(app.UpdatePreProjectHandler))))
		sub.HandleFunc("DELETE preproject/{id}", app.AuthMiddleware(app.AdminOrProjectOwnerOnlyMiddleware(http.HandlerFunc(app.DeletePreProjectHandler))))
		sub.HandleFunc("POST transferbook/{id}", app.AuthMiddleware(app.AdminOnlyMiddleware(http.HandlerFunc(app.MovePreProjectToBookHandler))))
		sub.HandleFunc("POST advisorresponse/{id}", app.AuthMiddleware(app.AdvisorsOnlyMiddleware(http.HandlerFunc(app.RespondToPreProjectHandler))))
		sub.HandleFunc("DELETE preproject/{id}/reset-advisors", app.AuthMiddleware(app.AdminOnlyMiddleware(http.HandlerFunc(app.ResetPreProjectAdvisorsHandler))))
		sub.HandleFunc("PUT canupdate/{id}", app.AuthMiddleware(app.AdminOnlyMiddleware(http.HandlerFunc(app.CanUpdate))))

		sub.HandleFunc("POST chats", app.AuthMiddleware(app.ChatParticipantMiddleware(http.HandlerFunc(app.CreateChatHandler))))                                                                         // Create a new chat
		sub.HandleFunc("DELETE chats/{chat_id}", app.AuthMiddleware(app.ChatParticipantMiddleware(http.HandlerFunc(app.DeleteChatHandler))))                                                             // Delete a specific chat message
		sub.HandleFunc("GET conversation/{conversation_id}", app.AuthMiddleware(app.BlockConversationsForRoleGraduatedMiddleware(app.ChatParticipantMiddleware(http.HandlerFunc(app.GetChatsHandler))))) // Get conversation between two users
		sub.HandleFunc("DELETE conversation/{id}", app.AuthMiddleware(app.ChatParticipantMiddleware(http.HandlerFunc(app.DeleteConversationHandler))))                                                   // Delete a specific conversation
		sub.HandleFunc("GET conversations", app.AuthMiddleware(app.BlockConversationsForRoleGraduatedMiddleware(http.HandlerFunc(app.GetConversationsHandler))))                                         // Get all chats
		sub.HandleFunc("GET ws", app.AuthMiddleware(http.HandlerFunc(app.HandleWebSocket)))                                                                                                              // WebSocket connection
	})

	return r
}
