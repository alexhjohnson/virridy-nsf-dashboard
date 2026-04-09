/* ─── Helpers ─── */
const periods = GRANT_DATA.periods;
const latestPeriod = periods[periods.length - 1].period;

function getAvgPct(obj, period) {
  const ms = obj.milestones;
  const sum = ms.reduce((s, m) => {
    const h = m.history.find(h => h.period === period);
    return s + (h ? h.pct : 0);
  }, 0);
  return Math.round(sum / ms.length);
}

function getOverallPct(period) {
  let total = 0, count = 0;
  GRANT_DATA.objectives.forEach(obj => {
    obj.milestones.forEach(m => {
      const h = m.history.find(h => h.period === period);
      total += h ? h.pct : 0;
      count++;
    });
  });
  return Math.round(total / count);
}

function statusColor(pct) {
  if (pct >= 80) return 'green';
  if (pct >= 40) return 'yellow';
  return 'red';
}

function statusHex(pct) {
  if (pct >= 80) return '#00966C';
  if (pct >= 40) return '#C4960C';
  return '#C43C2C';
}

function badgeClass(pct) {
  if (pct === 100) return 'badge-complete';
  if (pct > 0) return 'badge-progress';
  return 'badge-not-started';
}

function badgeText(pct) {
  if (pct === 100) return 'Complete';
  if (pct > 0) return 'In Progress';
  return 'Not Started';
}

