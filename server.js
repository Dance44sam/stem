const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
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

const readGames = () => JSON.parse(fs.readFileSync(gamesFile, 'utf8'));
const writeGames = (games) => fs.writeFileSync(gamesFile, JSON.stringify(games, null, 2));

const sendJson = (res, code, payload) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
};

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
