/* 1. C Program ----*/
#include <stdio.h>
#include <stdlib.h>

/* 1.1 Function Prototypes ----*/
int add(int a, int b);
void print_result(int result);

/* 1.2 Main Function ----*/
int main() {
    int x = 10;
    int y = 20;
    int result = add(x, y);
    print_result(result);
    return 0;
}

/* 2. Helper Functions ----*/

/* 2.1 Mathematical Operations ----*/
int add(int a, int b) {
    return a + b;
}

int multiply(int a, int b) {
    return a * b;
}

/* 2.2 Output Functions ----*/
void print_result(int result) {
    printf("Result: %d\n", result);
}