/* ─── Sparkline SVG ─── */
function sparklineSVG(milestones) {
  const avgByPeriod = periods.map(p => {
    const sum = milestones.reduce((s, m) => {
      const h = m.history.find(h => h.period === p.period);
      return s + (h ? h.pct : 0);
    }, 0);
    return sum / milestones.length;
  });

  const w = 200, h = 32, pad = 2;
  const step = (w - pad * 2) / (avgByPeriod.length - 1);
  const points = avgByPeriod.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - (v / 100) * (h - pad * 2);
    return `${x},${y}`;
  });

  const color = statusHex(avgByPeriod[avgByPeriod.length - 1]);

  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${pad + (avgByPeriod.length - 1) * step}" cy="${h - pad - (avgByPeriod[avgByPeriod.length - 1] / 100) * (h - pad * 2)}" r="3" fill="${color}"/>
  </svg>`;
}

/* ─── Views ─── */
const app = document.getElementById('app');
const navLinks = document.querySelectorAll('.nav-link');
let activeCharts = [];

function destroyCharts() {
  activeCharts.forEach(c => c.destroy());
  activeCharts = [];
}

function setActiveNav(view) {
  navLinks.forEach(l => {
    l.classList.toggle('active', l.dataset.view === view);
  });
}

/* ─── Overview ─── */
function renderOverview() {
  destroyCharts();
  setActiveNav('overview');

  const overall = getOverallPct(latestPeriod);

  let html = `
    <div class="card card-accent">
      <div class="summary-header">
        <div>
          <h1>${GRANT_DATA.title}</h1>
          <div class="summary-meta">
            <div class="summary-meta-item">
              <span class="summary-meta-label">Contract </span>
              <span class="summary-meta-value">${GRANT_DATA.contract}</span>
            </div>
            <div class="summary-meta-item">
              <span class="summary-meta-label">PI </span>
              <span class="summary-meta-value">${GRANT_DATA.pi}</span>
            </div>
            <div class="summary-meta-item">
              <span class="summary-meta-label">Start </span>
              <span class="summary-meta-value">${GRANT_DATA.startDate}</span>
            </div>
            <div class="summary-meta-item">
              <span class="summary-meta-label">Latest Report </span>
              <span class="summary-meta-value">${latestPeriod}</span>
            </div>
          </div>
        </div>
        <div class="summary-overall">
          <div class="summary-overall-pct" style="color:${statusHex(overall)}">${overall}%</div>
          <div class="summary-overall-label">Overall Progress</div>
        </div>
      </div>
    </div>

    <div class="obj-grid">
  `;

  GRANT_DATA.objectives.forEach(obj => {
    const avg = getAvgPct(obj, latestPeriod);
    const color = statusColor(avg);

    html += `
      <div class="card obj-card" data-obj-id="${obj.id}">
        <div class="obj-card-header">
          <div style="display:flex;align-items:flex-start;flex:1">
            <span class="obj-number ${color}">${obj.id}</span>
            <span class="obj-title">${obj.title}</span>
          </div>
          <span class="obj-pct ${color}">${avg}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${color}" style="width:${avg}%"></div>
        </div>
        <div class="sparkline-container">${sparklineSVG(obj.milestones)}</div>
      </div>
    `;
  });

  html += '</div>';
  app.innerHTML = html;

  document.querySelectorAll('.obj-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.objId);
      renderDetail(id);
    });
  });
}

/* ─── Detail ─── */
function renderDetail(objId, selectedPeriod) {
  destroyCharts();

  const obj = GRANT_DATA.objectives.find(o => o.id === objId);
  if (!obj) return;

  const period = selectedPeriod || latestPeriod;

  // Update nav: show this as a detail view but keep Overview highlighted
  navLinks.forEach(l => l.classList.remove('active'));

  let html = `
    <div class="detail-header">
      <button class="back-btn" id="back-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        Back to Overview
      </button>
    </div>
    <div class="card card-accent" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px">
        <span class="obj-number ${statusColor(getAvgPct(obj, period))}" style="width:36px;height:36px;font-size:1rem">${obj.id}</span>
        <div>
          <h2 style="font-size:1rem;font-weight:700;color:var(--virridy-text)">${obj.title}</h2>
          <div style="font-size:0.8125rem;color:var(--virridy-text-muted);margin-top:2px">${obj.milestones.length} milestones &middot; ${getAvgPct(obj, period)}% average progress</div>
        </div>
      </div>
    </div>

    <div class="period-selector">
      <label>Report Period:</label>
      <select id="period-select">
        ${periods.map(p => `<option value="${p.period}" ${p.period === period ? 'selected' : ''}>${p.period}</option>`).join('')}
      </select>
    </div>

    <div class="milestone-list">
  `;

  obj.milestones.forEach(m => {
    const h = m.history.find(h => h.period === period);
    const pct = h ? h.pct : 0;

    html += `
      <div class="card milestone-card">
        <div class="milestone-header">
          <div style="display:flex;align-items:flex-start">
            <span class="milestone-id">${m.id}</span>
            <span class="milestone-title">${m.title}</span>
          </div>
          <span class="badge ${badgeClass(pct)}">${badgeText(pct)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
          <div class="progress-bar progress-bar-lg" style="flex:1">
            <div class="progress-fill ${statusColor(pct)}" style="width:${pct}%"></div>
          </div>
          <span style="font-size:0.875rem;font-weight:700;color:${statusHex(pct)};min-width:40px;text-align:right">${pct}%</span>
        </div>
        <div class="milestone-chart">
          <canvas id="chart-${m.id}"></canvas>
        </div>
      </div>
    `;
  });

  html += '</div>';
  app.innerHTML = html;

  // Wire back button
  document.getElementById('back-btn').addEventListener('click', renderOverview);

  // Wire period selector
  document.getElementById('period-select').addEventListener('change', (e) => {
    renderDetail(objId, e.target.value);
  });

  // Create charts
  obj.milestones.forEach(m => {
    const ctx = document.getElementById(`chart-${m.id}`).getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: m.history.map(h => h.period),
        datasets: [{
          data: m.history.map(h => h.pct),
          borderColor: '#005151',
          backgroundColor: 'rgba(0,81,81,0.08)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: m.history.map(h => {
            if (h.period === period) return '#97D700';
            return '#005151';
          }),
          pointRadius: m.history.map(h => h.period === period ? 6 : 3),
          pointBorderColor: m.history.map(h => {
            if (h.period === period) return '#005151';
            return '#005151';
          }),
          pointBorderWidth: m.history.map(h => h.period === period ? 2 : 0),
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.y}%`
            }
          }
        },
        scales: {
          y: {
            min: 0, max: 100,
            ticks: {
              callback: v => v + '%',
              font: { family: 'DM Sans', size: 11 },
              color: '#4a6a6a',
            },
            grid: { color: '#e5e9e5' },
          },
          x: {
            ticks: {
              font: { family: 'DM Sans', size: 11 },
              color: '#4a6a6a',
            },
            grid: { display: false },
          }
        }
      }
    });
    activeCharts.push(chart);
  });
}

