// Background Service Worker for Chrome Usage Tracker
// Handles tab tracking, storage, and data management

class UsageTracker {
  constructor() {
    this.activeTabs = new Map();
    this.sessionData = new Map();
    this.isTrackingEnabled = true;
    this.pomodoro = {
      mode: 'work',
      isRunning: false,
      remainingMs: 25 * 60 * 1000,
      workMs: 25 * 60 * 1000,
      breakMs: 5 * 60 * 1000,
      longBreakMs: 15 * 60 * 1000,
      sessionsBeforeLong: 4,
      sessionsCompleted: 0,
      lastUpdated: Date.now()
    };
    
    this.init();
  }

  init() {
    // Set up event listeners
    chrome.tabs.onActivated.addListener(this.handleTabActivated.bind(this));
    chrome.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
    chrome.windows.onFocusChanged.addListener(this.handleWindowFocusChanged.bind(this));
    chrome.runtime.onStartup.addListener(this.handleStartup.bind(this));
    chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));
    
    // Initialize tracking for existing tabs
    this.initializeExistingTabs();
  }

  async initializeExistingTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      const activeTab = tabs.find(tab => tab.active);
      
      if (activeTab && activeTab.url) {
        this.startTrackingTab(activeTab.id, activeTab.url);
      }
    } catch (error) {
      console.error('Error initializing existing tabs:', error);
    }
  }

  handleTabActivated(activeInfo) {
    this.stopTrackingAllTabs();
    try {
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab && tab.url) {
          this.startTrackingTab(activeInfo.tabId, tab.url);
        }
      });
    } catch {}
  }

  async handleTabUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
      this.stopTrackingTab(tabId);
      this.startTrackingTab(tabId, tab.url);
    }
  }

  handleTabRemoved(tabId) {
    this.stopTrackingTab(tabId);
  }

  handleWindowFocusChanged(windowId) {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      this.stopTrackingAllTabs();
    } else {
      chrome.tabs.query({ active: true, windowId }, (tabs) => {
        if (tabs[0]) {
          this.stopTrackingAllTabs();
          this.startTrackingTab(tabs[0].id, tabs[0].url);
        }
      });
    }
  }

  handleStartup() {
    this.loadStoredData();
  }

  handleInstalled() {
    this.loadStoredData();
    this.setDefaultSettings();
  }

  async setDefaultSettings() {
    const defaultSettings = {
      trackingEnabled: true,
      dailyGoal: 480, // 8 hours in minutes
      excludedDomains: ['chrome://', 'chrome-extension://', 'about:'],
      dataRetentionDays: 30
    };

    try {
      const stored = await chrome.storage.local.get('settings');
      if (!stored.settings) {
        await chrome.storage.local.set({ settings: defaultSettings });
      }
    } catch (error) {
      console.error('Error setting default settings:', error);
    }
  }

  startTrackingTab(tabId, url) {
    if (!this.isTrackingEnabled || !url) return;

    const domain = this.extractDomain(url);
    if (this.isDomainExcluded(domain)) return;

    const trackingData = {
      tabId,
      url,
      domain,
      startTime: Date.now(),
      lastUpdate: Date.now()
    };

    this.activeTabs.set(tabId, trackingData);
    this.updateBadge(domain);
  }

  stopTrackingTab(tabId) {
    const trackingData = this.activeTabs.get(tabId);
    if (!trackingData) return;

    const endTime = Date.now();
    const duration = endTime - trackingData.startTime;

    if (duration > 1000) { // Only track visits longer than 1 second
      this.saveVisitData(trackingData.domain, duration, trackingData.url);
    }

    this.activeTabs.delete(tabId);
    this.updateBadge('');
  }

  stopTrackingAllTabs() {
    for (const tabId of this.activeTabs.keys()) {
      this.stopTrackingTab(tabId);
    }
  }

  extractDomain(url) {
    try {
      // Handle special URLs like chrome://, chrome-extension://, about:, file://
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || 
          url.startsWith('about:') || url.startsWith('file://')) {
        // Return the protocol part without trailing slash for consistency
        if (url.startsWith('chrome://')) return 'chrome://';
        if (url.startsWith('chrome-extension://')) return 'chrome-extension://';
        if (url.startsWith('about:')) return 'about:';
        if (url.startsWith('file://')) return 'file://';
      }
      
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  isDomainExcluded(domain) {
    const excludedDomains = ['chrome://', 'chrome-extension://', 'about:', 'file://'];
    return excludedDomains.some(excluded => domain.includes(excluded) || domain === '');
  }

  async saveVisitData(domain, duration, url) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `visits_${today}`;
      
      const result = await chrome.storage.local.get(key);
      const visits = result[key] || {};
      
      if (!visits[domain]) {
        visits[domain] = {
          totalTime: 0,
          visitCount: 0,
          urls: {}
        };
      }

      visits[domain].totalTime += duration;
      visits[domain].visitCount += 1;
      
      if (!visits[domain].urls[url]) {
        visits[domain].urls[url] = 0;
      }
      visits[domain].urls[url] += duration;

      await chrome.storage.local.set({ [key]: visits });
      
      // Update real-time statistics
      this.updateStatistics(domain, duration);
      
    } catch (error) {
      console.error('Error saving visit data:', error);
    }
  }

  async updateStatistics(domain, duration) {
    try {
      const result = await chrome.storage.local.get('statistics');
      const stats = result.statistics || {
        totalTime: 0,
        totalVisits: 0,
        domains: {},
        lastUpdated: Date.now()
      };

      stats.totalTime += duration;
      stats.totalVisits += 1;
      stats.lastUpdated = Date.now();

      if (!stats.domains[domain]) {
        stats.domains[domain] = {
          totalTime: 0,
          visitCount: 0
        };
      }

      stats.domains[domain].totalTime += duration;
      stats.domains[domain].visitCount += 1;

      await chrome.storage.local.set({ statistics: stats });
    } catch (error) {
      console.error('Error updating statistics:', error);
    }
  }

  updateBadge(domain) {
    if (!domain) {
      chrome.action.setBadgeText({ text: '' });
      return;
    }

    const shortDomain = domain.substring(0, 4).toUpperCase();
    chrome.action.setBadgeText({ text: shortDomain });
    chrome.action.setBadgeBackgroundColor({ color: '#303b39' });
  }

  async loadStoredData() {
    try {
      const result = await chrome.storage.local.get(['settings', 'statistics', 'pomodoro', 'tasks']);
      if (result.settings) {
        this.isTrackingEnabled = result.settings.trackingEnabled;
      }
      if (result.pomodoro) {
        this.pomodoro = { ...this.pomodoro, ...result.pomodoro };
      } else {
        await chrome.storage.local.set({ pomodoro: this.pomodoro });
      }
      if (!result.tasks) {
        await chrome.storage.local.set({ tasks: [] });
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
    }
  }

  // Public API for popup and other components
  async getDailyStats(date = new Date().toISOString().split('T')[0]) {
    try {
      const key = `visits_${date}`;
      const result = await chrome.storage.local.get(key);
      return result[key] || {};
    } catch (error) {
      console.error('Error getting daily stats:', error);
      return {};
    }
  }

  async getStatistics() {
    try {
      const result = await chrome.storage.local.get('statistics');
      return result.statistics || {
        totalTime: 0,
        totalVisits: 0,
        domains: {},
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return { totalTime: 0, totalVisits: 0, domains: {} };
    }
  }

  async clearData() {
    try {
      await chrome.storage.local.clear();
      this.setDefaultSettings();
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  async exportData() {
    try {
      const data = await chrome.storage.local.get();
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }
}

// Initialize the tracker
const tracker = new UsageTracker();

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'pageEvent') {
    try {
      const tabId = sender && sender.tab ? sender.tab.id : undefined;
      const url = request.url;
      const domain = tracker.extractDomain(url);
      if (!tabId || tracker.isDomainExcluded(domain)) {
        sendResponse({ ok: false });
        return true;
      }

      const prev = tracker.sessionData.get(tabId);
      const ts = request.timestamp;

      if (!prev || prev.url !== url) {
        tracker.sessionData.set(tabId, { lastTimestamp: ts, url });
        sendResponse({ ok: true });
        return true;
      }

      const delta = Math.max(0, Math.min(ts - prev.lastTimestamp, 60000));
      if (delta >= 5000) {
        tracker.saveVisitData(domain, delta, url);
      }
      tracker.sessionData.set(tabId, { lastTimestamp: ts, url });
      sendResponse({ ok: true });
      return true;
    } catch {
      sendResponse({ ok: false });
      return true;
    }
  }

  switch (request.action) {
    case 'getDailyStats':
      tracker.getDailyStats(request.date).then(sendResponse);
      return true;
    case 'getStatistics':
      tracker.getStatistics().then(sendResponse);
      return true;
    case 'clearData':
      tracker.clearData().then(sendResponse);
      return true;
    case 'exportData':
      tracker.exportData().then(sendResponse);
      return true;
    case 'toggleTracking':
      tracker.isTrackingEnabled = request.enabled;
      if (!tracker.isTrackingEnabled) {
        tracker.stopTrackingAllTabs();
      }
      sendResponse({ success: true });
      return true;
    case 'getSettings':
      chrome.storage.local.get('settings').then((res) => {
        sendResponse({ settings: res.settings || {} });
      });
      return true;
    case 'saveSettings':
      chrome.storage.local.get('settings').then((res) => {
        const existing = res.settings || {};
        const incoming = request.settings || {};
        const merged = { ...existing };

        ['trackingEnabled', 'dailyGoal', 'dataRetentionDays', 'excludedDomains'].forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(incoming, key)) {
            const val = incoming[key];
            if (val === undefined || (Array.isArray(val) && val.length === 0)) {
              delete merged[key];
            } else {
              merged[key] = val;
            }
          }
        });

        chrome.storage.local.set({ settings: merged }).then(() => {
          tracker.isTrackingEnabled = !!merged.trackingEnabled;
          sendResponse({ success: true });
        });
      });
      return true;
    default:
      return false;
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm && alarm.name === 'pomodoro-end') {
    const res = await chrome.storage.local.get('pomodoro');
    const state = res.pomodoro || {};
    let next = { ...state };
    if (state.mode === 'work') {
      next.sessionsCompleted = (state.sessionsCompleted || 0) + 1;
      const useLong = next.sessionsCompleted % (state.sessionsBeforeLong || 4) === 0;
      next.mode = 'break';
      next.remainingMs = useLong ? (state.longBreakMs || 900000) : (state.breakMs || 300000);
    } else {
      next.mode = 'work';
      next.remainingMs = state.workMs || 1500000;
    }
    next.isRunning = true;
    next.lastUpdated = Date.now();
    await chrome.storage.local.set({ pomodoro: next });
    chrome.alarms.create('pomodoro-end', { when: Date.now() + next.remainingMs });
    if (chrome.notifications) {
      chrome.notifications.create('pomodoro-notify', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: next.mode === 'work' ? 'Work session' : 'Break time',
        message: next.mode === 'work' ? 'Focus for the next session' : 'Take a short break'
      });
    }
  }
});

