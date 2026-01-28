// Triggered when the extension is first installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ 
    totalWastedToday: 0, 
    siteBreakdownToday: {}, // Initialize the breakdown for the pie chart
    lastResetDate: new Date().toLocaleDateString(),
    history: [] // Initialize empty history array
  });
});

// Listeners for tab changes
chrome.tabs.onActivated.addListener(info => checkTab(info.tabId));
chrome.tabs.onUpdated.addListener((id, change, tab) => {
  if (change.status === 'complete') checkTab(id);
});

async function checkTab(tabId) {
  try {
    // 1. --- DAILY RESET & HISTORY LOGGING ---
    // Fetch all necessary data for the reset check
    const storage = await chrome.storage.local.get([
      'lastResetDate', 
      'totalWastedToday', 
      'history', 
      'siteBreakdownToday'
    ]);
    
    const today = new Date().toLocaleDateString();

    if (storage.lastResetDate !== today) {
      let history = storage.history || [];

      // Save the previous day's data (Total + Site Breakdown)
      history.push({
        date: storage.lastResetDate,
        seconds: storage.totalWastedToday || 0,
        breakdown: storage.siteBreakdownToday || {} // This feeds the Pie Chart
      });

      // Keep only the last 30 days of history
      if (history.length > 30) {
        history.shift();
      }

      // Reset for the new day
      await chrome.storage.local.set({ 
        totalWastedToday: 0, 
        siteBreakdownToday: {}, // Reset the pie chart data for the new day
        lastResetDate: today,
        history: history
      });
      
      console.log("Focus Flow: New day detected. Daily stats archived to history.");
    }

    // 2. --- TAB CHECK ---
    const tab = await chrome.tabs.get(tabId);
    
    // Ignore internal chrome/system pages
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:")) {
      return;
    }

    // 3. --- RULE CHECK ---
    chrome.storage.sync.get(['focusRules'], (data) => {
      const rules = data.focusRules || [];
      const rule = rules.find(r => tab.url.toLowerCase().includes(r.url.toLowerCase()));

      if (rule) {
        // Send the limit to the content script
        chrome.tabs.sendMessage(tabId, { 
          action: "startTimer", 
          limit: rule.totalSeconds 
        }).catch(() => {
          // Silent catch for pages where script isn't loaded or context invalidated
        });
      } else {
        // If not a blocked site, tell content script to stop any running timers
        chrome.tabs.sendMessage(tabId, { action: "stopTimer" }).catch(() => {});
      }
    });

  } catch (e) {
    // Ignore errors if the tab was closed before we could check it
  }
}