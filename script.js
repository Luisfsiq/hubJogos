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
                memory: result.memory_best_time,
                balance: result.balance !== undefined ? result.balance : 1000,
                blackjack_wins: result.blackjack_wins || 0
            };
            saveSession();
            renderStats();
            updateCasinoUI();
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
        await apiRequest("/stats/casino", "POST", {
            balance: s.balance,
            blackjack_wins: s.blackjack_wins
        });
    }

    // --- Local Logic ---
    function simulateAuth(user) {
        currentUser = { username: user, email: `${user}@demo.com`, stats: { tictactoe: 0, snake: 0, memory: "--:--", balance: 1000, blackjack_wins: 0 } };
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
        } else if (game === 'blackjack') {
            currentUser.stats.blackjack_wins += value; // 1 win
            changed = true;
        } else if (game === 'balance') {
            currentUser.stats.balance += value; // value can be negative or positive
            changed = true;
        }

        if (changed) {
            saveSession();
            renderStats();
            updateCasinoUI();
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

        const profileAvatarImg = document.getElementById("profile-avatar-img");
        const profileAvatarEmoji = document.getElementById("profile-avatar-emoji");
        const sidebarAvatarSm = document.querySelector(".avatar-sm");
        
        let pic = currentUser ? currentUser.profile_pic : localStorage.getItem("temp_visitor_pic");
        if (pic) {
            if (profileAvatarImg) {
                profileAvatarImg.src = pic;
                profileAvatarImg.classList.remove("hidden");
                profileAvatarEmoji.classList.add("hidden");
            }
            if (sidebarAvatarSm) {
                sidebarAvatarSm.innerHTML = `<img src="${pic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            }
        } else {
            if (profileAvatarImg) {
                profileAvatarImg.classList.add("hidden");
                profileAvatarEmoji.classList.remove("hidden");
            }
            if (sidebarAvatarSm) {
                sidebarAvatarSm.innerHTML = `👤`;
            }
        }
    }

    function updateCasinoUI() {
        const balanceEl = document.getElementById("global-balance");
        if (balanceEl && currentUser && currentUser.stats && currentUser.stats.balance !== undefined) {
            balanceEl.textContent = currentUser.stats.balance;
        } else if (balanceEl) {
            balanceEl.textContent = "1000";
        }
    }

    function renderStats() {
        const stats = currentUser ? currentUser.stats : { tictactoe: 0, snake: 0, memory: "--:--", blackjack_wins: 0 };
        globalWinsDisp.textContent = (stats.tictactoe || 0) + (stats.blackjack_wins || 0);
        statTicTacToe.textContent = stats.tictactoe || 0;
        statSnake.textContent = stats.snake || 0;
        statMemory.textContent = stats.memory || '--:--';
        
        const bjwEl = document.getElementById("stat-blackjack");
        if(bjwEl) bjwEl.textContent = `$${(stats.blackjack_wins || 0) * 10}`;
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

    const profilePicUpload = document.getElementById("profile-pic-upload");
    if (profilePicUpload) {
        profilePicUpload.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const base64String = ev.target.result;
                if (currentUser) {
                    try {
                        const token = localStorage.getItem("arcade_token_v2");
                        await fetch(`${API_URL}/profile/upload`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "Authorization": token },
                            body: JSON.stringify({ profile_pic: base64String })
                        });
                        currentUser.profile_pic = base64String;
                        saveSession();
                        updateAuthUI();
                        showToast("Foto de perfil salva!", "success");
                    } catch (err) {
                        showToast("Erro ao salvar foto", "error");
                    }
                } else {
                    localStorage.setItem("temp_visitor_pic", base64String);
                    updateAuthUI();
                    showToast("Foto de perfil aplicada provisoriamente!", "success");
                }
            };
            reader.readAsDataURL(file);
        });
    }

    function launchGame(id) {
        switchView("games");
        gameArea.innerHTML = "";
        if (id === 'tictactoe') { activeGameTitle.textContent = "Jogo da Velha"; initTicTacToe(); }
        else if (id === 'snake') { activeGameTitle.textContent = "Snake Retro"; initSnake(); }
        else if (id === 'memory') { activeGameTitle.textContent = "Memória Master"; initMemory(); }
        else if (id === 'blackjack') { activeGameTitle.textContent = "Blackjack 21"; initBlackjack(); }
        else if (id === 'double') { activeGameTitle.textContent = "Roleta Double"; initDouble(); }
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
        gameArea.innerHTML = `<div class="tictactoe-wrapper">
            <div id="tt-overlay" class="game-overlay">
                <h2>Modo de Jogo</h2>
                <div class="snake-settings" style="margin-bottom:20px;">
                    <select id="tt-mode-select">
                        <option value="pvp" selected>Jogador vs Jogador (Local)</option>
                        <option value="bot">Jogador vs Máquina (Bot)</option>
                    </select>
                </div>
                <div class="snake-settings" style="margin-bottom:20px; display:none;" id="tt-diff-container">
                    <label>Perícia da Inteligência</label><br>
                    <select id="tt-difficulty">
                        <option value="easy">Fácil (Aleatório)</option>
                        <option value="medium" selected>Médio (Defensivo)</option>
                        <option value="hard">Impossível (Minimax)</option>
                    </select>
                </div>
                <button id="start-tt-btn" class="primary-btn">Iniciar Jogo</button>
            </div>
            <div class="game-status" id="tt-status">Vez do X</div>
            <div class="tictactoe-board" id="tt-board">${Array(9).fill().map((_, i) => `<div class="tt-cell" data-i="${i}"></div>`).join('')}</div>
            <button class="primary-btn mt-2" id="tt-reset">Reiniciar</button>
        </div>`;
        
        document.getElementById("tt-mode-select").addEventListener("change", (e) => {
            document.getElementById("tt-diff-container").style.display = e.target.value === "bot" ? "block" : "none";
        });

        let board = ["", "", "", "", "", "", "", "", ""];
        let turn = "X";
        let running = false;
        let isBotMode = false;
        let botDifficulty = "medium";
        
        document.getElementById("start-tt-btn").addEventListener("click", () => {
            isBotMode = document.getElementById("tt-mode-select").value === "bot";
            botDifficulty = document.getElementById("tt-difficulty").value;
            document.getElementById("tt-overlay").style.display = "none";
            running = true;
        });

        const cells = document.querySelectorAll(".tt-cell");
        const status = document.getElementById("tt-status");
        
        const winPatterns = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        function checkWinLogic(b, player) { return winPatterns.some(p => b[p[0]] === player && b[p[1]] === player && b[p[2]] === player); }
        function checkTTWin() { return checkWinLogic(board, turn); }

        function handlePlay(idx, c) {
            board[idx] = turn;
            c.textContent = turn;
            c.classList.add(turn.toLowerCase());
            
            if (checkTTWin()) {
                status.textContent = `${turn} Ganhou!`; running = false;
                if (turn === 'X' || (turn === 'O' && !isBotMode)) saveStat('tictactoe', 1);
                showGameOverlay("Fim de Jogo", isBotMode && turn === 'O' ? "O Bot Venceu" : `Jogador ${turn} Venceu!`, initTicTacToe);
            } else if (!board.includes("")) {
                status.textContent = "Empate!"; running = false;
                showGameOverlay("Deu Velha!", "O jogo terminou em empate.", initTicTacToe);
            } else {
                turn = turn === "X" ? "O" : "X"; status.textContent = `Vez do ${turn}`;
                if (running && isBotMode && turn === 'O') {
                    setTimeout(botPlay, 400);
                }
            }
        }

        function getEmptyIndices(b) {
            let empty = [];
            b.forEach((v, i) => { if (v === "") empty.push(i); });
            return empty;
        }

        function minimax(newBoard, player) {
            let availSpots = getEmptyIndices(newBoard);
            if (checkWinLogic(newBoard, 'X')) return { score: -10 };
            else if (checkWinLogic(newBoard, 'O')) return { score: 10 };
            else if (availSpots.length === 0) return { score: 0 };
            
            let moves = [];
            for (let i = 0; i < availSpots.length; i++) {
                let move = {};
                move.index = availSpots[i];
                newBoard[availSpots[i]] = player;

                if (player === 'O') move.score = minimax(newBoard, 'X').score;
                else move.score = minimax(newBoard, 'O').score;

                newBoard[availSpots[i]] = "";
                moves.push(move);
            }

            let bestMove;
            if (player === 'O') {
                let bestScore = -10000;
                for (let i = 0; i < moves.length; i++) {
                    if (moves[i].score > bestScore) { bestScore = moves[i].score; bestMove = i; }
                }
            } else {
                let bestScore = 10000;
                for (let i = 0; i < moves.length; i++) {
                    if (moves[i].score < bestScore) { bestScore = moves[i].score; bestMove = i; }
                }
            }
            return moves[bestMove];
        }

        function getMediumMove() {
            let empty = getEmptyIndices(board);
            // Defesa 50% ou Ataque
            for (let i = 0; i < empty.length; i++) {
                board[empty[i]] = 'O'; // Teste Win
                if (checkWinLogic(board, 'O')) { board[empty[i]] = ""; return empty[i]; }
                board[empty[i]] = 'X'; // Teste Bloqueio
                if (checkWinLogic(board, 'X') && Math.random() > 0.3) { board[empty[i]] = ""; return empty[i]; }
                board[empty[i]] = ""; // Undo
            }
            return empty[Math.floor(Math.random() * empty.length)];
        }

        function botPlay() {
            if (!running) return;
            let emptyLines = getEmptyIndices(board);
            if (emptyLines.length === 0) return;
            
            let targetIdx;
            if (botDifficulty === "easy") {
                targetIdx = emptyLines[Math.floor(Math.random() * emptyLines.length)];
            } else if (botDifficulty === "medium") {
                targetIdx = getMediumMove();
            } else {
                targetIdx = minimax(board, 'O').index;
            }
            
            const cell = document.querySelector(`.tt-cell[data-i='${targetIdx}']`);
            if (cell) handlePlay(targetIdx, cell);
        }

        cells.forEach(c => c.addEventListener("click", () => {
            const idx = c.dataset.i;
            if (board[idx] || !running) return;
            if (isBotMode && turn === 'O') return; // Bloqueio
            handlePlay(idx, c);
        }));
        
        document.getElementById("tt-reset").addEventListener("click", initTicTacToe);
    }

    function initSnake() {
        if (snakeInterval) clearInterval(snakeInterval);
        gameArea.innerHTML = `<div class="snake-wrapper"><div id="snake-overlay" class="game-overlay"><h2>Pronto para Começar?</h2>
            <div class="snake-settings">
                <label>Formato do Mapa</label><br>
                <select id="snake-grid-select">
                    <option value="20" selected>Clássico (20x20)</option>
                    <option value="30">Grande (30x30)</option>
                    <option value="40">Gigante (40x40)</option>
                </select>
            </div>
        <button id="start-snake-btn" class="primary-btn">Iniciar Jogo</button></div><canvas id="snake-canvas" width="400" height="400" class="game-canvas"></canvas><div class="game-info"><div>Score: <span id="snake-score">0</span></div><div>Recorde: <span>${currentUser ? currentUser.stats.snake : 0}</span></div></div></div>`;
        const canvas = document.getElementById("snake-canvas");
        const ctx = canvas.getContext("2d");
        const scoreDisp = document.getElementById("snake-score");
        const startBtn = document.getElementById("start-snake-btn");
        const overlay = document.getElementById("snake-overlay");
        let score = 0, snake = [], food = {x: 15, y: 15}, dx = 1, dy = 0, nextDx = 1, nextDy = 0;
        let gridSize = 20, tileCount = 20;
        let inputQueue = []; // Fila dupla para comandos ultrarrápidos

        startBtn.addEventListener("click", () => { 
            const sel = document.getElementById("snake-grid-select");
            tileCount = parseInt(sel.value);
            gridSize = 400 / tileCount;
            // Spawn cobra no meio
            snake = [{x: Math.floor(tileCount/2), y: Math.floor(tileCount/2)}];
            food = { x: Math.floor(Math.random() * tileCount), y: Math.floor(Math.random() * tileCount) };
            inputQueue = [];
            dx = 1; dy = 0; nextDx = 1; nextDy = 0;
            
            overlay.style.display = "none"; 
            snakeInterval = setInterval(gameLoop, 120); 
        });

        function gameLoop() {
            // Processa o próximo evento da Queue, de 1 em 1 por frame
            if (inputQueue.length > 0) {
                let cmd = inputQueue.shift();
                if (cmd === "UP" && dy === 0) { nextDx = 0; nextDy = -1; }
                else if (cmd === "DOWN" && dy === 0) { nextDx = 0; nextDy = 1; }
                else if (cmd === "LEFT" && dx === 0) { nextDx = -1; nextDy = 0; }
                else if (cmd === "RIGHT" && dx === 0) { nextDx = 1; nextDy = 0; }
            }
            
            dx = nextDx; dy = nextDy;
            const head = {x: snake[0].x + dx, y: snake[0].y + dy};
            
            // Paredes ou Canibalismo
            if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount || snake.some(p => head.x === p.x && head.y === p.y)) {
                clearInterval(snakeInterval); 
                saveStat('snake', score); 
                window.onkeydown = null; // Libera EventListener do jogo
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
        
        function pushToQueue(cmd) {
            let lastCmd = null;
            if (inputQueue.length > 0) {
                lastCmd = inputQueue[inputQueue.length - 1];
            } else {
                if (nextDx === 1) lastCmd = "RIGHT";
                else if (nextDx === -1) lastCmd = "LEFT";
                else if (nextDy === 1) lastCmd = "DOWN";
                else if (nextDy === -1) lastCmd = "UP";
            }
            // Ignora spam da mesma tecla ou arrasto contínuo para manter a fila limpa! (Max 3 ações)
            if (cmd !== lastCmd && inputQueue.length < 3) {
                inputQueue.push(cmd);
            }
        }

        window.onkeydown = (e) => {
            const key = e.key.toLowerCase();
            const keys = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "s", "a", "d"];
            if (keys.includes(key) && overlay.style.display === "none") {
                e.preventDefault(); // Inibe rolagem da janela enquanto joga
                if (key === "arrowup" || key === "w") pushToQueue("UP");
                if (key === "arrowdown" || key === "s") pushToQueue("DOWN");
                if (key === "arrowleft" || key === "a") pushToQueue("LEFT");
                if (key === "arrowright" || key === "d") pushToQueue("RIGHT");
            }
        };

        // --- Touch Control For Mobile Swipes (Melhorado "Joypad Drag") ---
        let touchStartX = 0;
        let touchStartY = 0;
        
        canvas.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, {passive: false});

        canvas.addEventListener('touchmove', function(e) {
            e.preventDefault(); // Evita scroll vertical nativo
            if (overlay.style.display !== "none") return;

            let touchEndX = e.changedTouches[0].screenX;
            let touchEndY = e.changedTouches[0].screenY;
            
            let dxSwipe = touchEndX - touchStartX;
            let dySwipe = touchEndY - touchStartY;
            
            // Sensibilidade do Swipe (30px)
            if (Math.abs(dxSwipe) > 30 || Math.abs(dySwipe) > 30) {
                if (Math.abs(dxSwipe) > Math.abs(dySwipe)) {
                    if (dxSwipe > 0) pushToQueue("RIGHT");
                    else if (dxSwipe < 0) pushToQueue("LEFT");
                } else {
                    if (dySwipe > 0) pushToQueue("DOWN");
                    else if (dySwipe < 0) pushToQueue("UP");
                }
                // Reseta a âncora para permitir curvas sequenciais s/ tirar o dedo!
                touchStartX = touchEndX;
                touchStartY = touchEndY;
            }
        }, {passive: false});

        draw();
    }

    function initMemory() {
        const allIcons = ['🍎','🍌','🍒','🥑','🍉','🍇','🍓','🥝','🍍','🥭','🥥','🍅','🍔','🍟','🍕','🌭','🍿','🥞'];
        
        gameArea.innerHTML = `<div class="memory-wrapper">
            <div id="memory-overlay" class="game-overlay" style="z-index: 50;">
                <h2>Memória Master</h2>
                <div class="snake-settings">
                    <label>Formato do Grade</label><br>
                    <select id="memory-grid-select">
                        <option value="16" selected>Pequeno 4x4 (8 Pares)</option>
                        <option value="20">Médio 4x5 (10 Pares)</option>
                        <option value="36">Desafio 6x6 (18 Pares)</option>
                    </select>
                </div>
                <div class="snake-settings" style="margin-top:10px;">
                    <label>Modo de Jogo</label><br>
                    <select id="memory-mode-select">
                        <option value="solo" selected>Treino Solo (Por Tempo)</option>
                        <option value="bot">Contra a Máquina (Por Pontos)</option>
                    </select>
                </div>
                <div class="snake-settings" style="margin-top:10px; display:none;" id="mem-diff-container">
                    <label>Cérebro Sintético</label><br>
                    <select id="memory-difficulty">
                        <option value="easy">Fácil (Chutes Aleatórios)</option>
                        <option value="normal" selected>Normal (Memória Curta)</option>
                        <option value="hard">Hacker (Visão Implacável)</option>
                    </select>
                </div>
                <button id="start-memory-btn" class="primary-btn mt-2">Iniciar Jogo</button>
            </div>
            
            <div class="game-info" id="memory-score-panel" style="display:none; justify-content:center; gap:20px; font-size:1.5rem; margin-bottom: 20px;">
                <div id="mem-p1" style="color:var(--primary-color)">Você: 0</div>
                <div id="mem-bot" style="color:var(--secondary-color)">Bot: 0</div>
            </div>
            <div id="memory-grid-container" class="memory-grid"></div>
        </div>`;

        document.getElementById("memory-mode-select").addEventListener("change", (e) => {
            document.getElementById("mem-diff-container").style.display = e.target.value === "bot" ? "block" : "none";
        });

        document.getElementById("start-memory-btn").addEventListener("click", () => {
            const numCards = parseInt(document.getElementById("memory-grid-select").value);
            const isBotMode = document.getElementById("memory-mode-select").value === "bot";
            const botDiff = document.getElementById("memory-difficulty").value;
            document.getElementById("memory-overlay").style.display = "none";
            startGame(numCards, isBotMode, botDiff);
        });

        function startGame(numCards, isBotMode, botDiff) {
            const pairsCount = numCards / 2;
            const selectedIcons = allIcons.slice(0, pairsCount);
            let cards = [...selectedIcons, ...selectedIcons].sort(() => Math.random() - 0.5);
            
            const gridContainer = document.getElementById("memory-grid-container");
            const cols = numCards === 16 ? 4 : (numCards === 20 ? 5 : 6);
            gridContainer.style.gridTemplateColumns = `repeat(${cols}, min(13vw, 80px))`;
            
            gridContainer.innerHTML = cards.map((icon, i) => `<div class="memory-card" data-icon="${icon}" data-idx="${i}">?</div>`).join('');
            
            if (isBotMode) document.getElementById("memory-score-panel").style.display = "flex";
            
            let flipped = [], matches = 0, startTime = Date.now();
            let p1Score = 0, botScore = 0;
            let playerTurn = true;
            let gameLock = false;
            let memoryDB = {}; // { icon: [idx1, idx2] }
            let memoryHistoryQueue = []; // For easy/normal tracking limits

            function memoryTrack(idx, icon) {
                if (!memoryDB[icon]) memoryDB[icon] = [];
                if (!memoryDB[icon].includes(idx)) {
                    memoryDB[icon].push(idx);
                    memoryHistoryQueue.push({icon, idx});
                }
                setTimeout(forgetProcess, 100);
            }

            function forgetProcess() {
                if (botDiff === 'easy') { memoryDB = {}; memoryHistoryQueue = []; } // 100% amnesia
                else if (botDiff === 'normal' && memoryHistoryQueue.length > 5) {
                    // Esquece os mais velhos para simular perda de memoria (mantém ultimo 5)
                    let amnesia = memoryHistoryQueue.shift();
                    if(memoryDB[amnesia.icon]) {
                        memoryDB[amnesia.icon] = memoryDB[amnesia.icon].filter(i => i !== amnesia.idx);
                    }
                }
            }

            function updateScore() {
                document.getElementById("mem-p1").textContent = `Você: ${p1Score}`;
                document.getElementById("mem-bot").textContent = `Bot: ${botScore}`;
            }

            function botPlay() {
                if(matches === pairsCount) return;
                gameLock = true;
                setTimeout(() => {
                    const docCards = Array.from(document.querySelectorAll(".memory-card"));
                    const unflipped = docCards.filter(c => !c.classList.contains("flipped"));
                    if(unflipped.length === 0) return;
                    
                    let target1 = null, target2 = null;

                    // Hacker mode / Normal Memory Check
                    if (botDiff !== 'easy') {
                        // Varre a memoria pra ver se ja sabemos o local dos dois icones identicos
                        for (const mk in memoryDB) {
                            let indices = memoryDB[mk].filter(idx => !docCards[idx].classList.contains("matched"));
                            if (indices.length === 2) {
                                target1 = docCards[indices[0]]; target2 = docCards[indices[1]]; break;
                            }
                        }
                    }

                    if (!target1) target1 = unflipped[Math.floor(Math.random() * unflipped.length)];
                    target1.classList.add("flipped"); target1.textContent = target1.dataset.icon;
                    memoryTrack(parseInt(target1.dataset.idx), target1.dataset.icon);
                    
                    setTimeout(() => {
                        if (!target2 && botDiff !== 'easy') {
                            // Se tirou target1 aleatório, mas agora sabe q o outro já tá na memoria:
                            let matchMemIndices = memoryDB[target1.dataset.icon].filter(idx => !docCards[idx].classList.contains("matched") && idx != parseInt(target1.dataset.idx));
                            if (matchMemIndices.length > 0) target2 = docCards[matchMemIndices[0]];
                        }
                        
                        const remaining = unflipped.filter(c => c !== target1 && !c.classList.contains("flipped"));
                        if(!target2 && remaining.length > 0) target2 = remaining[Math.floor(Math.random() * remaining.length)];
                        if(!target2) return;

                        target2.classList.add("flipped"); target2.textContent = target2.dataset.icon;
                        memoryTrack(parseInt(target2.dataset.idx), target2.dataset.icon);
                        
                        setTimeout(() => {
                            if (target1.dataset.icon === target2.dataset.icon) {
                                matches++; botScore++; updateScore();
                                target1.classList.add("matched"); target2.classList.add("matched");
                                if (matches === pairsCount) endGame();
                                else botPlay(); // Bot goes again!
                            } else {
                                target1.classList.remove("flipped"); target1.textContent = "?";
                                target2.classList.remove("flipped"); target2.textContent = "?";
                                playerTurn = true; gameLock = false;
                            }
                        }, 1000);
                    }, 600);
                }, 600);
            }

            function endGame() {
                if (isBotMode) {
                    const result = p1Score > botScore ? "Você Venceu o Bot!" : (botScore > p1Score ? "O Bot Venceu" : "Empate!");
                    if(p1Score > botScore) saveStat('memory', 'Win');
                    showGameOverlay("Fim de Jogo", `${result} (Placar: ${p1Score}x${botScore})`, initMemory);
                } else {
                    const time = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
                    saveStat('memory', time);
                    showGameOverlay("Você Venceu!", `Tempo: ${time}`, initMemory);
                }
            }

            document.querySelectorAll(".memory-card").forEach(c => c.addEventListener("click", () => {
                let currentIdx = parseInt(c.dataset.idx);
                memoryTrack(currentIdx, c.dataset.icon); // Trackei pro bot ver
                if (gameLock || (!playerTurn && isBotMode)) return;
                
                if (flipped.length < 2 && !c.classList.contains("flipped")) {
                    c.classList.add("flipped"); c.textContent = c.dataset.icon; flipped.push(c);
                    if (flipped.length === 2) {
                        gameLock = true;
                        if (flipped[0].dataset.icon === flipped[1].dataset.icon) {
                            matches++;
                            if (isBotMode) { p1Score++; updateScore(); }
                            flipped[0].classList.add("matched"); flipped[1].classList.add("matched");
                            flipped = []; gameLock = false;
                            if (matches === pairsCount) endGame();
                        } else {
                            setTimeout(() => {
                                flipped.forEach(f => { f.classList.remove("flipped"); f.textContent = "?"; });
                                flipped = [];
                                if (isBotMode) { playerTurn = false; botPlay(); } 
                                else { gameLock = false; }
                            }, 800);
                        }
                    }
                }
            }));
        }
    }
// --- Casino Logic ---
    function generateDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
        let deck = [];
        for(let s of suits) {
            for(let v of values) {
                let weight = parseInt(v);
                if (v === 'J' || v === 'Q' || v === 'K') weight = 10;
                if (v === 'A') weight = 11;
                deck.push({ v, s, weight, clr: (s==='♥'||s==='♦') ? '#ef4444' : '#1e293b' });
            }
        }
        return deck.sort(() => Math.random() - 0.5);
    }

    function renderCard(card) {
        return `<div style="background:white; color:${card.clr}; border-radius:8px; padding:10px; width:70px; height:100px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 6px rgba(0,0,0,0.3); font-weight:bold; font-size:1.2rem;">
            <div style="text-align:left;">${card.v}</div>
            <div style="font-size:2rem; text-align:center;">${card.s}</div>
            <div style="text-align:right;">${card.v}</div>
        </div>`;
    }

    function initBlackjack() {
        gameArea.innerHTML = `<div class="casino-board" style="padding:20px; align-items:center; background: radial-gradient(circle at center, #065f46, #022c22); width:100%; height:100%;">
            <div id="bj-overlay" class="game-overlay casino-overlay" style="z-index:50;">
                <h2 style="color:#fbbf24; text-shadow:0 2px 10px rgba(0,0,0,0.5);">Blackjack 21</h2>
                <div class="snake-settings" style="text-align:center;">
                    <label>Sua Aposta (SQC)</label><br>
                    <input type="number" id="bj-bet-input" value="50" min="10" max="1000" style="padding:10px; font-size:1.2rem; width:100%; max-width:200px; text-align:center; border-radius:8px; border:1px solid #78716c; margin-top:10px; background:#fafaf9;">
                </div>
                <button id="start-bj-btn" class="primary-btn mt-2" style="background:#dc2626; border-color:#b91c1c;">Apostar Mãos</button>
            </div>
            
            <div id="bj-table" style="display:none; width:100%; height:100%; flex-direction:column; justify-content:space-between; padding:20px;">
                <div class="bj-hand-container" style="text-align:center;">
                    <h3 style="color:#d1d5db; margin-bottom:10px; font-size:1.5rem;">Banca <span id="bj-dealer-score" style="background:rgba(0,0,0,0.5); padding:5px 10px; border-radius:10px;"></span></h3>
                    <div id="bj-dealer-hand" style="display:flex; justify-content:center; gap:10px;"></div>
                </div>
                
                <div class="bj-actions" style="display:flex; justify-content:center; gap:15px; margin:20px 0;">
                    <button id="bj-hit" style="background:#3b82f6; border:none; padding:15px 30px; color:white; font-weight:bold; border-radius:8px; cursor:pointer;">COMPRAR (HIT)</button>
                    <button id="bj-stand" style="background:#ef4444; border:none; padding:15px 30px; color:white; font-weight:bold; border-radius:8px; cursor:pointer;">PARAR (STAND)</button>
                </div>

                <div class="bj-hand-container" style="text-align:center;">
                    <h3 style="color:#d1d5db; margin-bottom:10px; font-size:1.5rem;">Você <span id="bj-player-score" style="background:rgba(0,0,0,0.5); padding:5px 10px; border-radius:10px;"></span></h3>
                    <div id="bj-player-hand" style="display:flex; justify-content:center; gap:10px;"></div>
                </div>
            </div>
        </div>`;

        let deck, playerHand, dealerHand, bet;

        document.getElementById("start-bj-btn").addEventListener("click", () => {
            bet = parseInt(document.getElementById("bj-bet-input").value);
            if (!currentUser || typeof currentUser.stats.balance === 'undefined') {
                showToast("Faça login (ou entre como convidado) para jogar Cassino.", "error"); return;
            }
            if (bet > currentUser.stats.balance || bet <= 0) {
                showToast(`Saldo Insuficiente! Saldo: SQC${currentUser.stats.balance}`, "error"); return;
            }
            
            saveStat('balance', -bet); // Remove a aposta
            
            document.getElementById("bj-overlay").style.display = "none";
            document.getElementById("bj-table").style.display = "flex";
            startBJRound();
        });

        function calcScore(hand) {
            let score = 0; let aces = 0;
            hand.forEach(c => { score += c.weight; if (c.v === 'A') aces++; });
            while (score > 21 && aces > 0) { score -= 10; aces--; }
            return score;
        }

        function renderHands(hideDealer = true) {
            document.getElementById("bj-player-hand").innerHTML = playerHand.map(renderCard).join('');
            document.getElementById("bj-player-score").textContent = calcScore(playerHand);

            let dHTML = "";
            if (hideDealer) {
                dHTML = renderCard(dealerHand[0]) + `<div style="background:linear-gradient(45deg, #dc2626, #991b1b); border:2px solid white; border-radius:8px; width:70px; height:100px; box-shadow:0 4px 6px rgba(0,0,0,0.3);"></div>`;
                document.getElementById("bj-dealer-score").textContent = "?";
            } else {
                dHTML = dealerHand.map(renderCard).join('');
                document.getElementById("bj-dealer-score").textContent = calcScore(dealerHand);
            }
            document.getElementById("bj-dealer-hand").innerHTML = dHTML;
        }

        function startBJRound() {
            deck = generateDeck();
            playerHand = [deck.pop(), deck.pop()];
            dealerHand = [deck.pop(), deck.pop()];
            
            // Check Natural 21
            if (calcScore(playerHand) === 21) {
                renderHands(false);
                endBJRound("BLACKJACK!", 'win', 2.5); // 2.5x total retorno
                return;
            }
            
            renderHands(true);
            toggleActions(true);
        }

        function toggleActions(state) {
            document.getElementById("bj-hit").disabled = !state;
            document.getElementById("bj-stand").disabled = !state;
        }

        document.getElementById("bj-hit").addEventListener("click", () => {
            playerHand.push(deck.pop());
            renderHands(true);
            const score = calcScore(playerHand);
            if (score > 21) endBJRound("VOCÊ ESTOUROU! (BUST)", 'lose', 0);
            else if (score === 21) standLogic();
        });

        document.getElementById("bj-stand").addEventListener("click", standLogic);

        function standLogic() {
            toggleActions(false);
            renderHands(false);
            
            const pScore = calcScore(playerHand);
            
            // Dealer auto-draw
            let iv = setInterval(() => {
                let dScore = calcScore(dealerHand);
                if (dScore < 17) {
                    dealerHand.push(deck.pop());
                    renderHands(false);
                } else {
                    clearInterval(iv);
                    dScore = calcScore(dealerHand);
                    if (dScore > 21) endBJRound("A BANCA ESTOUROU! VOCÊ VENCEU!", 'win', 2);
                    else if (dScore > pScore) endBJRound("A BANCA VENCEU", 'lose', 0);
                    else if (pScore > dScore) endBJRound("VOCÊ VENCEU!", 'win', 2);
                    else endBJRound("EMPATE! DEVOLUÇÃO", 'tie', 1);
                }
            }, 800);
        }

        function endBJRound(msg, res, mult) {
            toggleActions(false);
            renderHands(false);
            
            setTimeout(() => {
                if (mult > 0) saveStat('balance', Math.floor(bet * mult));
                if (res === 'win') saveStat('blackjack', 1);
                
                showGameOverlay(msg, res === 'win' || res === 'tie' ? `Retorno: SQC ${Math.floor(bet * mult)}` : `Você perdeu SQC ${bet}.`, initBlackjack);
            }, 1000);
        }
    }

    function initDouble() {
        gameArea.innerHTML = `<div class="casino-board" style="align-items:center;  background: radial-gradient(circle at top, #1f2937, #030712); width:100%; height:100%; display:flex; flex-direction:column; justify-content:center;">
            <div style="width:100%; padding:20px; text-align:center; max-width:800px; margin:0 auto;">
                <h2 style="color:white; margin-bottom:20px; font-size:2rem; font-weight:900;">DOUBLE <span style="color:#d1d5db;">ROULETTE</span></h2>
                
                <!-- Roleta Visor -->
                <div class="roleta-wrapper" style="width:100%; height:120px; background:#0f172a; border-radius:10px; overflow:hidden; position:relative; display:flex; align-items:center; border:2px solid #334155; box-shadow:inset 0 0 20px rgba(0,0,0,0.8);">
                    <div class="roleta-cursor" style="position:absolute; width:4px; height:120px; background:#fbbf24; left:50%; z-index:10; box-shadow:0 0 10px #fbbf24;"></div>
                    <div class="roleta-track" id="roleta-track" style="display:flex; height:100px; gap:5px; position:absolute; left:50%;">
                        <!-- Tiles injected here -->
                    </div>
                </div>

                <!-- Painel de Apostas -->
                <div class="double-bet-panel" style="margin-top:30px;">
                    <div style="margin-bottom:20px;">
                        <input type="number" id="double-bet-input" value="10" min="5" style="padding:15px; border-radius:8px; border:none; font-size:1.2rem; font-weight:bold; text-align:center; width:100%; max-width:300px;">
                    </div>
                    
                    <div class="double-buttons" style="display:flex; justify-content:center; gap:20px; flex-wrap:wrap;">
                        <button class="double-bet-btn" data-color="red" style="padding:15px 30px; border-radius:10px; border:none; background:#ef4444; color:white; font-size:1.2rem; cursor:pointer; font-weight:bold; box-shadow:0 4px 15px rgba(239,68,68,0.5);">VERMELHO (2X)</button>
                        <button class="double-bet-btn" data-color="white" style="padding:15px 30px; border-radius:10px; border:none; background:#f8fafc; color:#0f172a; font-size:1.2rem; cursor:pointer; font-weight:bold; box-shadow:0 4px 15px rgba(255,255,255,0.4);">BRANCO (14X)</button>
                        <button class="double-bet-btn" data-color="black" style="padding:15px 30px; border-radius:10px; border:none; background:#1e293b; color:white; font-size:1.2rem; cursor:pointer; font-weight:bold; border:2px solid #475569;">PRETO (2X)</button>
                    </div>
                </div>
            </div>
            <div id="double-overlay" class="game-overlay" style="display:none; background:rgba(0,0,0,0.85); z-index:100;"></div>
        </div>`;

        const track = document.getElementById("roleta-track");
        const order = ['red', 'black', 'red', 'black', 'white', 'black', 'red', 'black', 'red', 'black', 'red', 'white', 'black', 'red'];
        
        let tilesHtml = "";
        for(let i=0; i<100; i++) {
            let color = order[i % order.length];
            let bg = color === 'red' ? '#ef4444' : (color === 'black' ? '#1e293b' : '#f8fafc');
            tilesHtml += `<div style="background:${bg}; width:80px; height:100px; border-radius:8px; display:flex; justify-content:center; align-items:center; flex-shrink:0;">
                <span style="color:${color==='white'?'#0f172a':'white'}; font-size:2rem;">${color==='white'?'⚪':(color==='red'?'🔴':'⚫')}</span>
            </div>`;
        }
        track.innerHTML = tilesHtml;

        document.querySelectorAll(".double-bet-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const bet = parseInt(document.getElementById("double-bet-input").value);
                const colorObj = btn.dataset.color;
                
                if (!currentUser || typeof currentUser.stats.balance === 'undefined') {
                    showToast("Faça login para apostar.", "error"); return;
                }
                if (bet > currentUser.stats.balance || bet <= 0) {
                    showToast("Saldo Insuficiente!", "error"); return;
                }

                saveStat('balance', -bet); 
                document.querySelectorAll(".double-bet-btn").forEach(b => b.disabled = true);
                
                const winningIndex = 50 + Math.floor(Math.random() * 20);
                const chosenTileColor = order[winningIndex % order.length];
                
                // offset center adjustment: tile width 80 + 5 gap = 85.
                // Left is 50%. The track starts at 50%.
                // So shifting left (-translateX) by winningIndex * 85 + 42.5 (half tile) will put winning tile under the 50% cursor perfectly.
                const randomStopVariance = Math.floor(Math.random() * 60) - 30; // +/- 30px drift
                const deslocamento = (winningIndex * 85) + 42.5 + randomStopVariance;

                track.style.transition = 'transform 6s cubic-bezier(0.1, 0.7, 0.1, 1)';
                track.style.transform = `translateX(-${deslocamento}px)`;

                setTimeout(() => {
                    document.querySelectorAll(".double-bet-btn").forEach(b => b.disabled = false);
                    track.style.transition = 'none'; 
                    
                    let resultMsg = "";
                    let isWin = false; let mult = 0;
                    if (chosenTileColor === colorObj) {
                        isWin = true;
                        mult = colorObj === 'white' ? 14 : 2;
                        resultMsg = `VOCÊ GANHOU SQC ${bet * mult}!`;
                        saveStat('balance', bet * mult);
                        showToast(`Vitória Histórica! +${bet*mult} SQC`, "success");
                    } else {
                        resultMsg = `Você perdeu SQC ${bet}. Caiu no ${chosenTileColor.toUpperCase()}`;
                    }
                    
                    const dov = document.getElementById("double-overlay");
                    dov.innerHTML = `
                        <h2 style="color:${isWin ? '#10b981' : '#ef4444'}; font-size:3rem; text-shadow:0 0 20px rgba(0,0,0,0.8); margin-bottom:20px;">${isWin ? 'VITÓRIA MAX!' : 'PERDEU'}</h2>
                        <p style="color:white; font-size:1.5rem; margin:10px 0 20px;">${resultMsg}</p>
                        <button class="primary-btn mt-2" id="double-continue">CONTINUAR</button>
                    `;
                    dov.style.display = 'flex';
                    dov.style.flexDirection = 'column';
                    
                    document.getElementById('double-continue').addEventListener("click", () => {
                        dov.style.display='none'; 
                        track.style.transform='translateX(0)';
                    });
                    
                }, 6300); 
            });
        });

    }

});
