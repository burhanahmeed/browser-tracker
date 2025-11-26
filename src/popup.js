// Chrome Usage Tracker - Popup Script
// Handles UI interactions and data visualization

class PopupManager {
  constructor() {
    this.currentTab = 'today';
    this.charts = {};
    this.settings = {};
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.loadData();
    this.setupCharts();
  }

  setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.currentTarget.dataset.tab);
      });
    });

    // Control buttons
    document.getElementById('toggleTracking').addEventListener('click', this.toggleTracking.bind(this));
    document.getElementById('refreshData').addEventListener('click', this.refreshData.bind(this));
    document.getElementById('openFullscreen').addEventListener('click', this.openFullscreen.bind(this));
    document.getElementById('exportData').addEventListener('click', this.exportData.bind(this));
    document.getElementById('clearData').addEventListener('click', this.clearData.bind(this));

    // Search functionality
    document.getElementById('sitesSearch').addEventListener('input', this.filterSites.bind(this));

    const pt = document.getElementById('pomodoroToggle');
    const pr = document.getElementById('pomodoroReset');
    if (pt) pt.addEventListener('click', this.pomodoroToggle.bind(this));
    if (pr) pr.addEventListener('click', this.pomodoroReset.bind(this));

    const ta = document.getElementById('todoAdd');
    const tc = document.getElementById('todoClearCompleted');
    const tca = document.getElementById('todoClearAll');
    if (ta) ta.addEventListener('click', this.todoAdd.bind(this));
    if (tc) tc.addEventListener('click', this.todoClearCompleted.bind(this));
    if (tca) tca.addEventListener('click', this.todoClearAll.bind(this));

    const ti = document.getElementById('todoInput');
    if (ti) ti.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.todoAdd();
    });

    if (chrome && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
          if (changes.tasks) this.loadTasks();
          if (changes.pomodoro) this.loadPomodoroData();
        }
      });
    }
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      this.settings = response.settings || {
        trackingEnabled: true,
        dailyGoal: 480,
        excludedDomains: ['chrome://', 'chrome-extension://', 'about:'],
        dataRetentionDays: 30
      };
      this.updateTrackingButton();
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = { trackingEnabled: true };
    }
  }

  updateTrackingButton() {
    const button = document.getElementById('toggleTracking');
    if (this.settings.trackingEnabled) {
      button.innerHTML = '<span class="icon">⏸</span>';
      button.classList.remove('paused');
      button.title = 'Pause Tracking';
    } else {
      button.innerHTML = '<span class="icon">▶</span>';
      button.classList.add('paused');
      button.title = 'Resume Tracking';
    }
  }

  async toggleTracking() {
    this.settings.trackingEnabled = !this.settings.trackingEnabled;
    
    try {
      await chrome.runtime.sendMessage({ 
        action: 'toggleTracking', 
        enabled: this.settings.trackingEnabled 
      });
      
      this.updateTrackingButton();
      this.refreshData();
    } catch (error) {
      console.error('Error toggling tracking:', error);
    }
  }

  switchTab(tabName) {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Update active tab pane
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    this.currentTab = tabName;
    
    // Load data for the selected tab
    switch (tabName) {
      case 'today':
        this.loadTodayData();
        break;
      case 'week':
        this.loadWeekData();
        break;
      case 'sites':
        this.loadSitesData();
        break;
      case 'pomodoro':
        this.loadPomodoroData();
        break;
      case 'todo':
        this.loadTasks();
        break;
    }
  }

  async loadData() {
    await this.loadTodayData();
  }

  async loadTodayData() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dailyStats = await chrome.runtime.sendMessage({ 
        action: 'getDailyStats', 
        date: today 
      });
      
      const statistics = await chrome.runtime.sendMessage({ 
        action: 'getStatistics' 
      });

      this.updateTodayOverview(dailyStats, statistics);
      this.renderTodayChart(dailyStats);
      this.renderTodaySitesList(dailyStats);
    } catch (error) {
      console.error('Error loading today data:', error);
    }
  }

  updateTodayOverview(dailyStats, statistics) {
    let todayTime = 0;
    let sitesCount = 0;
    let visitsCount = 0;

    if (dailyStats) {
      Object.values(dailyStats).forEach(site => {
        todayTime += site.totalTime || 0;
        sitesCount++;
        visitsCount += site.visitCount || 0;
      });
    }

    document.getElementById('todayTime').textContent = this.formatDuration(todayTime);
    document.getElementById('sitesCount').textContent = sitesCount;
    document.getElementById('visitsCount').textContent = visitsCount;
  }

  async loadWeekData() {
    try {
      const weekData = await this.getWeekData();
      this.renderWeekChart(weekData);
      this.renderWeekSummary(weekData);
    } catch (error) {
      console.error('Error loading week data:', error);
    }
  }

  async getWeekData() {
    const weekData = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dailyStats = await chrome.runtime.sendMessage({ 
        action: 'getDailyStats', 
        date: dateStr 
      });
      
      let totalTime = 0;
      if (dailyStats) {
        Object.values(dailyStats).forEach(site => {
          totalTime += site.totalTime || 0;
        });
      }
      
      weekData.push({
        date: dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        totalTime: totalTime
      });
    }
    
    return weekData;
  }

  async loadSitesData() {
    try {
      const statistics = await chrome.runtime.sendMessage({ 
        action: 'getStatistics' 
      });
      
      this.renderSitesList(statistics.domains || {});
    } catch (error) {
      console.error('Error loading sites data:', error);
    }
  }

  renderTodayChart(dailyStats) {
    const canvas = document.getElementById('todayChart');
    const ctx = canvas.getContext('2d');
    
    // Prepare data for pie chart
    const data = [];
    const colors = this.generateColors(Object.keys(dailyStats).length);
    
    Object.entries(dailyStats).forEach(([domain, stats], index) => {
      data.push({
        label: domain,
        value: stats.totalTime,
        color: colors[index]
      });
    });
    
    // Sort by time spent
    data.sort((a, b) => b.value - a.value);
    
    // Simple pie chart implementation
    this.drawPieChart(ctx, canvas, data);
  }

  renderWeekChart(weekData) {
    const canvas = document.getElementById('weekChart');
    const ctx = canvas.getContext('2d');
    
    // Prepare data for bar chart
    const labels = weekData.map(d => d.dayName);
    const values = weekData.map(d => d.totalTime);
    
    const colors = this.generateColors(labels.length);
    this.drawBarChart(ctx, canvas, labels, values, colors);
  }

  drawPieChart(ctx, canvas, data) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (data.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', centerX, centerY);
      return;
    }
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -Math.PI / 2;
    
    data.forEach(item => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      
      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();
      
      // Draw label
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
      
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.formatDuration(item.value), labelX, labelY);
      
      currentAngle += sliceAngle;
    });
    
    // Draw legend
    let legendY = 10;
    data.forEach((item, index) => {
      ctx.fillStyle = item.color;
      ctx.fillRect(10, legendY, 12, 12);
      
      ctx.fillStyle = '#333';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${item.label} (${Math.round(item.value / total * 100)}%)`, 28, legendY + 9);
      
      legendY += 18;
    });
  }

  drawBarChart(ctx, canvas, labels, values, colors) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (values.length === 0 || values.every(v => v === 0)) {
      ctx.fillStyle = '#999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
      return;
    }
    
    const maxValue = Math.max(...values);
    const barWidth = (canvas.width - 40) / labels.length;
    const maxBarHeight = canvas.height - 60;
    
    labels.forEach((label, index) => {
      const value = values[index];
      const barHeight = (value / maxValue) * maxBarHeight;
      const x = 20 + index * barWidth;
      const y = canvas.height - barHeight - 30;
      
      ctx.fillStyle = colors[index % colors.length];
      ctx.fillRect(x + barWidth * 0.2, y, barWidth * 0.6, barHeight);
      
      // Draw value
      ctx.fillStyle = '#222';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.formatDuration(value), x + barWidth / 2, y - 5);
      
      // Draw label
      ctx.fillText(label, x + barWidth / 2, canvas.height - 10);
    });
  }

  renderTodaySitesList(dailyStats) {
    const container = document.getElementById('todaySitesList');
    container.innerHTML = '';
    
    const sites = Object.entries(dailyStats)
      .map(([domain, stats]) => ({
        domain,
        totalTime: stats.totalTime,
        visitCount: stats.visitCount,
        percentage: 0
      }))
      .sort((a, b) => b.totalTime - a.totalTime);
    
    const totalTime = sites.reduce((sum, site) => sum + site.totalTime, 0);
    sites.forEach(site => {
      site.percentage = totalTime > 0 ? Math.round((site.totalTime / totalTime) * 100) : 0;
    });
    
    sites.forEach(site => {
      const siteElement = this.createSiteElement(site);
      container.appendChild(siteElement);
    });
  }

  renderWeekSummary(weekData) {
    const container = document.getElementById('weekSummary');
    container.innerHTML = '';
    
    const totalWeekTime = weekData.reduce((sum, day) => sum + day.totalTime, 0);
    const avgDailyTime = totalWeekTime / 7;
    
    // Summary stats
    const summaryElement = document.createElement('div');
    summaryElement.innerHTML = `
      <div class="summary-item">
        <span class="summary-label">Total Week Time:</span>
        <span class="summary-time">${this.formatDuration(totalWeekTime)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Daily Average:</span>
        <span class="summary-time">${this.formatDuration(avgDailyTime)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Most Active Day:</span>
        <span class="summary-time">${this.getMostActiveDay(weekData)}</span>
      </div>
    `;
    container.appendChild(summaryElement);
    
    // Daily breakdown
    const breakdownElement = document.createElement('div');
    breakdownElement.style.marginTop = '16px';
    breakdownElement.innerHTML = '<h4 style="margin-bottom: 12px; color: #2c3e50;">Daily Breakdown</h4>';
    
    weekData.forEach(day => {
      const dayElement = document.createElement('div');
      dayElement.className = 'summary-item';
      dayElement.innerHTML = `
        <span class="summary-day">${day.dayName}</span>
        <span class="summary-time">${this.formatDuration(day.totalTime)}</span>
      `;
      breakdownElement.appendChild(dayElement);
    });
    
    container.appendChild(breakdownElement);
  }

  getMostActiveDay(weekData) {
    if (weekData.length === 0) return 'N/A';
    
    const mostActive = weekData.reduce((max, day) => 
      day.totalTime > max.totalTime ? day : max
    );
    
    return `${mostActive.dayName} (${this.formatDuration(mostActive.totalTime)})`;
  }

  renderSitesList(domains) {
    const container = document.getElementById('topSitesList');
    container.innerHTML = '';
    
    const sites = Object.entries(domains)
      .map(([domain, stats]) => ({
        domain,
        totalTime: stats.totalTime,
        visitCount: stats.visitCount,
        avgTime: stats.visitCount > 0 ? stats.totalTime / stats.visitCount : 0
      }))
      .sort((a, b) => b.totalTime - a.totalTime);
    
    sites.forEach(site => {
      const siteElement = this.createSiteElement(site);
      container.appendChild(siteElement);
    });
    
    // Store original list for filtering
    this.originalSitesList = sites;
  }

  createSiteElement(site) {
    const element = document.createElement('div');
    element.className = 'site-item';
    const pct = site.percentage || 0;
    const color = this.generateColors(1)[0];
    element.innerHTML = `
      <div class="site-info">
        <div class="site-domain">${site.domain}</div>
        <div class="site-url">${site.visitCount} visits</div>
        <div class="progress"><div class="progress-bar" style="width:${pct}%;background:${color}"></div></div>
      </div>
      <div class="site-stats">
        <div class="site-time">${this.formatDuration(site.totalTime)}</div>
        <div class="site-visits">avg: ${this.formatDuration(site.avgTime || 0)}</div>
      </div>
    `;
    return element;
  }

  filterSites() {
    const searchTerm = document.getElementById('sitesSearch').value.toLowerCase();
    const container = document.getElementById('topSitesList');
    container.innerHTML = '';
    
    if (!this.originalSitesList) return;
    
    const filteredSites = this.originalSitesList.filter(site => 
      site.domain.toLowerCase().includes(searchTerm)
    );
    
    filteredSites.forEach(site => {
      const siteElement = this.createSiteElement(site);
      container.appendChild(siteElement);
    });
  }

  async refreshData() {
    const refreshIcon = document.querySelector('#refreshData .icon');
    if (refreshIcon) refreshIcon.classList.add('rotating');
    
    await this.loadData();
    
    setTimeout(() => {
      if (refreshIcon) refreshIcon.classList.remove('rotating');
    }, 1000);
  }

  async exportData() {
    try {
      const data = await chrome.runtime.sendMessage({ action: 'exportData' });
      
      if (data) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `usage-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  }

  async clearData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      try {
        const success = await chrome.runtime.sendMessage({ action: 'clearData' });
        if (success) {
          this.refreshData();
          alert('Data cleared successfully.');
        }
      } catch (error) {
        console.error('Error clearing data:', error);
        alert('Error clearing data. Please try again.');
      }
    }
  }


  setupCharts() {
    // Set canvas dimensions
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      const parent = canvas.parentElement;
      const width = parent ? parent.clientWidth : canvas.offsetWidth;
      canvas.width = Math.max(320, width);
      canvas.height = 240;
    });

    window.addEventListener('resize', () => {
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        const parent = canvas.parentElement;
        const width = parent ? parent.clientWidth : canvas.offsetWidth;
        canvas.width = Math.max(320, width);
        canvas.height = 240;
      });
      // Re-render charts on resize
      if (this.currentTab === 'today') {
        this.loadTodayData();
      } else if (this.currentTab === 'week') {
        this.loadWeekData();
      } else if (this.currentTab === 'sites') {
        this.loadSitesData();
      }
    });
  }

  generateColors(count) {
    const palette = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#8BC34A', '#E91E63', '#00BCD4', '#9C27B0'
    ];
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(palette[i % palette.length]);
    }
    return result;
  }

  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '<1m';
    }
  }

  async loadPomodoroData() {
    try {
      const res = await chrome.runtime.sendMessage({ action: 'pomodoro:get' });
      const s = res && res.state ? res.state : {};
      const rem = s.remainingMs || 0;
      const m = Math.floor(rem / 60000);
      const sec = Math.floor((rem % 60000) / 1000);
      const display = `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
      const dispEl = document.getElementById('pomodoroDisplay');
      const statusEl = document.getElementById('pomodoroStatus');
      const sessionsEl = document.getElementById('pomodoroSessions');
      if (dispEl) dispEl.textContent = display;
      if (statusEl) statusEl.textContent = s.mode === 'break' ? 'Break' : 'Work';
      if (sessionsEl) sessionsEl.textContent = s.sessionsCompleted || 0;
      if (this.pomodoroTimer) clearInterval(this.pomodoroTimer);
      if (s.isRunning) {
        this.pomodoroTimer = setInterval(() => this.loadPomodoroData(), 1000);
      }
      const toggleBtn = document.getElementById('pomodoroToggle');
      if (toggleBtn) {
        if (s.isRunning) {
          toggleBtn.innerHTML = 'Pause <i class="fa-solid fa-pause"></i>';
        } else {
          toggleBtn.innerHTML = 'Start <i class="fa-solid fa-play"></i>';
        }
      }
      const wd = document.getElementById('workDuration');
      const bd = document.getElementById('breakDuration');
      const lbd = document.getElementById('longBreakDuration');
      const sbl = document.getElementById('sessionsBeforeLong');
      if (wd && s.workMs) wd.value = Math.round(s.workMs/60000);
      if (bd && s.breakMs) bd.value = Math.round(s.breakMs/60000);
      if (lbd && s.longBreakMs) lbd.value = Math.round(s.longBreakMs/60000);
      if (sbl && s.sessionsBeforeLong) sbl.value = s.sessionsBeforeLong;
    } catch {}
  }

  async pomodoroStart() {
    const wd = parseInt(document.getElementById('workDuration').value, 10) || 25;
    const bd = parseInt(document.getElementById('breakDuration').value, 10) || 5;
    const lbd = parseInt(document.getElementById('longBreakDuration').value, 10) || 15;
    const sbl = parseInt(document.getElementById('sessionsBeforeLong').value, 10) || 4;
    const settings = {
      workMs: wd*60000,
      breakMs: bd*60000,
      longBreakMs: lbd*60000,
      sessionsBeforeLong: sbl
    };
    await chrome.runtime.sendMessage({ action: 'pomodoro:updateSettings', settings });
    await chrome.runtime.sendMessage({ action: 'pomodoro:start' });
    await this.loadPomodoroData();
  }

  async pomodoroPause() {
    await chrome.runtime.sendMessage({ action: 'pomodoro:pause' });
    await this.loadPomodoroData();
  }

  async pomodoroReset() {
    await chrome.runtime.sendMessage({ action: 'pomodoro:reset' });
    await this.loadPomodoroData();
  }

  async loadTasks() {
    try {
      const res = await chrome.runtime.sendMessage({ action: 'tasks:list' });
      const tasks = res && res.tasks ? res.tasks : [];
      const container = document.getElementById('todoList');
      if (!container) return;
      container.innerHTML = '';
      const sorted = [...tasks].sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
      const groups = this.groupTasksByDate(sorted);
      const order = ['Today','Yesterday'];
      order.forEach((key) => {
        if (groups[key] && groups[key].length) this.renderTaskGroup(container, key, groups[key]);
      });
      const dateKeys = Object.keys(groups).filter(k => !order.includes(k) && k !== 'Last Month');
      dateKeys.sort((a,b) => {
        const pa = a.split('-');
        const pb = b.split('-');
        const da = new Date(2000+parseInt(pa[2],10), parseInt(pa[1],10)-1, parseInt(pa[0],10));
        const db = new Date(2000+parseInt(pb[2],10), parseInt(pb[1],10)-1, parseInt(pb[0],10));
        return db - da;
      });
      dateKeys.forEach((key) => {
        if (groups[key] && groups[key].length) this.renderTaskGroup(container, key, groups[key]);
      });
      if (groups['Last Month'] && groups['Last Month'].length) this.renderTaskGroup(container, 'Last Month', groups['Last Month']);
      container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          await chrome.runtime.sendMessage({ action: 'tasks:toggle', id });
          this.loadTasks();
        });
      });
      container.querySelectorAll('.todo-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          await chrome.runtime.sendMessage({ action: 'tasks:delete', id });
          this.loadTasks();
        });
      });
    } catch {}
  }

  groupTasksByDate(tasks) {
    const groups = {};
    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = now.getMonth();
    const todayD = now.getDate();
    const yesterday = new Date(todayY, todayM, todayD - 1);
    const prevMonthY = todayM === 0 ? todayY - 1 : todayY;
    const prevMonthM = todayM === 0 ? 11 : todayM - 1;
    tasks.forEach((t) => {
      const d = new Date(t.createdAt || Date.now());
      const y = d.getFullYear();
      const m = d.getMonth();
      const day = d.getDate();
      if (y === todayY && m === todayM && day === todayD) {
        (groups['Today'] ||= []).push(t);
        return;
      }
      if (y === yesterday.getFullYear() && m === yesterday.getMonth() && day === yesterday.getDate()) {
        (groups['Yesterday'] ||= []).push(t);
        return;
      }
      if (y === prevMonthY && m === prevMonthM) {
        (groups['Last Month'] ||= []).push(t);
        return;
      }
      const label = this.formatDayLabel(d);
      (groups[label] ||= []).push(t);
    });
    return groups;
  }

  formatDayLabel(d) {
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  }

  renderTaskGroup(container, title, items) {
    const groupEl = document.createElement('div');
    groupEl.className = 'todo-group';
    const titleEl = document.createElement('div');
    titleEl.className = 'todo-group-title';
    titleEl.textContent = title;
    const itemsEl = document.createElement('div');
    itemsEl.className = 'todo-group-items';
    items.forEach((t) => {
      const el = document.createElement('div');
      el.className = 'todo-item';
      const createdStr = t.createdAt ? this.formatDateTime(t.createdAt) : '';
      el.innerHTML = `
        <label class="todo-check">
          <input type="checkbox" ${t.done ? 'checked' : ''} data-id="${t.id}" />
          <span class="todo-text ${t.done ? 'done' : ''}">${this.escapeHtml(t.text)}</span>
          ${createdStr ? `<span class="todo-created">${this.escapeHtml(createdStr)}</span>` : ''}
        </label>
        <button class="btn btn-danger todo-delete" data-id="${t.id}">Delete</button>
      `;
      itemsEl.appendChild(el);
    });
    groupEl.appendChild(titleEl);
    groupEl.appendChild(itemsEl);
    container.appendChild(groupEl);
  }

  async todoAdd() {
    const input = document.getElementById('todoInput');
    const text = (input && input.value ? input.value.trim() : '') || '';
    if (!text) return;
    await chrome.runtime.sendMessage({ action: 'tasks:add', text });
    input.value = '';
    await this.loadTasks();
  }

  async todoClearCompleted() {
    await chrome.runtime.sendMessage({ action: 'tasks:clearCompleted' });
    await this.loadTasks();
  }

  async todoClearAll() {
    await chrome.runtime.sendMessage({ action: 'tasks:clearAll' });
    await this.loadTasks();
  }

  formatDateTime(ts) {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch {
      return '';
    }
  }

  escapeHtml(s) {
    return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
}

// Add CSS for rotating animation
const style = document.createElement('style');
style.textContent = `
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .icon.rotating {
    animation: rotate 1s linear infinite;
  }
`;
document.head.appendChild(style);

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
  // Add a hint of fullscreen layout when wider viewport
  if (window.innerWidth > 500) {
    document.body.classList.add('fullscreen');
  }
});

// Open fullscreen in a new tab
PopupManager.prototype.openFullscreen = async function() {
  try {
    const url = chrome.runtime.getURL('src/popup.html');
    if (chrome && chrome.tabs && chrome.tabs.create) {
      await chrome.tabs.create({ url });
    } else if (window.browserAPI && browserAPI.tabs) {
      await browserAPI.tabs.create({ url });
    }
  } catch (error) {
    console.error('Error opening fullscreen view:', error);
  }
};
PopupManager.prototype.pomodoroToggle = async function() {
  try {
    const res = await chrome.runtime.sendMessage({ action: 'pomodoro:get' });
    const s = res && res.state ? res.state : {};
    if (s.isRunning) {
      await this.pomodoroPause();
    } else {
      await this.pomodoroStart();
    }
  } catch {}
};
