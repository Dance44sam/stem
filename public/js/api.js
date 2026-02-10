const api = {
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
  acceptFriend(payload) { return this.request('/api/social/friend-accept', { method: 'POST', body: JSON.stringify(payload) }); },
  transfer(payload) { return this.request('/api/currency/transfer', { method: 'POST', body: JSON.stringify(payload) }); },
  buyItem(payload) { return this.request('/api/marketplace/buy', { method: 'POST', body: JSON.stringify(payload) }); },
  sendMessage(payload) { return this.request('/api/chat/send', { method: 'POST', body: JSON.stringify(payload) }); },
};
