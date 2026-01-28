let elapsed = 0;
let limit = 0;
let timer = null;
let notificationShown = false;

const quotes = [
  "Is this worth your time?",
  "Don't give up on your goals for this.",
  "Deep work pays better than scrolling.",
  "Your future self is watching you.",
  "One more minute usually turns into twenty."
];

// --- SAFETY HELPER ---
// Checks if the extension is still connected. If not, stops everything.
function isContextValid() {
  if (!chrome.runtime?.id) {
    stopLoop();
    return false;
  }
  return true;
}

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!isContextValid()) return;

  try {
    if (msg.action === "startTimer") {
      limit = msg.limit;
      if (!timer) startLoop();
    } else if (msg.action === "stopTimer") {
      stopLoop();
    } else if (msg.action === "getTime") {
      sendResponse({ elapsed: elapsed, limit: limit });
    }
  } catch (e) {
    console.log("Focus Flow: Extension context invalidated. Refresh the page.");
  }
  return true; // Keeps the message channel open for async responses
});

function startLoop() {
  if (timer) clearInterval(timer);
  
  timer = setInterval(() => {
    // 1. Safety check at the start of every tick
    if (!isContextValid()) return;

    elapsed++;
    
    // 2. Increment Daily Total with safety
    try {
      chrome.storage.local.get(['totalWastedToday'], (data) => {
        if (chrome.runtime.lastError) return; // Silent catch for reloads
        let total = (data.totalWastedToday || 0) + 1;
        chrome.storage.local.set({ totalWastedToday: total });
      });
    } catch (e) { /* Ignore background disconnection */ }

    const timeLeft = limit - elapsed;

    // 3. Warning Logic
    if (timeLeft === 5 && !notificationShown) {
      try {
        chrome.storage.sync.get(['deepWork'], (data) => {
          if (chrome.runtime.lastError) return;
          const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
          showWarningNotification(data.deepWork, randomQuote);
        });
        notificationShown = true;
      } catch (e) { /* Ignore */ }
    }

    // 4. Visual Fading Logic
    if (elapsed >= limit) {
      const intensity = Math.min((elapsed - limit) / 300, 0.85);
      document.body.style.transition = "all 2s ease";
      document.body.style.filter = `grayscale(${intensity * 100}%) blur(${intensity * 3}px)`;
      document.body.style.opacity = 1 - intensity;
    }
  }, 1000);
}

function stopLoop() {
  if (timer) clearInterval(timer);
  timer = null;
  elapsed = 0;
  notificationShown = false;
  resetVisuals();
  removeNotification();
}

function resetVisuals() {
  document.body.style.filter = "";
  document.body.style.opacity = "1";
}

function showWarningNotification(isDeepWork, quote) {
  if (document.getElementById('focus-flow-alert')) return;

  const notify = document.createElement('div');
  notify.id = "focus-flow-alert";
  
  const snoozeHtml = isDeepWork 
    ? `<div style="font-size: 11px; color: #f87171; font-weight: bold;">⚠️ DEEP WORK ACTIVE</div>`
    : `<button id="snoozeBtn" style="background:#6366f1; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:12px;">Snooze +1 Min</button>`;

  notify.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 12px; min-width: 220px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="background: #ef4444; width: 12px; height: 12px; border-radius: 50%; animation: pulse 1s infinite;"></div>
        <div>
          <div style="font-weight: 800; font-size: 14px; color: #fff;">${quote}</div>
          <div style="font-size: 11px; color: #9ca3af;">Focus Flow Nudge</div>
        </div>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        ${snoozeHtml}
        <button id="closeNotify" style="background:transparent; color:#9ca3af; border:1px solid #374151; padding:8px 12px; border-radius:6px; cursor:pointer; font-size:12px;">Dismiss</button>
      </div>
    </div>
    <style>
      @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
      #focus-flow-alert {
        position: fixed; top: 20px; right: 20px; background: #111827 !important; color: white !important; padding: 20px !important; border-radius: 16px !important; 
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5) !important; z-index: 999999999 !important; font-family: 'Inter', sans-serif !important;
        transform: translateX(120%); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        border: 1px solid #374151 !important;
      }
    </style>
  `;
  document.documentElement.appendChild(notify);
  
  setTimeout(() => { if(notify) notify.style.transform = "translateX(0)"; }, 100);

  const snoozeBtn = document.getElementById('snoozeBtn');
  if (snoozeBtn) {
    snoozeBtn.onclick = () => {
      limit += 60;
      notificationShown = false;
      resetVisuals();
      removeNotification();
    };
  }

  const closeBtn = document.getElementById('closeNotify');
  if (closeBtn) closeBtn.onclick = removeNotification;

  // Auto-remove after 10 seconds
  setTimeout(removeNotification, 10000);
}

function removeNotification() {
  const existing = document.getElementById('focus-flow-alert');
  if (existing) {
    existing.style.transform = "translateX(120%)";
    setTimeout(() => existing.remove(), 500);
  }
}