/* ─── Timeline ─── */
function renderTimeline(selectedIdx) {
  destroyCharts();
  setActiveNav('timeline');

  const idx = selectedIdx !== undefined ? selectedIdx : periods.length - 1;
  const selectedPeriod = periods[idx].period;
  const prevPeriod = idx > 0 ? periods[idx - 1].period : null;

  let html = `
    <div class="card" style="margin-bottom:24px">
      <div style="font-size:0.875rem;font-weight:600;color:var(--virridy-text);margin-bottom:16px">Project Timeline: Jun 2025 &mdash; Mar 2026</div>
      <div class="timeline-bar">
        <div class="timeline-line"></div>
  `;

  // Start node
  html += `
    <div class="timeline-node" style="opacity:0.5">
      <div class="timeline-dot" style="background:var(--virridy-dark-green)"></div>
      <span class="timeline-label">Jun 2025<br><span style="font-weight:400;font-size:0.625rem">Start</span></span>
    </div>
  `;

  periods.forEach((p, i) => {
    html += `
      <div class="timeline-node ${i === idx ? 'active' : ''}" data-period-idx="${i}">
        <div class="timeline-dot"></div>
        <span class="timeline-label">${p.period}</span>
      </div>
    `;
  });

  html += `
      </div>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="font-size:0.875rem;font-weight:700;color:var(--virridy-text)">Snapshot: ${selectedPeriod}</h3>
        ${prevPeriod ? `<span style="font-size:0.75rem;color:var(--virridy-text-muted)">Changes from ${prevPeriod} highlighted</span>` : ''}
      </div>
      <div class="timeline-snapshot">
        <table class="timeline-table">
          <thead>
            <tr>
              <th style="width:50px">Obj</th>
              <th>Title</th>
              <th style="width:100px;text-align:right">Avg %</th>
              <th style="width:200px">Progress</th>
            </tr>
          </thead>
          <tbody>
  `;

  GRANT_DATA.objectives.forEach(obj => {
    const avg = getAvgPct(obj, selectedPeriod);
    const prevAvg = prevPeriod ? getAvgPct(obj, prevPeriod) : avg;
    const changed = avg !== prevAvg;
    const delta = avg - prevAvg;

    html += `
      <tr class="${changed ? 'milestone-changed' : ''}">
        <td><span class="obj-number ${statusColor(avg)}" style="width:24px;height:24px;font-size:0.6875rem">${obj.id}</span></td>
        <td style="font-weight:500">${obj.title}</td>
        <td style="text-align:right;font-weight:700;color:${statusHex(avg)}">
          ${avg}%
          ${changed && delta > 0 ? `<span class="change-indicator">+${delta}%</span>` : ''}
        </td>
        <td>
          <div class="progress-bar">
            <div class="progress-fill ${statusColor(avg)}" style="width:${avg}%"></div>
          </div>
        </td>
      </tr>
    `;

    // Show individual milestones that changed
    if (prevPeriod) {
      obj.milestones.forEach(m => {
        const h = m.history.find(h => h.period === selectedPeriod);
        const ph = m.history.find(h => h.period === prevPeriod);
        const pct = h ? h.pct : 0;
        const prevPct = ph ? ph.pct : 0;
        if (pct !== prevPct) {
          const d = pct - prevPct;
          html += `
            <tr class="milestone-changed">
              <td></td>
              <td style="padding-left:40px;font-size:0.75rem;color:var(--virridy-text-muted)">${m.id}: ${m.title}</td>
              <td style="text-align:right;font-size:0.75rem;font-weight:600;color:${statusHex(pct)}">
                ${pct}%
                <span class="change-indicator">${d > 0 ? '+' : ''}${d}%</span>
              </td>
              <td>
                <div class="progress-bar" style="height:4px">
                  <div class="progress-fill ${statusColor(pct)}" style="width:${pct}%"></div>
                </div>
              </td>
            </tr>
          `;
        }
      });
    }
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  app.innerHTML = html;

  // Wire timeline nodes
  document.querySelectorAll('.timeline-node[data-period-idx]').forEach(node => {
    node.addEventListener('click', () => {
      renderTimeline(parseInt(node.dataset.periodIdx));
    });
  });
}

/* ─── Navigation ─── */
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    const view = link.dataset.view;
    if (view === 'overview') renderOverview();
    else if (view === 'timeline') renderTimeline();
  });
});

// Initial render
renderOverview();
