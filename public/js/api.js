const api = {
  async listGames() {
    const res = await fetch('/api/games');
    if (!res.ok) throw new Error('Failed to fetch games');
    return res.json();
  },
  async getGame(id) {
    const res = await fetch(`/api/games/${id}`);
    if (!res.ok) throw new Error('Game not found');
    return res.json();
  },
  async publishGame(payload) {
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Publish failed');
    return res.json();
  },
};
