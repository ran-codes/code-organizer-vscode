// 1. Rust Application ----
use std::collections::HashMap;

// 1.1 Struct Definitions ----
#[derive(Debug, Clone)]
struct User {
    id: u32,
    name: String,
    email: String,
}

struct UserService {
    users: HashMap<u32, User>,
}

// 1.2 Implementation ----
impl UserService {
    fn new() -> Self {
        UserService {
            users: HashMap::new(),
        }
    }
    
    fn add_user(&mut self, user: User) {
        self.users.insert(user.id, user);
    }
    
    fn get_user(&self, id: u32) -> Option<&User> {
        self.users.get(&id)
    }
}

// 2. Utility Functions ----

// 2.1 String Helpers ----
fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

// 2.2 Validation ----
fn is_valid_email(email: &str) -> bool {
    email.contains('@') && email.contains('.')
}

// 3. Main Function ----
fn main() {
    let mut service = UserService::new();
    
    let user = User {
        id: 1,
        name: String::from("john doe"),
        email: String::from("john@example.com"),
    };
    
    service.add_user(user.clone());
    println!("User added: {}", capitalize_first(&user.name));
}
