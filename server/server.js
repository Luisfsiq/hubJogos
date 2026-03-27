const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path');

// Database connection (PostgreSQL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(bodyParser.json());

// Serve static files from the frontend directory
const frontendPath = process.env.FRONTEND_PATH || path.join(__dirname, '../');
app.use(express.static(frontendPath));

const JWT_SECRET = process.env.JWT_SECRET || 'arcade_secret_key';

// User Registration
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, hashedPassword]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Unique constraint violation
            res.status(400).json({ error: 'Username or email already exists' });
        } else {
            console.error(err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Fetch stats
        const statsResult = await pool.query('SELECT * FROM user_stats WHERE user_id = $1', [user.id]);
        let stats = statsResult.rows[0] || { tictactoe_wins: 0, snake_record: 0, memory_best_time: '--:--' };

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, stats } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get User Stats
app.get('/api/stats', async (req, res) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const result = await pool.query('SELECT * FROM user_stats WHERE user_id = $1', [decoded.id]);
        if (result.rows.length === 0) {
            return res.json({ tictactoe_wins: 0, snake_record: 0, memory_best_time: '--:--' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Update User Stats
app.post('/api/stats/update', async (req, res) => {
    const { tictactoe_wins, snake_record, memory_best_time } = req.body;
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const query = `
            INSERT INTO user_stats (user_id, tictactoe_wins, snake_record, memory_best_time)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id) DO UPDATE SET
                tictactoe_wins = EXCLUDED.tictactoe_wins,
                snake_record = EXCLUDED.snake_record,
                memory_best_time = EXCLUDED.memory_best_time;
        `;
        await pool.query(query, [decoded.id, tictactoe_wins, snake_record, memory_best_time]);
        res.json({ message: 'Stats updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
