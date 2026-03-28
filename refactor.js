const fs = require('fs');

let scriptStr = fs.readFileSync('script.js', 'utf8').replace(/\r\n/g, '\n');

const games = [
    { name: 'tictactoe', fn: 'function initTicTacToe()' },
    { name: 'snake', fn: 'function initSnake()' },
    { name: 'memory', fn: 'function initMemory()' },
    { name: 'flappy', fn: 'function initFlappy()' },
    { name: 'mines', fn: 'function initMines()' },
    { name: 'crash', fn: 'function initCrash()' },
    { name: 'blackjack', fn: 'function initBlackjack()' },
    { name: 'double', fn: 'function initDouble()' },
    { name: 'slots', fn: 'function initSlots()' }
];

if (!fs.existsSync('js')) fs.mkdirSync('js');
if (!fs.existsSync('js/games')) fs.mkdirSync('js/games');

let lines = scriptStr.split('\n');
let chunks = {};
let currentChunk = 'main';
chunks['main'] = [];

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    let startedGame = games.find(g => line.trim().startsWith(g.fn));
    
    if (startedGame) {
        currentChunk = startedGame.name;
        chunks[currentChunk] = [line];
    } else if (line.trim().startsWith('function init') && currentChunk !== 'main') {
        currentChunk = 'main';
        chunks[currentChunk].push(line);
    } else if (line.trim().startsWith('// --- Casino Logic ---')) {
        currentChunk = 'main';
        chunks[currentChunk].push(line);
    } else {
        chunks[currentChunk].push(line);
    }
}

fs.writeFileSync('js/main.js', chunks['main'].join('\n'));

games.forEach(g => {
    if(chunks[g.name]) {
        fs.writeFileSync(`js/games/${g.name}.js`, chunks[g.name].join('\n'));
        console.log("Extracted: " + g.name);
    }
});

let html = fs.readFileSync('index.html', 'utf8');
let scriptTags = games.map(g => `<script src="js/games/${g.name}.js"></script>`).join('\n    ');
scriptTags += '\n    <script src="js/main.js"></script>';

html = html.replace('<script src="script.js"></script>', scriptTags);
fs.writeFileSync('index.html', html);
fs.unlinkSync('script.js');
console.log("Refactoring absolute success.");
