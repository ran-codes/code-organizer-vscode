// 1. C++ Class Definition ----
#include <iostream>
#include <string>

class Calculator {
private:
    std::string name;
    
public:
    // 1.1 Constructor ----
    Calculator(const std::string& name) : name(name) {}
    
    // 1.2 Operations ----
    int add(int a, int b) {
        return a + b;
    }
    
    int subtract(int a, int b) {
        return a - b;
    }
};

// 2. Template Functions ----
template<typename T>
T maximum(T a, T b) {
    return (a > b) ? a : b;
}

// 2.1 Main Function ----
int main() {
    Calculator calc("MyCalculator");
    
    // 2.2 Usage Examples ----
    int sum = calc.add(5, 3);
    int diff = calc.subtract(10, 4);
    
    std::cout << "Sum: " << sum << std::endl;
    std::cout << "Difference: " << diff << std::endl;
    
    return 0;
}
