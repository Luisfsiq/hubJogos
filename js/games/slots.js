    function initSlots() {
        gameArea.innerHTML = `<div class="casino-board" style="align-items:center; background: radial-gradient(circle at center, #4c1d95, #2e1065); width:100%; height:100%; display:flex; flex-direction:column; justify-content:center;">
             <div style="width:100%; padding:20px; text-align:center; max-width:600px; margin:0 auto; background:rgba(0,0,0,0.5); border-radius:20px; border:2px solid #8b5cf6; box-shadow:0 0 30px rgba(139, 92, 246, 0.5);">
                 <h2 style="color:#fcd34d; font-size:2.5rem; text-shadow:0 0 10px #fcd34d, 0 0 20px #b45309; margin-bottom:20px;">JACKPOT SLOTS 🎰</h2>
                 
                 <div style="display:flex; justify-content:center; gap:10px; margin-bottom:30px; background:#0f172a; padding:20px; border-radius:15px; border:inset 4px #cbd5e1;">
                     <div class="slot-reel" id="reel-1" style="font-size:4rem; width:80px; height:100px; display:flex; justify-content:center; align-items:center; background:white; border-radius:8px; box-shadow:inset 0 10px 10px rgba(0,0,0,0.5);">🍒</div>
                     <div class="slot-reel" id="reel-2" style="font-size:4rem; width:80px; height:100px; display:flex; justify-content:center; align-items:center; background:white; border-radius:8px; box-shadow:inset 0 10px 10px rgba(0,0,0,0.5);">🍋</div>
                     <div class="slot-reel" id="reel-3" style="font-size:4rem; width:80px; height:100px; display:flex; justify-content:center; align-items:center; background:white; border-radius:8px; box-shadow:inset 0 10px 10px rgba(0,0,0,0.5);">🍇</div>
                 </div>

                 <div class="snake-settings" style="text-align:center;">
                     <input type="number" id="slots-bet-input" value="20" min="10" max="500" style="padding:15px; font-size:1.5rem; width:150px; text-align:center; border-radius:8px; font-weight:bold; background:#fffbeb;">
                     <button id="spin-slots-btn" style="padding:15px 40px; border-radius:10px; border:none; background:linear-gradient(to bottom, #ef4444, #991b1b); color:white; font-size:1.5rem; font-weight:bold; cursor:pointer; margin-left:15px; box-shadow:0 5px 0 #7f1d1d, 0 10px 20px rgba(0,0,0,0.5); position:relative; top:-2px;">GIRAR</button>
                 </div>
                 <div id="slots-msg" style="margin-top:20px; font-size:1.2rem; color:white; min-height:30px;">Prêmios: 3x💎=100x | 3x🔔=20x | 3x🍒=5x</div>
             </div>
        </div>`;

        const symbols = ['🍒', '🍋', '🍇', '🍉', '🔔', '💎'];
        const weights = [40, 30, 15, 10, 4, 1]; // sum = 100
        
        function getRandomSymbol() {
            let r = Math.random() * 100;
            let acc = 0;
            for(let i=0; i<symbols.length; i++) {
                acc += weights[i];
                if(r < acc) return symbols[i];
            }
            return symbols[0];
        }

        const btn = document.getElementById("spin-slots-btn");
        const msg = document.getElementById("slots-msg");
        const reels = [document.getElementById("reel-1"), document.getElementById("reel-2"), document.getElementById("reel-3")];

        btn.addEventListener("click", () => {
            const bet = parseInt(document.getElementById("slots-bet-input").value);
            if (!currentUser || !currentUser.stats || typeof currentUser.stats.balance === 'undefined') {
                showToast("Faça login para apostar.", "error"); return;
            }
            if (isNaN(bet) || bet > currentUser.stats.balance || bet <= 0) {
                showToast("Saldo Insuficiente ou Aposta Inválida!", "error"); return;
            }

            saveStat('balance', -bet);
            btn.disabled = true;
            btn.style.top = '3px';
            btn.style.boxShadow = '0 0 0 #7f1d1d, 0 5px 10px rgba(0,0,0,0.5)';
            msg.textContent = 'Girando...';
            msg.style.color = 'white';
            
            let spins = [0,0,0];
            let results = [];
            let spinIntervals = [];

            for(let i=0; i<3; i++) {
                results[i] = getRandomSymbol();
                spinIntervals[i] = setInterval(() => {
                    reels[i].textContent = symbols[Math.floor(Math.random()*symbols.length)];
                }, 50);

                setTimeout(() => {
                    clearInterval(spinIntervals[i]);
                    reels[i].textContent = results[i];
                    
                    if(i === 2) { // Last reel
                        btn.disabled = false;
                        btn.style.top = '-2px';
                        btn.style.boxShadow = '0 5px 0 #7f1d1d, 0 10px 20px rgba(0,0,0,0.5)';
                        checkWin(results, bet);
                    }
                }, 1000 + i * 500);
            }
        });

        function checkWin(res, bet) {
            let mult = 0;
            if (res[0] === res[1] && res[1] === res[2]) {
                if(res[0] === '💎') mult = 100;
                else if(res[0] === '🔔') mult = 20;
                else if(res[0] === '🍉') mult = 10;
                else if(res[0] === '🍇') mult = 7;
                else if(res[0] === '🍋') mult = 6;
                else if(res[0] === '🍒') mult = 5;
            }
            
            if (mult > 0) {
                msg.textContent = `JACKPOT! VOCÊ GANHOU ${bet * mult} SQC!`;
                msg.style.color = '#10b981';
                msg.style.fontWeight = 'bold';
                msg.style.textShadow = '0 0 10px rgba(16, 185, 129, 0.8)';
                saveStat('balance', bet * mult);
                showToast(`Ganhos Multiplicados x${mult}!`, "success");
            } else {
                msg.textContent = `Você perdeu ${bet} SQC.`;
                msg.style.color = '#ef4444';
                msg.style.fontWeight = 'normal';
                msg.style.textShadow = 'none';
                saveStat('check_bankrupt');
            }
        }
    }
