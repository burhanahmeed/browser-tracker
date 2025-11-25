// Content Script for Chrome Usage Tracker
// Monitors page visibility and user activity

class PageTracker {
  constructor() {
    this.startTime = Date.now();
    this.isVisible = !document.hidden;
    this.lastActivity = Date.now();
    this.idleThreshold = 30000; // 30 seconds
    this.heartbeatInterval = 10000; // 10 seconds
    
    this.init();
  }

  init() {
    // Monitor page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Monitor user activity
    this.setupActivityListeners();
    
    // Start heartbeat to track active time
    this.startHeartbeat();
    
    // Send initial page load event
    this.sendPageEvent('pageLoad');
  }

  setupActivityListeners() {
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, this.handleUserActivity.bind(this), { passive: true });
    });
  }

  handleVisibilityChange() {
    this.isVisible = !document.hidden;
    
    if (this.isVisible) {
      this.sendPageEvent('pageVisible');
      this.lastActivity = Date.now();
    } else {
      this.sendPageEvent('pageHidden');
    }
  }

  handleUserActivity() {
    this.lastActivity = Date.now();
  }

  startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    this.heartbeatTimer = setInterval(() => {
      if (this.isVisible && this.isUserActive()) {
        this.sendHeartbeat();
      }
    }, this.heartbeatInterval);
  }

  isUserActive() {
    return Date.now() - this.lastActivity < this.idleThreshold;
  }

  sendHeartbeat() {
    this.sendPageEvent('heartbeat');
  }

  sendPageEvent(eventType) {
    const message = {
      type: 'pageEvent',
      event: eventType,
      url: window.location.href,
      domain: window.location.hostname,
      timestamp: Date.now(),
      activeTime: this.getActiveTime()
    };

    // Send message to background script
    try {
      if (typeof browserAPI !== 'undefined' && browserAPI.runtime && browserAPI.runtime.sendMessage) {
        browserAPI.runtime.sendMessage(message).catch((error) => {
          if (!error || !error.message || !/context invalidated/i.test(error.message)) {
            console.warn('sendMessage warning:', error);
          }
        });
        return;
      }

      if (chrome && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
        chrome.runtime.sendMessage(message, (response) => {
          const err = chrome.runtime && chrome.runtime.lastError ? chrome.runtime.lastError : null;
          if (err && /context invalidated/i.test(err.message)) {
            return; // Silent ignore
          }
          if (err) {
            console.warn('sendMessage warning:', err.message);
          }
        });
      }
    } catch (e) {
      // Swallow errors due to invalidated extension context
    }
  }

  getActiveTime() {
    return Date.now() - this.startTime;
  }

  // Get page metadata for enhanced tracking
  getPageMetadata() {
    return {
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname,
      pathname: window.location.pathname,
      timestamp: Date.now(),
      activeTime: this.getActiveTime(),
      scrollDepth: this.getScrollDepth(),
      contentLength: this.getContentLength()
    };
  }

  getScrollDepth() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    return scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
  }

  getContentLength() {
    return document.body ? document.body.innerText.length : 0;
  }

  // Clean up when page is unloaded
  cleanup() {
    this.sendPageEvent('pageUnload');
  }
}

// Initialize page tracker when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.pageTracker = new PageTracker();
  });
} else {
  window.pageTracker = new PageTracker();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.pageTracker) {
    window.pageTracker.cleanup();
    if (window.pageTracker.heartbeatTimer) {
      clearInterval(window.pageTracker.heartbeatTimer);
      window.pageTracker.heartbeatTimer = null;
    }
  }
});

// Handle extension updates or reloads
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageInfo') {
    if (window.pageTracker) {
      sendResponse(window.pageTracker.getPageMetadata());
    } else {
      sendResponse({ error: 'Page tracker not initialized' });
    }
  }
  
  if (request.action === 'ping') {
    sendResponse({ status: 'active' });
  }
  
  return true;
});