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
    const statFlappy = document.getElementById("stat-flappy");
    const statMemory = document.getElementById("stat-memory");
    const statMinesweeper = document.getElementById("stat-minesweeper");

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
            if (!currentUser.stats) {
                currentUser.stats = { tictactoe: 0, snake: 0, memory: "--:--", flappy: 0, minesweeper: "--:--", blackjack_wins: 0, balance: 1000 };
            }
            saveSession();
            loginSuccess();
            syncStats(); // Puxa do Banco de dados e sobrepõe a interface real-time
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
                flappy: result.flappy_record || 0,
                minesweeper: result.minesweeper_record || "--:--",
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
            memory_best_time: s.memory,
            flappy_record: s.flappy,
            minesweeper_record: s.minesweeper
        });
        await apiRequest("/stats/casino", "POST", {
            balance: s.balance,
            blackjack_wins: s.blackjack_wins
        });
    }

    // --- Local Logic ---
    function simulateAuth(user) {
        currentUser = { username: user, email: `${user}@demo.com`, stats: { tictactoe: 0, snake: 0, memory: "--:--", flappy: 0, minesweeper: "--:--", balance: 1000, blackjack_wins: 0 } };
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
        } else if (game === 'flappy') {
            if (value > currentUser.stats.flappy) {
                currentUser.stats.flappy = value;
                changed = true;
            }
        } else if (game === 'tictactoe') {
            currentUser.stats.tictactoe += 1;
            changed = true;
        } else if (game === 'memory' || game === 'minesweeper') {
            const isNoRecord = currentUser.stats[game] === "--:--" || currentUser.stats[game] === "Win" || !currentUser.stats[game];
            const currentRecord = isNoRecord ? Infinity : parseFloat(currentUser.stats[game]);
            const newValue = parseFloat(value);
            
            if (isNoRecord || (!isNaN(newValue) && newValue < currentRecord)) {
                currentUser.stats[game] = value;
                changed = true;
            }
        } else if (game === 'blackjack') {
            currentUser.stats.blackjack_wins += value; // 1 win
            changed = true;
        } else if (game === 'balance') {
            let v = parseInt(value);
            if(isNaN(v)) v = 0;
            
            if (typeof currentUser.stats.balance !== 'number' || isNaN(currentUser.stats.balance)) {
                currentUser.stats.balance = 1000;
            }
            currentUser.stats.balance += v; 
            changed = true;
        } else if (game === 'check_bankrupt') {
            if (currentUser.stats.balance <= 0) {
                currentUser.stats.balance = 10000;
                showToast("Banca zerada! Bônus de resgate (+10.000 SQC) ativado!", "success");
                changed = true;
            }
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
        const isLoggedIn = currentUser && currentUser.token;

        const casinoSection = document.getElementById("casino-section");
        const topCasinoBalance = document.getElementById("top-casino-balance");
        const statCasino = document.getElementById("stat-box-casino-revenue");

        if (isLoggedIn) {
            userDisplayName.textContent = currentUser.username;
            loginTrigger.classList.add("hidden");
            if(sidebarUserInfo) {
                sidebarUserInfo.classList.remove("hidden");
                sidebarUsername.textContent = currentUser.username;
            }
            logoutBtn.classList.remove("hidden");
            profileUsername.textContent = currentUser.username;
            profileEmail.textContent = currentUser.email;

            // Show Casino
            if(casinoSection) casinoSection.classList.remove("hidden");
            if(topCasinoBalance) topCasinoBalance.classList.remove("hidden");
            if(statCasino) statCasino.classList.remove("hidden");
        } else {
            userDisplayName.textContent = "Convidado";
            loginTrigger.classList.remove("hidden");
            if(sidebarUserInfo) {
                sidebarUserInfo.classList.add("hidden");
            }
            logoutBtn.classList.add("hidden");
            profileUsername.textContent = "Visitante";
            profileEmail.textContent = "Modo Convidado ativo";

            // Hide Casino specifics but keep section visible
            if(casinoSection) casinoSection.classList.remove("hidden");
            if(topCasinoBalance) topCasinoBalance.classList.add("hidden");
            if(statCasino) statCasino.classList.add("hidden");
        }

        const profileAvatarImg = document.getElementById("profile-avatar-img");
        const profileAvatarEmoji = document.getElementById("profile-avatar-emoji");
        const sidebarAvatarSm = document.querySelector(".avatar-sm");
        
        // Hide upload label if not logged in
        const uploadLabel = document.querySelector('label[for="profile-pic-upload"]');
        if (uploadLabel) {
            if (isLoggedIn) uploadLabel.classList.remove("hidden");
            else uploadLabel.classList.add("hidden");
        }
        
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
        const stats = currentUser ? currentUser.stats : { tictactoe: 0, snake: 0, memory: "--:--", flappy: 0, minesweeper: "--:--", blackjack_wins: 0, balance: 1000 };
        globalWinsDisp.textContent = (stats.tictactoe || 0) + (stats.blackjack_wins || 0);
        statTicTacToe.textContent = stats.tictactoe || 0;
        statSnake.textContent = stats.snake || 0;
        if(statFlappy) statFlappy.textContent = stats.flappy || 0;
        statMemory.textContent = stats.memory || '--:--';
        if(statMinesweeper) statMinesweeper.textContent = stats.minesweeper || '--:--';
        
        const bjwEl = document.getElementById("stat-blackjack");
        if(bjwEl) {
            const currentBalance = stats.balance !== undefined ? stats.balance : 1000;
            const profit = currentBalance - 1000;
            bjwEl.textContent = `${profit > 0 ? '+' : ''}${profit} SQC`;
            bjwEl.style.color = profit > 0 ? '#10b981' : (profit < 0 ? '#ef4444' : '#f59e0b');
            document.getElementById("stat-blackjack").parentElement.style.borderColor = profit > 0 ? '#10b981' : (profit < 0 ? '#ef4444' : '#f59e0b');
            document.getElementById("stat-blackjack").previousElementSibling.style.color = profit > 0 ? '#10b981' : (profit < 0 ? '#ef4444' : '#f59e0b');
        }
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
        const casinoGames = ['mines', 'crash', 'blackjack', 'double', 'slots'];
        if (casinoGames.includes(id)) {
            const isLoggedIn = currentUser && currentUser.token;
            if (!isLoggedIn) {
                showToast("Faça login para apostar no Cassino!", "error");
                // Optional: shake animation or open auth modal
                authModal.classList.add("show");
                return;
            }
        }

        switchView("games");
        gameArea.innerHTML = "";
        if (id === 'tictactoe') { activeGameTitle.textContent = "Jogo da Velha"; initTicTacToe(); }
        else if (id === 'snake') { activeGameTitle.textContent = "Snake Retro"; initSnake(); }
        else if (id === 'memory') { activeGameTitle.textContent = "Memória Master"; initMemory(); }
        else if (id === 'mines') { activeGameTitle.textContent = "Mines Cassino"; initMines(); }
        else if (id === 'crash') { activeGameTitle.textContent = "Crash Turbo"; initCrash(); }
        else if (id === 'flappy') { activeGameTitle.textContent = "Flappy Bird"; initFlappy(); }
        else if (id === 'blackjack') { activeGameTitle.textContent = "Blackjack 21"; initBlackjack(); }
        else if (id === 'double') { activeGameTitle.textContent = "Roleta Double"; initDouble(); }
        else if (id === 'slots') { activeGameTitle.textContent = "Caça-Níqueis"; initSlots(); }
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
