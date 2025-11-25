// Cross-browser compatibility layer for Chrome Usage Tracker
// Provides unified API for Chrome, Firefox, and Edge

// Browser detection
const isChrome = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest;
const isFirefox = typeof browser !== 'undefined' && browser.runtime && browser.runtime.getManifest;
const isEdge = isChrome && navigator.userAgent.includes('Edg');

// Unified browser API
const browserAPI = (() => {
  // Use browser API for Firefox, chrome for Chrome/Edge
  const api = isFirefox ? browser : chrome;
  
  return {
    // Storage API
    storage: {
      local: {
        get: (keys) => {
          return new Promise((resolve, reject) => {
            if (isFirefox) {
              api.storage.local.get(keys).then(resolve).catch(reject);
            } else {
              api.storage.local.get(keys, (result) => {
                if (api.runtime.lastError) {
                  reject(api.runtime.lastError);
                } else {
                  resolve(result);
                }
              });
            }
          });
        },
        set: (items) => {
          return new Promise((resolve, reject) => {
            if (isFirefox) {
              api.storage.local.set(items).then(resolve).catch(reject);
            } else {
              api.storage.local.set(items, () => {
                if (api.runtime.lastError) {
                  reject(api.runtime.lastError);
                } else {
                  resolve();
                }
              });
            }
          });
        },
        clear: () => {
          return new Promise((resolve, reject) => {
            if (isFirefox) {
              api.storage.local.clear().then(resolve).catch(reject);
            } else {
              api.storage.local.clear(() => {
                if (api.runtime.lastError) {
                  reject(api.runtime.lastError);
                } else {
                  resolve();
                }
              });
            }
          });
        }
      }
    },
    
    // Tabs API
    tabs: {
      query: (queryInfo) => {
        return new Promise((resolve, reject) => {
          if (isFirefox) {
            api.tabs.query(queryInfo).then(resolve).catch(reject);
          } else {
            api.tabs.query(queryInfo, (tabs) => {
              if (api.runtime.lastError) {
                reject(api.runtime.lastError);
              } else {
                resolve(tabs);
              }
            });
          }
        });
      },
      onActivated: api.tabs.onActivated,
      onUpdated: api.tabs.onUpdated,
      onRemoved: api.tabs.onRemoved
    },
    
    // Windows API
    windows: {
      onFocusChanged: api.windows.onFocusChanged
    },
    
    // Runtime API
    runtime: {
      sendMessage: (message) => {
        return new Promise((resolve, reject) => {
          if (isFirefox) {
            api.runtime.sendMessage(message).then(resolve).catch(reject);
          } else {
            api.runtime.sendMessage(message, (response) => {
              if (api.runtime.lastError) {
                reject(api.runtime.lastError);
              } else {
                resolve(response);
              }
            });
          }
        });
      },
      onMessage: api.runtime.onMessage,
      onInstalled: api.runtime.onInstalled,
      onStartup: api.runtime.onStartup,
      lastError: api.runtime.lastError
    },
    
    // Action API (Manifest V3) or Browser Action (Manifest V2)
    action: api.action || api.browserAction,
    
    // Context menus (for future features)
    contextMenus: api.contextMenus,
    
    // Notifications (for future features)
    notifications: api.notifications
  };
})();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = browserAPI;
} else if (typeof window !== 'undefined') {
  window.browserAPI = browserAPI;
}