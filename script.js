(function () {
  // ⚠️ Update this once the Render service is live — see README for the exact steps.
  const API_BASE = 'https://registro-salidas-api.onrender.com';

  const TOKEN_KEY = 'rs_token';
  const el = id => document.getElementById(id);

  const views = {
    auth: el('view-auth'),
    groups: el('view-groups'),
    group: el('view-group'),
  };
  function showView(name) {
    Object.entries(views).forEach(([k, v]) => { v.hidden = k !== name; });
  }

  const toastEl = el('toast');
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }

  async function api(path, opts = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(API_BASE + path, Object.assign({}, opts, { headers }));
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      const msg = (data && data.detail) || ('Error ' + res.status);
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    return data;
  }

  // ---------- pending invite (from ?join=TOKEN in the URL) ----------
  const params = new URLSearchParams(location.search);
  const pendingInvite = params.get('join');
  if (pendingInvite) {
    el('joinNote').hidden = false;
  }

  async function consumePendingInviteIfAny() {
    if (!pendingInvite) return null;
    try {
      const group = await api('/groups/join/' + encodeURIComponent(pendingInvite), { method: 'POST' });
      history.replaceState(null, '', location.pathname);
      toast('Te uniste a "' + group.name + '" 🎉');
      return group;
    } catch (e) {
      toast('El enlace de invitación no es válido');
      history.replaceState(null, '', location.pathname);
      return null;
    }
  }

  // ---------- auth screen ----------
  el('tabLogin').addEventListener('click', () => switchAuthTab('login'));
  el('tabSignup').addEventListener('click', () => switchAuthTab('signup'));
  function switchAuthTab(which) {
    const isLogin = which === 'login';
    el('tabLogin').classList.toggle('active', isLogin);
    el('tabSignup').classList.toggle('active', !isLogin);
    el('loginForm').hidden = !isLogin;
    el('signupForm').hidden = isLogin;
    el('authStatus').textContent = '';
  }

  el('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = el('authStatus');
    status.className = 'status-msg'; status.textContent = 'Entrando...';
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: el('loginIdentifier').value.trim(),
          password: el('loginPassword').value,
        }),
      });
      setToken(data.access_token);
      status.textContent = '';
      await afterAuth();
    } catch (err) {
      status.className = 'status-msg err';
      status.textContent = err.message;
    }
  });

  el('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = el('authStatus');
    status.className = 'status-msg'; status.textContent = 'Creando cuenta...';
    try {
      const data = await api('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          name: el('suName').value.trim(),
          last_name: el('suLastName').value.trim(),
          username: el('suUsername').value.trim(),
          email: el('suEmail').value.trim(),
          password: el('suPassword').value,
        }),
      });
      setToken(data.access_token);
      status.textContent = '';
      await afterAuth();
    } catch (err) {
      status.className = 'status-msg err';
      status.textContent = err.message;
    }
  });

  el('logoutBtn').addEventListener('click', () => {
    clearToken();
    location.reload();
  });

  async function afterAuth() {
    const joined = await consumePendingInviteIfAny();
    if (joined) {
      openGroup(joined.id);
    } else {
      await loadGroupsList();
    }
  }

  // ---------- groups list ----------
  async function loadGroupsList() {
    showView('groups');
    const statusEl = el('groupsStatus');
    statusEl.textContent = '';
    try {
      const me = await api('/auth/me');
      el('helloMsg').textContent = 'Hola, ' + me.name + ' 💗';
      const groups = await api('/groups/mine');
      renderGroupsList(groups);
    } catch (err) {
      // token invalid/expired
      clearToken();
      showView('auth');
    }
  }

  function renderGroupsList(groups) {
    const list = el('groupsList');
    if (!groups.length) {
      list.innerHTML = '<p class="empty-note">Todavía no tienes grupos. Crea uno abajo 👇</p>';
      return;
    }
    list.innerHTML = groups.map(g => `
      <div class="group-item" data-id="${g.id}">
        <div>
          <div class="g-name">${escapeHtml(g.name)}</div>
          <div class="g-meta">${g.total} salidas · ${g.completed} completadas</div>
        </div>
        <span class="g-arrow">›</span>
      </div>
    `).join('');
    list.querySelectorAll('.group-item').forEach(item => {
      item.addEventListener('click', () => openGroup(Number(item.dataset.id)));
    });
  }

  el('createGroupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = el('groupsStatus');
    const name = el('newGroupName').value.trim();
    if (!name) return;
    statusEl.className = 'status-msg'; statusEl.textContent = 'Creando...';
    try {
      const group = await api('/groups', { method: 'POST', body: JSON.stringify({ name }) });
      el('newGroupName').value = '';
      statusEl.textContent = '';
      openGroup(group.id);
    } catch (err) {
      statusEl.className = 'status-msg err';
      statusEl.textContent = err.message;
    }
  });

  el('backBtn').addEventListener('click', loadGroupsList);

  // ---------- group / stamp card ----------
  let currentGroupId = null;

  async function openGroup(id) {
    currentGroupId = id;
    showView('group');
    await refreshGroup();
  }

  async function refreshGroup() {
    try {
      const g = await api('/groups/' + currentGroupId);
      renderGroup(g);
    } catch (err) {
      toast(err.message);
      loadGroupsList();
    }
  }

  function renderGroup(g) {
    el('groupName').textContent = g.name;
    el('totalVal').textContent = g.total;
    el('completedVal').textContent = g.completed;

    const grid = el('stampGrid');
    grid.innerHTML = '';
    for (let i = 0; i < g.stamps_per_card; i++) {
      const filled = i < g.progress;
      const div = document.createElement('div');
      div.className = 'stamp' + (filled ? ' filled' : '');
      div.innerHTML = '<span class="glyph">' + (filled ? g.completed_icon : '🤍') + '</span>';
      grid.appendChild(div);
    }

    if (g.progress === 0 && g.total > 0) {
      el('progressNote').textContent = '¡Tarjeta completa! Empezando una nueva 🎉';
    } else {
      el('progressNote').textContent = g.progress + ' / ' + g.stamps_per_card + ' para la próxima tarjeta';
    }

    el('membersRow').innerHTML = g.members.map(m =>
      `<span class="member-chip">${escapeHtml(m.name)}</span>`
    ).join('');

    el('inviteBtn').dataset.token = g.invite_token;
  }

  el('logBtn').addEventListener('click', async () => {
    try {
      const g = await api('/groups/' + currentGroupId + '/log', { method: 'POST', body: JSON.stringify({}) });
      const card = document.getElementById('view-group');
      card.classList.remove('celebrate');
      void card.offsetWidth;
      card.classList.add('celebrate');
      renderGroup(g);
      toast(g.progress === 0 ? '🎉 ¡Tarjeta completa!' : 'Salida registrada ✓');
    } catch (err) {
      toast(err.message);
    }
  });

  el('iconBtn').addEventListener('click', async () => {
    const next = window.prompt('Ícono para cuando se completa una tarjeta (pega un emoji):', '💗');
    if (!next) return;
    try {
      const g = await api('/groups/' + currentGroupId, {
        method: 'PATCH',
        body: JSON.stringify({ completed_icon: next.trim() }),
      });
      renderGroup(g);
      toast('Ícono actualizado');
    } catch (err) {
      toast(err.message);
    }
  });

  el('inviteBtn').addEventListener('click', async () => {
    const token = el('inviteBtn').dataset.token;
    const link = location.origin + location.pathname + '?join=' + encodeURIComponent(token);
    try {
      await navigator.clipboard.writeText(link);
      toast('Enlace de invitación copiado 📋');
    } catch (e) {
      window.prompt('Copia este enlace:', link);
    }
  });

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- boot ----------
  (async function boot() {
    if (getToken()) {
      await afterAuth();
    } else {
      showView('auth');
      switchAuthTab(pendingInvite ? 'signup' : 'login');
    }
  })();
})();
