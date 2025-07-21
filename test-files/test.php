<?php
// 1. PHP Application ----

// 1.1 Configuration ----
$config = [
    'database' => 'mysql',
    'host' => 'localhost',
    'port' => 3306
];

// 1.2 Database Class ----
class Database {
    private $connection;
    
    public function __construct($config) {
        $this->connection = $config;
    }
    
    public function connect() {
        echo "Connecting to database...";
    }
}

// 2. Utility Functions ----

// 2.1 String Helpers ----
function sanitize_input($input) {
    return htmlspecialchars(trim($input));
}

function format_currency($amount) {
    return '$' . number_format($amount, 2);
}

// 2.2 Array Helpers ----
function array_get($array, $key, $default = null) {
    return isset($array[$key]) ? $array[$key] : $default;
}

// 3. Main Application ----
$db = new Database($config);
$db->connect();

$user_input = "Hello World";
$clean_input = sanitize_input($user_input);
echo $clean_input;
?>
