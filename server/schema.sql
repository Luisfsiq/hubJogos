-- Create Database
CREATE DATABASE arcade_premium;

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stats Table
CREATE TABLE user_stats (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tictactoe_wins INTEGER DEFAULT 0,
    snake_record INTEGER DEFAULT 0,
    memory_best_time VARCHAR(20) DEFAULT '--:--',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
