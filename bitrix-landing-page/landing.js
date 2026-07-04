/**
 * JB Marks Digital Workplace Portal — Live Data Script
 * Uses BX.rest.callMethod (Bitrix24 built-in) for authenticated API calls
 * Falls back to static/placeholder data if BX is not available (local preview)
 */

const IS_BITRIX = typeof BX !== 'undefined' && BX.rest;
const PORTAL_URL = 'https://jbmarks.sdinmotion.co.za';

// ─── Date/Time ────────────────────────────────────────────────
function updateDateTime() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  const metaEl = document.querySelector('.welcome-meta');
  if (metaEl) metaEl.innerHTML = `<span>📅 ${dateStr}</span><span>🕗 ${timeStr}</span>`;
}

function updateGreeting(name) {
  const hour = new Date().getHours();
  let greeting = 'Good Morning';
  if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
  else if (hour >= 17) greeting = 'Good Evening';
  const el = document.querySelector('.welcome-greeting');
  if (el) el.textContent = `${greeting}, ${name}! 👋`;
}

updateDateTime();
setInterval(updateDateTime, 60000);

// ─── API Helper ───────────────────────────────────────────────
function callBitrix(method, params) {
  return new Promise((resolve, reject) => {
    if (!IS_BITRIX) { reject('Not in Bitrix'); return; }
    BX.rest.callMethod(method, params || {}, function(result) {
      if (result.error()) reject(result.error());
      else resolve(result.data());
    });
  });
}

// Paginated fetch (gets all results, max 500 for safety)
async function callBitrixAll(method, params, maxItems = 500) {
  if (!IS_BITRIX) throw 'Not in Bitrix';
  let all = [];
  let start = 0;
  let hasMore = true;
  while (hasMore && all.length < maxItems) {
    const data = await new Promise((resolve, reject) => {
      BX.rest.callMethod(method, { ...params, start }, function(result) {
        if (result.error()) reject(result.error());
        else resolve({ items: result.data(), next: result.next() });
      });
    });
    if (data.items) {
      if (Array.isArray(data.items)) all = all.concat(data.items);
      else if (data.items.tasks) all = all.concat(data.items.tasks);
    }
    if (data.next && all.length < maxItems) start = data.next;
    else hasMore = false;
  }
  return all;
}

// ─── Load Current User ────────────────────────────────────────
async function loadCurrentUser() {
  try {
    const user = await callBitrix('user.current');
    const name = user.NAME || 'User';
    updateGreeting(name);
    // Update top-right user profile
    const avatarEl = document.querySelector('.user-avatar');
    const nameEl = document.querySelector('.user-name');
    const roleEl = document.querySelector('.user-role');
    if (avatarEl) avatarEl.textContent = (user.NAME?.[0] || '') + (user.LAST_NAME?.[0] || '');
    if (nameEl) nameEl.textContent = user.NAME || '';
    if (roleEl) roleEl.textContent = user.WORK_POSITION || 'Team Member';
    return user;
  } catch(e) {
    updateGreeting('User'); // fallback
    return null;
  }
}

// ─── Load Stats ───────────────────────────────────────────────
async function loadStats() {
  try {
    const tasks = await callBitrixAll('tasks.task.list', {
      filter: { '!STATUS': [5, 6] },
      select: ['ID', 'STATUS', 'DEADLINE', 'CREATED_DATE']
    });

    const now = new Date();
    const open = tasks.length;
    const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < now).length;
    const pending = tasks.filter(t => t.status === '4' || t.status === 4).length;
    const today = now.toISOString().split('T')[0];
    const todayCount = tasks.filter(t => t.createdDate && t.createdDate.startsWith(today)).length;

    // Update stat values
    const setStatVal = (idx, val) => {
      const els = document.querySelectorAll('.stat-value');
      if (els[idx]) els[idx].textContent = val;
    };
    setStatVal(0, open);
    setStatVal(1, overdue);
    setStatVal(2, pending);
    setStatVal(3, todayCount);

    // Users online (try im.user.status.idle.get or user.get active)
    try {
      const users = await callBitrix('user.get', { filter: { ACTIVE: true } });
      const onlineCount = Array.isArray(users) ? users.length : 0;
      setStatVal(4, onlineCount);
    } catch(e) { /* skip */ }

    // SLA compliance (% of tasks not overdue)
    if (open > 0) {
      const sla = Math.round(((open - overdue) / open) * 100);
      setStatVal(5, sla + '%');
    }
  } catch(e) {
    // Keep placeholder values on error
  }
}

