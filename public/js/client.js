window.location.href = '/';
const gamesEl = document.getElementById('games');
const errorEl = document.getElementById('error');

const render = (games) => {
  gamesEl.innerHTML = '';
  games.forEach((game) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <h3>${game.title}</h3>
      <p class="small">${game.description || 'No description yet.'}</p>
      <p class="small">Updated: ${new Date(game.updatedAt).toLocaleString()}</p>
      <button data-id="${game.id}">Launch</button>
    `;
    card.querySelector('button').addEventListener('click', () => {
      window.location.href = `/play.html?id=${encodeURIComponent(game.id)}`;
    });
    gamesEl.appendChild(card);
  });
};

api.listGames().then(render).catch((err) => {
  errorEl.textContent = err.message;
});
