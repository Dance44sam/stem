const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'db.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify({ users: [], presence: [] }, null, 2));
const dataDir = path.join(__dirname, 'data');
const gamesFile = path.join(dataDir, 'games.json');
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(gamesFile)) fs.writeFileSync(gamesFile, JSON.stringify([], null, 2));

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const readDb = () => JSON.parse(fs.readFileSync(dbFile, 'utf8'));
const writeDb = (db) => fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
const readGames = () => JSON.parse(fs.readFileSync(gamesFile, 'utf8'));
const writeGames = (games) => fs.writeFileSync(gamesFile, JSON.stringify(games, null, 2));

const sendJson = (res, code, payload) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
};

const withUser = (db, userId) => db.users.find((u) => u.id === userId);
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 999)}`;

const serveFile = (reqPath, res) => {
  const safe = path.normalize(reqPath).replace(/^\.+/, '');
  let filePath = path.join(publicDir, safe);
  if (reqPath === '/') filePath = path.join(publicDir, 'index.html');
  if (!filePath.startsWith(publicDir)) return sendJson(res, 403, { error: 'Forbidden' });
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'text/plain; charset=utf-8' });
    return res.end(data);
  });
};

const parseBody = (req) => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1_000_000) req.destroy();
  });
  req.on('end', () => {
    try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON payload')); }
  });
});

const routes = async (req, res, url) => {
  if (req.method === 'GET' && url.pathname === '/api/bootstrap') return sendJson(res, 200, readDb());

  if (req.method === 'POST' && url.pathname === '/api/users/register') {
    const body = await parseBody(req);
    const username = String(body.username || '').trim();
    if (!username) return sendJson(res, 400, { error: 'username required' });
    const db = readDb();
    let existing = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!existing) {
      existing = { id: uid('u'), username, bio: 'New player in BlockForge X', balance: 1000, xp: 0, friends: [], inventory: [], createdAt: new Date().toISOString() };
      db.users.push(existing);
      writeDb(db);
    }
    return sendJson(res, 201, existing);
  }

  if (req.method === 'POST' && url.pathname === '/api/worlds/publish') {
    const body = await parseBody(req);
    const db = readDb();
    const owner = withUser(db, body.ownerId);
    if (!owner) return sendJson(res, 404, { error: 'owner not found' });
    const title = String(body.title || '').trim();
    if (!title) return sendJson(res, 400, { error: 'title required' });
    const world = { id: uid('world'), ownerId: owner.id, title, genre: String(body.genre || 'Adventure'), description: String(body.description || ''), tags: Array.isArray(body.tags) ? body.tags.slice(0, 5) : [], activePlayers: 0, likes: 0, visits: 0, thumbnail: body.thumbnail || '🧩', updatedAt: new Date().toISOString() };
    db.worlds.unshift(world);
    owner.xp += 35;
    owner.balance += 75;
    db.transactions.unshift({ id: uid('tx'), type: 'publish_reward', userId: owner.id, amount: 75, createdAt: new Date().toISOString() });
    writeDb(db);
    return sendJson(res, 201, world);
  }

  if (req.method === 'POST' && url.pathname === '/api/social/post') {
    const body = await parseBody(req);
    const db = readDb();
    const user = withUser(db, body.userId);
    if (!user) return sendJson(res, 404, { error: 'user not found' });
    const text = String(body.text || '').trim();
    if (!text) return sendJson(res, 400, { error: 'text required' });
    const post = { id: uid('post'), userId: user.id, text, likes: 0, createdAt: new Date().toISOString() };
    db.posts.unshift(post);
    user.xp += 5;
    writeDb(db);
    return sendJson(res, 201, post);
  }

  if (req.method === 'POST' && url.pathname === '/api/social/friend-request') {
    const body = await parseBody(req);
    const db = readDb();
    const from = withUser(db, body.fromUserId);
    const to = withUser(db, body.toUserId);
    if (!from || !to) return sendJson(res, 404, { error: 'user missing' });
    if (from.id === to.id) return sendJson(res, 400, { error: 'cannot add self' });
    const existing = db.friendRequests.find((r) => r.fromUserId === from.id && r.toUserId === to.id);
    if (existing) return sendJson(res, 200, existing);
    const reqEntry = { id: uid('fr'), fromUserId: from.id, toUserId: to.id, createdAt: new Date().toISOString() };
    db.friendRequests.push(reqEntry);
    writeDb(db);
    return sendJson(res, 201, reqEntry);
  }

  if (req.method === 'POST' && url.pathname === '/api/currency/transfer') {
    const body = await parseBody(req);
    const db = readDb();
    const from = withUser(db, body.fromUserId);
    const to = withUser(db, body.toUserId);
    const amount = Number(body.amount || 0);
    if (!from || !to) return sendJson(res, 404, { error: 'user missing' });
    if (amount <= 0 || !Number.isFinite(amount)) return sendJson(res, 400, { error: 'invalid amount' });
    if (from.balance < amount) return sendJson(res, 400, { error: 'insufficient funds' });
    from.balance -= amount;
    to.balance += amount;
    db.transactions.unshift({ id: uid('tx'), type: 'transfer', fromUserId: from.id, toUserId: to.id, amount, createdAt: new Date().toISOString() });
    writeDb(db);
    return sendJson(res, 200, { fromBalance: from.balance, toBalance: to.balance });
  }

  if (req.method === 'POST' && url.pathname === '/api/marketplace/buy') {
    const body = await parseBody(req);
    const db = readDb();
    const buyer = withUser(db, body.userId);
    const item = db.marketplace.find((entry) => entry.id === body.itemId);
    if (!buyer || !item) return sendJson(res, 404, { error: 'buyer or item missing' });
    if (buyer.inventory.includes(item.id)) return sendJson(res, 400, { error: 'already owned' });
    if (buyer.balance < item.price) return sendJson(res, 400, { error: 'insufficient funds' });
    buyer.balance -= item.price;
    buyer.inventory.push(item.id);
    const seller = withUser(db, item.sellerId);
    if (seller) seller.balance += item.price;
    db.transactions.unshift({ id: uid('tx'), type: 'marketplace_buy', userId: buyer.id, itemId: item.id, amount: item.price, createdAt: new Date().toISOString() });
    writeDb(db);
    return sendJson(res, 200, buyer);
  }

  if (req.method === 'POST' && url.pathname === '/api/chat/send') {
    const body = await parseBody(req);
    const db = readDb();
    const user = withUser(db, body.userId);
    if (!user) return sendJson(res, 404, { error: 'user not found' });
    const text = String(body.text || '').trim();
    if (!text) return sendJson(res, 400, { error: 'text required' });
    const message = { id: uid('msg'), room: String(body.room || 'global'), userId: user.id, text, createdAt: new Date().toISOString() };
    db.chat.push(message);
    db.chat = db.chat.slice(-100);
    writeDb(db);
    return sendJson(res, 201, message);
  }

  if (req.method === 'POST' && url.pathname === '/api/multiplayer/presence') {
    const body = await parseBody(req);
    const db = readDb();
    const user = withUser(db, body.userId);
    if (!user) return sendJson(res, 404, { error: 'user not found' });
    db.presence = Array.isArray(db.presence) ? db.presence : [];
    db.presence = db.presence.filter((p) => !(p.userId === user.id && p.room === String(body.room || 'lobby')));
    db.presence.push({ userId: user.id, room: String(body.room || 'lobby'), x: Number(body.x || 0), y: Number(body.y || 0), updatedAt: new Date().toISOString() });
    const cutoff = Date.now() - 30000;
    db.presence = db.presence.filter((p) => new Date(p.updatedAt).getTime() >= cutoff);
    writeDb(db);
    return sendJson(res, 200, { ok: true, presence: db.presence });
  }

  return false;
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    const handled = await routes(req, res, url);
    if (handled !== false) return;
  } catch (error) {
    return sendJson(res, 400, { error: error.message || 'request failed' });
  }
  return serveFile(url.pathname, res);
});

server.listen(port, () => console.log(`BlockForge X running on http://localhost:${port}`));
const serveFile = (reqPath, res) => {
  const safePath = path.normalize(reqPath).replace(/^\.+/, '');
  let filePath = path.join(publicDir, safePath);

  if (filePath.endsWith(path.sep) || reqPath === '/') {
    filePath = path.join(publicDir, 'index.html');
  }

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain; charset=utf-8' });
    res.end(data);
  });
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/games') {
    const games = readGames().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return sendJson(res, 200, games);
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/games/')) {
    const id = decodeURIComponent(url.pathname.replace('/api/games/', ''));
    const game = readGames().find((entry) => entry.id === id);
    if (!game) return sendJson(res, 404, { error: 'Game not found' });
    return sendJson(res, 200, game);
  }

  if (req.method === 'POST' && url.pathname === '/api/games') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on('end', () => {
      try {
        const { id, title, description, map } = JSON.parse(body || '{}');
        if (!title || !Array.isArray(map) || map.length === 0) {
          return sendJson(res, 400, { error: 'title and map are required' });
        }

        const safeMap = map.map((row) => row.map((cell) => (cell ? 1 : 0)));
        const games = readGames();
        const entry = {
          id: id || `game-${Date.now()}`,
          title: String(title).trim(),
          description: String(description || '').trim(),
          map: safeMap,
          updatedAt: new Date().toISOString(),
        };

        const idx = games.findIndex((g) => g.id === entry.id);
        if (idx >= 0) games[idx] = entry;
        else games.push(entry);
        writeGames(games);

        return sendJson(res, 201, entry);
      } catch {
        return sendJson(res, 400, { error: 'Invalid JSON payload' });
      }
    });
    return;
  }

  return serveFile(url.pathname, res);
});

server.listen(port, () => {
  console.log(`BlockForge PC running at http://localhost:${port}`);
});
