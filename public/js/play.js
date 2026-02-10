const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const titleEl = document.getElementById('gameTitle');
const messageEl = document.getElementById('message');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let game;
let player = { x: 0, y: 0 };

const tileSize = 64;

const draw = () => {
  if (!game) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  game.map.forEach((row, y) => {
    row.forEach((cell, x) => {
      ctx.fillStyle = cell ? '#1f2430' : '#9ff0a5';
      ctx.fillRect(x * tileSize, y * tileSize, tileSize - 2, tileSize - 2);
    });
  });

  ctx.fillStyle = '#0077ff';
  ctx.beginPath();
  ctx.arc(player.x * tileSize + tileSize / 2, player.y * tileSize + tileSize / 2, tileSize / 3, 0, Math.PI * 2);
  ctx.fill();
};

const tryMove = (dx, dy) => {
  const next = { x: player.x + dx, y: player.y + dy };
  if (next.x < 0 || next.y < 0 || next.x >= game.map[0].length || next.y >= game.map.length) {
    return;
  }
  if (game.map[next.y][next.x] === 1) {
    return;
  }
  player = next;
  if (player.x === game.map[0].length - 1 && player.y === game.map.length - 1) {
    messageEl.textContent = '🏆 You reached the goal!';
  }
  draw();
};

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'arrowup' || key === 'w') tryMove(0, -1);
  if (key === 'arrowdown' || key === 's') tryMove(0, 1);
  if (key === 'arrowleft' || key === 'a') tryMove(-1, 0);
  if (key === 'arrowright' || key === 'd') tryMove(1, 0);
});

const init = async () => {
  try {
    game = await api.getGame(id);
    titleEl.textContent = game.title;
    draw();
  } catch (err) {
    titleEl.textContent = 'Failed to load game';
    messageEl.textContent = err.message;
  }
};

init();
