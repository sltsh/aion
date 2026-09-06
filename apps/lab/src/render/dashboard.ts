import { exemptRows, figures, sections, tightest } from '../figures.js';
import { icons } from './icons.js';

const NAV = [
  ['files', 'Overview', true], ['ruler', 'Tokens', false], ['branch', 'Builds', false],
  ['shield', 'Audits', false], ['gear', 'Settings', false],
] as const;

// Every number on this surface comes from the same `checks()` the build gate runs. The
// dashboard used to hardcode a token count, four deltas, twelve chart bars, a claim about
// releases since 0.0.9 and a failing boundary row, none of which any run produced.
const KPIS = [
  { label: 'Rows gated', value: String(figures.gated), note: `${figures.passed} pass` },
  { label: 'Below the floor', value: String(figures.failed), note: `floor ${figures.floor}` },
  { label: 'Reading states', value: String(figures.readingStates), note: 'per syntax colour' },
  { label: 'Exemptions', value: String(figures.exempt), note: 'each documented' },
] as const;

const HEADROOM = (row: { ratio: number; floor: number }): number => row.ratio - row.floor;
const CHART_CEILING = 12;

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
            <span class="kpi-delta is-flat">${kpi.note}</span>
          </div>`).join('')}
      </div>

      <div class="app-split">
        <section class="surface-card">
          <h3>Lowest ratio by section</h3>
          <div class="chart">${sections.map((section) => `
            <i title="${section.name}: ${section.lowest.toFixed(2)}:1 over ${section.count} rows"
               style="height:${Math.min(100, (section.lowest / CHART_CEILING) * 100).toFixed(1)}%"></i>`).join('')}</div>
          <p class="chart-note">${sections.length} sections of the gate, ${figures.gated} rows.
            Each bar is the lowest ratio that section produced, against a ${CHART_CEILING}:1 ceiling.</p>
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
        <h3>Pairs <span class="app-sub">the least room left in each section</span></h3>
        <table class="table">
          <thead><tr><th>Foreground</th><th>Background</th><th class="is-numeric">Ratio</th><th>State</th></tr></thead>
          <tbody>
            ${tightest.map((row) => `
              <tr>
                <td class="is-mono">${row.token}</td>
                <td class="is-mono">${row.surface}</td>
                <td class="is-numeric is-mono">${row.ratio.toFixed(2)}</td>
                <td><span class="status-pill is-${HEADROOM(row) < 0.1 ? 'warning' : 'success'}">${
                  HEADROOM(row) < 0.1 ? 'Near' : 'Pass'}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </section>
    </div>
  </div>`;
}
