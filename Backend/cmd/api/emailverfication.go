package main

import (
	"fmt"
	"log"
	"os"

	_ "github.com/joho/godotenv/autoload"
	"gopkg.in/gomail.v2"
)

func SendVerificationEmail(to, verificationCode string) error {
	m := gomail.NewMessage()

	m.SetHeader("From", os.Getenv("GMAIL_USER")) // Use environment variable for Gmail address
	m.SetHeader("To", to)
	m.SetHeader("Subject", "بريد رمز توثيق")

	// Create a more descriptive email body in Arabic
	body := fmt.Sprintf(
		"مرحبًا!\n\n"+
			"لقد قمت بتسجيل حساب في موقع تقنية معلومات جامعة بنغازي فرع المرج. \n\n"+
			"يرجى استخدام رمز التحقق التالي لتأكيد بريدك الإلكتروني:\n\n"+
			"رمز التحقق: %s\n\n"+
			"هذا الرمز صالح لمدة 5 دقائق. إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.\n\n"+
			"إذا كان لديك أي استفسارات، لا تتردد في الاتصال بإادارة القسم او المبرمج أحمد علي عطية.\n\n"+
			"مع تحياتنا،\n"+
			"المبرمج.",
		verificationCode,
	)

	m.SetBody("text/plain", body)

	// Use environment variables for Gmail credentials
	d := gomail.NewDialer("smtp.gmail.com", 587, os.Getenv("GMAIL_USER"), os.Getenv("GMAIL_PASSWORD"))
	// Send the email
	if err := d.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send email: %v", err)
	}

	log.Printf("Verification email sent to: %s", to)
	return nil
}
