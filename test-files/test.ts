// 1. TypeScript Application ----
interface User {
    id: number;
    name: string;
    email: string;
}

// 1.1 User Service ----
class UserService {
    private users: User[] = [];
    
    // 1.2 CRUD Operations ----
    public addUser(user: User): void {
        this.users.push(user);
    }
    
    public getUserById(id: number): User | undefined {
        return this.users.find(user => user.id === id);
    }
    
    public getAllUsers(): User[] {
        return [...this.users];
    }
}

// 2. Utility Functions ----

// 2.1 Validation Helpers ----
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidId(id: number): boolean {
    return id > 0 && Number.isInteger(id);
}

// 2.2 Formatting Helpers ----
function formatUserName(user: User): string {
    return `${user.name} (${user.email})`;
}

// 3. Main Application ----
const userService = new UserService();

const newUser: User = {
    id: 1,
    name: "John Doe",
    email: "john@example.com"
};

userService.addUser(newUser);
console.log(formatUserName(newUser));
