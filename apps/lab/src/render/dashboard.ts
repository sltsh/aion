import { exemptRows, figures } from '../figures.js';
import { icons } from './icons.js';

const NAV = [
  ['files', 'Overview', true], ['ruler', 'Tokens', false], ['branch', 'Builds', false],
  ['shield', 'Audits', false], ['gear', 'Settings', false],
] as const;

const KPIS = [
  { label: 'Tokens checked', value: '154', delta: '+12', trend: 'up' },
  { label: 'Below the floor', value: '0', delta: '−2', trend: 'up' },
  { label: 'Lowest ratio', value: '4.54', delta: '+0.09', trend: 'up' },
  { label: 'Exemptions', value: '2', delta: '0', trend: 'flat' },
] as const;

const ROWS = [
  ['fg.primary', 'bg.editor', '14.8', 'success', 'Pass'],
  ['fg.secondary', 'bg.sidebar', '7.71', 'success', 'Pass'],
  ['fg.dim', 'bg.widget', '4.54', 'warning', 'Near'],
  ['fg.muted', 'bg.editor', '4.25', 'info', 'Exempt'],
  ['accent.gold', 'bg.editor', '11.2', 'success', 'Pass'],
  ['border.ui', 'bg.page', '2.60', 'error', 'Fail'],
] as const;

const BARS = [62, 88, 45, 96, 74, 58, 81, 39, 92, 67, 84, 71];

export function dashboardSurface(): string {
  return `
  <div class="window app">
    <aside class="app-nav">
      <span class="app-mark">${icons.bolt} Aion</span>
      ${NAV.map(([icon, label, active]) => `
        <a class="app-nav-item${active ? ' is-active' : ''}" href="#">${icons[icon]}${label}</a>`).join('')}
      <div class="app-nav-foot">
        <div class="avatar">SS</div>
        <div><div class="app-nav-name">simon</div><div class="app-nav-role">maintainer</div></div>
      </div>
    </aside>

    <div class="app-main">
      <header class="app-head">
        <div>
          <h2>Contrast report</h2>
          <p class="app-sub">Every emitted token, measured on the surface it ships on.</p>
        </div>
        <div class="app-head-actions">
          <label class="field">
            <input class="input" type="text" placeholder="Filter by token name" />
          </label>
          <button class="button button-ghost" type="button">Export</button>
          <button class="button button-solid" type="button">Re-run gate</button>
        </div>
      </header>

      <div class="kpi-row">
        ${KPIS.map((kpi) => `
          <div class="kpi">
            <span class="kpi-label">${kpi.label}</span>
            <span class="kpi-value">${kpi.value}</span>
            <span class="kpi-delta is-${kpi.trend}">${kpi.delta}</span>
          </div>`).join('')}
      </div>

      <div class="app-split">
        <section class="surface-card">
          <h3>Ratio by build</h3>
          <div class="chart">${BARS.map((height) => `<i style="height:${height}%"></i>`).join('')}</div>
          <p class="chart-note">Twelve builds. The gate has not been below the floor since 0.0.9.</p>
        </section>

        <section class="surface-card">
          <h3>Alerts <span class="sample-tag">sample data</span></h3>
          <div class="alert alert-error">${icons.cross}<div><b>SAMPLE — an invented failure</b><span>Shown so the error colours appear on this surface</span></div></div>
          <div class="alert alert-warning">${icons.warning}<div><b>SAMPLE — an invented warning</b><span>Shown so the warning colours appear on this surface</span></div></div>
          <div class="alert alert-info">${icons.info}<div><b>${figures.exempt} exemptions are documented</b><span>${exemptRows.map((row) => row.token).join(', ')}</span></div></div>
          <div class="alert alert-success">${icons.check}<div><b>Every syntax colour passes on every supported state</b><span>The worst reads ${figures.decoratedLowest}, floor ${figures.floor}</span></div></div>
        </section>
      </div>

      <section class="surface-card">
        <h3>Pairs</h3>
        <table class="table">
          <thead><tr><th>Foreground</th><th>Background</th><th class="is-numeric">Ratio</th><th>State</th></tr></thead>
          <tbody>
            ${ROWS.map(([fg, bg, ratio, status, label]) => `
              <tr>
                <td class="is-mono">${fg}</td>
                <td class="is-mono">${bg}</td>
                <td class="is-numeric is-mono">${ratio}</td>
                <td><span class="status-pill is-${status}">${label}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </section>
    </div>
  </div>`;
}
