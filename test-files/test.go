// 1. Go Package ----
package main

import (
	"fmt"
	"strings"
)
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")

//// 1.1 Struct Definitions ----
type User struct {
	ID    int
	Name  string
	Email string
}

type UserService struct {
	users []User
}
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")

//// 1.2 Methods ----
func (us *UserService) AddUser(user User) {
	us.users = append(us.users, user)
}

func (us *UserService) GetUserByID(id int) *User {
	for _, user := range us.users {
		if user.ID == id {
			return &user
		}
	}
	return nil
}
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")

// 2. Utility Functions ----

//// 2.1 String Helpers ----
func capitalizeWords(s string) string {
	words := strings.Fields(s)
	for i, word := range words {
		words[i] = strings.Title(word)
	}
	return strings.Join(words, " ")
}
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")

//// 2.2 Validation ----
func isValidEmail(email string) bool {
	return strings.Contains(email, "@") && strings.Contains(email, ".")
}
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
////// 2.2.1 validation phase A ----
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
////// 2.2.2 validation phase B ----
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")
fmt.Println("filler")

// 3. Main Function ----
func main() {
	service := &UserService{}
	
	user := User{
		ID:    1,
		Name:  "john doe",
		Email: "john@example.com",
	}
	
	service.AddUser(user)
	fmt.Printf("User added: %s\n", capitalizeWords(user.Name))
}
