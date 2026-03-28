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
            if (!currentUser || !currentUser.stats || typeof currentUser.stats.balance === 'undefined') {
                showToast("Faça login (ou entre como convidado) para jogar Cassino.", "error"); return;
            }
            if (isNaN(bet) || bet > currentUser.stats.balance || bet <= 0) {
                showToast(`Salso Insuficiente ou Inválido!`, "error"); return;
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
                if (mult > 0) {
                    saveStat('balance', Math.floor(bet * mult));
                } else {
                    saveStat('check_bankrupt');
                }
                if (res === 'win') saveStat('blackjack', 1);
                
                showGameOverlay(msg, res === 'win' || res === 'tie' ? `Retorno: SQC ${Math.floor(bet * mult)}` : `Você perdeu SQC ${bet}.`, initBlackjack);
            }, 1000);
        }
    }
