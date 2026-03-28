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
