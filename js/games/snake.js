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
