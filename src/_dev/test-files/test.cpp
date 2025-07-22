// 1. C++ Class Definition ----
#include <iostream>
#include <string>
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;

//// 1.1 Constructor ----
class Calculator {
private:
    std::string name;
public:
    Calculator(const std::string& name) : name(name) {}
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    std::cout << "filler" << std::endl;
    
    //// 1.2 Operations ----
    int add(int a, int b) {
        return a + b;
    }
    
    int subtract(int a, int b) {
        return a - b;
    }
};
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;

// 2. Template Functions ----
template<typename T>
T maximum(T a, T b) {
    return (a > b) ? a : b;
}
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;
std::cout << "filler" << std::endl;

//// 2.1 Main Function ----
int main() {
    Calculator calc("MyCalculator");
    
    //// 2.2 Usage Examples ----
    int sum = calc.add(5, 3);
    int diff = calc.subtract(10, 4);
    
    std::cout << "Sum: " << sum << std::endl;
    std::cout << "Difference: " << diff << std::endl;
    
    return 0;
}
