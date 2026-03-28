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
                
                if (!currentUser || !currentUser.stats || typeof currentUser.stats.balance === 'undefined') {
                    showToast("Faça login para apostar.", "error"); return;
                }
                if (isNaN(bet) || bet > currentUser.stats.balance || bet <= 0) {
                    showToast("Saldo Insuficiente ou Aposta Inválida!", "error"); return;
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
                        saveStat('check_bankrupt');
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
