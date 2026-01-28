const timerDisplay = document.getElementById('timerDisplay');
const statusLabel = document.getElementById('statusLabel');
const dashboardBg = document.getElementById('dashboardBg');
const deepWorkToggle = document.getElementById('deepWorkToggle');
const totalDailyTime = document.getElementById('totalDailyTime');
const prodGrade = document.getElementById('prodGrade');
const exportBtn = document.getElementById('exportBtn');

// 1. INITIAL LOAD: Get all settings when popup opens
chrome.storage.sync.get(['focusRules', 'deepWork'], (data) => {
  if (data.focusRules) {
    renderRules(data.focusRules);
  }
  if (data.deepWork !== undefined) {
    deepWorkToggle.checked = data.deepWork;
  }
});

// 2. LIVE UPDATES: Update the timer and daily stats every second
function updateDashboard() {
  // Update the countdown timer from the active tab
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "getTime"}, (response) => {
        if (chrome.runtime.lastError || !response) {
          timerDisplay.innerText = "00:00:00";
          statusLabel.innerText = "No Active Limit";
          dashboardBg.style.background = "#6366f1"; // Primary Blue
          return;
        }

        const remaining = response.limit - response.elapsed;
        if (remaining <= 0) {
          timerDisplay.innerText = "LIMIT REACHED";
          statusLabel.innerText = "Focus Broken!";
          dashboardBg.style.background = "#ef4444"; // Danger Red
        } else {
          timerDisplay.innerText = formatTime(remaining);
          statusLabel.innerText = "Time Remaining";
          dashboardBg.style.background = "#10b981"; // Success Green
        }
      });
    }
  });

  // Update Daily Stats and Productivity Grade
  chrome.storage.local.get(['totalWastedToday'], (result) => {
    const totalSeconds = result.totalWastedToday || 0;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    
    // Update Grade UI
    if (mins < 15) {
      prodGrade.innerText = "A+";
      prodGrade.style.background = "#10b981"; // Success Green
    } else if (mins < 30) {
      prodGrade.innerText = "B";
      prodGrade.style.background = "#6366f1"; // Primary Blue
    } else if (mins < 60) {
      prodGrade.innerText = "C";
      prodGrade.style.background = "#f59e0b"; // Warning Orange
    } else {
      prodGrade.innerText = "F";
      prodGrade.style.background = "#ef4444"; // Danger Red
    }

    // Display formatted daily time
    totalDailyTime.innerText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  });
}

// Run the dashboard update immediately and then every 1 second
updateDashboard();
setInterval(updateDashboard, 1000);

// 3. SETTINGS: Save Deep Work toggle
deepWorkToggle.addEventListener('change', () => {
  chrome.storage.sync.set({ deepWork: deepWorkToggle.checked });
});

// 4. EXPORT: Download rules as CSV
exportBtn.addEventListener('click', () => {
  chrome.storage.sync.get(['focusRules'], (data) => {
    const rules = data.focusRules || [];
    if (rules.length === 0) {
      alert("No rules to export!");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Website,Limit (Seconds)\n";
    rules.forEach(rule => {
      csvContent += `${rule.url},${rule.totalSeconds}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "focus_flow_rules.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
});

// 5. RULE MANAGEMENT: Add new rules
const urlInput = document.getElementById('urlInput');
const addBtn = document.getElementById('addBtn');
const rulesList = document.getElementById('rulesList');

addBtn.addEventListener('click', () => {
  const url = urlInput.value.trim().toLowerCase();
  const h = parseInt(document.getElementById('hh').value) || 0;
  const m = parseInt(document.getElementById('mm').value) || 0;
  const s = parseInt(document.getElementById('ss').value) || 0;
  const totalSeconds = (h * 3600) + (m * 60) + s;

  if (url && totalSeconds > 0) {
    chrome.storage.sync.get(['focusRules'], (data) => {
      const rules = data.focusRules || [];
      const updated = [...rules.filter(r => r.url !== url), { url, totalSeconds }];
      
      chrome.storage.sync.set({ focusRules: updated }, () => {
        renderRules(updated);
        // Reset inputs to default values
        urlInput.value = '';
        document.getElementById('hh').value = 0;
        document.getElementById('mm').value = 5;
        document.getElementById('ss').value = 0;
      });
    });
  }
});

// 6. UI: Render the list of rules
function renderRules(rules) {
  rulesList.innerHTML = '';
  rules.forEach(rule => {
    const card = document.createElement('div');
    card.className = 'rule-card';
    
    // Formatting the limit text for the card
    let timeText = "";
    if (rule.totalSeconds >= 3600) timeText += `${Math.floor(rule.totalSeconds / 3600)}h `;
    if ((rule.totalSeconds % 3600) >= 60) timeText += `${Math.floor((rule.totalSeconds % 3600) / 60)}m `;
    if (rule.totalSeconds % 60 > 0 || rule.totalSeconds === 0) timeText += `${rule.totalSeconds % 60}s`;

    card.innerHTML = `
      <div>
        <div class="rule-url">${rule.url}</div>
        <div class="rule-time">${timeText.trim()} limit</div>
      </div>
      <div class="delete-btn" title="Remove Rule">&times;</div> 
    `;

    card.querySelector('.delete-btn').onclick = () => {
      const updated = rules.filter(r => r.url !== rule.url);
      chrome.storage.sync.set({ focusRules: updated }, () => renderRules(updated));
    };

    rulesList.appendChild(card);
  });
}

// Helper: Format seconds into HH:MM:SS
function formatTime(totalSeconds) {
  if (totalSeconds < 0) return "00:00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

document.getElementById('viewHistory').addEventListener('click', () => {
  chrome.tabs.create({ url: 'history.html' });
});