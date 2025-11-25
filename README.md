# Chrome Usage Tracker

A privacy-focused browser extension that monitors and analyzes web browsing habits to help users understand and optimize their online time management.

## Features

### 🕒 Time Tracking
- **Real-time tracking** of active tab usage
- **Domain-level analysis** with detailed breakdowns
- **Page-level insights** with scroll depth and content engagement
- **Automatic idle detection** to prevent over-counting

### 📊 Data Visualization
- **Daily usage reports** with pie charts and site breakdowns
- **Weekly trend analysis** with bar charts
- **Top sites ranking** with visit frequency and duration
- **Time distribution charts** showing browsing patterns

### 🔒 Privacy First
- **100% local data storage** - no external servers
- **No data transmission** - everything stays on your device
- **Transparent data collection** - clear privacy policy
- **User-controlled settings** - customize what gets tracked

### 🌐 Cross-Browser Support
- **Chrome** (Manifest V3)
- **Firefox** (WebExtensions API)
- **Edge** (Chromium-based)
- **Brave** and other Chromium browsers

### ⚡ Performance Optimized
- **Lightweight footprint** - minimal memory usage
- **Efficient tracking** - optimized event handling
- **Smart data management** - automatic cleanup of old data
- **Responsive UI** - smooth popup interactions

## Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore)
2. Search for "Chrome Usage Tracker"
3. Click "Add to Chrome"
4. Grant necessary permissions

