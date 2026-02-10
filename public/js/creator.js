window.location.href = '/';
const size = 10;
let map = Array.from({ length: size }, () => Array(size).fill(0));

const mapGrid = document.getElementById('mapGrid');
const statusEl = document.getElementById('status');

const drawGrid = () => {
  mapGrid.innerHTML = '';
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const tile = document.createElement('button');
      tile.className = `tile ${map[r][c] ? 'wall' : ''}`;
      tile.title = `Row ${r + 1}, Col ${c + 1}`;
      tile.addEventListener('click', () => {
        map[r][c] = map[r][c] ? 0 : 1;
        drawGrid();
      });
      mapGrid.appendChild(tile);
    }
  }
};

document.getElementById('clearBtn').addEventListener('click', () => {
  map = Array.from({ length: size }, () => Array(size).fill(0));
  statusEl.textContent = 'Map cleared.';
  drawGrid();
});

document.getElementById('publishBtn').addEventListener('click', async () => {
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  if (!title) {
    statusEl.textContent = 'Title is required.';
    return;
  }

  try {
    statusEl.textContent = 'Publishing...';
    const game = await api.publishGame({ title, description, map });
    statusEl.textContent = `Published ${game.title}. Open Client to launch.`;
  } catch (err) {
    statusEl.textContent = err.message;
  }
});

drawGrid();