// ─── Load My Tasks ────────────────────────────────────────────
async function loadMyTasks() {
  try {
    const user = await callBitrix('user.current');
    const result = await callBitrix('tasks.task.list', {
      filter: { RESPONSIBLE_ID: user.ID, '!STATUS': [5, 6] },
      order: { DEADLINE: 'asc' },
      select: ['ID', 'TITLE', 'DEADLINE', 'GROUP_ID'],
      start: 0
    });
    const tasks = result.tasks || [];
    const container = document.querySelector('.task-list');
    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = '<div class="task-item"><div class="task-body"><div class="task-title" style="color:#6b7280">No active tasks 🎉</div></div></div>';
      return;
    }

    // Update view-all count
    const viewAll = container.closest('.panel')?.querySelector('.view-all');
    if (viewAll) viewAll.textContent = `View all (${tasks.length})`;

    container.innerHTML = tasks.slice(0, 5).map(t => {
      const deadline = t.deadline ? new Date(t.deadline) : null;
      const now = new Date();
      let dueText = deadline ? deadline.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      let dueClass = '';
      if (deadline) {
        const diffDays = Math.ceil((deadline - now) / (1000*60*60*24));
        if (diffDays <= 0) { dueText = 'Overdue'; dueClass = 'red'; }
        else if (diffDays === 1) { dueText = 'Due tomorrow'; dueClass = 'orange'; }
        else if (diffDays <= 3) { dueClass = 'orange'; }
      }
      const taskUrl = `/company/personal/user/${user.ID}/tasks/task/view/${t.id}/`;
      return `<a href="${taskUrl}" class="task-item" style="text-decoration:none;color:inherit"><div class="task-dot"></div><div class="task-body"><div class="task-title">${escapeHtml(t.title)}</div><div class="task-dept">Task #${t.id}</div></div><span class="task-due ${dueClass}">${dueText}</span></a>`;
    }).join('');
  } catch(e) { /* keep static */ }
}

// ─── Load Recent Activity ─────────────────────────────────────
async function loadRecentActivity() {
  try {
    const result = await callBitrix('log.blogpost.get', { POST_PER_PAGE: 5 });
    const posts = Array.isArray(result) ? result : [];
    const container = document.querySelector('.activity-list');
    if (!container || posts.length === 0) return;

    const icons = ['🎫', '📁', '💼', '💰', '📊'];
    const colors = ['blue', 'green', 'purple', 'gold', 'indigo'];

    container.innerHTML = posts.slice(0, 5).map((p, i) => {
      const date = p.DATE_PUBLISH ? new Date(p.DATE_PUBLISH) : new Date();
      const diff = Math.round((Date.now() - date.getTime()) / 60000);
      let timeText = diff < 1 ? 'Just now' : diff < 60 ? `${diff} min ago` : diff < 1440 ? `${Math.round(diff/60)} hr ago` : `${Math.round(diff/1440)} days ago`;
      const title = p.TITLE || (p.POST_TEXT ? stripHtml(p.POST_TEXT).substring(0, 80) : 'Activity');
      return `<div class="activity-item"><div class="activity-icon ${colors[i % 5]}">${icons[i % 5]}</div><div class="activity-body"><div class="activity-title">${escapeHtml(title)}</div><div class="activity-dept">${escapeHtml(p.AUTHOR_NAME || '')}</div></div><span class="activity-time">${timeText}</span></div>`;
    }).join('');
  } catch(e) { /* keep static */ }
}

// ─── Load Notifications Badge ─────────────────────────────────
async function loadNotifications() {
  try {
    const result = await callBitrix('im.notify.get', { limit: 50 });
    const notifs = Array.isArray(result) ? result : (result?.notifications || []);
    const unread = notifs.filter(n => !n.read).length;
    const badge = document.getElementById('notifBadge');
    if (badge) {
      badge.textContent = unread > 99 ? '99+' : unread;
      badge.style.display = unread > 0 ? '' : 'none';
    }
  } catch(e) { /* skip */ }
}

// ─── Load Unread Messages Badge ───────────────────────────────
async function loadMessages() {
  try {
    const result = await callBitrix('im.recent.get', { SKIP_OPENLINES: 'Y' });
    const chats = Array.isArray(result) ? result : [];
    const unread = chats.filter(c => c.counter > 0).reduce((s, c) => s + c.counter, 0);
    const badge = document.getElementById('msgBadge');
    if (badge) {
      badge.textContent = unread > 99 ? '99+' : unread;
      badge.style.display = unread > 0 ? '' : 'none';
    }
  } catch(e) { /* skip */ }
}

