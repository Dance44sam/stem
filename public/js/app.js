const state = { db: null, user: null };

const el = (id) => document.getElementById(id);
const formatAgo = (iso) => new Date(iso).toLocaleString();

function userName(id) {
  const user = state.db.users.find((u) => u.id === id);
  return user ? user.username : id;
}

function renderProfile() {
  if (!state.user) return;
  el('profileName').textContent = `${state.user.username} (${state.user.id})`;
  el('profileBalance').textContent = state.user.balance;
  el('profileXp').textContent = state.user.xp;
  el('profileFriends').textContent = state.user.friends.length;
}

function renderWorlds() {
  el('worldGrid').innerHTML = state.db.worlds.map((w) => `
    <article class="card">
      <div class="emoji">${w.thumbnail || '🧩'}</div>
      <h4>${w.title}</h4>
      <p class="muted">${w.genre} • by ${userName(w.ownerId)}</p>
      <p>${w.description}</p>
      <p class="muted">👥 ${w.activePlayers} • ❤️ ${w.likes} • 👁️ ${w.visits}</p>
      <div class="chips">${w.tags.map((t) => `<span>${t}</span>`).join('')}</div>
    </article>
  `).join('');
}

function renderPosts() {
  el('postList').innerHTML = state.db.posts.slice(0, 8).map((p) => `
    <article class="card slim"><b>${userName(p.userId)}</b><p>${p.text}</p><small>${formatAgo(p.createdAt)} • ❤️ ${p.likes}</small></article>
  `).join('');
}

function renderMarketplace() {
  el('marketList').innerHTML = state.db.marketplace.map((item) => `
    <article class="card slim">
      <b>${item.name}</b>
      <p class="muted">${item.rarity} • ${item.price} BUX</p>
      <p class="muted">Seller: ${userName(item.sellerId)}</p>
      <button data-buy="${item.id}">Buy</button>
    </article>
  `).join('');

  el('marketList').querySelectorAll('[data-buy]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!state.user) return setStatus('Login first');
      try {
        await api.buyItem({ userId: state.user.id, itemId: button.dataset.buy });
        await refresh();
        setStatus('Item purchased');
      } catch (error) {
        setStatus(error.message);
      }
    });
  });
}

function renderChat() {
  el('chatList').innerHTML = state.db.chat.slice(-20).map((m) => `
    <p><b>${userName(m.userId)}:</b> ${m.text} <small class="muted">${new Date(m.createdAt).toLocaleTimeString()}</small></p>
  `).join('');
}

function setStatus(text) {
  el('status').textContent = text;
}

async function refresh() {
  state.db = await api.bootstrap();
  if (state.user) state.user = state.db.users.find((u) => u.id === state.user.id);
  renderProfile();
  renderWorlds();
  renderPosts();
  renderMarketplace();
  renderChat();
}

el('loginBtn').addEventListener('click', async () => {
  const username = el('usernameInput').value.trim();
  if (!username) return setStatus('Type username');
  try {
    state.user = await api.register(username);
    await refresh();
    setStatus(`Logged in as ${state.user.username}`);
  } catch (error) {
    setStatus(error.message);
  }
});

el('publishWorldBtn').addEventListener('click', async () => {
  if (!state.user) return setStatus('Login first');
  try {
    await api.publishWorld({
      ownerId: state.user.id,
      title: el('worldTitle').value,
      genre: el('worldGenre').value,
      description: el('worldDescription').value,
      tags: el('worldTags').value.split(',').map((t) => t.trim()).filter(Boolean),
      thumbnail: '🚀',
    });
    await refresh();
    setStatus('World published and rewards granted');
  } catch (error) {
    setStatus(error.message);
  }
});

el('postBtn').addEventListener('click', async () => {
  if (!state.user) return setStatus('Login first');
  try {
    await api.createPost({ userId: state.user.id, text: el('postText').value });
    el('postText').value = '';
    await refresh();
    setStatus('Posted to feed');
  } catch (error) {
    setStatus(error.message);
  }
});

el('sendFriendBtn').addEventListener('click', async () => {
  if (!state.user) return setStatus('Login first');
  try {
    await api.requestFriend({ fromUserId: state.user.id, toUserId: el('friendUserId').value.trim() });
    await refresh();
    setStatus('Friend request sent');
  } catch (error) {
    setStatus(error.message);
  }
});

el('transferBtn').addEventListener('click', async () => {
  if (!state.user) return setStatus('Login first');
  try {
    await api.transfer({ fromUserId: state.user.id, toUserId: el('transferUserId').value.trim(), amount: Number(el('transferAmount').value) });
    await refresh();
    setStatus('Transfer complete');
  } catch (error) {
    setStatus(error.message);
  }
});

el('sendChatBtn').addEventListener('click', async () => {
  if (!state.user) return setStatus('Login first');
  try {
    await api.sendMessage({ userId: state.user.id, room: 'global', text: el('chatInput').value });
    el('chatInput').value = '';
    await refresh();
  } catch (error) {
    setStatus(error.message);
  }
});

refresh();
setInterval(refresh, 15000);
