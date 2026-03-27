"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // --- Configuration ---
    const API_URL = window.location.origin.includes('file://') ? 'http://localhost:3000/api' : '/api';
    
    // --- State Management ---
    let currentUser = JSON.parse(localStorage.getItem("arcade_session_v2")) || null;
    let snakeInterval = null;

    // --- Selectors ---
    const body = document.body;
    const sidebarLinks = document.querySelectorAll(".nav-links li");
    const views = document.querySelectorAll(".content-view");
    const userDisplayName = document.getElementById("user-display-name");
    const globalWinsDisp = document.getElementById("global-wins");
    const loginTrigger = document.getElementById("nav-login-btn");
    const authModal = document.getElementById("auth-modal");
    const closeModalBtn = document.querySelector(".close-modal-btn");
    const authTabs = document.querySelectorAll(".auth-tab");
    const authForms = document.querySelectorAll(".auth-form");
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const logoutBtn = document.getElementById("logout-btn");
    const gameArea = document.getElementById("game-canvas-area");
    const gameCards = document.querySelectorAll(".game-card");
    const backToHubBtn = document.getElementById("back-to-hub");
    const activeGameTitle = document.getElementById("active-game-title");

    // Gate Selectors
    const gateLoginBtn = document.getElementById("gate-login-btn");
    const gateSignupBtn = document.getElementById("gate-signup-btn");
    const visitorBtn = document.getElementById("visitor-btn");

    // Profile selectors
    const profileUsername = document.getElementById("profile-username");
    const profileEmail = document.getElementById("profile-email");
    const statTicTacToe = document.getElementById("stat-tictactoe");
    const statSnake = document.getElementById("stat-snake");
    const statMemory = document.getElementById("stat-memory");

    // --- Initial App State ---
    checkSession();
    updateAuthUI();
    if (currentUser) syncStats();

    // --- Sidebar Navigation ---
    sidebarLinks.forEach(link => {
        link.addEventListener("click", () => {
            const viewId = link.getAttribute("data-view");
            switchView(viewId);
        });
    });

    function switchView(viewId) {
        views.forEach(view => {
            if (view.id === `view-${viewId}`) {
                view.classList.remove("hidden");
                view.classList.add("active");
            } else {
                view.classList.add("hidden");
                view.classList.remove("active");
            }
        });

        sidebarLinks.forEach(link => {
            link.classList.toggle("active", link.getAttribute("data-view") === viewId);
        });
        
        if (viewId === 'profile') syncStats();
    }

    // --- Backend API Integration ---
    async function apiRequest(endpoint, method = "GET", data = null) {
        const options = {
            method,
            headers: { "Content-Type": "application/json" }
        };
        if (currentUser && currentUser.token) {
            options.headers["Authorization"] = currentUser.token;
        }
        if (data) options.body = JSON.stringify(data);

        try {
            const response = await fetch(`${API_URL}${endpoint}`, options);
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Algo deu errado.");
            return result;
        } catch (err) {
            console.error("API Error:", err);
            // Fallback for demo if no backend is running
            if (err.message.includes("Failed to fetch")) {
                showToast("Aviso: Servidor Offline. Modo Simulação Ativado.", "warning");
                return null;
            }
            throw err;
        }
    }

    async function handleLogin(username, password) {
        const result = await apiRequest("/login", "POST", { username, password });
        if (result) {
            currentUser = { ...result.user, token: result.token };
            saveSession();
            loginSuccess();
        } else {
            // Offline fallback simulation
            simulateAuth(username);
        }
    }

    async function handleRegister(username, email, password) {
        const result = await apiRequest("/register", "POST", { username, email, password });
        if (result) {
            showToast("Conta criada com sucesso! Faça login.", "success");
            authTabs[0].click(); // Switch to login tab
        } else {
            simulateAuth(username);
        }
    }

    async function syncStats() {
        if (!currentUser) return;
        const result = await apiRequest("/stats");
        if (result) {
            currentUser.stats = {
                tictactoe: result.tictactoe_wins,
                snake: result.snake_record,
                memory: result.memory_best_time
            };
            saveSession();
            renderStats();
        }
    }

    async function pushStats() {
        if (!currentUser || !currentUser.token) return;
        const s = currentUser.stats;
        await apiRequest("/stats/update", "POST", {
            tictactoe_wins: s.tictactoe,
            snake_record: s.snake,
            memory_best_time: s.memory
        });
    }

    // --- Local Logic ---
    function simulateAuth(user) {
        currentUser = { username: user, email: `${user}@demo.com`, stats: { tictactoe: 0, snake: 0, memory: "--:--" } };
        saveSession();
        loginSuccess();
    }

    function loginSuccess() {
        body.classList.remove("auth-locked");
        authModal.classList.remove("show"); // Close Modal via class removal
        updateAuthUI();
        renderStats();
        showToast(`Bem-vindo, ${currentUser.username}!`, "success");
    }

    function checkSession() {
        if (!currentUser) {
            body.classList.add("auth-locked");
        } else {
            body.classList.remove("auth-locked");
        }
    }

    function saveSession() {
        localStorage.setItem("arcade_session_v2", JSON.stringify(currentUser));
    }

    function saveStat(game, value) {
        if (!currentUser) return;
        let changed = false;
        
        if (game === 'snake') {
            if (value > currentUser.stats.snake) {
                currentUser.stats.snake = value;
                changed = true;
            }
        } else if (game === 'tictactoe') {
            currentUser.stats.tictactoe += 1;
            changed = true;
        } else if (game === 'memory') {
            currentUser.stats.memory = value;
            changed = true;
        }

        if (changed) {
            saveSession();
            renderStats();
            pushStats();
        }
    }

    function loginFormSubmit(e) {
        e.preventDefault();
        const u = document.getElementById("login-username").value;
        const p = document.getElementById("login-password").value;
        handleLogin(u, p).catch(err => {
            document.getElementById("login-error").textContent = err.message;
        });
    }

    function signupFormSubmit(e) {
        e.preventDefault();
        const u = document.getElementById("signup-username").value;
        const em = document.getElementById("signup-email").value;
        const p = document.getElementById("signup-password").value;
        handleRegister(u, em, p).catch(err => {
            document.getElementById("signup-error").textContent = err.message;
        });
    }

    // --- UI Logic ---
    function updateAuthUI() {
        const sidebarUserInfo = document.getElementById("sidebar-user-info");
        const sidebarUsername = document.getElementById("sidebar-username");

        if (currentUser) {
            userDisplayName.textContent = currentUser.username;
            loginTrigger.classList.add("hidden");
            if(sidebarUserInfo) {
                sidebarUserInfo.classList.remove("hidden");
                sidebarUsername.textContent = currentUser.username;
            }
            logoutBtn.classList.remove("hidden");
            profileUsername.textContent = currentUser.username;
            profileEmail.textContent = currentUser.email;
        } else {
            userDisplayName.textContent = "Convidado";
            loginTrigger.classList.remove("hidden");
            if(sidebarUserInfo) {
                sidebarUserInfo.classList.add("hidden");
            }
            logoutBtn.classList.add("hidden");
            profileUsername.textContent = "Visitante";
            profileEmail.textContent = "Modo Convidado ativo";
        }
    }

    function renderStats() {
        const stats = currentUser ? currentUser.stats : { tictactoe: 0, snake: 0, memory: "--:--" };
        globalWinsDisp.textContent = stats.tictactoe;
        statTicTacToe.textContent = stats.tictactoe;
        statSnake.textContent = stats.snake;
        statMemory.textContent = stats.memory;
    }

    function showToast(msg, type = "info") {
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add("show"), 100);
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // --- Event Listeners ---
    gateLoginBtn.addEventListener("click", () => { authModal.classList.add("show"); authTabs[0].click(); });
    gateSignupBtn.addEventListener("click", () => { authModal.classList.add("show"); authTabs[1].click(); });
    visitorBtn.addEventListener("click", () => { body.classList.remove("auth-locked"); currentUser = null; updateAuthUI(); renderStats(); });
    loginTrigger.addEventListener("click", () => authModal.classList.add("show"));
    closeModalBtn.addEventListener("click", () => authModal.classList.remove("show"));
    loginForm.addEventListener("submit", loginFormSubmit);
    signupForm.addEventListener("submit", signupFormSubmit);
    logoutBtn.addEventListener("click", () => { currentUser = null; localStorage.removeItem("arcade_session_v2"); body.classList.add("auth-locked"); updateAuthUI(); renderStats(); switchView("home"); });
    
    authTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const tabType = tab.getAttribute("data-tab");
            authTabs.forEach(t => t.classList.toggle("active", t === tab));
            authForms.forEach(f => f.classList.toggle("hidden", !f.id.startsWith(tabType)));
        });
    });

    gameCards.forEach(card => card.addEventListener("click", () => launchGame(card.getAttribute("data-game"))));
    backToHubBtn.addEventListener("click", () => { if (snakeInterval) clearInterval(snakeInterval); switchView("home"); gameArea.innerHTML = ""; });

    function launchGame(id) {
        switchView("games");
        gameArea.innerHTML = "";
        if (id === 'tictactoe') { activeGameTitle.textContent = "Jogo da Velha"; initTicTacToe(); }
        else if (id === 'snake') { activeGameTitle.textContent = "Snake Retro"; initSnake(); }
        else if (id === 'memory') { activeGameTitle.textContent = "Memória Master"; initMemory(); }
    }

    function showGameOverlay(title, subtitle, onRetry) {
        let existing = document.getElementById("game-result-overlay");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.id = "game-result-overlay";
        overlay.className = "game-result-overlay";
        overlay.innerHTML = `
            <h2>${title}</h2>
            <p>${subtitle}</p>
            <button class="primary-btn mt-2">Tentar Novamente</button>
        `;
        
        overlay.querySelector("button").addEventListener("click", () => {
            overlay.remove();
            if (onRetry) onRetry();
        });
        
        gameArea.appendChild(overlay);
    }

    // --- Game Logic ---
    function initTicTacToe() {
        gameArea.innerHTML = `<div class="tictactoe-wrapper"><div class="game-status" id="tt-status">Vez do X</div><div class="tictactoe-board" id="tt-board">${Array(9).fill().map((_, i) => `<div class="tt-cell" data-i="${i}"></div>`).join('')}</div><button class="primary-btn mt-2" id="tt-reset">Reiniciar</button></div>`;
        let board = ["", "", "", "", "", "", "", "", ""];
        let turn = "X";
        let running = true;
        const cells = document.querySelectorAll(".tt-cell");
        const status = document.getElementById("tt-status");
        cells.forEach(c => c.addEventListener("click", () => {
            const idx = c.dataset.i;
            if (board[idx] || !running) return;
            board[idx] = turn;
            c.textContent = turn;
            c.classList.add(turn.toLowerCase());
            if (checkTTWin()) {
                status.textContent = `${turn} Ganhou!`; running = false;
                if (turn === 'X') saveStat('tictactoe', 1);
                showGameOverlay("Fim de Jogo", `Jogador ${turn} Venceu!`, initTicTacToe);
            } else if (!board.includes("")) {
                status.textContent = "Empate!"; running = false;
                showGameOverlay("Deu Velha!", "O jogo terminou em empate.", initTicTacToe);
            } else {
                turn = turn === "X" ? "O" : "X"; status.textContent = `Vez do ${turn}`;
            }
        }));
        document.getElementById("tt-reset").addEventListener("click", initTicTacToe);
        function checkTTWin() { const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]; return wins.some(p => board[p[0]] && board[p[0]] === board[p[1]] && board[p[0]] === board[p[2]]); }
    }

    function initSnake() {
        if (snakeInterval) clearInterval(snakeInterval);
        gameArea.innerHTML = `<div class="snake-wrapper"><div id="snake-overlay" class="game-overlay"><h2>Pronto para Começar?</h2><button id="start-snake-btn" class="primary-btn">Iniciar Jogo</button></div><canvas id="snake-canvas" width="400" height="400" class="game-canvas"></canvas><div class="game-info"><div>Score: <span id="snake-score">0</span></div><div>Recorde: <span>${currentUser ? currentUser.stats.snake : 0}</span></div></div></div>`;
        const canvas = document.getElementById("snake-canvas");
        const ctx = canvas.getContext("2d");
        const scoreDisp = document.getElementById("snake-score");
        const startBtn = document.getElementById("start-snake-btn");
        const overlay = document.getElementById("snake-overlay");
        let score = 0, snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}], food = {x: 15, y: 15}, dx = 1, dy = 0, nextDx = 1, nextDy = 0;
        const gridSize = 20, tileCount = 20;
        startBtn.addEventListener("click", () => { overlay.style.display = "none"; snakeInterval = setInterval(gameLoop, 120); });
        function gameLoop() {
            dx = nextDx; dy = nextDy;
            const head = {x: snake[0].x + dx, y: snake[0].y + dy};
            if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount || snake.some(p => head.x === p.x && head.y === p.y)) {
                clearInterval(snakeInterval); 
                saveStat('snake', score); 
                showGameOverlay("Game Over", `Você fez ${score} pontos!`, initSnake); 
                return;
            }
            snake.unshift(head);
            if (head.x === food.x && head.y === food.y) { score += 10; scoreDisp.textContent = score; placeFood(); } else snake.pop();
            draw();
        }
        function draw() {
            ctx.fillStyle = "#020617"; ctx.fillRect(0,0,400,400);
            snake.forEach((p, i) => { ctx.fillStyle = i === 0 ? "#6366f1" : "rgba(99, 102, 241, 0.6)"; ctx.fillRect(p.x * gridSize + 1, p.y * gridSize + 1, gridSize-2, gridSize-2); });
            ctx.fillStyle = "#ec4899"; ctx.fillRect(food.x * gridSize + 4, food.y * gridSize + 4, gridSize-8, gridSize-8);
        }
        function placeFood() { food = { x: Math.floor(Math.random() * tileCount), y: Math.floor(Math.random() * tileCount) }; if (snake.some(p => p.x === food.x && p.y === food.y)) placeFood(); }
        window.onkeydown = (e) => {
            if (e.key === "ArrowUp" && dy === 0) { nextDx = 0; nextDy = -1; }
            if (e.key === "ArrowDown" && dy === 0) { nextDx = 0; nextDy = 1; }
            if (e.key === "ArrowLeft" && dx === 0) { nextDx = -1; nextDy = 0; }
            if (e.key === "ArrowRight" && dx === 0) { nextDx = 1; nextDy = 0; }
        };
        draw();
    }

    function initMemory() {
        const icons = ['🍎', '🍌', '🍒', '🥑', '🍉', '🍇', '🍓', '🥝'];
        let cards = [...icons, ...icons].sort(() => Math.random() - 0.5);
        gameArea.innerHTML = `<div class="memory-grid">${cards.map((icon, i) => `<div class="memory-card" data-icon="${icon}">?</div>`).join('')}</div>`;
        let flipped = [], matches = 0, startTime = Date.now();
        document.querySelectorAll(".memory-card").forEach(c => c.addEventListener("click", () => {
            if (flipped.length < 2 && !c.classList.contains("flipped")) {
                c.classList.add("flipped"); c.textContent = c.dataset.icon; flipped.push(c);
                if (flipped.length === 2) {
                    if (flipped[0].dataset.icon === flipped[1].dataset.icon) {
                        matches++; flipped = [];
                        if (matches === icons.length) {
                            const time = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
                            saveStat('memory', time);
                            showGameOverlay("Você Venceu!", `Tempo: ${time}`, initMemory);
                        }
                    } else setTimeout(() => { flipped.forEach(f => { f.classList.remove("flipped"); f.textContent = "?"; }); flipped = []; }, 800);
                }
            }
        }));
    }
});