// ─── Load Weather ─────────────────────────────────────────────
async function loadWeather() {
  try {
    // Potchefstroom / JB Marks area coordinates
    const resp = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-26.72&longitude=27.09&current_weather=true');
    const data = await resp.json();
    if (data.current_weather) {
      const temp = Math.round(data.current_weather.temperature);
      const code = data.current_weather.weathercode;
      let desc = 'Clear ☀️';
      if (code >= 1 && code <= 3) desc = 'Partly Cloudy ⛅';
      else if (code >= 45 && code <= 48) desc = 'Foggy 🌫️';
      else if (code >= 51 && code <= 55) desc = 'Drizzle 🌦️';
      else if (code >= 56 && code <= 67) desc = 'Rainy 🌧️';
      else if (code >= 71 && code <= 77) desc = 'Snowy ❄️';
      else if (code >= 80 && code <= 82) desc = 'Showers 🌧️';
      else if (code >= 95) desc = 'Thunderstorm ⛈️';

      const tempEl = document.querySelector('.weather-temp');
      const descEl = document.querySelector('.weather-desc');
      if (tempEl) tempEl.textContent = `${temp}°C`;
      if (descEl) descEl.textContent = desc;
    }
  } catch(e) { /* keep static */ }
}

// ─── Load Announcements (from blog/stream) ────────────────────
async function loadAnnouncements() {
  try {
    const result = await callBitrix('log.blogpost.get', {
      POST_PER_PAGE: 3,
      FILTER: { POST_TYPE: 'IM' }  // Important messages
    });
    const posts = Array.isArray(result) ? result : [];
    const container = document.getElementById('announceList');
    if (!container || posts.length === 0) return;

    const icons = ['⚠️', '📋', '🌿'];
    const colors = ['orange', 'blue', 'green'];

    container.innerHTML = posts.slice(0, 3).map((p, i) => {
      const date = p.DATE_PUBLISH ? new Date(p.DATE_PUBLISH) : new Date();
      const diff = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      let timeText = diff < 1 ? 'Today' : diff === 1 ? 'Yesterday' : diff < 7 ? `${diff} days ago` : `${Math.round(diff/7)} weeks ago`;
      const title = p.TITLE || 'Announcement';
      const desc = p.POST_TEXT ? stripHtml(p.POST_TEXT).substring(0, 100) : '';
      return `<div class="announce-item"><div class="announce-icon ${colors[i % 3]}">${icons[i % 3]}</div><div class="announce-body"><div class="announce-title">${escapeHtml(title)}</div><div class="announce-desc">${escapeHtml(desc)}</div></div><span class="announce-time">${timeText}</span></div>`;
    }).join('');
  } catch(e) { /* keep static */ }
}

// ─── Global Search ────────────────────────────────────────────
function initSearch() {
  const globalInput = document.getElementById('globalSearch') || document.querySelector('.global-search-input');
  const sidebarInput = document.getElementById('sidebarSearch') || document.querySelector('.search-input');

  function doSearch(query) {
    if (!query.trim()) return;
    // Redirect to Bitrix universal search
    window.location.href = `/search/?q=${encodeURIComponent(query.trim())}`;
  }

  if (globalInput) {
    globalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch(e.target.value);
    });
  }
  if (sidebarInput) {
    sidebarInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch(e.target.value);
    });
  }
}

// ─── Sidebar Toggle (Mobile) ─────────────────────────────────
function initSidebarToggle() {
  const toggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }
}

// ─── Utility ──────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// ─── Active Nav Highlight ─────────────────────────────────────
function highlightActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    const href = item.getAttribute('href');
    if (href === path || (href !== '/' && path.startsWith(href))) {
      item.classList.add('active');
    }
  });
  // Default to home if nothing else matches
  if (!document.querySelector('.nav-item.active')) {
    const home = document.querySelector('.nav-item[href="/"]');
    if (home) home.classList.add('active');
  }
}

// ─── Initialize ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initSearch();
  initSidebarToggle();
  highlightActiveNav();

  // Load live data
  loadCurrentUser();
  loadStats();
  loadMyTasks();
  loadRecentActivity();
  loadAnnouncements();
  loadNotifications();
  loadMessages();
  loadWeather();

  // Auto-refresh every 60 seconds
  setInterval(() => {
    loadStats();
    loadMyTasks();
    loadRecentActivity();
    loadNotifications();
    loadMessages();
  }, 60000);

  // Refresh weather every 15 minutes
  setInterval(loadWeather, 900000);
});
