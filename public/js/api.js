const APP_CONFIG = {
  mode: localStorage.getItem('bfx_mode') || (location.hostname.includes('github.io') ? 'github' : 'local'),
  githubOwner: localStorage.getItem('bfx_owner') || '',
  githubRepo: localStorage.getItem('bfx_repo') || '',
  githubBranch: localStorage.getItem('bfx_branch') || 'main',
  githubToken: localStorage.getItem('bfx_token') || '',
  dbPath: 'data/db.json',
};

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

const githubApi = {
  base() {
    return `https://api.github.com/repos/${APP_CONFIG.githubOwner}/${APP_CONFIG.githubRepo}`;
  },
  async getDb() {
    if (!APP_CONFIG.githubOwner || !APP_CONFIG.githubRepo) {
      throw new Error('GitHub owner/repo not configured');
    }
    const url = `${this.base()}/contents/${APP_CONFIG.dbPath}?ref=${encodeURIComponent(APP_CONFIG.githubBranch)}`;
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to read GitHub db');
    const content = atob((json.content || '').replace(/\n/g, ''));
    return { db: JSON.parse(content), sha: json.sha };
  },
  async putDb(db, message = 'Update BlockForge X data') {
    if (!APP_CONFIG.githubToken) throw new Error('GitHub token required for write operations');
    const { sha } = await this.getDb();
    const url = `${this.base()}/contents/${APP_CONFIG.dbPath}`;
    const payload = {
      message,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(db, null, 2)))),
      sha,
      branch: APP_CONFIG.githubBranch,
    };
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${APP_CONFIG.githubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to write GitHub db');
    return json;
  },
};

const localApi = {
  async request(path, options = {}) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  bootstrap() { return this.request('/api/bootstrap'); },
  register(username) { return this.request('/api/users/register', { method: 'POST', body: JSON.stringify({ username }) }); },
  publishWorld(payload) { return this.request('/api/worlds/publish', { method: 'POST', body: JSON.stringify(payload) }); },
  createPost(payload) { return this.request('/api/social/post', { method: 'POST', body: JSON.stringify(payload) }); },
  requestFriend(payload) { return this.request('/api/social/friend-request', { method: 'POST', body: JSON.stringify(payload) }); },
  transfer(payload) { return this.request('/api/currency/transfer', { method: 'POST', body: JSON.stringify(payload) }); },
  buyItem(payload) { return this.request('/api/marketplace/buy', { method: 'POST', body: JSON.stringify(payload) }); },
  sendMessage(payload) { return this.request('/api/chat/send', { method: 'POST', body: JSON.stringify(payload) }); },
  updatePresence(payload) { return this.request('/api/multiplayer/presence', { method: 'POST', body: JSON.stringify(payload) }); },
};

const githubAdapter = {
  async withDb(mutator, message) {
    const { db } = await githubApi.getDb();
    const next = mutator(deepClone(db));
    await githubApi.putDb(next, message);
    return next;
  },
  async bootstrap() {
    const { db } = await githubApi.getDb();
    return db;
  },
  async register(username) {
    let created;
    await this.withDb((db) => {
      const match = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
      if (match) {
        created = match;
        return db;
      }
      created = {
        id: `u-${Date.now()}`,
        username,
        bio: 'GitHub Pages player',
        balance: 1000,
        xp: 0,
        friends: [],
        inventory: [],
        createdAt: new Date().toISOString(),
      };
      db.users.push(created);
      return db;
    }, `Register player ${username}`);
    return created;
  },
  async publishWorld(payload) {
    let world;
    await this.withDb((db) => {
      const user = db.users.find((u) => u.id === payload.ownerId);
      if (!user) throw new Error('owner not found');
      world = {
        id: `world-${Date.now()}`,
        ownerId: user.id,
        title: payload.title,
        genre: payload.genre || 'Adventure',
        description: payload.description || '',
        tags: Array.isArray(payload.tags) ? payload.tags.slice(0, 5) : [],
        activePlayers: 0,
        likes: 0,
        visits: 0,
        thumbnail: payload.thumbnail || '🚀',
        updatedAt: new Date().toISOString(),
      };
      db.worlds.unshift(world);
      user.balance += 75;
      user.xp += 35;
      return db;
    }, `Publish world ${payload.title}`);
    return world;
  },
  async createPost(payload) {
    let created;
    await this.withDb((db) => {
      const user = db.users.find((u) => u.id === payload.userId);
      if (!user) throw new Error('user not found');
      created = { id: `post-${Date.now()}`, userId: user.id, text: payload.text, likes: 0, createdAt: new Date().toISOString() };
      db.posts.unshift(created);
      user.xp += 5;
      return db;
    }, 'Create social post');
    return created;
  },
  async requestFriend(payload) {
    return this.withDb((db) => {
      db.friendRequests.push({ id: `fr-${Date.now()}`, fromUserId: payload.fromUserId, toUserId: payload.toUserId, createdAt: new Date().toISOString() });
      return db;
    }, 'Create friend request');
  },
  async transfer(payload) {
    return this.withDb((db) => {
      const from = db.users.find((u) => u.id === payload.fromUserId);
      const to = db.users.find((u) => u.id === payload.toUserId);
      const amount = Number(payload.amount || 0);
      if (!from || !to) throw new Error('user missing');
      if (amount <= 0 || from.balance < amount) throw new Error('invalid transfer');
      from.balance -= amount;
      to.balance += amount;
      db.transactions.unshift({ id: `tx-${Date.now()}`, type: 'transfer', fromUserId: from.id, toUserId: to.id, amount, createdAt: new Date().toISOString() });
      return db;
    }, 'Transfer BUX');
  },
  async buyItem(payload) {
    return this.withDb((db) => {
      const buyer = db.users.find((u) => u.id === payload.userId);
      const item = db.marketplace.find((i) => i.id === payload.itemId);
      if (!buyer || !item) throw new Error('buyer or item missing');
      if (buyer.balance < item.price) throw new Error('insufficient funds');
      if (buyer.inventory.includes(item.id)) throw new Error('already owned');
      buyer.balance -= item.price;
      buyer.inventory.push(item.id);
      const seller = db.users.find((u) => u.id === item.sellerId);
      if (seller) seller.balance += item.price;
      return db;
    }, 'Marketplace purchase');
  },
  async sendMessage(payload) {
    return this.withDb((db) => {
      db.chat.push({ id: `msg-${Date.now()}`, room: payload.room || 'global', userId: payload.userId, text: payload.text, createdAt: new Date().toISOString() });
      db.chat = db.chat.slice(-120);
      return db;
    }, 'Send chat message');
  },
  async updatePresence(payload) {
    return this.withDb((db) => {
      db.presence = db.presence || [];
      db.presence = db.presence.filter((p) => !(p.userId === payload.userId && p.room === payload.room));
      db.presence.push({ userId: payload.userId, room: payload.room, x: payload.x || 0, y: payload.y || 0, updatedAt: new Date().toISOString() });
      const cutoff = Date.now() - 30000;
      db.presence = db.presence.filter((p) => new Date(p.updatedAt).getTime() >= cutoff);
      return db;
    }, 'Update multiplayer presence');
  },
};

const api = APP_CONFIG.mode === 'github' ? githubAdapter : localApi;
window.api = api;
window.APP_CONFIG = APP_CONFIG;
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
