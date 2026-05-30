/* eslint-disable */
/* global WebImporter */

/**
 * Import script for Private Foundations pages.
 * URL pattern: /private-foundations/*
 *
 * Structure:
 *   - H1: Foundation name
 *   - Fragment: Start your application
 *   - Tabs (Yellow, Top, Tab-Fill, Panel-Border): Overview, Grant Guidelines, Foundation Information
 *   - Fragment: Contact cards (View Saved Applications + FAQ + How can we help?)
 *   - Metadata: Title, Description, program-areas, states, geographic-limitations, pageid
 */

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.querySelector('main') || document.body;

    // --- Remove non-content elements ---
    document.querySelectorAll('header, footer, nav, script, style, link, noscript, iframe').forEach((el) => el.remove());
    // Remove hidden elements but preserve tab panels (which use is-tab-hidden class)
    document.querySelectorAll('.hidden, [class*="hidden"]').forEach((el) => {
      // Preserve tab panel containers and their parents
      if (el.classList.contains('is-tab-hidden')) return;
      if (el.querySelector && el.querySelector('[role="tabpanel"], .is-tab-hidden')) return;
      if (el.getAttribute('role') === 'tabpanel') return;
      el.remove();
    });

    // --- Extract H1 ---
    const h1 = main.querySelector('h1');
    const h1Text = h1 ? h1.textContent.trim() : '';

    // --- Extract pageid and footnote CIDs ---
    let pageid = '';
    const allText = main.textContent || '';
    const dtMatch = allText.match(/DT1-\d+-\d+-\d+-[\d.]+/);
    if (dtMatch) pageid = dtMatch[0];

    const footnoteCids = [];
    // Extract footnotes from .ps-footnote-text elements only (not nav/header CIDs)
    document.querySelectorAll('.ps-footnote-text, .ps-footnote [data-cid]').forEach((el) => {
      const cid = el.getAttribute('data-cid');
      if (!cid) return;
      const text = el.textContent.trim();
      // Skip pageid entries
      if (text.match(/^(DT1|QSR|LRC)-/)) return;
      if (!footnoteCids.includes(cid)) footnoteCids.push(cid);
    });

    // --- Detect and extract tab panel content ---
    const tablist = main.querySelector('[role="tablist"]');
    const tabData = [];
    let programAreas = '';
    let statesServed = '';
    let geographicLimitations = '';

    if (tablist) {
      const tabs = tablist.querySelectorAll('[role="tab"]');
      const panelIds = [];
      const seenIds = new Set();

      tabs.forEach((tab) => {
        const link = tab.querySelector('a');
        const label = (link || tab).textContent.trim().split('\n')[0].trim();
        const href = link ? link.getAttribute('href') || '' : '';
        const panelId = href.replace('#', '').replace(/^\//, '');
        if (label && panelId && !seenIds.has(panelId)) {
          seenIds.add(panelId);
          panelIds.push({ label, panelId });
        }
      });

      // Extract content from each panel by ID (try multiple ID formats)
      panelIds.forEach(({ label, panelId }) => {
        const panel = document.getElementById(panelId)
          || document.getElementById('#' + panelId)
          || document.querySelector('[id="' + panelId + '"]')
          || document.querySelector('[id="#' + panelId + '"]');
        if (!panel) {
          tabData.push({ label, content: '' });
          return;
        }

        // Clean the panel content
        const clone = panel.cloneNode(true);
        clone.querySelectorAll('.hidden, [class*="hidden"]').forEach((el) => el.remove());
        clone.querySelectorAll('a[href="#"]').forEach((a) => {
          if (!a.textContent.trim()) a.remove();
        });

        // Extract metadata from Overview tab
        if (label.toLowerCase() === 'overview') {
          const h2s = clone.querySelectorAll('h2');
          h2s.forEach((h2) => {
            const heading = h2.textContent.trim().toLowerCase();
            const nextEl = h2.nextElementSibling;
            const value = nextEl ? nextEl.textContent.trim() : '';

            if (heading.includes('program areas') || heading === 'program areas') {
              // May be a list, br-separated paragraph, or comma-separated text
              let values = '';
              if (nextEl && nextEl.tagName === 'UL') {
                const items = nextEl.querySelectorAll('li');
                values = Array.from(items).map((li) => li.textContent.trim()).join(' | ');
              } else if (nextEl) {
                // Split by <br> tags or newlines
                const rawHTML = nextEl.innerHTML || '';
                if (rawHTML.includes('<br')) {
                  values = rawHTML.split(/<br\s*\/?>/i).map((s) => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' | ');
                } else {
                  values = value.split('\n').map((s) => s.trim()).filter(Boolean).join(' | ');
                }
              }
              programAreas = values;
            } else if (heading.includes('states served') || heading === 'states served') {
              statesServed = value;
            } else if (heading.includes('geographic limitations') || heading === 'geographic limitations') {
              geographicLimitations = value;
            }
          });
        }

        const content = clone.innerHTML.trim();
        tabData.push({ label, content });
      });
    }

    // --- Build output ---
    // Clear main
    while (main.firstChild) main.removeChild(main.firstChild);

    // Wrap all content in a single div (= one DA section, no separators)
    const section = document.createElement('div');

    // 1. H1
    if (h1Text) {
      const h1El = document.createElement('h1');
      h1El.textContent = h1Text;
      section.appendChild(h1El);
    }

    // 2. Fragment: Start your application
    const appFragment = WebImporter.Blocks.createBlock(document, {
      name: 'Fragment',
      cells: [[['/fragments/private-foundations/start-your-application']]],
    });
    section.appendChild(appFragment);

    // 3. Tabs block
    if (tabData.length > 0) {
      const tabCells = tabData.map((tab) => {
        const contentEl = document.createElement('div');
        contentEl.innerHTML = tab.content;
        return [[tab.label], [contentEl]];
      });
      const tabBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Tabs (Yellow, Top, Tab-Fill, Panel-Border)',
        cells: tabCells,
      });
      section.appendChild(tabBlock);
    }

    // 4. Fragment: Contact cards
    const contactFragment = WebImporter.Blocks.createBlock(document, {
      name: 'Fragment',
      cells: [[['/fragments/private-foundations/contact-cards']]],
    });
    section.appendChild(contactFragment);

    main.appendChild(section);

    // 5. Metadata (separate from content section)
    WebImporter.rules.createMetadata(main, document);

    // Add custom metadata rows to the metadata table
    const allTables = main.querySelectorAll('table');
    let metaTable = null;
    for (let i = allTables.length - 1; i >= 0; i--) {
      const firstCell = allTables[i].querySelector('th, td');
      if (firstCell && firstCell.textContent.trim().toLowerCase().includes('metadata')) {
        metaTable = allTables[i];
        break;
      }
    }
    if (!metaTable) metaTable = allTables[allTables.length - 1];

    if (metaTable) {
      const tbody = metaTable.querySelector('tbody') || metaTable;

      if (programAreas) {
        const row = document.createElement('tr');
        row.innerHTML = `<td>program-areas</td><td>${programAreas}</td>`;
        tbody.appendChild(row);
      }
      if (statesServed) {
        const row = document.createElement('tr');
        row.innerHTML = `<td>states</td><td>${statesServed}</td>`;
        tbody.appendChild(row);
      }
      if (geographicLimitations) {
        const row = document.createElement('tr');
        row.innerHTML = `<td>geographic-limitations</td><td>${geographicLimitations}</td>`;
        tbody.appendChild(row);
      }
      if (pageid) {
        const row = document.createElement('tr');
        row.innerHTML = `<td>pageid</td><td>${pageid}</td>`;
        tbody.appendChild(row);
      }
      if (footnoteCids.length > 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td>footnotes</td><td>${footnoteCids.join(', ')}</td>`;
        tbody.appendChild(row);
      }
    }

    const path = new URL(params.originalURL || url).pathname.replace(/\/$/, '') || '/index';

    return [{
      element: main,
      path,
      report: { title: document.title, template: 'private-foundations' },
    }];
  },
};
