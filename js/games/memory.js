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
                const timeStr = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
                if (isBotMode) {
                    const result = p1Score > botScore ? "Você Venceu o Bot!" : (botScore > p1Score ? "O Bot Venceu" : "Empate!");
                    if(p1Score > botScore) saveStat('memory', timeStr);
                    showGameOverlay("Fim de Jogo", `${result} (Placar: ${p1Score}x${botScore}) - Tempo: ${timeStr}`, initMemory);
                } else {
                    saveStat('memory', timeStr);
                    showGameOverlay("Você Venceu!", `Tempo: ${timeStr}`, initMemory);
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