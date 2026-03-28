    function initCrash() {
        gameArea.innerHTML = `<div class="crash-wrapper" style="width:100%; max-width:600px; margin:0 auto; background:#0f172a; border-radius:15px; border:2px solid #f59e0b; overflow:hidden; position:relative;">
            <div id="crash-screen" style="height:350px; position:relative; display:flex; justify-content:center; align-items:center; overflow:hidden; border-bottom:1px solid #334155; box-shadow:inset 0 0 50px rgba(0,0,0,0.8);">
                <div id="crash-pulse" style="position:absolute; bottom:0; left:0; width:100%; height:0%; background:linear-gradient(to top, rgba(16, 185, 129, 0.4), transparent); transition: height 0.1s;"></div>
                <h1 id="crash-multiplier" style="font-size:5rem; font-weight:900; color:#10b981; z-index:5; text-shadow:0 0 20px #10b981;">1.00x</h1>
                <div id="crash-rocket" style="position:absolute; bottom:10px; left:10px; font-size:3rem; transition:all 0.1s; transform:rotate(45deg); z-index:10; filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.8));">🚀</div>
            </div>
            <div style="padding:20px; background:rgba(0,0,0,0.5);">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; gap:10px;">
                     <div style="flex:1;">
                         <label style="color:#cbd5e1; font-weight:bold;">Aposta (SQC)</label><br>
                         <input type="number" id="crash-bet" value="50" min="1" style="width:100%; padding:10px; border-radius:5px; font-weight:bold; background:#1e293b; color:white; border:1px solid #475569;">
                     </div>
                     <div style="flex:1;">
                         <label style="color:#cbd5e1; font-weight:bold;">Auto Retirar</label><br>
                         <input type="number" id="crash-auto" value="2.00" step="0.1" min="1.1" style="width:100%; padding:10px; border-radius:5px; font-weight:bold; background:#1e293b; color:white; border:1px solid #475569;">
                     </div>
                </div>
                <button id="crash-action-btn" class="primary-btn" style="width:100%; height:60px; font-size:1.5rem; background:#10b981; box-shadow:0 5px 0 #047857; text-transform:uppercase;">Iniciar Aposta</button>
            </div>
        </div>`;

        let isPlaying = false, isCrashed = false, multiplier = 1.0, betAmount = 0, currentCrashPoint = 0, timerId, startTime;
        const multEl = document.getElementById("crash-multiplier");
        const actionBtn = document.getElementById("crash-action-btn");
        const rocket = document.getElementById("crash-rocket");
        const pulse = document.getElementById("crash-pulse");
        const autoInput = document.getElementById("crash-auto");
        const betInput = document.getElementById("crash-bet");

        actionBtn.addEventListener("click", () => {
            if(!isPlaying && !isCrashed) {
                // START BET
                if (!currentUser || !currentUser.stats || typeof currentUser.stats.balance === 'undefined') {
                    showToast("Faça login para apostar.", "error"); return;
                }
                betAmount = parseInt(betInput.value);
                if(isNaN(betAmount) || betAmount <= 0 || betAmount > currentUser.stats.balance) {
                    showToast("Saldo insuficiente ou aposta inválida!", "error"); return;
                }
                saveStat('balance', -betAmount);
                
                // Calculate Crash Point (1% house edge => ~0.99 inverse exponential chance)
                currentCrashPoint = Math.max(1.00, 0.99 / Math.random());
                if(currentCrashPoint > 1000) currentCrashPoint = 1000;
                
                isPlaying = true;
                multiplier = 1.0;
                startTime = Date.now();
                actionBtn.textContent = "RETIRAR SQC " + betAmount;
                actionBtn.style.background = "#f59e0b";
                actionBtn.style.boxShadow = "0 5px 0 #b45309";
                actionBtn.classList.add("pulse-glow");
                
                multEl.style.color = "#10b981";
                multEl.style.textShadow = "0 0 20px #10b981";
                pulse.style.height = "0%";
                pulse.style.background = "linear-gradient(to top, rgba(16, 185, 129, 0.4), transparent)";
                rocket.style.bottom = "10px"; rocket.style.left = "10px";
                
                timerId = requestAnimationFrame(tickCrash);
            } else if (isPlaying && !isCrashed) {
                // CASH OUT
                cashOut();
            } else if (isCrashed) {
                // RESET
                isCrashed = false;
                multEl.textContent = "1.00x";
                multEl.style.color = "#10b981";
                multEl.style.textShadow = "0 0 20px #10b981";
                actionBtn.textContent = "Iniciar Aposta";
                actionBtn.style.background = "#10b981";
                actionBtn.style.boxShadow = "0 5px 0 #047857";
                actionBtn.classList.remove("pulse-glow");
                rocket.style.bottom = "10px"; rocket.style.left = "10px";
                pulse.style.height = "0%";
            }
        });

        function cashOut() {
            isPlaying = false;
            let winAmount = Math.floor(betAmount * multiplier);
            saveStat('balance', winAmount);
            actionBtn.textContent = `Retirou SQC ${winAmount}! (Apostar Nova)`;
            actionBtn.style.background = "#3b82f6";
            actionBtn.style.boxShadow = "0 5px 0 #1d4ed8";
            actionBtn.classList.remove("pulse-glow");
            showToast(`Você pulou fora com ${multiplier.toFixed(2)}x! (+${winAmount} SQC)`, "success");
        }

        function tickCrash() {
            if(!isPlaying) return; // cashed out early
            
            let elapsed = (Date.now() - startTime) / 1000;
            // Curva composta: começa lenta, mas a base e a potência crescem com o tempo
            multiplier = Math.pow(1.01 + (elapsed * 0.005), elapsed * 15);
            
            if (multiplier >= currentCrashPoint) {
                multiplier = currentCrashPoint;
                doCrash();
                return;
            }
            
            let autoLimit = parseFloat(autoInput.value) || Infinity;
            if(multiplier >= autoLimit && autoLimit > 1.0) {
                cashOut();
            } else {
                multEl.textContent = multiplier.toFixed(2) + "x";
                actionBtn.textContent = `RETIRAR SQC ${Math.floor(betAmount * multiplier)}`;
                
                let pctX = Math.min(100, (multiplier / 5) * 100);
                let pctY = Math.min(100, (multiplier / 3) * 100);
                pulse.style.height = pctY + '%';
                
                // Animate rocket diagonally relative to container (350px height x 600px width approx)
                rocket.style.bottom = (10 + pctY * 2.8) + "px";
                rocket.style.left = (10 + pctX * 4.5) + "px";
                
                timerId = requestAnimationFrame(tickCrash);
            }
        }

        function doCrash() {
            isPlaying = false;
            isCrashed = true;
            multEl.textContent = multiplier.toFixed(2) + "x";
            multEl.style.color = "#ef4444";
            multEl.style.textShadow = "0 0 20px #ef4444";
            
            actionBtn.textContent = "CRASHED! (Apostar Novamente)";
            actionBtn.style.background = "#ef4444";
            actionBtn.style.boxShadow = "0 5px 0 #b91c1c";
            actionBtn.classList.remove("pulse-glow");
            
            pulse.style.background = "linear-gradient(to top, rgba(239, 68, 68, 0.4), transparent)";
            saveStat('check_bankrupt');
        }
    }