### Manual Installation (Developer Mode)
1. Download the latest release from [GitHub Releases](https://github.com/your-username/chrome-usage-tracker/releases)
2. Extract the ZIP file
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the extension folder
6. The extension icon should appear in your toolbar

### Firefox Installation
1. Download the Firefox-compatible version
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" → "Load Temporary Add-on"
4. Select the `manifest.json` file from the extension folder

## Usage

### Basic Usage
1. **Install the extension** following the instructions above
2. **Browse normally** - the extension automatically tracks your usage
3. **Click the extension icon** to view your usage statistics
4. **Explore different views** - Today, This Week, and Top Sites

### Understanding the Interface

#### Popup Overview
- **Today**: Shows today's browsing time, number of sites visited, and total visits
- **Controls**: Toggle tracking on/off and refresh data
- **Tabs**: Switch between different time periods and views

#### Daily View
- **Pie chart**: Visual breakdown of time spent on each domain
- **Site list**: Detailed list with time spent and visit count
- **Real-time updates**: Data refreshes automatically

#### Weekly View
- **Bar chart**: Daily usage comparison across the week
- **Summary statistics**: Total time, daily average, most active day
- **Trend analysis**: Identify patterns in your browsing habits

#### Top Sites
- **Search functionality**: Find specific domains quickly
- **Detailed metrics**: Total time, visits, and average time per visit
- **Historical data**: All-time statistics for each domain

### Settings and Customization

#### Access Settings
1. Click the extension icon
2. Click the "Settings" button
3. Configure your preferences

#### Available Settings
- **Enable/disable tracking**: Pause/resume data collection
- **Daily goal**: Set target browsing time (default: 8 hours)
- **Data retention**: Choose how long to keep data (default: 30 days)
- **Excluded domains**: Domains to never track (pre-configured with browser internal pages)

#### Data Management
- **Export data**: Download all your usage data as JSON
- **Clear data**: Remove all stored data (requires confirmation)
- **Automatic cleanup**: Old data is automatically removed based on retention settings

## Technical Details

### Architecture
```
chrome-usage-tracker/
├── manifest.json          # Extension configuration
├── src/
│   ├── background.js      # Service worker for tab tracking
│   ├── content.js         # Page-level tracking script
│   ├── popup.html         # Extension popup interface
│   ├── popup.css          # Popup styling
│   ├── popup.js           # Popup functionality
│   └── browser-compat.js  # Cross-browser compatibility
├── icons/                 # Extension icons
├── tests/                 # Unit tests
└── docs/                  # Documentation
```

### Data Structure
```javascript
// Daily visit data
{
  "visits_2024-01-15": {
    "google.com": {
      "totalTime": 3600000,
      "visitCount": 15,
      "urls": {
        "https://google.com/search": 1800000,
        "https://google.com/maps": 1800000
      }
    }
  }
}

// Statistics
{
  "statistics": {
    "totalTime": 7200000,
    "totalVisits": 45,
    "domains": {
      "google.com": { "totalTime": 3600000, "visitCount": 15 },
      "github.com": { "totalTime": 1800000, "visitCount": 10 }
    },
    "lastUpdated": 1705320000000
  }
}
```

### API Reference

#### Background Script Messages
```javascript
// Get daily statistics
chrome.runtime.sendMessage({
  action: 'getDailyStats',
  date: '2024-01-15'
});

// Get overall statistics
chrome.runtime.sendMessage({
  action: 'getStatistics'
});

// Toggle tracking
chrome.runtime.sendMessage({
  action: 'toggleTracking',
  enabled: false
});

// Export data
chrome.runtime.sendMessage({
  action: 'exportData'
});

// Clear all data
chrome.runtime.sendMessage({
  action: 'clearData'
});
```

### Browser Compatibility

| Feature | Chrome | Firefox | Edge |
|---------|--------|---------|------|
| Tab Tracking | ✅ | ✅ | ✅ |
| Storage API | ✅ | ✅ | ✅ |
| Manifest V3 | ✅ | ⚠️ | ✅ |
| Content Scripts | ✅ | ✅ | ✅ |
| Popup Interface | ✅ | ✅ | ✅ |

⚠️ Firefox supports Manifest V3 but with some limitations

## Development

### Setup Development Environment
```bash
# Clone the repository
git clone https://github.com/your-username/chrome-usage-tracker.git
cd chrome-usage-tracker

# Install dependencies
npm install

# Run tests
npm test

# Package for distribution
npm run package
```

### Running Tests
```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Validate extension manifest
npm run validate
```

### Building for Production
```bash
# Create distribution package
npm run package

# This creates chrome-usage-tracker.zip ready for upload to extension stores
```

### Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Privacy Policy

### Data Collection
Chrome Usage Tracker collects and stores the following data locally on your device:
- **Website domains** you visit
- **Time spent** on each website
- **Number of visits** to each website
- **Page URLs** (optional, can be disabled)

### Data Storage
- **All data is stored locally** using browser's storage API
- **No data is transmitted** to external servers
- **No analytics or tracking** of your usage patterns
- **No third-party integrations** or data sharing

### Data Retention
- Data is retained based on your settings (default: 30 days)
- Old data is automatically deleted
- You can manually clear all data at any time
- You can export your data for backup

### Your Rights
- **Full control** over what gets tracked
- **Access to all your data** through export feature
- **Right to delete** all data at any time
- **Right to disable** tracking completely

## Troubleshooting

### Common Issues

#### Extension Not Working
1. **Check permissions**: Ensure the extension has necessary permissions
2. **Restart browser**: Sometimes a browser restart helps
3. **Check console**: Open browser dev tools for error messages
4. **Reinstall extension**: Remove and reinstall the extension

#### Data Not Showing
1. **Wait for activity**: Data appears after you browse for a while
2. **Check if tracking is enabled**: Use the toggle button in popup
3. **Refresh data**: Click the refresh button in popup
4. **Check excluded domains**: Some domains are excluded by default

#### Performance Issues
1. **Clear old data**: Large datasets can slow down the extension
2. **Reduce data retention**: Lower the retention period in settings
3. **Disable tracking temporarily**: Use the pause button
4. **Check browser performance**: Extension has minimal impact

### Getting Help
- **GitHub Issues**: [Report bugs and request features](https://github.com/your-username/chrome-usage-tracker/issues)
- **Documentation**: Check this README and inline code comments
- **Browser Support**: Ensure you're using a supported browser version

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Browser extension APIs and documentation
- Chart.js library for data visualization
- Open source community for inspiration and feedback
- Beta testers for valuable feedback and bug reports

## Changelog

### v1.0.0 (Initial Release)
- ✅ Basic time tracking functionality
- ✅ Daily and weekly usage reports
- ✅ Top sites analysis
- ✅ Privacy-focused local storage
- ✅ Cross-browser compatibility
- ✅ Responsive UI with charts
- ✅ Export and data management features

---

**Made with ❤️ for better browsing habits**