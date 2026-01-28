document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  
  // 1. Theme Persistence Logic
  chrome.storage.local.get(['theme'], (res) => {
    if (res.theme === 'dark') {
      document.body.setAttribute('data-theme', 'dark');
      themeToggle.innerText = "Switch to Light Mode";
    }
  });

  themeToggle.onclick = () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    themeToggle.innerText = isDark ? "Switch to Dark Mode" : "Switch to Light Mode";
    chrome.storage.local.set({ theme: newTheme });
    
    // Reload after a short delay to allow the storage to save
    setTimeout(() => location.reload(), 100); 
  };

  // 2. Load History Data
  chrome.storage.local.get(['history'], (data) => {
    const history = data.history || [];
    
    // Handle empty state
    if (history.length === 0) {
      document.querySelector('.grid').innerHTML = `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 50px;">
          <h2 style="color: var(--subtext);">No data collected yet.</h2>
          <p>Browse some of your blocked sites to see your stats here tomorrow!</p>
        </div>`;
      return;
    }

    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    // --- LINE CHART (Usage Trends) ---
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: history.map(e => e.date),
        datasets: [{
          label: 'Minutes Wasted',
          data: history.map(e => Math.round(e.seconds / 60)),
          borderColor: '#6366f1',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: { 
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false } // Hide legend for cleaner look
        },
        scales: { 
          y: { 
            beginAtZero: true,
            ticks: { color: textColor },
            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
          },
          x: { 
            ticks: { color: textColor },
            grid: { display: false }
          }
        }
      }
    });

    // --- PIE CHART & LEADERBOARD LOGIC ---
    
    // 1. Calculate totals for every site across all history
    const siteTotals = {};
    history.forEach(entry => {
      if (entry.breakdown) {
        for (const [site, secs] of Object.entries(entry.breakdown)) {
          siteTotals[site] = (siteTotals[site] || 0) + secs;
        }
      }
    });

    // 2. Sort sites by time spent (Descending) and take Top 5
    const sortedSites = Object.entries(siteTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // 3. Generate HTML for the Leaderboard
    const leaderboard = document.getElementById('siteLeaderboard');
    leaderboard.innerHTML = ''; // Clear loading state

    sortedSites.forEach(([site, secs]) => {
      const mins = Math.round(secs / 60);
      const iconUrl = `https://www.google.com/s2/favicons?domain=${site}&sz=64`;

      const item = document.createElement('div');
      item.className = 'leaderboard-item';
      item.innerHTML = `
        <div class="site-meta">
          <img src="${iconUrl}" class="site-icon" onerror="this.src='icon128.png'">
          <span class="site-name">${site}</span>
        </div>
        <span class="site-time">${mins}m</span>
      `;
      leaderboard.appendChild(item);
    });

    // 4. Render the Doughnut Chart
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: sortedSites.map(([site]) => site),
        datasets: [{
          data: sortedSites.map(([, secs]) => Math.round(secs / 60)),
          backgroundColor: [
            '#6366f1', // Indigo
            '#10b981', // Green
            '#f59e0b', // Amber
            '#ef4444', // Red
            '#8b5cf6'  // Violet
          ],
          hoverOffset: 10,
          borderWidth: 0
        }]
      },
      options: {
        cutout: '75%', // Modern thin doughnut look
        plugins: { 
          legend: { display: false } // Legend is handled by the leaderboard list
        }
      }
    });
  });
});
