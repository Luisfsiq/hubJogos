    function initFlappy() {
        if (snakeInterval) clearInterval(snakeInterval); // just in case
        gameArea.innerHTML = `<div class="flappy-wrapper" style="position:relative; width:400px; height:500px; background:#0ea5e9; overflow:hidden; margin:0 auto; border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
            <div id="flappy-overlay" class="game-overlay" style="z-index: 10;">
                <h2 style="color:white; text-shadow:2px 2px 0 #000;">Flappy Bird</h2>
                <p style="color:white; font-weight:bold;">Space ou Toque para Voar</p>
                <button id="start-flappy-btn" class="primary-btn mt-2">Jogar</button>
            </div>
            <div id="flappy-score" style="position:absolute; top:20px; width:100%; text-align:center; font-size:3rem; font-weight:900; color:white; z-index:5; text-shadow:2px 2px 0 #000;">0</div>
            <div id="flappy-bird" style="position:absolute; width:34px; height:24px; background:#f59e0b; border-radius:50%; top:200px; left:50px; z-index:2; transition:transform 0.1s;">
               <div style="position:absolute; width:10px; height:10px; background:white; border-radius:50%; right:5px; top:4px;"><div style="width:4px; height:4px; background:black; border-radius:50%; margin-top:3px; margin-left:4px;"></div></div>
               <div style="position:absolute; width:14px; height:8px; background:#ef4444; border-radius:4px; right:-6px; top:12px;"></div>
            </div>
        </div>`;
        const wrapper = document.querySelector('.flappy-wrapper');
        const bird = document.getElementById('flappy-bird');
        const scoreEl = document.getElementById('flappy-score');
        const overlay = document.getElementById('flappy-overlay');
        const startBtn = document.getElementById('start-flappy-btn');

        let birdY = 200, velocity = 0, gravity = 0.5, isPlaying = false;
        let pipes = [], score = 0, gameTimer;

        function jump() {
            if(!isPlaying) return;
            velocity = -7.5;
        }

        startBtn.addEventListener('click', () => {
            overlay.style.display = 'none';
            resetGame();
            isPlaying = true;
            gameTimer = setInterval(update, 20);
        });

        window.onkeydown = (e) => { if ((e.code === 'Space' || e.key === ' ') && overlay.style.display === "none") { e.preventDefault(); jump(); } };
        wrapper.addEventListener('touchstart', (e) => { e.preventDefault(); jump(); }, {passive: false});
        wrapper.addEventListener('mousedown', (e) => { e.preventDefault(); jump(); });

        function resetGame() {
            birdY = 200; velocity = 0; score = 0; pipes.forEach(p => p.top.remove() & p.bottom.remove()); pipes = [];
            scoreEl.textContent = score; bird.style.top = birdY + 'px';
        }

        function createPipe() {
            const gap = 130;
            const pipeWidth = 60;
            const topHeight = Math.floor(Math.random() * (500 - gap - 100)) + 50;
            
            const topPipe = document.createElement('div');
            topPipe.style.position = 'absolute'; topPipe.style.top = '0'; topPipe.style.width = pipeWidth + 'px'; topPipe.style.height = topHeight + 'px'; topPipe.style.background = '#22c55e'; topPipe.style.border = '3px solid #14532d'; topPipe.style.left = '400px';
            
            const bottomPipe = document.createElement('div');
            bottomPipe.style.position = 'absolute'; bottomPipe.style.bottom = '0'; bottomPipe.style.width = pipeWidth + 'px'; bottomPipe.style.height = (500 - topHeight - gap) + 'px'; bottomPipe.style.background = '#22c55e'; bottomPipe.style.border = '3px solid #14532d'; bottomPipe.style.left = '400px';
            
            wrapper.appendChild(topPipe); wrapper.appendChild(bottomPipe);
            pipes.push({ x: 400, top: topPipe, bottom: bottomPipe, passed: false, width: pipeWidth });
        }

        let pipeFrames = 0;
        function update() {
            // physics
            velocity += gravity; birdY += velocity;
            bird.style.top = birdY + 'px';
            bird.style.transform = `rotate(${Math.min(90, velocity * 4)}deg)`;
            
            if (birdY > 480 || birdY < -20) return gameOver();

            if (pipeFrames % 90 === 0) createPipe();
            pipeFrames++;

            for (let i = 0; i < pipes.length; i++) {
                let p = pipes[i];
                p.x -= 3;
                p.top.style.left = p.x + 'px';
                p.bottom.style.left = p.x + 'px';
                
                // collision
                if (p.x < 50 + 34 && p.x + p.width > 50) {
                    let topLimit = parseInt(p.top.style.height);
                    let bottomLimit = 500 - parseInt(p.bottom.style.height);
                    if (birdY < topLimit || birdY + 24 > bottomLimit) return gameOver();
                }

                if (p.x + p.width < 50 && !p.passed) { p.passed = true; score++; scoreEl.textContent = score; }
                
                if (p.x < -60) { p.top.remove(); p.bottom.remove(); pipes.splice(i, 1); i--; }
            }
        }

        function gameOver() {
            isPlaying = false;
            clearInterval(gameTimer);
            saveStat('flappy', score);
            window.onkeydown = null;
            showGameOverlay("Game Over", `Score: ${score}`, initFlappy);
        }
    }
    