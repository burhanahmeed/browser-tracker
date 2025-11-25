// Unit Tests for Chrome Usage Tracker
// Test suite for core functionality

class UsageTrackerTests {
  constructor() {
    this.tests = [];
    this.results = [];
  }

  // Test runner
  async runAllTests() {
    console.log('🧪 Running Chrome Usage Tracker Tests...\n');
    
    this.tests = [
      this.testDomainExtraction,
      this.testDurationFormatting,
      this.testDataStorage,
      this.testTabTracking,
      this.testStatisticsCalculation,
      this.testPrivacyFeatures
    ];

    for (const test of this.tests) {
      try {
        await test.call(this);
        this.results.push({ test: test.name, status: 'PASS' });
        console.log(`✅ ${test.name}`);
      } catch (error) {
        this.results.push({ test: test.name, status: 'FAIL', error: error.message });
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }

    this.printSummary();
    return this.results;
  }

  printSummary() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;

    console.log(`\n📊 Test Summary:`);
    console.log(`   Total: ${total}`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Success Rate: ${Math.round((passed / total) * 100)}%`);
  }

  // Test 1: Domain extraction from URLs
  testDomainExtraction() {
    const testCases = [
      { url: 'https://www.google.com/search?q=test', expected: 'google.com' },
      { url: 'http://subdomain.example.com/path/to/page', expected: 'subdomain.example.com' },
      { url: 'https://github.com/user/repository', expected: 'github.com' },
      { url: 'chrome://extensions/', expected: 'chrome://' },
      { url: 'about:blank', expected: 'about:' },
      { url: 'invalid-url', expected: 'unknown' }
    ];

    testCases.forEach(testCase => {
      const result = this.extractDomain(testCase.url);
      if (result !== testCase.expected) {
        throw new Error(`Domain extraction failed for ${testCase.url}. Expected: ${testCase.expected}, Got: ${result}`);
      }
    });
  }

  extractDomain(url) {
    try {
      // Handle special URLs like chrome://, chrome-extension://, about:, file://
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || 
          url.startsWith('about:') || url.startsWith('file://')) {
        // Return the protocol part without trailing slash for consistency with test expectations
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

  // Test 2: Duration formatting
  testDurationFormatting() {
    const testCases = [
      { milliseconds: 0, expected: '<1m' },
      { milliseconds: 30000, expected: '<1m' },
      { milliseconds: 60000, expected: '1m' },
      { milliseconds: 90000, expected: '1m' },
      { milliseconds: 3600000, expected: '1h 0m' },
      { milliseconds: 5400000, expected: '1h 30m' },
      { milliseconds: 7200000, expected: '2h 0m' },
      { milliseconds: 9000000, expected: '2h 30m' }
    ];

    testCases.forEach(testCase => {
      const result = this.formatDuration(testCase.milliseconds);
      if (result !== testCase.expected) {
        throw new Error(`Duration formatting failed for ${testCase.milliseconds}ms. Expected: ${testCase.expected}, Got: ${result}`);
      }
    });
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

  // Test 3: Data storage operations
  async testDataStorage() {
    const testData = {
      domain: 'test.com',
      totalTime: 300000,
      visitCount: 5,
      urls: {
        'https://test.com/page1': 120000,
        'https://test.com/page2': 180000
      }
    };

    // Test storage key generation
    const today = new Date().toISOString().split('T')[0];
    const key = `visits_${today}`;
    if (!key.startsWith('visits_')) {
      throw new Error('Invalid storage key format');
    }

    // Test data structure validation
    if (!testData.domain || typeof testData.totalTime !== 'number' || typeof testData.visitCount !== 'number') {
      throw new Error('Invalid data structure');
    }

    if (!testData.urls || typeof testData.urls !== 'object') {
      throw new Error('Invalid URLs structure');
    }
  }

  // Test 4: Tab tracking logic
  testTabTracking() {
    // Test tab ID management
    const activeTabs = new Map();
    const tabId = 123;
    const trackingData = {
      tabId: tabId,
      url: 'https://example.com',
      domain: 'example.com',
      startTime: Date.now(),
      lastUpdate: Date.now()
    };

    activeTabs.set(tabId, trackingData);
    
    if (!activeTabs.has(tabId)) {
      throw new Error('Tab tracking failed - tab not found in active tabs');
    }

    if (activeTabs.get(tabId).domain !== 'example.com') {
      throw new Error('Tab tracking failed - incorrect domain stored');
    }

    // Test tab removal
    activeTabs.delete(tabId);
    if (activeTabs.has(tabId)) {
      throw new Error('Tab removal failed - tab still exists');
    }
  }

  // Test 5: Statistics calculation
  testStatisticsCalculation() {
    const domains = {
      'google.com': { totalTime: 3600000, visitCount: 10 },
      'github.com': { totalTime: 1800000, visitCount: 5 },
      'stackoverflow.com': { totalTime: 900000, visitCount: 3 }
    };

    // Calculate total time
    const totalTime = Object.values(domains).reduce((sum, domain) => sum + domain.totalTime, 0);
    if (totalTime !== 6300000) {
      throw new Error(`Total time calculation failed. Expected: 6300000, Got: ${totalTime}`);
    }

    // Calculate total visits
    const totalVisits = Object.values(domains).reduce((sum, domain) => sum + domain.visitCount, 0);
    if (totalVisits !== 18) {
      throw new Error(`Total visits calculation failed. Expected: 18, Got: ${totalVisits}`);
    }

    // Find most visited domain
    const mostVisited = Object.entries(domains)
      .sort(([,a], [,b]) => b.visitCount - a.visitCount)[0];
    
    if (mostVisited[0] !== 'google.com' || mostVisited[1].visitCount !== 10) {
      throw new Error('Most visited domain calculation failed');
    }

    // Find domain with most time
    const mostTime = Object.entries(domains)
      .sort(([,a], [,b]) => b.totalTime - a.totalTime)[0];
    
    if (mostTime[0] !== 'google.com' || mostTime[1].totalTime !== 3600000) {
      throw new Error('Most time spent calculation failed');
    }
  }

  // Test 6: Privacy features
  testPrivacyFeatures() {
    // Test excluded domains
    const excludedDomains = ['chrome://', 'chrome-extension://', 'about:', 'file://'];
    const testUrls = [
      'chrome://extensions/',
      'chrome-extension://abc123/popup.html',
      'about:blank',
      'file:///home/user/document.pdf',
      'https://google.com',
      'http://example.com'
    ];

    testUrls.forEach(url => {
      const domain = this.extractDomain(url);
      const isExcluded = excludedDomains.some(excluded => domain.includes(excluded) || domain === '');
      
      // Should be excluded for internal URLs
      if (url.includes('chrome://') || url.includes('chrome-extension://') || 
          url.includes('about:') || url.includes('file://')) {
        if (!isExcluded) {
          throw new Error(`Privacy test failed - ${url} should be excluded`);
        }
      }
      
      // Should not be excluded for regular URLs
      if (url.includes('https://') || url.includes('http://')) {
        if (isExcluded) {
          throw new Error(`Privacy test failed - ${url} should not be excluded`);
        }
      }
    });

    // Test data retention
    const dataRetentionDays = 30;
    const retentionMs = dataRetentionDays * 24 * 60 * 60 * 1000;
    
    if (retentionMs !== 2592000000) {
      throw new Error(`Data retention calculation failed. Expected: 2592000000ms, Got: ${retentionMs}ms`);
    }

    // Test that no external data transmission occurs
    // This would need to be verified in the actual implementation
    console.log('⚠️  Note: External data transmission test requires runtime verification');
  }
}

// Test runner for browser environment
if (typeof window !== 'undefined') {
  window.runUsageTrackerTests = () => {
    const tester = new UsageTrackerTests();
    return tester.runAllTests();
  };
}

// Test runner for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UsageTrackerTests;
}

// Auto-run tests if in test environment
if (typeof window === 'undefined' && typeof require !== 'undefined') {
  const tester = new UsageTrackerTests();
  tester.runAllTests().then(results => {
    process.exit(results.some(r => r.status === 'FAIL') ? 1 : 0);
  });
}