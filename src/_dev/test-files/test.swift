// 1. Swift Application ----
import Foundation
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")

//// 1.1 Protocol Definitions ----
protocol UserServiceProtocol {
    func addUser(_ user: User)
    func getUserById(_ id: Int) -> User?
}
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")

//// 1.2 Data Models ----
struct User {
    let id: Int
    let name: String
    let email: String
}

class UserService: UserServiceProtocol {
    private var users: [User] = []
    
    //// 1.3 Service Methods ----
    func addUser(_ user: User) {
        users.append(user)
    }
    
    func getUserById(_ id: Int) -> User? {
        return users.first { $0.id == id }
    }
    
    func getAllUsers() -> [User] {
        return users
    }
}
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")

// 2. Utility Extensions ----

//// 2.1 String Extensions ----
extension String {
    func capitalizeFirst() -> String {
        return prefix(1).uppercased() + dropFirst()
    }
    
    func isValidEmail() -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"
        let predicate = NSPredicate(format:"SELF MATCHES %@", emailRegex)
        return predicate.evaluate(with: self)
    }
}
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")

//// 2.2 Array Extensions ----
extension Array where Element == User {
    func findByEmail(_ email: String) -> User? {
        return first { $0.email == email }
    }
}
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")
print("filler")

// 3. Main Application ----
let userService = UserService()

let newUser = User(
    id: 1,
    name: "john doe",
    email: "john@example.com"
)

userService.addUser(newUser)
print("User added: \(newUser.name.capitalizeFirst())")
