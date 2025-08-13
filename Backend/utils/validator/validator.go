package validator

import (
	"regexp"

	"github.com/google/uuid"
)

type Validator struct {
	Errors     map[string]string
	ErrorOrder []string
}

var (
	EmailRX        = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@uob\.edu\.ly$`)
	PhoneRX        = regexp.MustCompile(`^\+2189[1234]\d{7}$`)
	GeneralEmailRX = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
)

func New() *Validator {
	return &Validator{Errors: make(map[string]string)}
}
func (v *Validator) Valid() bool {
	return len(v.Errors) == 0
}
func (v *Validator) AddError(key, message string) {
	if _, exists := v.Errors[key]; !exists {
		v.Errors[key] = message
	}

}
func (v *Validator) Check(ok bool, key, message string) {
	if !ok {
		v.AddError(key, message)
	}
}

func In(value string, list ...string) bool {
	for i := range list {
		if value == list[i] {
			return true
		}
	}

	return false
}
func Matches(value string, rx *regexp.Regexp) bool {
	return rx.MatchString(value)
}

func Unique(values []string) bool {
	uniqueValues := make(map[string]bool)
	for _, value := range values {
		uniqueValues[value] = true
	}

	return len(values) == len(uniqueValues)
}
func InUUID(value uuid.UUID, list []uuid.UUID) bool {
	for _, item := range list {
		if value == item {
			return true
		}
	}
	return false
}
