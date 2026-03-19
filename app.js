/* ============================================================
   REMINDERS APP - Complete JavaScript Logic
   localStorage-only, production-grade
   ============================================================ */
(function () {
  'use strict';

  // ======================== CONSTANTS ========================
  const STORAGE_KEY = 'reminders_app_data';
  const THEME_KEY = 'reminders_theme';
  const POMODORO_KEY = 'reminders_pomodoro_counts';
  const ORDER_KEY = 'reminders_custom_order';
  const NOTIFICATION_INTERVAL = 30000;
  const POMODORO_DURATION = 25 * 60; // 25 minutes in seconds

  // ======================== HELPERS ========================
  const $ = (id) => document.getElementById(id);
  const qs = (sel, ctx) => (ctx || document).querySelector(sel);
  const qsa = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  function safeGet(id) {
    const el = $(id);
    if (!el) console.warn(`Element #${id} not found`);
    return el;
  }

  // ======================== STATE ========================
  let reminders = [];
  let customOrder = [];
  let selectedIds = new Set();
  let currentFilter = 'all';
  let currentSort = 'date';
  let currentView = 'cards';
  let calendarMonth = new Date().getMonth();
  let calendarYear = new Date().getFullYear();
  let pomodoroTimer = null;
  let pomodoroRemaining = 0;
  let pomodoroReminderId = null;
  let deferredPWAPrompt = null;
  let draggedCardId = null;

  // Category colors
  const CATEGORY_COLORS = {
    work: '#3b82f6',
    personal: '#8b5cf6',
    health: '#10b981',
    finance: '#f59e0b',
    holiday: '#ef4444',
    learning: '#06b6d4',
    other: '#6b7280'
  };

  const PRIORITY_COLORS = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#22c55e'
  };

  const SEASON_WEATHER = {
    0: '❄️', 1: '🌸', 2: '🌸', 3: '☀️', 4: '☀️', 5: '🌧️',
    6: '🌧️', 7: '🌧️', 8: '🌧️', 9: '🍂', 10: '🍂', 11: '❄️'
  };

  // ======================== STORAGE ========================
  function loadReminders() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      reminders = data ? JSON.parse(data) : [];
    } catch (e) {
      reminders = [];
    }
  }

  function saveReminders() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  }

  function loadOrder() {
    try {
      const data = localStorage.getItem(ORDER_KEY);
      customOrder = data ? JSON.parse(data) : [];
    } catch (e) {
      customOrder = [];
    }
  }

  function saveOrder() {
    localStorage.setItem(ORDER_KEY, JSON.stringify(customOrder));
  }

  function loadPomodoroCounts() {
    try {
      const data = localStorage.getItem(POMODORO_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  function savePomodoroCount(reminderId) {
    const counts = loadPomodoroCounts();
    counts[reminderId] = (counts[reminderId] || 0) + 1;
    localStorage.setItem(POMODORO_KEY, JSON.stringify(counts));
  }

  // ======================== SEED DATA ========================
  function seedData() {
    if (reminders.length > 0) return;

    const now = Date.now();
    const seeds = [
      { title: 'Railway Trial Expiring - Upgrade Plan', desc: 'Railway deployment trial expires ~Mar 25. Upgrade plan or migrate services. Check railway.app/account/billing', date: '2026-03-25T10:00', priority: 'high', category: 'work', source: 'Gmail' },
      { title: 'Submit EOD Report - Daily', desc: 'Send daily End-of-Day report. Attach OverAll.xlsx with updates.', date: '2026-03-19T17:30', priority: 'high', category: 'work', recur: 'weekdays', source: 'Gmail' },
      { title: 'Review Navachetana Agent Applications', desc: 'Multiple empanelment applications processed: NC-CON-2026-06595 (Suresh), NC-CON-2026-38746 (Raghunandan), NC-CON-2026-93431 (Karthik). Verify all approved.', date: '2026-03-20T11:00', priority: 'high', category: 'work', source: 'Gmail' },
      { title: 'Follow Up on Interview Opportunity', desc: 'Skill Scout Consultancy sent interview 1st round details. Review and decide. Email from alerts@jobs.shine.com', date: '2026-03-21T10:00', priority: 'high', category: 'personal', source: 'Gmail' },
      { title: 'Ramzan Id - Public Holiday', desc: '', date: '2026-03-21T09:00', priority: 'medium', category: 'holiday', source: 'Google Calendar' },
      { title: 'Rama Navami - Public Holiday', desc: '', date: '2026-03-26T09:00', priority: 'medium', category: 'holiday', source: 'Google Calendar' },
      { title: 'Mahavir Jayanti - Public Holiday', desc: '', date: '2026-03-31T09:00', priority: 'medium', category: 'holiday', source: 'Google Calendar' },
      { title: 'Good Friday - Public Holiday', desc: '', date: '2026-04-03T09:00', priority: 'medium', category: 'holiday', source: 'Google Calendar' },
      { title: 'Weekly EOD Report Summary', desc: 'Compile weekly summary of all EOD reports.', date: '2026-03-21T16:00', priority: 'medium', category: 'work', recur: 'weekly', source: 'Gmail' },
      { title: 'Ambedkar Jayanti / Vaisakhi / Mesadi', desc: '', date: '2026-04-14T09:00', priority: 'medium', category: 'holiday', source: 'Google Calendar' },
      { title: 'Check Railway Deployment Status', desc: 'Monitor Railway app after trial upgrade.', date: '2026-03-26T14:00', priority: 'medium', category: 'work', source: 'Gmail' },
      { title: 'Ugadi & Gudi Padwa - Festival', desc: 'Telugu/Kannada & Marathi New Year!', date: '2026-03-19T08:00', priority: 'low', category: 'holiday', source: 'Google Calendar' },
      { title: 'Jamat Ul-Vida Observance', desc: '', date: '2026-03-20T09:00', priority: 'low', category: 'holiday', source: 'Google Calendar' },
      { title: 'Easter Sunday', desc: '', date: '2026-04-05T09:00', priority: 'low', category: 'holiday', source: 'Google Calendar' },
      { title: 'Bahag Bihu', desc: '', date: '2026-04-15T09:00', priority: 'low', category: 'holiday', source: 'Google Calendar' },
      { title: 'Buddha Purnima - Public Holiday', desc: '', date: '2026-05-01T09:00', priority: 'low', category: 'holiday', source: 'Google Calendar' },
      { title: 'Bakrid - Public Holiday (Tentative)', desc: '', date: '2026-05-27T09:00', priority: 'low', category: 'holiday', source: 'Google Calendar' },
      { title: 'Lemon AI - Product Hunt Support', desc: 'Consider upvoting on Product Hunt.', date: '2026-03-20T12:00', priority: 'low', category: 'personal', source: 'Gmail' },
      { title: 'Muharram/Ashura - Public Holiday (Tentative)', desc: '', date: '2026-06-26T09:00', priority: 'low', category: 'holiday', source: 'Google Calendar' }
    ];

    reminders = seeds.map((s, i) => ({
      id: crypto.randomUUID(),
      title: s.title,
      desc: s.desc || '',
      date: s.date,
      priority: s.priority,
      category: s.category,
      recur: s.recur || 'none',
      pinned: false,
      completed: false,
      completedAt: null,
      createdAt: now + i,
      snoozedUntil: null,
      subtasks: [],
      source: s.source || null,
      kanbanStatus: 'todo',
      notified: false
    }));

    saveReminders();
  }

  // ======================== THEME ========================
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    const btn = safeGet('themeToggle');
    if (btn) {
      btn.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem(THEME_KEY, isDark ? 'light' : 'dark');
      });
    }
  }

  // ======================== PWA ========================
  function initPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPWAPrompt = e;
      const btn = safeGet('pwaInstall');
      if (btn) btn.style.display = 'inline-flex';
    });
    const btn = safeGet('pwaInstall');
    if (btn) {
      btn.addEventListener('click', () => {
        if (deferredPWAPrompt) {
          deferredPWAPrompt.prompt();
          deferredPWAPrompt.userChoice.then(() => {
            deferredPWAPrompt = null;
            btn.style.display = 'none';
          });
        }
      });
    }
  }

  // ======================== NOTIFICATIONS ========================
  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function checkDueReminders() {
    const now = Date.now();
    reminders.forEach((r) => {
      if (r.completed || r.notified) return;
      if (r.snoozedUntil && now < r.snoozedUntil) return;
      const dueTime = new Date(r.date).getTime();
      if (dueTime <= now && dueTime > now - 5 * 60000) {
        r.notified = true;
        playNotificationSound();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Reminder Due', { body: r.title, icon: '📋' });
        }
        showToast(`Due now: ${r.title}`, 'warning');
      }
    });
    saveReminders();
  }

  // ======================== SOUND (Web Audio API) ========================
  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    } catch (e) { /* Audio not available */ }
  }

  // ======================== TOAST ========================
  function showToast(message, type = 'info') {
    const container = safeGet('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ======================== PROGRESS BAR ========================
  function updateProgress() {
    const total = reminders.length;
    const done = reminders.filter((r) => r.completed).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const fill = safeGet('progressFill');
    const text = safeGet('progressText');
    const pctEl = safeGet('progressPct');
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = `${done}/${total} completed`;
    if (pctEl) pctEl.textContent = pct + '%';
  }

  // ======================== NATURAL LANGUAGE PARSER ========================
  function parseNaturalLanguage(input) {
    const result = { title: '', date: '', priority: 'medium', category: 'other' };
    let text = input.trim();

    // Extract priority
    const priMatch = text.match(/\b(high|medium|low)\s*priority\b/i) || text.match(/\b(high|medium|low)\b(?!.*\b(high|medium|low)\b)/i);
    if (priMatch) {
      result.priority = priMatch[1].toLowerCase();
      text = text.replace(priMatch[0], '').trim();
    }

    // Extract category
    const cats = ['work', 'personal', 'health', 'finance', 'holiday', 'learning', 'other'];
    for (const cat of cats) {
      const catReg = new RegExp('\\b' + cat + '\\b', 'i');
      if (catReg.test(text)) {
        result.category = cat;
        text = text.replace(catReg, '').trim();
        break;
      }
    }

    // Extract time
    let hours = 9, minutes = 0, foundTime = false;
    const timeMatch = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1]);
      minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      if (timeMatch[3]) {
        if (timeMatch[3].toLowerCase() === 'pm' && hours < 12) hours += 12;
        if (timeMatch[3].toLowerCase() === 'am' && hours === 12) hours = 0;
      }
      foundTime = true;
      text = text.replace(timeMatch[0], '').trim();
    }

    // Extract date
    const now = new Date();
    let targetDate = new Date(now);

    if (/\btomorrow\b/i.test(text)) {
      targetDate.setDate(targetDate.getDate() + 1);
      text = text.replace(/\btomorrow\b/i, '').trim();
    } else if (/\btoday\b/i.test(text)) {
      text = text.replace(/\btoday\b/i, '').trim();
    } else {
      const dayMatch = text.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
      if (dayMatch) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(dayMatch[1].toLowerCase());
        const currentDay = now.getDay();
        let diff = targetDay - currentDay;
        if (diff <= 0) diff += 7;
        targetDate.setDate(targetDate.getDate() + diff);
        text = text.replace(dayMatch[0], '').trim();
      }
    }

    targetDate.setHours(hours, minutes, 0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    result.date = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T${pad(hours)}:${pad(minutes)}`;

    // Remaining text is the title
    result.title = text.replace(/\s+/g, ' ').trim();
    if (!result.title) result.title = 'Untitled Reminder';

    // Auto-categorize from title if still 'other'
    if (result.category === 'other') {
      result.category = autoCategorize(result.title);
    }

    return result;
  }

  // ======================== AUTO-CATEGORIZE ========================
  function autoCategorize(text) {
    const lower = text.toLowerCase();
    if (/\b(meeting|report|deadline|deploy|review|project|sprint|standup)\b/.test(lower)) return 'work';
    if (/\b(doctor|gym|medicine|health|workout|exercise)\b/.test(lower)) return 'health';
    if (/\b(pay|bill|invoice|salary|tax|budget|bank)\b/.test(lower)) return 'finance';
    if (/\b(holiday|festival|birthday|anniversary|celebration)\b/.test(lower)) return 'holiday';
    if (/\b(learn|course|study|read|tutorial|book)\b/.test(lower)) return 'learning';
    return 'other';
  }

  // ======================== SHARE VIA LINK ========================
  function checkShareParam() {
    const params = new URLSearchParams(window.location.search);
    const shareData = params.get('share');
    if (shareData) {
      try {
        const decoded = JSON.parse(atob(shareData));
        if (Array.isArray(decoded) && decoded.length > 0) {
          if (confirm(`Import ${decoded.length} shared reminder(s)?`)) {
            decoded.forEach((r) => {
              const exists = reminders.some((e) => e.title === r.title && e.date === r.date);
              if (!exists) {
                r.id = crypto.randomUUID();
                r.createdAt = Date.now();
                reminders.push(r);
              }
            });
            saveReminders();
            showToast(`Imported ${decoded.length} reminder(s)`, 'success');
            renderAll();
          }
        }
      } catch (e) {
        showToast('Invalid share link', 'error');
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  function generateShareLink() {
    const toShare = selectedIds.size > 0
      ? reminders.filter((r) => selectedIds.has(r.id))
      : reminders.filter((r) => !r.completed);
    if (toShare.length === 0) {
      showToast('No reminders to share', 'error');
      return;
    }
    const encoded = btoa(JSON.stringify(toShare));
    const url = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Share link copied to clipboard!', 'success');
    }).catch(() => {
      // Fallback
      prompt('Copy this share link:', url);
    });
  }

  // ======================== EXPORT / IMPORT ========================
  function exportJSON() {
    const blob = new Blob([JSON.stringify(reminders, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'reminders.json');
    showToast('Exported as JSON', 'success');
  }

  function exportCSV() {
    const headers = ['title', 'desc', 'date', 'priority', 'category', 'recur', 'completed', 'source'];
    const rows = reminders.map((r) =>
      headers.map((h) => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, 'reminders.csv');
    showToast('Exported as CSV', 'success');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error('Invalid format');
        let imported = 0;
        data.forEach((r) => {
          const exists = reminders.some((e) => e.title === r.title && e.date === r.date);
          if (!exists) {
            r.id = r.id || crypto.randomUUID();
            r.createdAt = r.createdAt || Date.now();
            reminders.push(r);
            imported++;
          }
        });
        saveReminders();
        showToast(`Imported ${imported} reminder(s)`, 'success');
        renderAll();
      } catch (err) {
        showToast('Import failed: invalid file', 'error');
      }
    };
    reader.readAsText(file);
  }

  // ======================== RECURRING ========================
  function createNextRecurrence(reminder) {
    const d = new Date(reminder.date);
    switch (reminder.recur) {
      case 'daily':
        d.setDate(d.getDate() + 1);
        break;
      case 'weekdays':
        do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
        break;
      case 'weekly':
        d.setDate(d.getDate() + 7);
        break;
      case 'monthly':
        d.setMonth(d.getMonth() + 1);
        break;
      default:
        return;
    }
    const pad = (n) => String(n).padStart(2, '0');
    const newDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    const newReminder = {
      ...reminder,
      id: crypto.randomUUID(),
      date: newDate,
      completed: false,
      completedAt: null,
      createdAt: Date.now(),
      snoozedUntil: null,
      notified: false,
      kanbanStatus: 'todo',
      subtasks: reminder.subtasks.map((st) => ({ ...st, id: crypto.randomUUID(), done: false }))
    };
    reminders.push(newReminder);
  }

  // ======================== REMINDER CRUD ========================
  function addReminder(data) {
    const r = {
      id: crypto.randomUUID(),
      title: data.title || 'Untitled',
      desc: data.desc || '',
      date: data.date || new Date().toISOString().slice(0, 16),
      priority: data.priority || 'medium',
      category: data.category || 'other',
      recur: data.recur || 'none',
      pinned: data.pinned || false,
      completed: false,
      completedAt: null,
      createdAt: Date.now(),
      snoozedUntil: null,
      subtasks: data.subtasks || [],
      source: data.source || null,
      kanbanStatus: 'todo',
      notified: false
    };
    reminders.push(r);
    saveReminders();
    renderAll();
    showToast('Reminder added', 'success');
    return r;
  }

  function updateReminder(id, data) {
    const idx = reminders.findIndex((r) => r.id === id);
    if (idx === -1) return;
    Object.assign(reminders[idx], data);
    saveReminders();
    renderAll();
    showToast('Reminder updated', 'success');
  }

  function deleteReminder(id) {
    reminders = reminders.filter((r) => r.id !== id);
    selectedIds.delete(id);
    saveReminders();
    renderAll();
    showToast('Reminder deleted', 'success');
  }

  function toggleComplete(id) {
    const r = reminders.find((r) => r.id === id);
    if (!r) return;
    r.completed = !r.completed;
    r.completedAt = r.completed ? Date.now() : null;
    r.kanbanStatus = r.completed ? 'done' : 'todo';
    if (r.completed && r.recur !== 'none') {
      createNextRecurrence(r);
    }
    saveReminders();
    renderAll();
    checkAllTodayCompleted();
  }

  function togglePin(id) {
    const r = reminders.find((r) => r.id === id);
    if (!r) return;
    r.pinned = !r.pinned;
    saveReminders();
    renderAll();
  }

  function snoozeReminder(id, ms) {
    const r = reminders.find((r) => r.id === id);
    if (!r) return;
    r.snoozedUntil = Date.now() + ms;
    r.notified = false;
    saveReminders();
    renderAll();
    showToast('Snoozed', 'info');
  }

  function toggleSubtask(reminderId, subtaskId) {
    const r = reminders.find((r) => r.id === reminderId);
    if (!r) return;
    const st = r.subtasks.find((s) => s.id === subtaskId);
    if (st) st.done = !st.done;
    saveReminders();
    renderAll();
  }

  // ======================== FILTERING & SORTING ========================
  function getFilteredReminders() {
    let list = [...reminders];

    // Search
    const searchInput = safeGet('searchInput');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    if (query) {
      list = list.filter((r) =>
        r.title.toLowerCase().includes(query) ||
        r.desc.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query)
      );
    }

    // Filter
    if (currentFilter !== 'all') {
      if (currentFilter === 'today') {
        const today = new Date().toDateString();
        list = list.filter((r) => new Date(r.date).toDateString() === today);
      } else if (currentFilter === 'upcoming') {
        const now = new Date();
        list = list.filter((r) => new Date(r.date) > now && !r.completed);
      } else if (currentFilter === 'completed') {
        list = list.filter((r) => r.completed);
      } else if (currentFilter === 'overdue') {
        list = list.filter((r) => new Date(r.date) < new Date() && !r.completed);
      } else {
        // Category filter
        list = list.filter((r) => r.category === currentFilter);
      }
    }

    return list;
  }

  function sortReminders(list) {
    const sortSel = safeGet('sortSelect');
    const sortVal = sortSel ? sortSel.value : 'date';

    list.sort((a, b) => {
      // Pinned always first
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

      // Custom order if exists
      if (customOrder.length > 0) {
        const aIdx = customOrder.indexOf(a.id);
        const bIdx = customOrder.indexOf(b.id);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
      }

      switch (sortVal) {
        case 'date':
          return new Date(a.date) - new Date(b.date);
        case 'priority': {
          const p = { high: 0, medium: 1, low: 2 };
          return p[a.priority] - p[b.priority];
        }
        case 'title':
          return a.title.localeCompare(b.title);
        case 'created':
          return b.createdAt - a.createdAt;
        default:
          return 0;
      }
    });
    return list;
  }

  // ======================== RENDER CARDS VIEW ========================
  function renderCardsView() {
    const container = safeGet('cardsList');
    const overdueSection = safeGet('overdueSection');
    if (!container) return;

    const filtered = sortReminders(getFilteredReminders());
    const now = new Date();
    const overdue = filtered.filter((r) => new Date(r.date) < now && !r.completed);
    const rest = filtered.filter((r) => !(new Date(r.date) < now && !r.completed));

    // Overdue section
    if (overdueSection) {
      if (overdue.length > 0 && currentFilter !== 'completed') {
        overdueSection.style.display = 'block';
        overdueSection.innerHTML = `<h3 class="overdue-title">Overdue (${overdue.length})</h3>
          <div class="overdue-cards">${overdue.map((r) => renderCardHTML(r)).join('')}</div>`;
        // Shake animation on first render
        if (!overdueSection.dataset.animated) {
          overdueSection.classList.add('shake');
          overdueSection.dataset.animated = '1';
          setTimeout(() => overdueSection.classList.remove('shake'), 800);
        }
      } else {
        overdueSection.style.display = 'none';
      }
    }

    container.innerHTML = rest.length > 0
      ? rest.map((r) => renderCardHTML(r)).join('')
      : '<div class="empty-state">No reminders found</div>';

    // Attach event listeners
    attachCardListeners(container);
    if (overdueSection) attachCardListeners(overdueSection);
  }

  function renderCardHTML(r) {
    const isOverdue = new Date(r.date) < new Date() && !r.completed;
    const subtaskProgress = r.subtasks.length > 0
      ? Math.round((r.subtasks.filter((s) => s.done).length / r.subtasks.length) * 100)
      : -1;

    const weather = r.category === 'holiday' ? SEASON_WEATHER[new Date(r.date).getMonth()] || '' : '';
    const sourceIcon = r.source === 'Gmail' ? '📧' : r.source === 'Google Calendar' ? '📅' : '';

    return `
      <div class="card ${r.completed ? 'completed' : ''} ${r.pinned ? 'pinned' : ''} ${isOverdue ? 'overdue' : ''} priority-${r.priority}"
           data-id="${r.id}" draggable="true">
        <div class="card-header">
          <label class="bulk-check">
            <input type="checkbox" class="card-select" data-id="${r.id}" ${selectedIds.has(r.id) ? 'checked' : ''}>
          </label>
          <span class="card-priority-dot" style="background:${PRIORITY_COLORS[r.priority]}" title="${r.priority} priority"></span>
          <h4 class="card-title">${escapeHTML(r.title)}</h4>
          ${r.pinned ? '<span class="pin-badge" title="Pinned">📌</span>' : ''}
          ${r.recur !== 'none' ? '<span class="recur-badge" title="Recurring: ' + r.recur + '">🔁</span>' : ''}
          ${weather ? '<span class="weather-badge">' + weather + '</span>' : ''}
          ${sourceIcon ? '<span class="source-badge" title="Source: ' + escapeHTML(r.source) + '">' + sourceIcon + '</span>' : ''}
        </div>
        ${r.desc ? '<p class="card-desc">' + escapeHTML(r.desc) + '</p>' : ''}
        <div class="card-meta">
          <span class="card-date">${formatDate(r.date)}</span>
          <span class="card-category" style="background:${CATEGORY_COLORS[r.category]}20;color:${CATEGORY_COLORS[r.category]};border:1px solid ${CATEGORY_COLORS[r.category]}40">${r.category}</span>
          ${r.snoozedUntil && r.snoozedUntil > Date.now() ? '<span class="snooze-badge">😴 Snoozed</span>' : ''}
        </div>
        ${subtaskProgress >= 0 ? `
          <div class="subtask-progress">
            <div class="subtask-bar"><div class="subtask-fill" style="width:${subtaskProgress}%"></div></div>
            <span class="subtask-text">${r.subtasks.filter((s) => s.done).length}/${r.subtasks.length} subtasks</span>
          </div>` : ''}
        <div class="card-actions">
          <button class="btn-icon btn-complete" data-id="${r.id}" title="${r.completed ? 'Undo' : 'Complete'}">
            ${r.completed ? '↩️' : '✅'}
          </button>
          <button class="btn-icon btn-edit" data-id="${r.id}" title="Edit">✏️</button>
          <button class="btn-icon btn-pin" data-id="${r.id}" title="${r.pinned ? 'Unpin' : 'Pin'}">📌</button>
          <button class="btn-icon btn-snooze" data-id="${r.id}" title="Snooze">😴</button>
          <button class="btn-icon btn-pomodoro" data-id="${r.id}" title="Pomodoro">🍅</button>
          <button class="btn-icon btn-delete" data-id="${r.id}" title="Delete">🗑️</button>
        </div>
      </div>`;
  }

  function attachCardListeners(container) {
    if (!container) return;

    container.querySelectorAll('.btn-complete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleComplete(btn.dataset.id);
      });
    });

    container.querySelectorAll('.btn-edit').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(btn.dataset.id);
      });
    });

    container.querySelectorAll('.btn-pin').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePin(btn.dataset.id);
      });
    });

    container.querySelectorAll('.btn-snooze').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSnoozeDialog(btn.dataset.id);
      });
    });

    container.querySelectorAll('.btn-pomodoro').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        startPomodoro(btn.dataset.id);
      });
    });

    container.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        showConfirm(() => deleteReminder(btn.dataset.id));
      });
    });

    container.querySelectorAll('.card-select').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        if (cb.checked) {
          selectedIds.add(cb.dataset.id);
        } else {
          selectedIds.delete(cb.dataset.id);
        }
        updateBulkBar();
      });
    });

    // Drag & Drop for cards
    container.querySelectorAll('.card[draggable]').forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        draggedCardId = card.dataset.id;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.dataset.id);
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        draggedCardId = null;
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        card.classList.add('drag-over');
      });
      card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over');
      });
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-over');
        const fromId = e.dataTransfer.getData('text/plain');
        const toId = card.dataset.id;
        if (fromId && toId && fromId !== toId) {
          reorderCards(fromId, toId);
        }
      });
    });
  }

  function reorderCards(fromId, toId) {
    const ids = sortReminders(getFilteredReminders()).map((r) => r.id);
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, fromId);
    customOrder = ids;
    saveOrder();
    renderAll();
  }

  // ======================== CALENDAR VIEW ========================
  function renderCalendarView() {
    const grid = safeGet('calGrid');
    const monthEl = safeGet('calMonth');
    const yearEl = safeGet('calYear');
    if (!grid) return;

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    if (monthEl) monthEl.textContent = months[calendarMonth];
    if (yearEl) yearEl.textContent = calendarYear;

    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const today = new Date();

    let html = '<div class="cal-header-row">';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((d) => {
      html += `<div class="cal-day-name">${d}</div>`;
    });
    html += '</div><div class="cal-body">';

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      html += '<div class="cal-cell empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = today.getDate() === day && today.getMonth() === calendarMonth && today.getFullYear() === calendarYear;
      const dayReminders = reminders.filter((r) => r.date.startsWith(dateStr));
      const dots = dayReminders.slice(0, 3).map((r) =>
        `<span class="cal-dot" style="background:${PRIORITY_COLORS[r.priority]}"></span>`
      ).join('');

      html += `<div class="cal-cell ${isToday ? 'today' : ''} ${dayReminders.length > 0 ? 'has-reminders' : ''}"
                    data-date="${dateStr}">
        <span class="cal-day-num">${day}</span>
        <div class="cal-dots">${dots}</div>
        ${dayReminders.length > 3 ? `<span class="cal-more">+${dayReminders.length - 3}</span>` : ''}
      </div>`;
    }

    html += '</div>';
    grid.innerHTML = html;

    // Click handlers
    grid.querySelectorAll('.cal-cell[data-date]').forEach((cell) => {
      cell.addEventListener('click', () => {
        const date = cell.dataset.date;
        const dayRems = reminders.filter((r) => r.date.startsWith(date));
        if (dayRems.length > 0) {
          showCalendarDayPopup(date, dayRems);
        }
      });
    });
  }

  function showCalendarDayPopup(date, dayReminders) {
    const formatted = new Date(date + 'T00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    let html = `<div class="cal-popup-overlay" id="calPopup">
      <div class="cal-popup">
        <h3>${formatted}</h3>
        <div class="cal-popup-list">`;
    dayReminders.forEach((r) => {
      html += `<div class="cal-popup-item ${r.completed ? 'completed' : ''}">
        <span class="card-priority-dot" style="background:${PRIORITY_COLORS[r.priority]}"></span>
        <span>${escapeHTML(r.title)}</span>
        <span class="cal-popup-time">${r.date.split('T')[1] || ''}</span>
      </div>`;
    });
    html += `</div><button class="btn btn-sm cal-popup-close">Close</button></div></div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    const popup = document.getElementById('calPopup');
    if (popup) {
      popup.querySelector('.cal-popup-close').addEventListener('click', () => popup.remove());
      popup.addEventListener('click', (e) => { if (e.target === popup) popup.remove(); });
    }
  }

  // ======================== KANBAN VIEW ========================
  function renderKanbanView() {
    const todoCol = safeGet('kanbanTodo');
    const progressCol = safeGet('kanbanProgress');
    const doneCol = safeGet('kanbanDone');
    if (!todoCol || !progressCol || !doneCol) return;

    const filtered = getFilteredReminders();
    const todo = filtered.filter((r) => r.kanbanStatus === 'todo');
    const inprogress = filtered.filter((r) => r.kanbanStatus === 'inprogress');
    const done = filtered.filter((r) => r.kanbanStatus === 'done');

    // Update column headers with counts
    const todoHeader = todoCol.closest('.kanban-column')?.querySelector('.kanban-count');
    const progressHeader = progressCol.closest('.kanban-column')?.querySelector('.kanban-count');
    const doneHeader = doneCol.closest('.kanban-column')?.querySelector('.kanban-count');
    if (todoHeader) todoHeader.textContent = todo.length;
    if (progressHeader) progressHeader.textContent = inprogress.length;
    if (doneHeader) doneHeader.textContent = done.length;

    const renderKanbanCards = (list) => list.map((r) => `
      <div class="kanban-card priority-${r.priority} ${r.pinned ? 'pinned' : ''}" draggable="true" data-id="${r.id}">
        <div class="kanban-card-header">
          <span class="card-priority-dot" style="background:${PRIORITY_COLORS[r.priority]}"></span>
          <span class="kanban-card-title">${escapeHTML(r.title)}</span>
        </div>
        <div class="kanban-card-meta">
          <span class="card-category" style="background:${CATEGORY_COLORS[r.category]}20;color:${CATEGORY_COLORS[r.category]}">${r.category}</span>
          <span class="card-date">${formatDate(r.date)}</span>
        </div>
      </div>
    `).join('') || '<div class="kanban-empty">No items</div>';

    todoCol.innerHTML = renderKanbanCards(todo);
    progressCol.innerHTML = renderKanbanCards(inprogress);
    doneCol.innerHTML = renderKanbanCards(done);

    // Drag & Drop for Kanban
    [todoCol, progressCol, doneCol].forEach((col) => {
      const status = col.id === 'kanbanTodo' ? 'todo' : col.id === 'kanbanProgress' ? 'inprogress' : 'done';

      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.classList.add('drag-over');
      });
      col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const id = e.dataTransfer.getData('text/plain');
        if (id) {
          const r = reminders.find((r) => r.id === id);
          if (r) {
            r.kanbanStatus = status;
            if (status === 'done' && !r.completed) {
              r.completed = true;
              r.completedAt = Date.now();
              if (r.recur !== 'none') createNextRecurrence(r);
            } else if (status !== 'done' && r.completed) {
              r.completed = false;
              r.completedAt = null;
            }
            saveReminders();
            renderAll();
          }
        }
      });

      col.querySelectorAll('.kanban-card[draggable]').forEach((card) => {
        card.addEventListener('dragstart', (e) => {
          card.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', card.dataset.id);
        });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
      });
    });
  }

  // ======================== STATISTICS VIEW ========================
  function renderStatsView() {
    renderStatCards();
    renderPriorityChart();
    renderWeekChart();
    renderCategoryChart();
    renderStreak();
  }

  function renderStatCards() {
    const container = safeGet('statCards');
    if (!container) return;

    const total = reminders.length;
    const completed = reminders.filter((r) => r.completed).length;
    const overdue = reminders.filter((r) => new Date(r.date) < new Date() && !r.completed).length;
    const rate = total ? Math.round((completed / total) * 100) : 0;

    container.innerHTML = `
      <div class="stat-card"><div class="stat-number">${total}</div><div class="stat-label">Total</div></div>
      <div class="stat-card"><div class="stat-number">${completed}</div><div class="stat-label">Completed</div></div>
      <div class="stat-card"><div class="stat-number">${overdue}</div><div class="stat-label">Overdue</div></div>
      <div class="stat-card"><div class="stat-number">${rate}%</div><div class="stat-label">Completion Rate</div></div>
    `;
  }

  function renderPriorityChart() {
    const container = safeGet('priorityChart');
    if (!container) return;

    const counts = { high: 0, medium: 0, low: 0 };
    reminders.forEach((r) => counts[r.priority]++);
    const max = Math.max(...Object.values(counts), 1);

    container.innerHTML = Object.entries(counts).map(([pri, count]) => `
      <div class="chart-row">
        <span class="chart-label">${pri}</span>
        <div class="chart-bar-container">
          <div class="chart-bar" style="width:${(count / max) * 100}%;background:${PRIORITY_COLORS[pri]}"></div>
        </div>
        <span class="chart-value">${count}</span>
      </div>
    `).join('');
  }

  function renderWeekChart() {
    const container = safeGet('weekChart');
    if (!container) return;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Array(7).fill(0);
    reminders.forEach((r) => {
      const day = new Date(r.date).getDay();
      if (!isNaN(day)) counts[day]++;
    });
    const max = Math.max(...counts, 1);

    container.innerHTML = counts.map((count, i) => `
      <div class="chart-row">
        <span class="chart-label">${days[i]}</span>
        <div class="chart-bar-container">
          <div class="chart-bar" style="width:${(count / max) * 100}%;background:#3b82f6"></div>
        </div>
        <span class="chart-value">${count}</span>
      </div>
    `).join('');
  }

  function renderCategoryChart() {
    const container = safeGet('categoryChart');
    if (!container) return;

    const counts = {};
    reminders.forEach((r) => counts[r.category] = (counts[r.category] || 0) + 1);
    const max = Math.max(...Object.values(counts), 1);

    container.innerHTML = Object.entries(counts).map(([cat, count]) => `
      <div class="chart-row">
        <span class="chart-label">${cat}</span>
        <div class="chart-bar-container">
          <div class="chart-bar" style="width:${(count / max) * 100}%;background:${CATEGORY_COLORS[cat] || '#6b7280'}"></div>
        </div>
        <span class="chart-value">${count}</span>
      </div>
    `).join('');
  }

  function renderStreak() {
    const container = safeGet('streakDisplay');
    if (!container) return;

    // Calculate streak: consecutive days (ending today or yesterday) with at least one completion
    const completedDates = new Set();
    reminders.forEach((r) => {
      if (r.completedAt) {
        completedDates.add(new Date(r.completedAt).toDateString());
      }
    });

    let streak = 0;
    const d = new Date();
    d.setHours(0, 0, 0, 0);

    // Check if today has a completion; if not, start from yesterday
    if (!completedDates.has(d.toDateString())) {
      d.setDate(d.getDate() - 1);
    }

    while (completedDates.has(d.toDateString())) {
      streak++;
      d.setDate(d.getDate() - 1);
    }

    container.innerHTML = `
      <div class="streak-number">${streak}</div>
      <div class="streak-label">Day${streak !== 1 ? 's' : ''} Streak 🔥</div>
    `;
  }

  // ======================== MODAL ========================
  function openModal(reminderId) {
    const overlay = safeGet('modalOverlay');
    const title = safeGet('modalTitle');
    const editIdInput = safeGet('editId');
    if (!overlay) return;

    if (reminderId) {
      const r = reminders.find((r) => r.id === reminderId);
      if (!r) return;
      if (title) title.textContent = 'Edit Reminder';
      if (editIdInput) editIdInput.value = r.id;
      populateForm(r);
    } else {
      if (title) title.textContent = 'New Reminder';
      if (editIdInput) editIdInput.value = '';
      resetForm();
    }

    overlay.classList.add('active');
  }

  function openEditModal(id) {
    openModal(id);
  }

  function closeModal() {
    const overlay = safeGet('modalOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  function populateForm(r) {
    const titleInput = safeGet('titleInput');
    const descInput = safeGet('descInput');
    const dateInput = safeGet('dateInput');
    const priorityInput = safeGet('priorityInput');
    const categoryInput = safeGet('categoryInput');
    const recurInput = safeGet('recurInput');
    const pinInput = safeGet('pinInput');

    if (titleInput) titleInput.value = r.title;
    if (descInput) descInput.value = r.desc;
    if (dateInput) dateInput.value = r.date;
    if (priorityInput) priorityInput.value = r.priority;
    if (categoryInput) categoryInput.value = r.category;
    if (recurInput) recurInput.value = r.recur;
    if (pinInput) pinInput.checked = r.pinned;

    renderSubtasksInModal(r.subtasks);
  }

  function resetForm() {
    const titleInput = safeGet('titleInput');
    const descInput = safeGet('descInput');
    const dateInput = safeGet('dateInput');
    const priorityInput = safeGet('priorityInput');
    const categoryInput = safeGet('categoryInput');
    const recurInput = safeGet('recurInput');
    const pinInput = safeGet('pinInput');

    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    if (dateInput) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      dateInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }
    if (priorityInput) priorityInput.value = 'medium';
    if (categoryInput) categoryInput.value = 'other';
    if (recurInput) recurInput.value = 'none';
    if (pinInput) pinInput.checked = false;

    renderSubtasksInModal([]);
  }

  function renderSubtasksInModal(subtasks) {
    const container = safeGet('subtaskContainer');
    if (!container) return;

    container.innerHTML = subtasks.map((st) => `
      <div class="subtask-item" data-id="${st.id}">
        <input type="checkbox" ${st.done ? 'checked' : ''} class="subtask-check">
        <input type="text" class="subtask-text" value="${escapeHTML(st.text)}">
        <button class="btn-icon subtask-remove" title="Remove">✕</button>
      </div>
    `).join('');

    // Remove subtask
    container.querySelectorAll('.subtask-remove').forEach((btn) => {
      btn.addEventListener('click', () => btn.closest('.subtask-item').remove());
    });
  }

  function getFormData() {
    return {
      title: (safeGet('titleInput')?.value || '').trim(),
      desc: (safeGet('descInput')?.value || '').trim(),
      date: safeGet('dateInput')?.value || '',
      priority: safeGet('priorityInput')?.value || 'medium',
      category: safeGet('categoryInput')?.value || 'other',
      recur: safeGet('recurInput')?.value || 'none',
      pinned: safeGet('pinInput')?.checked || false,
      subtasks: getSubtasksFromModal()
    };
  }

  function getSubtasksFromModal() {
    const container = safeGet('subtaskContainer');
    if (!container) return [];
    return qsa('.subtask-item', container).map((el) => ({
      id: el.dataset.id || crypto.randomUUID(),
      text: el.querySelector('.subtask-text')?.value || '',
      done: el.querySelector('.subtask-check')?.checked || false
    })).filter((st) => st.text.trim());
  }

  function handleFormSave() {
    const data = getFormData();
    if (!data.title) {
      showToast('Title is required', 'error');
      return;
    }

    const editId = safeGet('editId')?.value;
    if (editId) {
      updateReminder(editId, data);
    } else {
      // Auto-categorize if user left it as 'other'
      if (data.category === 'other') {
        data.category = autoCategorize(data.title);
      }
      addReminder(data);
    }
    closeModal();
  }

  // ======================== CONFIRM DIALOG ========================
  let confirmCallback = null;

  function showConfirm(callback) {
    const overlay = safeGet('confirmOverlay');
    if (!overlay) {
      callback();
      return;
    }
    confirmCallback = callback;
    overlay.classList.add('active');
  }

  function initConfirm() {
    const yes = safeGet('confirmYes');
    const no = safeGet('confirmNo');
    const overlay = safeGet('confirmOverlay');

    if (yes) yes.addEventListener('click', () => {
      if (confirmCallback) confirmCallback();
      confirmCallback = null;
      if (overlay) overlay.classList.remove('active');
    });

    if (no) no.addEventListener('click', () => {
      confirmCallback = null;
      if (overlay) overlay.classList.remove('active');
    });
  }

  // ======================== SNOOZE DIALOG ========================
  let snoozeTargetId = null;

  function openSnoozeDialog(id) {
    snoozeTargetId = id;
    const overlay = safeGet('snoozeOverlay');
    if (!overlay) return;
    overlay.classList.add('active');
  }

  function initSnooze() {
    const overlay = safeGet('snoozeOverlay');
    const options = safeGet('snoozeOptions');
    if (!options) return;

    const snoozeOptions = [
      { label: '5 minutes', ms: 5 * 60 * 1000 },
      { label: '15 minutes', ms: 15 * 60 * 1000 },
      { label: '1 hour', ms: 60 * 60 * 1000 },
      { label: '3 hours', ms: 3 * 60 * 60 * 1000 },
      { label: 'Tomorrow', ms: 24 * 60 * 60 * 1000 }
    ];

    options.innerHTML = snoozeOptions.map((opt) =>
      `<button class="snooze-option btn" data-ms="${opt.ms}">${opt.label}</button>`
    ).join('') + '<button class="snooze-option btn btn-secondary snooze-cancel">Cancel</button>';

    options.querySelectorAll('.snooze-option[data-ms]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (snoozeTargetId) {
          snoozeReminder(snoozeTargetId, parseInt(btn.dataset.ms));
          snoozeTargetId = null;
        }
        if (overlay) overlay.classList.remove('active');
      });
    });

    const cancelBtn = options.querySelector('.snooze-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        snoozeTargetId = null;
        if (overlay) overlay.classList.remove('active');
      });
    }
  }

  // ======================== BULK ACTIONS ========================
  function updateBulkBar() {
    const bar = safeGet('bulkBar');
    if (!bar) return;

    if (selectedIds.size > 0) {
      bar.style.display = 'flex';
      bar.innerHTML = `
        <span class="bulk-count">${selectedIds.size} selected</span>
        <button class="btn btn-sm bulk-select-all">Select All</button>
        <button class="btn btn-sm bulk-deselect">Deselect All</button>
        <button class="btn btn-sm btn-danger bulk-delete">Delete Selected</button>
        <button class="btn btn-sm btn-success bulk-complete">Complete Selected</button>
        <select class="bulk-priority-select">
          <option value="">Change Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      `;

      bar.querySelector('.bulk-select-all')?.addEventListener('click', () => {
        getFilteredReminders().forEach((r) => selectedIds.add(r.id));
        renderAll();
      });

      bar.querySelector('.bulk-deselect')?.addEventListener('click', () => {
        selectedIds.clear();
        updateBulkBar();
        renderAll();
      });

      bar.querySelector('.bulk-delete')?.addEventListener('click', () => {
        showConfirm(() => {
          reminders = reminders.filter((r) => !selectedIds.has(r.id));
          selectedIds.clear();
          saveReminders();
          renderAll();
          showToast('Deleted selected reminders', 'success');
        });
      });

      bar.querySelector('.bulk-complete')?.addEventListener('click', () => {
        selectedIds.forEach((id) => {
          const r = reminders.find((r) => r.id === id);
          if (r && !r.completed) {
            r.completed = true;
            r.completedAt = Date.now();
            r.kanbanStatus = 'done';
            if (r.recur !== 'none') createNextRecurrence(r);
          }
        });
        selectedIds.clear();
        saveReminders();
        renderAll();
        showToast('Completed selected reminders', 'success');
        checkAllTodayCompleted();
      });

      bar.querySelector('.bulk-priority-select')?.addEventListener('change', (e) => {
        if (!e.target.value) return;
        selectedIds.forEach((id) => {
          const r = reminders.find((r) => r.id === id);
          if (r) r.priority = e.target.value;
        });
        selectedIds.clear();
        saveReminders();
        renderAll();
        showToast('Priority updated', 'success');
      });
    } else {
      bar.style.display = 'none';
    }
  }

  // ======================== POMODORO TIMER ========================
  function startPomodoro(reminderId) {
    if (pomodoroTimer) {
      showToast('A Pomodoro is already running', 'warning');
      return;
    }
    pomodoroReminderId = reminderId;
    pomodoroRemaining = POMODORO_DURATION;

    const overlay = document.createElement('div');
    overlay.id = 'pomodoroOverlay';
    overlay.className = 'pomodoro-overlay';
    const r = reminders.find((r) => r.id === reminderId);
    overlay.innerHTML = `
      <div class="pomodoro-box">
        <h3>🍅 Pomodoro Timer</h3>
        <p class="pomodoro-task">${r ? escapeHTML(r.title) : 'Focus Time'}</p>
        <div class="pomodoro-time" id="pomodoroTime">25:00</div>
        <div class="pomodoro-actions">
          <button class="btn btn-danger" id="pomodoroStop">Stop</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('pomodoroStop')?.addEventListener('click', stopPomodoro);

    pomodoroTimer = setInterval(() => {
      pomodoroRemaining--;
      const mins = Math.floor(pomodoroRemaining / 60);
      const secs = pomodoroRemaining % 60;
      const timeEl = document.getElementById('pomodoroTime');
      if (timeEl) timeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      if (pomodoroRemaining <= 0) {
        clearInterval(pomodoroTimer);
        pomodoroTimer = null;
        playNotificationSound();
        if (pomodoroReminderId) savePomodoroCount(pomodoroReminderId);
        showToast('Pomodoro complete! Take a break.', 'success');
        const ol = document.getElementById('pomodoroOverlay');
        if (ol) ol.remove();
        pomodoroReminderId = null;
      }
    }, 1000);
  }

  function stopPomodoro() {
    if (pomodoroTimer) {
      clearInterval(pomodoroTimer);
      pomodoroTimer = null;
    }
    const ol = document.getElementById('pomodoroOverlay');
    if (ol) ol.remove();
    pomodoroReminderId = null;
    showToast('Pomodoro stopped', 'info');
  }

  // ======================== CONFETTI ========================
  function checkAllTodayCompleted() {
    const today = new Date().toDateString();
    const todayReminders = reminders.filter((r) => new Date(r.date).toDateString() === today);
    if (todayReminders.length > 0 && todayReminders.every((r) => r.completed)) {
      triggerConfetti();
    }
  }

  function triggerConfetti() {
    const canvas = safeGet('confettiCanvas');
    if (!canvas) return;

    canvas.style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    const particles = [];
    const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: Math.random() * 3 + 2,
        vx: Math.random() * 2 - 1,
        rot: Math.random() * 360,
        vr: Math.random() * 6 - 3
      });
    }

    let frame = 0;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y += p.vy;
        p.x += p.vx;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      frame++;
      if (frame < 180) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
      }
    }
    animate();
  }

  // ======================== KEYBOARD SHORTCUTS ========================
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in inputs
      const tag = e.target.tagName.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;

      if (e.key === 'Escape') {
        closeModal();
        const confirmOverlay = safeGet('confirmOverlay');
        const snoozeOverlay = safeGet('snoozeOverlay');
        const shortcutsOverlay = safeGet('shortcutsOverlay');
        if (confirmOverlay) confirmOverlay.classList.remove('active');
        if (snoozeOverlay) snoozeOverlay.classList.remove('active');
        if (shortcutsOverlay) shortcutsOverlay.classList.remove('active');
        const calPopup = document.getElementById('calPopup');
        if (calPopup) calPopup.remove();
        return;
      }

      if (isTyping) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openModal(null);
      } else if (e.key === 's' || e.key === 'S' || e.key === '/') {
        e.preventDefault();
        safeGet('searchInput')?.focus();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        safeGet('themeToggle')?.click();
      } else if (e.key === '1') {
        switchView('cards');
      } else if (e.key === '2') {
        switchView('calendar');
      } else if (e.key === '3') {
        switchView('kanban');
      } else if (e.key === '4') {
        switchView('stats');
      } else if (e.key === '?') {
        e.preventDefault();
        const overlay = safeGet('shortcutsOverlay');
        if (overlay) overlay.classList.toggle('active');
      } else if (e.ctrlKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        exportJSON();
      } else if (e.ctrlKey && (e.key === 'a' || e.key === 'A') && currentView === 'cards') {
        e.preventDefault();
        getFilteredReminders().forEach((r) => selectedIds.add(r.id));
        updateBulkBar();
        renderAll();
      }
    });
  }

  // ======================== VIEW SWITCHING ========================
  function switchView(view) {
    currentView = view;
    const views = ['cardsView', 'calendarView', 'kanbanView', 'statsView'];
    views.forEach((v) => {
      const el = safeGet(v);
      if (el) el.style.display = 'none';
    });

    const viewMap = { cards: 'cardsView', calendar: 'calendarView', kanban: 'kanbanView', stats: 'statsView' };
    const active = safeGet(viewMap[view]);
    if (active) active.style.display = view === 'kanban' ? 'flex' : 'block';

    // Update active button
    const viewBtns = safeGet('viewBtns');
    if (viewBtns) {
      viewBtns.querySelectorAll('[data-view]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.view === view);
      });
    }

    renderCurrentView();
  }

  function renderCurrentView() {
    switch (currentView) {
      case 'cards': renderCardsView(); break;
      case 'calendar': renderCalendarView(); break;
      case 'kanban': renderKanbanView(); break;
      case 'stats': renderStatsView(); break;
    }
  }

  // ======================== RENDER ALL ========================
  function renderAll() {
    updateProgress();
    updateBulkBar();
    renderCurrentView();
  }

  // ======================== UTILITIES ========================
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = d.toDateString() === tomorrow.toDateString();

      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

      if (isToday) return `Today, ${time}`;
      if (isTomorrow) return `Tomorrow, ${time}`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + `, ${time}`;
    } catch (e) {
      return dateStr;
    }
  }

  // ======================== EVENT LISTENERS SETUP ========================
  function initEventListeners() {
    // FAB - New Reminder
    const fab = safeGet('fab');
    if (fab) fab.addEventListener('click', () => openModal(null));

    // Modal Save/Cancel
    const modalSave = safeGet('modalSave');
    const modalCancel = safeGet('modalCancel');
    const modalOverlay = safeGet('modalOverlay');
    if (modalSave) modalSave.addEventListener('click', (e) => { e.preventDefault(); handleFormSave(); });
    if (modalCancel) modalCancel.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

    // Prevent form submit
    const form = safeGet('reminderForm');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); handleFormSave(); });

    // Add Subtask
    const addSubtaskBtn = safeGet('addSubtask');
    if (addSubtaskBtn) {
      addSubtaskBtn.addEventListener('click', () => {
        const container = safeGet('subtaskContainer');
        if (!container) return;
        const item = document.createElement('div');
        item.className = 'subtask-item';
        item.dataset.id = crypto.randomUUID();
        item.innerHTML = `
          <input type="checkbox" class="subtask-check">
          <input type="text" class="subtask-text" placeholder="Subtask...">
          <button class="btn-icon subtask-remove" title="Remove">✕</button>
        `;
        item.querySelector('.subtask-remove').addEventListener('click', () => item.remove());
        container.appendChild(item);
        item.querySelector('.subtask-text').focus();
      });
    }

    // Search
    const searchInput = safeGet('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => renderAll(), 200));
    }

    // Natural Language Input
    const naturalInput = safeGet('naturalInput');
    const naturalParse = safeGet('naturalParse');
    if (naturalInput && naturalParse) {
      naturalParse.addEventListener('click', () => {
        const val = naturalInput.value.trim();
        if (!val) { showToast('Enter a reminder in natural language', 'error'); return; }
        const parsed = parseNaturalLanguage(val);
        openModal(null);
        // Fill form with parsed data
        setTimeout(() => {
          const titleInput = safeGet('titleInput');
          const dateInput = safeGet('dateInput');
          const priorityInput = safeGet('priorityInput');
          const categoryInput = safeGet('categoryInput');
          if (titleInput) titleInput.value = parsed.title;
          if (dateInput) dateInput.value = parsed.date;
          if (priorityInput) priorityInput.value = parsed.priority;
          if (categoryInput) categoryInput.value = parsed.category;
        }, 50);
        naturalInput.value = '';
      });

      naturalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          naturalParse.click();
        }
      });
    }

    // Filter Buttons
    const filterBtns = safeGet('filterBtns');
    if (filterBtns) {
      filterBtns.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-filter]');
        if (!btn) return;
        currentFilter = btn.dataset.filter;
        filterBtns.querySelectorAll('[data-filter]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderAll();
      });
    }

    // Sort Select
    const sortSelect = safeGet('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        customOrder = []; // Reset custom order when sort changes
        saveOrder();
        renderAll();
      });
    }

    // View Buttons
    const viewBtns = safeGet('viewBtns');
    if (viewBtns) {
      viewBtns.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-view]');
        if (!btn) return;
        switchView(btn.dataset.view);
      });
    }

    // Calendar Navigation
    const calPrev = safeGet('calPrev');
    const calNext = safeGet('calNext');
    if (calPrev) calPrev.addEventListener('click', () => {
      calendarMonth--;
      if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
      renderCalendarView();
    });
    if (calNext) calNext.addEventListener('click', () => {
      calendarMonth++;
      if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
      renderCalendarView();
    });

    // Menu Toggle
    const menuToggle = safeGet('menuToggle');
    const menuDropdown = safeGet('menuDropdown');
    if (menuToggle && menuDropdown) {
      menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDropdown.classList.toggle('active');
      });
      document.addEventListener('click', () => menuDropdown.classList.remove('active'));
    }

    // Export/Import
    const exportJsonBtn = safeGet('exportJson');
    const exportCsvBtn = safeGet('exportCsv');
    const importBtn = safeGet('importBtn');
    const importFile = safeGet('importFile');
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportJSON);
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportCSV);
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', (e) => {
        if (e.target.files[0]) importJSON(e.target.files[0]);
        e.target.value = '';
      });
    }

    // Share
    const shareBtn = safeGet('shareBtn');
    if (shareBtn) shareBtn.addEventListener('click', generateShareLink);

    // Shortcuts
    const shortcutsBtn = safeGet('shortcutsBtn');
    const shortcutsOverlay = safeGet('shortcutsOverlay');
    if (shortcutsBtn && shortcutsOverlay) {
      shortcutsBtn.addEventListener('click', () => shortcutsOverlay.classList.toggle('active'));
      shortcutsOverlay.addEventListener('click', (e) => {
        if (e.target === shortcutsOverlay) shortcutsOverlay.classList.remove('active');
      });
    }

    // Auto-categorize on title input change
    const titleInput = safeGet('titleInput');
    const categoryInput = safeGet('categoryInput');
    if (titleInput && categoryInput) {
      titleInput.addEventListener('input', debounce(() => {
        const editId = safeGet('editId')?.value;
        if (!editId && categoryInput.value === 'other') {
          const suggested = autoCategorize(titleInput.value);
          if (suggested !== 'other') {
            categoryInput.value = suggested;
          }
        }
      }, 500));
    }
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  // ======================== INITIALIZATION ========================
  function init() {
    loadReminders();
    seedData();
    loadOrder();
    initTheme();
    initPWA();
    initConfirm();
    initSnooze();
    initEventListeners();
    initKeyboardShortcuts();
    requestNotificationPermission();
    checkShareParam();

    // Initial render
    switchView('cards');

    // Notification check interval
    setInterval(checkDueReminders, NOTIFICATION_INTERVAL);
    // Initial check
    setTimeout(checkDueReminders, 2000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
