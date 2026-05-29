var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-private-foundations.js
  var import_private_foundations_exports = {};
  __export(import_private_foundations_exports, {
    default: () => import_private_foundations_default
  });
  var import_private_foundations_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.querySelector("main") || document.body;
      document.querySelectorAll("header, footer, nav, script, style, link, noscript, iframe").forEach((el) => el.remove());
      document.querySelectorAll('.hidden, [class*="hidden"]').forEach((el) => el.remove());
      const h1 = main.querySelector("h1");
      const h1Text = h1 ? h1.textContent.trim() : "";
      let pageid = "";
      const allText = main.textContent || "";
      const dtMatch = allText.match(/DT1-\d+-\d+-\d+-[\d.]+/);
      if (dtMatch) pageid = dtMatch[0];
      const footnoteCids = [];
      main.querySelectorAll("[data-cid]").forEach((el) => {
        const cid = el.getAttribute("data-cid");
        if (!cid) return;
        const text = el.textContent.trim();
        if (text.match(/^(DT1|QSR|LRC)-/)) return;
        if (!footnoteCids.includes(cid)) footnoteCids.push(cid);
      });
      const tablist = main.querySelector('[role="tablist"]');
      const tabData = [];
      let programAreas = "";
      let statesServed = "";
      let geographicLimitations = "";
      if (tablist) {
        const tabs = tablist.querySelectorAll('[role="tab"]');
        const panelIds = [];
        const seenIds = /* @__PURE__ */ new Set();
        tabs.forEach((tab) => {
          const link = tab.querySelector("a");
          const label = (link || tab).textContent.trim().split("\n")[0].trim();
          const href = link ? link.getAttribute("href") || "" : "";
          const panelId = href.replace("#", "").replace(/^\//, "");
          if (label && panelId && !seenIds.has(panelId)) {
            seenIds.add(panelId);
            panelIds.push({ label, panelId });
          }
        });
        panelIds.forEach(({ label, panelId }) => {
          const panel = document.getElementById(panelId);
          if (!panel) {
            tabData.push({ label, content: "" });
            return;
          }
          const clone = panel.cloneNode(true);
          clone.querySelectorAll('.hidden, [class*="hidden"]').forEach((el) => el.remove());
          clone.querySelectorAll('a[href="#"]').forEach((a) => {
            if (!a.textContent.trim()) a.remove();
          });
          if (label.toLowerCase() === "overview") {
            const h2s = clone.querySelectorAll("h2");
            h2s.forEach((h2) => {
              const heading = h2.textContent.trim().toLowerCase();
              const nextEl = h2.nextElementSibling;
              const value = nextEl ? nextEl.textContent.trim() : "";
              if (heading.includes("program areas") || heading === "program areas") {
                let values = value;
                if (nextEl && nextEl.tagName === "UL") {
                  const items = nextEl.querySelectorAll("li");
                  values = Array.from(items).map((li) => li.textContent.trim()).join(", ");
                }
                programAreas = values;
              } else if (heading.includes("states served") || heading === "states served") {
                statesServed = value;
              } else if (heading.includes("geographic limitations") || heading === "geographic limitations") {
                geographicLimitations = value;
              }
            });
          }
          const content = clone.innerHTML.trim();
          tabData.push({ label, content });
        });
      }
      while (main.firstChild) main.removeChild(main.firstChild);
      if (h1Text) {
        const h1El = document.createElement("h1");
        h1El.textContent = h1Text;
        main.appendChild(h1El);
        main.appendChild(document.createElement("hr"));
      }
      const appFragment = WebImporter.Blocks.createBlock(document, {
        name: "Fragment",
        cells: [[["/fragments/private-foundations/start-your-application"]]]
      });
      main.appendChild(appFragment);
      main.appendChild(document.createElement("hr"));
      if (tabData.length > 0) {
        const tabCells = tabData.map((tab) => {
          const contentEl = document.createElement("div");
          contentEl.innerHTML = tab.content;
          return [[tab.label], [contentEl]];
        });
        const tabBlock = WebImporter.Blocks.createBlock(document, {
          name: "Tabs (Yellow, Top, Tab-Fill, Panel-Border)",
          cells: tabCells
        });
        main.appendChild(tabBlock);
        main.appendChild(document.createElement("hr"));
      }
      const contactFragment = WebImporter.Blocks.createBlock(document, {
        name: "Fragment",
        cells: [[["/fragments/private-foundations/contact-cards"]]]
      });
      main.appendChild(contactFragment);
      main.appendChild(document.createElement("hr"));
      WebImporter.rules.createMetadata(main, document);
      const allTables = main.querySelectorAll("table");
      let metaTable = null;
      for (let i = allTables.length - 1; i >= 0; i--) {
        const firstCell = allTables[i].querySelector("th, td");
        if (firstCell && firstCell.textContent.trim().toLowerCase().includes("metadata")) {
          metaTable = allTables[i];
          break;
        }
      }
      if (!metaTable) metaTable = allTables[allTables.length - 1];
      if (metaTable) {
        const tbody = metaTable.querySelector("tbody") || metaTable;
        if (programAreas) {
          const row = document.createElement("tr");
          row.innerHTML = `<td>program-areas</td><td>${programAreas}</td>`;
          tbody.appendChild(row);
        }
        if (statesServed) {
          const row = document.createElement("tr");
          row.innerHTML = `<td>states</td><td>${statesServed}</td>`;
          tbody.appendChild(row);
        }
        if (geographicLimitations) {
          const row = document.createElement("tr");
          row.innerHTML = `<td>geographic-limitations</td><td>${geographicLimitations}</td>`;
          tbody.appendChild(row);
        }
        if (pageid) {
          const row = document.createElement("tr");
          row.innerHTML = `<td>pageid</td><td>${pageid}</td>`;
          tbody.appendChild(row);
        }
        if (footnoteCids.length > 0) {
          const row = document.createElement("tr");
          row.innerHTML = `<td>footnotes</td><td>${footnoteCids.join(", ")}</td>`;
          tbody.appendChild(row);
        }
      }
      const wrapper = document.createElement("div");
      const mainChildren = Array.from(main.children);
      let sectionDiv = document.createElement("div");
      mainChildren.forEach((el) => {
        if (el.tagName === "HR") {
          if (sectionDiv.children.length > 0) {
            wrapper.appendChild(sectionDiv);
            sectionDiv = document.createElement("div");
          }
        } else {
          sectionDiv.appendChild(el);
        }
      });
      if (sectionDiv.children.length > 0) wrapper.appendChild(sectionDiv);
      while (main.firstChild) main.removeChild(main.firstChild);
      while (wrapper.firstChild) main.appendChild(wrapper.firstChild);
      const path = new URL(params.originalURL || url).pathname.replace(/\/$/, "") || "/index";
      return [{
        element: main,
        path,
        report: { title: document.title, template: "private-foundations" }
      }];
    }
  };
  return __toCommonJS(import_private_foundations_exports);
})();