function getPomodoroRemaining(state) {
  if (!state.isRunning) return state.remainingMs;
  const now = Date.now();
  const delta = Math.max(0, now - (state.lastUpdated || now));
  return Math.max(0, (state.remainingMs || 0) - delta);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'pomodoro:get': {
      chrome.storage.local.get('pomodoro').then((res) => {
        const s = res.pomodoro || {};
        const remaining = getPomodoroRemaining(s);
        sendResponse({ state: { ...s, remainingMs: remaining } });
      });
      return true;
    }
    case 'pomodoro:start': {
      chrome.storage.local.get('pomodoro').then((res) => {
        const s = { ...res.pomodoro, ...request.settings };
        const remaining = request.remainingMs != null ? request.remainingMs : s.remainingMs;
        const next = { ...s, isRunning: true, remainingMs: remaining, lastUpdated: Date.now() };
        chrome.storage.local.set({ pomodoro: next }).then(() => {
          chrome.alarms.clear('pomodoro-end').then(() => {
            chrome.alarms.create('pomodoro-end', { when: Date.now() + next.remainingMs });
            sendResponse({ success: true });
          });
        });
      });
      return true;
    }
    case 'pomodoro:pause': {
      chrome.storage.local.get('pomodoro').then((res) => {
        const s = res.pomodoro || {};
        const remaining = getPomodoroRemaining(s);
        const next = { ...s, isRunning: false, remainingMs: remaining, lastUpdated: Date.now() };
        chrome.storage.local.set({ pomodoro: next }).then(() => {
          chrome.alarms.clear('pomodoro-end').then(() => sendResponse({ success: true }));
        });
      });
      return true;
    }
    case 'pomodoro:reset': {
      const defaults = {
        mode: 'work',
        isRunning: false,
        remainingMs: 25 * 60 * 1000,
        sessionsCompleted: 0,
        lastUpdated: Date.now()
      };
      chrome.storage.local.get('pomodoro').then((res) => {
        const s = { ...res.pomodoro, ...defaults };
        chrome.storage.local.set({ pomodoro: s }).then(() => {
          chrome.alarms.clear('pomodoro-end').then(() => sendResponse({ success: true }));
        });
      });
      return true;
    }
    case 'pomodoro:updateSettings': {
      chrome.storage.local.get('pomodoro').then((res) => {
        const s = res.pomodoro || {};
        const next = { ...s, ...request.settings };
        chrome.storage.local.set({ pomodoro: next }).then(() => sendResponse({ success: true }));
      });
      return true;
    }
    case 'tasks:list': {
      chrome.storage.local.get('tasks').then((res) => {
        sendResponse({ tasks: res.tasks || [] });
      });
      return true;
    }
    case 'tasks:add': {
      chrome.storage.local.get('tasks').then((res) => {
        const tasks = res.tasks || [];
        const t = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
          text: request.text || '',
          done: false,
          createdAt: Date.now(),
          dueAt: request.dueAt || null
        };
        const next = [t, ...tasks];
        chrome.storage.local.set({ tasks: next }).then(() => sendResponse({ task: t }));
      });
      return true;
    }
    case 'tasks:toggle': {
      chrome.storage.local.get('tasks').then((res) => {
        const tasks = (res.tasks || []).map((t) => t.id === request.id ? { ...t, done: !t.done } : t);
        chrome.storage.local.set({ tasks }).then(() => sendResponse({ success: true }));
      });
      return true;
    }
    case 'tasks:delete': {
      chrome.storage.local.get('tasks').then((res) => {
        const tasks = (res.tasks || []).filter((t) => t.id !== request.id);
        chrome.storage.local.set({ tasks }).then(() => sendResponse({ success: true }));
      });
      return true;
    }
    case 'tasks:clearCompleted': {
      chrome.storage.local.get('tasks').then((res) => {
        const tasks = (res.tasks || []).filter((t) => !t.done);
        chrome.storage.local.set({ tasks }).then(() => sendResponse({ success: true }));
      });
      return true;
    }
    case 'tasks:clearAll': {
      chrome.storage.local.set({ tasks: [] }).then(() => sendResponse({ success: true }));
      return true;
    }
    default:
      return true;
  }
});