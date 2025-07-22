using System;
using System.Collections.Generic;

// 1. C# Application ----
namespace TestApp
{
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    
    //// 1.1 Main Class ----
    public class Program
    {
        //// 1.2 Entry Point ----
        public static void Main(string[] args)
        {
            var calculator = new Calculator();
            int result = calculator.Add(10, 20);
            Console.WriteLine($"Result: {result}");
        }
    }
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    Console.WriteLine("filler");
    
    // 2. Business Logic ----
    public class Calculator
    {
        //// 2.1 Basic Operations ----
        public int Add(int a, int b)
        {
            return a + b;
        }
        
        public int Multiply(int a, int b)
        {
            return a * b;
        }
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        Console.WriteLine("filler");
        
        //// 2.2 Advanced Operations ----
        public double Average(List<int> numbers)
        {
            if (numbers.Count == 0) return 0;
            
            int sum = 0;
            foreach (int number in numbers)
            {
                sum += number;
            }
            
            return (double)sum / numbers.Count;
        }
    }
}
