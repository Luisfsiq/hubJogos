    function initMines() {
        gameArea.innerHTML = `<div class="minesweeper-wrapper" style="max-width:600px; margin:0 auto; display:flex; flex-direction:column; gap:20px;">
             <!-- Setup Panel -->
             <div id="mines-setup" class="game-info" style="justify-content:center; align-items:center; flex-direction:column; background:rgba(0,0,0,0.5); padding:20px; border-radius:15px; border:2px inset #475569;">
                 <h2 style="color:#fcd34d; font-size:2rem; margin-bottom:10px;">MINES 💣</h2>
                 <div style="display:flex; gap:10px; margin-bottom:15px;">
                     <div>
                         <label style="color:#cbd5e1; font-size:0.9rem;">Aposta (SQC)</label><br>
                         <input type="number" id="mines-bet" value="10" min="1" style="width:100px; padding:10px; border-radius:5px; font-weight:bold; background:#1e293b; color:white; border:1px solid #475569;">
                     </div>
                     <div>
                         <label style="color:#cbd5e1; font-size:0.9rem;">Bombas</label><br>
                         <input type="number" id="mines-count-input" value="3" min="1" max="24" style="width:100px; padding:10px; border-radius:5px; font-weight:bold; background:#1e293b; color:white; border:1px solid #475569;">
                     </div>
                 </div>
                 <button id="mines-bet-btn" class="primary-btn" style="width:210px; background:#10b981;">Apostar</button>
             </div>
             <!-- Play Panel (Hidden initially) -->
             <div id="mines-play" style="display:none; flex-direction:column; justify-content:center; align-items:center; gap:10px; background:rgba(0,0,0,0.5); padding:15px; border-radius:15px; border:2px inset #475569; width:100%;">
                 <div style="font-size:1.2rem; font-weight:bold; color:#10b981;">Multiplicador: <span id="mines-mult">1.00</span>x</div>
                 <button id="mines-cashout-btn" class="primary-btn pulse-glow" style="width:100%; max-width:300px; padding:15px; font-size:1.3rem; background:#10b981; color:white; font-weight:900; text-transform:uppercase; box-shadow:0 0 15px rgba(16,185,129,0.5); border:2px solid #34d399;">RETIRAR SQC <span id="mines-profit">0</span></button>
             </div>
             
             <div id="ms-grid" class="ms-grid" style="grid-template-columns: repeat(5, 60px); grid-template-rows: repeat(5, 60px); gap:5px; background:transparent; border:none;"></div>
        </div>`;

        let grid = [], bombsList = [];
        let isPlaying = false, multiplier = 1.0, betAmount = 0, bombsCount = 3, tilesRevealed = 0;
        
        const gridEl = document.getElementById("ms-grid");
        const betBtn = document.getElementById("mines-bet-btn");
        const setupDiv = document.getElementById("mines-setup");
        const playDiv = document.getElementById("mines-play");
        const multEl = document.getElementById("mines-mult");
        const profitEl = document.getElementById("mines-profit");
        const cashoutBtn = document.getElementById("mines-cashout-btn");

        function drawGrid(active) {
            gridEl.innerHTML = '';
            for(let i=0; i<25; i++) {
                const cell = document.createElement("div");
                cell.className = "ms-cell";
                cell.style.width = "60px"; cell.style.height = "60px"; cell.style.fontSize = "2rem";
                if(active) cell.addEventListener("click", () => revealCell(i, cell));
                gridEl.appendChild(cell);
            }
        }
        drawGrid(false);

        betBtn.addEventListener("click", () => {
            if (!currentUser || !currentUser.stats || typeof currentUser.stats.balance === 'undefined') {
                showToast("Faça login para apostar.", "error"); return;
            }
            betAmount = parseInt(document.getElementById("mines-bet").value);
            bombsCount = parseInt(document.getElementById("mines-count-input").value);
            if(isNaN(betAmount) || betAmount <= 0 || betAmount > currentUser.stats.balance) {
                showToast("Saldo insuficiente ou aposta inválida!", "error"); return;
            }
            if(isNaN(bombsCount) || bombsCount < 1 || bombsCount > 24) {
                showToast("Bombas deve ser entre 1 e 24.", "warning"); return;
            }

            saveStat('balance', -betAmount); // deduct upfront
            
            // Generate bombs
            let allInd = Array.from({length: 25}, (_, i) => i);
            allInd.sort(() => Math.random() - 0.5);
            bombsList = allInd.slice(0, bombsCount);
            
            isPlaying = true;
            multiplier = 1.00;
            tilesRevealed = 0;
            
            setupDiv.style.display = "none";
            playDiv.style.display = "flex";
            multEl.textContent = "1.00";
            profitEl.textContent = (betAmount).toFixed(0);
            
            drawGrid(true);
        });

        function revealCell(idx, cellEl) {
            if(!isPlaying || cellEl.classList.contains("revealed")) return;
            cellEl.classList.add("revealed");
            
            if(bombsList.includes(idx)) {
                // BOOM
                cellEl.innerHTML = '💣';
                cellEl.style.background = '#ef4444';
                gameOverMines(false);
            } else {
                // DIAMOND
                cellEl.innerHTML = '💎';
                tilesRevealed++;
                
                // Calculate next payout
                let remainingSpaces = 25 - (tilesRevealed - 1);
                let remainingSafe = remainingSpaces - bombsCount;
                multiplier = multiplier * (remainingSpaces / remainingSafe) * 0.98; // 2% house edge
                
                multEl.textContent = multiplier.toFixed(2);
                profitEl.textContent = Math.floor(betAmount * multiplier);
                
                if (tilesRevealed === 25 - bombsCount) {
                    gameOverMines(true); // Auto cashout on max win
                }
            }
        }

        cashoutBtn.addEventListener("click", () => {
            if(!isPlaying || tilesRevealed === 0) return;
            gameOverMines(true);
        });

        function gameOverMines(won) {
            isPlaying = false;
            
            const cells = gridEl.children;
            for(let i=0; i<25; i++) {
                if(!cells[i].classList.contains("revealed")) {
                    cells[i].classList.add("revealed");
                    cells[i].style.opacity = "0.5";
                    cells[i].innerHTML = bombsList.includes(i) ? '💣' : '💎';
                }
            }

            setTimeout(() => {
                if(won) {
                    let winAmount = Math.floor(betAmount * multiplier);
                    saveStat('balance', winAmount);
                    showToast(`BINGO! Você retirou SQC ${winAmount}!`, "success");
                } else {
                    saveStat('check_bankrupt');
                    showToast("CABUM! Você acertou uma bomba =(", "error");
                }
                setupDiv.style.display = "flex";
                playDiv.style.display = "none";
                drawGrid(false);
            }, 1000);
        }
    }
