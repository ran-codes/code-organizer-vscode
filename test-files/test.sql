-- 1. Database Setup ----
CREATE DATABASE myapp;
USE myapp;
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code

---- 1.1 Tables ----

------ 1.1.1 Users ----

CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100)
);
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code


------ 1.1.1 Orders ----

CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT
);
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code


---- 1.1 Row Level Security ----
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code

-- 2. Queries ----
SELECT * FROM users;
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code

---- 2.1 Joins ----
SELECT u.name, o.id 
FROM users u 
JOIN orders o ON u.id = o.user_id;
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
-- code
