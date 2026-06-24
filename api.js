/* ============================================================
   kpr.lol — Shared API Client & Toast System
   ============================================================ */

const API = {
  BASE: 'https://api.kpr.lol',

  /* ── Token management ─────────────────────────────────── */
  getToken()  { return localStorage.getItem('kpr_token'); },
  setToken(t) { localStorage.setItem('kpr_token', t); },
  clearToken() { localStorage.removeItem('kpr_token'); },
  isLoggedIn() { return !!this.getToken(); },

  /* ── User info cache ──────────────────────────────────── */
  getUser()  { return JSON.parse(localStorage.getItem('kpr_user') || 'null'); },
  setUser(u) { localStorage.setItem('kpr_user', JSON.stringify(u)); },
  clearUser() { localStorage.removeItem('kpr_user'); },

  /* ── Core request helper ──────────────────────────────── */
  async request(endpoint, options = {}) {
    const url = this.BASE + endpoint;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    const token = this.getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    try {
      const res = await fetch(url, { ...options, headers });

      /* Handle empty responses (204 etc.) */
      const text = await res.text();
      let data = null;
      if (text) {
        try { data = JSON.parse(text); }
        catch (_) { data = { message: text }; }
      }

      if (!res.ok) {
        const err = { status: res.status, ...(data || {}) };
        throw err;
      }
      return data;
    } catch (err) {
      /* Network error (not HTTP error) */
      if (!err.status) {
        throw { status: 0, message: 'Network error — check your connection.' };
      }
      throw err;
    }
  },

  /* ── Auth endpoints ───────────────────────────────────── */
  signup(username, password, inviteCode) {
    return this.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, password, inviteCode })
    });
  },

  login(username, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  /* ── Profile / User endpoints ─────────────────────────── */
  getProfile(username) {
    return this.request('/api/profile/' + encodeURIComponent(username));
  },

  getMe() {
    return this.request('/api/user/me');
  },

  updateProfile(data) {
    return this.request('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  updateSettings(data) {
    return this.request('/api/user/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  updateSocials(links) {
    return this.request('/api/user/socials', {
      method: 'PUT',
      body: JSON.stringify({ links })
    });
  },

  /* ── Admin endpoints ──────────────────────────────────── */
  getInvites() {
    return this.request('/api/admin/invites');
  },

  createInvites(count) {
    return this.request('/api/admin/invites', {
      method: 'POST',
      body: JSON.stringify({ count })
    });
  },

  deleteInvite(code) {
    return this.request('/api/admin/invites/' + encodeURIComponent(code), {
      method: 'DELETE'
    });
  },

  getUsers() {
    return this.request('/api/admin/users');
  },

  /* ── Logout ───────────────────────────────────────────── */
  logout() {
    this.clearToken();
    this.clearUser();
    window.location.href = '/login';
  }
};


/* ============================================================
   Toast Notification System
   ============================================================ */
const Toast = {
  _container: null,

  _getContainer() {
    if (this._container) return this._container;
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        display: flex;
        flex-direction: column-reverse;
        gap: 10px;
        pointer-events: none;
        max-width: 400px;
        width: calc(100% - 48px);
      `;
      document.body.appendChild(c);
    }
    this._container = c;
    return c;
  },

  show(message, type = 'error', duration = 4000) {
    const container = this._getContainer();

    const colors = {
      error:   { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)',  icon: 'fa-circle-xmark',      color: '#f87171' },
      success: { bg: 'rgba(34, 197, 94, 0.12)',  border: 'rgba(34, 197, 94, 0.3)',   icon: 'fa-circle-check',      color: '#4ade80' },
      info:    { bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.3)',  icon: 'fa-circle-info',       color: '#818cf8' },
      warning: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)',  icon: 'fa-triangle-exclamation', color: '#fbbf24' }
    };

    const c = colors[type] || colors.error;

    const toast = document.createElement('div');
    toast.style.cssText = `
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      background: ${c.bg};
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid ${c.border};
      border-radius: 14px;
      color: #e2e8f0;
      font-family: 'Poppins', sans-serif;
      font-size: 0.88rem;
      font-weight: 500;
      line-height: 1.4;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      transform: translateX(120%);
      opacity: 0;
      transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1),
                  opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
    `;

    toast.innerHTML = `
      <i class="fa-solid ${c.icon}" style="font-size: 1.15rem; color: ${c.color}; flex-shrink: 0;"></i>
      <span style="flex: 1;">${message}</span>
      <i class="fa-solid fa-xmark" style="font-size: 0.85rem; color: rgba(255,255,255,0.35); cursor: pointer; flex-shrink: 0; padding: 4px; transition: color 0.2s;" onmouseenter="this.style.color='#fff'" onmouseleave="this.style.color='rgba(255,255,255,0.35)'"></i>
    `;

    container.appendChild(toast);

    /* Slide in */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
      });
    });

    const dismiss = () => {
      toast.style.transform = 'translateX(120%)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 460);
    };

    /* Click to dismiss */
    toast.addEventListener('click', dismiss);

    /* Auto-dismiss */
    if (duration > 0) {
      setTimeout(dismiss, duration);
    }

    return toast;
  }
};
