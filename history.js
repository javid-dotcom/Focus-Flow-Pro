document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  
  // 1. Dark Mode Logic
  chrome.storage.local.get(['theme'], (res) => {
    if (res.theme === 'dark') document.body.setAttribute('data-theme', 'dark');
  });

  themeToggle.onclick = () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    chrome.storage.local.set({ theme: newTheme });
    location.reload(); // Refresh to update chart colors
  };

  // 2. Load Data
  chrome.storage.local.get(['history'], (data) => {
    const history = data.history || [];
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f8fafc' : '#1e293b';

    // --- LINE CHART (Trend) ---
    const lineCtx = document.getElementById('lineChart');
    new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: history.map(e => e.date),
        datasets: [{
          label: 'Minutes',
          data: history.map(e => Math.round(e.seconds / 60)),
          borderColor: '#6366f1',
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(99, 102, 241, 0.1)'
        }]
      },
      options: { 
        plugins: { legend: { labels: { color: textColor } } },
        scales: { 
          y: { ticks: { color: textColor } },
          x: { ticks: { color: textColor } }
        }
      }
    });

    // --- PIE CHART (Site Breakdown) ---
    // Aggregate all sites from the history
    const siteTotals = {};
    history.forEach(entry => {
      for (const [site, secs] of Object.entries(entry.breakdown || {})) {
        siteTotals[site] = (siteTotals[site] || 0) + secs;
      }
    });

    const pieCtx = document.getElementById('pieChart');
    new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(siteTotals),
        datasets: [{
          data: Object.values(siteTotals).map(s => Math.round(s / 60)),
          backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6']
        }]
      },
      options: {
        plugins: { 
          legend: { 
            position: 'bottom',
            labels: { color: textColor } 
          } 
        }
      }
    });
  });
});