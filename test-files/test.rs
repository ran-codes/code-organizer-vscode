// 1. Rust Application ----
use std::collections::HashMap;
use std::fmt;
use std::io::{self, Write};
use serde::{Deserialize, Serialize};

// Constants
const MAX_USERS: usize = 1000;
const DEFAULT_TIMEOUT: u64 = 30;
const API_VERSION: &str = "v1.0";

// Custom error types
#[derive(Debug)]
enum UserError {
    NotFound,
    AlreadyExists,
    InvalidData,
}

impl fmt::Display for UserError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            UserError::NotFound => write!(f, "User not found"),
            UserError::AlreadyExists => write!(f, "User already exists"),
            UserError::InvalidData => write!(f, "Invalid user data"),
        }
    }
}

//// 1.1 Struct Definitions ----
#[derive(Debug, Clone, Serialize, Deserialize)]
struct User {
    id: u32,
    name: String,
    email: String,
    created_at: String,
    is_active: bool,
}

impl User {
    fn new(id: u32, name: String, email: String) -> Result<Self, UserError> {
        if name.is_empty() || email.is_empty() {
            return Err(UserError::InvalidData);
        }
        
        Ok(User {
            id,
            name,
            email,
            created_at: chrono::Utc::now().to_rfc3339(),
            is_active: true,
        })
    }
}

#[derive(Debug)]
struct UserService {
    users: HashMap<u32, User>,
    next_id: u32,
}

trait UserRepository {
    fn save(&mut self, user: User) -> Result<(), UserError>;
    fn find_by_id(&self, id: u32) -> Option<&User>;
    fn find_by_email(&self, email: &str) -> Option<&User>;
    fn delete(&mut self, id: u32) -> Result<(), UserError>;
}

//// 1.2 Implementation ----
impl UserService {
    fn new() -> Self {
        UserService {
            users: HashMap::new(),
            next_id: 1,
        }
    }
    
    fn generate_id(&mut self) -> u32 {
        let id = self.next_id;
        self.next_id += 1;
        id
    }
}

impl UserRepository for UserService {
    fn save(&mut self, user: User) -> Result<(), UserError> {
        if self.users.len() >= MAX_USERS {
            return Err(UserError::InvalidData);
        }
        
        // Check for duplicate email
        if self.find_by_email(&user.email).is_some() {
            return Err(UserError::AlreadyExists);
        }
        
        self.users.insert(user.id, user);
        Ok(())
    }
    
    fn find_by_id(&self, id: u32) -> Option<&User> {
        self.users.get(&id)
    }
    
    fn find_by_email(&self, email: &str) -> Option<&User> {
        self.users.values().find(|user| user.email == email)
    }
    
    fn delete(&mut self, id: u32) -> Result<(), UserError> {
        match self.users.remove(&id) {
            Some(_) => Ok(()),
            None => Err(UserError::NotFound),
        }
    }
}

// 2. Utility Functions ----

//// 2.1 String Helpers ----
fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

fn slugify(input: &str) -> String {
    input
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<&str>>()
        .join("-")
}

////// 2.1.1 Text Processing ----
fn truncate_text(text: &str, max_length: usize) -> String {
    if text.len() <= max_length {
        text.to_string()
    } else {
        format!("{}...", &text[..max_length.saturating_sub(3)])
    }
}

fn word_count(text: &str) -> usize {
    text.split_whitespace().count()
}

fn remove_special_chars(input: &str) -> String {
    input.chars().filter(|c| c.is_alphanumeric() || c.is_whitespace()).collect()
}

////// 2.1.2 Format Helpers ----
fn format_name(first: &str, last: &str) -> String {
    format!("{} {}", capitalize_first(first), capitalize_first(last))
}

fn format_currency(amount: f64) -> String {
    format!("${:.2}", amount)
}

fn format_percentage(value: f64) -> String {
    format!("{:.1}%", value * 100.0)
}

//// 2.2 Validation ----
fn is_valid_email(email: &str) -> bool {
    email.contains('@') && email.contains('.') && email.len() > 5
}

fn is_strong_password(password: &str) -> bool {
    password.len() >= 8
        && password.chars().any(|c| c.is_uppercase())
        && password.chars().any(|c| c.is_lowercase())
        && password.chars().any(|c| c.is_numeric())
        && password.chars().any(|c| !c.is_alphanumeric())
}

fn validate_age(age: u8) -> Result<(), &'static str> {
    match age {
        0..=17 => Err("Must be 18 or older"),
        18..=120 => Ok(()),
        _ => Err("Invalid age"),
    }
}

////// 2.2.1 Data Validation ----
fn validate_username(username: &str) -> Result<(), &'static str> {
    if username.len() < 3 {
        return Err("Username must be at least 3 characters");
    }
    if username.len() > 20 {
        return Err("Username must be less than 20 characters");
    }
    if !username.chars().all(|c| c.is_alphanumeric() || c == '_') {
        return Err("Username can only contain letters, numbers, and underscores");
    }
    Ok(())
}

fn validate_phone_number(phone: &str) -> bool {
    let digits: String = phone.chars().filter(|c| c.is_numeric()).collect();
    digits.len() == 10 || digits.len() == 11
}

// 3. Main Function ----
fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Starting Rust Application {}", API_VERSION);
    
    let mut service = UserService::new();
    
    // Create test users
    let user1 = User::new(
        service.generate_id(),
        "John Doe".to_string(),
        "john@example.com".to_string(),
    )?;
    
    let user2 = User::new(
        service.generate_id(),
        "Jane Smith".to_string(),
        "jane@example.com".to_string(),
    )?;
    
    // Add users to service
    service.save(user1.clone())?;
    service.save(user2.clone())?;
    
    // Test string utilities
    println!("Formatted name: {}", format_name("john", "doe"));
    println!("Slugified: {}", slugify("Hello World! 123"));
    println!("Truncated: {}", truncate_text("This is a very long text", 10));
    
    // Test validation
    println!("Email valid: {}", is_valid_email("test@example.com"));
    println!("Strong password: {}", is_strong_password("MyP@ssw0rd"));
    
    match validate_username("john_doe") {
        Ok(_) => println!("Username is valid"),
        Err(e) => println!("Username error: {}", e),
    }
    
    // Display users
    for (id, user) in &service.users {
        println!("User {}: {} - {}", id, user.name, user.email);
    }
    
    println!("Application completed successfully");
    Ok(())
}
