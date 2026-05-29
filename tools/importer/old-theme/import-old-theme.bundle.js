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

  // tools/importer/old-theme/import-old-theme.js
  var import_old_theme_exports = {};
  __export(import_old_theme_exports, {
    default: () => import_old_theme_default
  });

  // tools/importer/old-theme/cleanup.js
  function cleanup(document, url) {
    const main = document.querySelector("main") || document.querySelector("#mainColumns") || document.querySelector("#shell") || document.body;
    const removeSelectors = [
      "#onetrust-consent-sdk",
      ".onetrust-pc-dark-filter",
      '[id*="onetrust"]',
      "#ot-sdk-btn-floating",
      ".ep-modal",
      ".signon-container",
      ".hidden",
      '[class*="hidden"]',
      "#persistent-cta",
      "iframe",
      "noscript",
      ".visuallyHidden",
      "link",
      "script",
      'a[href="#skip"]',
      ".skip-to-content"
    ];
    removeSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    });
    document.querySelectorAll("a").forEach((a) => {
      const text = (a.textContent || "").trim().toLowerCase();
      if (text === "skip to content" || text === "skip to main content") {
        a.remove();
      }
    });
    document.querySelectorAll("header").forEach((el) => el.remove());
    document.querySelectorAll("footer").forEach((el) => el.remove());
    document.querySelectorAll(".ps-masthead, .ps-footer-wrapper, .ps-footer-homepage").forEach((el) => el.remove());
    const walkTargets = [main, document.body];
    walkTargets.forEach((parent) => {
      if (!parent) return;
      Array.from(parent.children).forEach((child) => {
        const text = child.textContent || "";
        if (text.includes("Comienzo de ventana emergente") && text.includes("Fin de ventana emergente")) {
          child.remove();
          return;
        }
        if (text.includes("Esta p\xE1gina solo est\xE1 disponible en ingl\xE9s") && text.length < 500) {
          child.remove();
          return;
        }
        if (text.includes("Naveg\xF3 a una p\xE1gina que no est\xE1 disponible en espa\xF1ol") && text.length < 500) {
          child.remove();
        }
      });
    });
    const removeByContent = (parent) => {
      Array.from(parent.querySelectorAll("div, section")).forEach((el) => {
        const text = el.textContent || "";
        if ((text.includes("You are leaving wellsfargo.com") || text.includes("leaving wellsfargo.com")) && text.includes("Cancel") && text.length < 600) {
          el.remove();
          return;
        }
        if (text.includes("Choose a link above") && text.includes("Wells Fargo does not control") && text.length < 600) {
          el.remove();
        }
      });
    };
    removeByContent(main);
    const printShareEls = main.querySelectorAll("a");
    const toolbarCandidates = /* @__PURE__ */ new Set();
    printShareEls.forEach((a) => {
      const text = a.textContent || "";
      const href = a.getAttribute("href") || "";
      if (text.includes("Imprima") || text.includes("Print") || href.includes("/exit/social")) {
        let toolbar = a.parentElement;
        for (let i = 0; i < 4; i++) {
          if (toolbar && toolbar !== main && toolbar !== document.body) {
            const links = toolbar.querySelectorAll("a");
            const hasPrint = Array.from(links).some((l) => l.textContent.includes("Imprima") || l.textContent.includes("Print"));
            const hasSocial = Array.from(links).some((l) => (l.getAttribute("href") || "").includes("/exit/social") || (l.getAttribute("href") || "").includes("linkedin.com/share") || (l.getAttribute("href") || "").includes("twitter.com/share"));
            if (hasPrint || hasSocial) {
              toolbarCandidates.add(toolbar);
            }
            toolbar = toolbar.parentElement;
          }
        }
      }
    });
    toolbarCandidates.forEach((el) => el.remove());
    document.querySelectorAll('nav[aria-label*="breadcrumb"], nav.breadcrumbs, [class*="breadcrumb"]').forEach((el) => el.remove());
    document.querySelectorAll('[role="complementary"]').forEach((el) => {
      if (!el.textContent.trim() && !el.querySelector("img")) {
        el.remove();
      }
    });
    const footnoteCids = [];
    let pageid = "";
    const c20 = main.querySelectorAll(".c20");
    c20.forEach((el) => {
      if (el.querySelector(".c20equal")) {
        footnoteCids.push("tcm:84-226264-16");
      }
      const cidItems = el.querySelectorAll("[data-cid]");
      cidItems.forEach((item) => {
        const cid = item.getAttribute("data-cid");
        if (!cid) return;
        const text = item.textContent.trim();
        const dtMatch = text.match(/DT1-\d+-\d+-\d+-[\d.]+/);
        const qsrMatch = text.match(/QSR-\d+-\d+\.\d+\.\d+/);
        const lrcMatch = text.match(/LRC-\d+/);
        if (dtMatch) pageid = dtMatch[0];
        else if (qsrMatch) pageid = qsrMatch[0];
        else if (lrcMatch) pageid = lrcMatch[0];
        else if (!footnoteCids.includes(cid)) footnoteCids.push(cid);
      });
      el.remove();
    });
    const asides = document.querySelectorAll('aside, [role="complementary"]');
    for (const aside of asides) {
      const text = aside.textContent || "";
      if (!pageid) {
        const dtMatch = text.match(/DT1-\d+-\d+-\d+-[\d.]+/);
        const qsrMatch = text.match(/QSR-\d+-\d+\.\d+\.\d+/);
        const lrcMatch = text.match(/LRC-\d+/);
        if (dtMatch) pageid = dtMatch[0];
        else if (qsrMatch) pageid = qsrMatch[0];
        else if (lrcMatch) pageid = lrcMatch[0];
      }
      const cidItems = aside.querySelectorAll("[data-cid]");
      cidItems.forEach((item) => {
        const cid = item.getAttribute("data-cid");
        if (cid && !footnoteCids.includes(cid)) {
          const itemText = item.textContent.trim();
          if (!itemText.match(/^(DT1|QSR|LRC)-/)) footnoteCids.push(cid);
        }
      });
      aside.remove();
    }
    if (pageid) {
      main.setAttribute("data-pageid", pageid);
      document.body.setAttribute("data-pageid", pageid);
    }
    if (footnoteCids.length > 0) {
      main.setAttribute("data-footnotes", footnoteCids.join(", "));
      document.body.setAttribute("data-footnotes", footnoteCids.join(", "));
    }
    const isSpanish = url && url.includes("/es/");
    const prefix = isSpanish ? "/es" : "";
    let sidebarEl = null;
    const allH2s = main.querySelectorAll("h2");
    for (const h2 of allH2s) {
      const hText = h2.textContent.trim();
      if (hText.includes("\xBFTiene m\xE1s preguntas?") || hText.includes("More questions?")) {
        sidebarEl = h2.parentElement;
        while (sidebarEl && sidebarEl.parentElement && sidebarEl.parentElement !== main && sidebarEl.parentElement !== document.body) {
          const parent = sidebarEl.parentElement;
          if (parent.classList.contains("mainContentCol") || parent.id === "mainColumns") {
            break;
          }
          const parentChildren = Array.from(parent.children);
          if (parentChildren.length > 1 && parent.textContent.length > sidebarEl.textContent.length * 3) {
            break;
          }
          sidebarEl = parent;
        }
        break;
      }
    }
    if (!sidebarEl) {
      const allH3s = main.querySelectorAll("h3");
      let quickHelpH3 = null;
      let callUsH3 = null;
      for (const h3 of allH3s) {
        const t = h3.textContent.trim().toLowerCase();
        if (t.includes("quick help") || t.includes("ayuda r\xE1pida")) quickHelpH3 = h3;
        if (t.includes("call us") || t.includes("ll\xE1menos")) callUsH3 = h3;
      }
      if (quickHelpH3 && callUsH3) {
        sidebarEl = quickHelpH3.parentElement;
        while (sidebarEl && !sidebarEl.contains(callUsH3)) {
          sidebarEl = sidebarEl.parentElement;
        }
        if (sidebarEl === main || sidebarEl === document.body) {
          sidebarEl = quickHelpH3.parentElement;
        }
      }
    }
    if (sidebarEl && sidebarEl !== main && sidebarEl !== document.body && !sidebarEl.classList.contains("mainContentCol") && sidebarEl.id !== "contentBody") {
      const block = WebImporter.Blocks.createBlock(document, {
        name: "Fragment",
        cells: [[[prefix + "/fragments/mortgage/talk-to-mortgage-consultant"]]]
      });
      sidebarEl.replaceWith(block);
    }
    main.querySelectorAll('.contentBottom, #contentBottom, [id*="contentBottom"]').forEach((el) => el.remove());
    main.querySelectorAll("div.title2-SemiBold").forEach((el) => {
      const h3 = document.createElement("h3");
      h3.innerHTML = el.innerHTML;
      el.replaceWith(h3);
    });
    main.querySelectorAll("div.headline").forEach((el) => {
      const h4 = document.createElement("h4");
      h4.innerHTML = el.innerHTML;
      el.replaceWith(h4);
    });
    main.querySelectorAll("a").forEach((a) => {
      const text = a.textContent || "";
      if (!text.includes("footnote") && !text.includes("modal")) return;
      const match = text.match(/(\d+)\s*$/);
      if (!match) return;
      const num = match[1];
      const href = a.getAttribute("href") || "#";
      const newSup = document.createElement("sup");
      const newA = document.createElement("a");
      newA.setAttribute("href", href);
      newA.textContent = num;
      newSup.appendChild(newA);
      a.replaceWith(newSup);
    });
    main.querySelectorAll("a").forEach((a) => {
      let href = a.getAttribute("href") || "";
      if (href.startsWith("https://www.wellsfargo.com/")) {
        href = href.replace("https://www.wellsfargo.com", "");
        a.setAttribute("href", href);
      }
    });
    main.querySelectorAll("a").forEach((a) => {
      let href = a.getAttribute("href") || "";
      if (href.length > 1 && href.endsWith("/")) {
        a.setAttribute("href", href.slice(0, -1));
      }
    });
    main.querySelectorAll('a.ps-btn-secondary, a[class*="ps-btn-secondary"], a.c93.secondarybtn').forEach((a) => {
      const em = document.createElement("em");
      const newA = document.createElement("a");
      newA.setAttribute("href", a.getAttribute("href") || "");
      newA.textContent = a.textContent.trim();
      em.appendChild(newA);
      a.replaceWith(em);
    });
    main.querySelectorAll('a.ps-btn-primary, a.ps-btn, a[class*="ps-btn-primary"], a.c93:not(.secondarybtn)').forEach((a) => {
      const strong = document.createElement("strong");
      const newA = document.createElement("a");
      newA.setAttribute("href", a.getAttribute("href") || "");
      newA.textContent = a.textContent.trim();
      strong.appendChild(newA);
      a.replaceWith(strong);
    });
    main.querySelectorAll("a").forEach((a) => {
      const text = a.textContent || "";
      if (/\s*>+\s*$/.test(text)) {
        a.textContent = text.replace(/\s*>+\s*$/, "").trim();
      }
    });
  }

  // tools/importer/old-theme/parsers/button-accordion.js
  function parse(container, { document }) {
    const children = Array.from(container.children);
    const accordionItems = [];
    let i = 0;
    while (i < children.length) {
      const el = children[i];
      if (el.tagName === "H2" && el.querySelector("button")) {
        const button = el.querySelector("button");
        const questionText = button.textContent.trim();
        const answerElements = [];
        i++;
        while (i < children.length) {
          const next = children[i];
          if (next.tagName === "H2" && next.querySelector("button")) break;
          answerElements.push(next);
          i++;
        }
        if (questionText) {
          accordionItems.push({ questionText, answerElements });
        }
      } else {
        i++;
      }
    }
    if (accordionItems.length === 0) return null;
    const cells = [];
    accordionItems.forEach(({ questionText, answerElements }) => {
      const questionH3 = document.createElement("h3");
      questionH3.textContent = questionText;
      cells.push([[questionH3], answerElements.length > 0 ? answerElements : [""]]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "Accordion (compact)", cells });
    container.replaceWith(block);
    return block;
  }

  // tools/importer/old-theme/import-old-theme.js
  function isAccordionH2(h2) {
    const links = h2.querySelectorAll("a");
    for (const link of links) {
      const href = link.getAttribute("href") || "";
      if (href.includes("#Expand") || href.includes("#expand") || href.includes("#collapse")) {
        return true;
      }
      const img = link.querySelector("img");
      if (img) {
        const src = (img.getAttribute("src") || "").toLowerCase();
        if (src.includes("plus") || src.includes("showhide") || src.includes("expand") || src.includes("minus")) {
          return true;
        }
      }
    }
    if (h2.querySelector("button")) return true;
    return false;
  }
  function parseOldThemeAccordion(main, document) {
    const allH2s = Array.from(main.querySelectorAll("h2"));
    const accordionH2s = allH2s.filter(isAccordionH2);
    if (accordionH2s.length < 2) return false;
    const parentGroups = /* @__PURE__ */ new Map();
    accordionH2s.forEach((h2) => {
      const parent = h2.parentElement;
      if (!parentGroups.has(parent)) parentGroups.set(parent, []);
      parentGroups.get(parent).push(h2);
    });
    const allSingle = Array.from(parentGroups.values()).every((arr) => arr.length === 1);
    if (allSingle && parentGroups.size >= 2) {
      const grandparentGroups = /* @__PURE__ */ new Map();
      accordionH2s.forEach((h2) => {
        const wrapper = h2.parentElement;
        const grandparent = wrapper ? wrapper.parentElement : null;
        if (grandparent) {
          if (!grandparentGroups.has(grandparent)) grandparentGroups.set(grandparent, []);
          grandparentGroups.get(grandparent).push({ h2, wrapper });
        }
      });
      grandparentGroups.forEach((entries, grandparent) => {
        if (entries.length < 2) return;
        const items = [];
        entries.forEach(({ h2, wrapper }) => {
          const link = h2.querySelector("a");
          let questionText = "";
          if (link) {
            const clone = link.cloneNode(true);
            clone.querySelectorAll("img, picture").forEach((img) => img.remove());
            questionText = clone.textContent.trim();
          }
          if (!questionText) questionText = h2.textContent.trim();
          const answer = [];
          Array.from(wrapper.children).forEach((child) => {
            if (child !== h2) answer.push(child);
          });
          if (questionText) {
            items.push({ question: questionText, answer });
          }
        });
        if (items.length === 0) return;
        const cells = [];
        items.forEach(({ question, answer }) => {
          const questionH3 = document.createElement("h3");
          questionH3.textContent = question;
          cells.push([[questionH3], answer.length > 0 ? answer : [""]]);
        });
        const block = WebImporter.Blocks.createBlock(document, { name: "Accordion (compact)", cells });
        const firstWrapper = entries[0].wrapper;
        firstWrapper.before(block);
        entries.forEach(({ wrapper }) => {
          if (wrapper.parentElement) wrapper.remove();
        });
      });
      return true;
    }
    parentGroups.forEach((h2sInParent, parent) => {
      if (h2sInParent.length < 2) return;
      const parentChildren = Array.from(parent.children);
      const runs = [];
      let currentRun = [];
      for (let i = 0; i < parentChildren.length; i++) {
        const el = parentChildren[i];
        if (h2sInParent.includes(el)) {
          currentRun.push(el);
        } else if (currentRun.length > 0) {
          const nextAccIdx = parentChildren.findIndex((e, idx) => idx > i && h2sInParent.includes(e));
          if (nextAccIdx > -1) {
            currentRun.push(el);
          } else {
            currentRun.push(el);
            runs.push(currentRun);
            currentRun = [];
          }
        }
      }
      if (currentRun.length > 0) runs.push(currentRun);
      runs.forEach((run) => {
        const accH2sInRun = run.filter((el) => h2sInParent.includes(el));
        if (accH2sInRun.length < 2) return;
        const items = [];
        let currentQuestion = null;
        let currentAnswer = [];
        run.forEach((el) => {
          if (h2sInParent.includes(el)) {
            if (currentQuestion) {
              items.push({ question: currentQuestion, answer: currentAnswer });
            }
            const link = el.querySelector("a");
            let questionText = "";
            if (link) {
              const clone = link.cloneNode(true);
              clone.querySelectorAll("img, picture").forEach((img) => img.remove());
              questionText = clone.textContent.trim();
            }
            if (!questionText) questionText = el.textContent.trim();
            currentQuestion = questionText;
            currentAnswer = [];
          } else {
            currentAnswer.push(el);
          }
        });
        if (currentQuestion) {
          items.push({ question: currentQuestion, answer: currentAnswer });
        }
        if (items.length === 0) return;
        const cells = [];
        items.forEach(({ question, answer }) => {
          const questionH3 = document.createElement("h3");
          questionH3.textContent = question;
          cells.push([[questionH3], answer.length > 0 ? answer : [""]]);
        });
        const block = WebImporter.Blocks.createBlock(document, { name: "Accordion (compact)", cells });
        const firstEl = run[0];
        firstEl.before(block);
        run.forEach((el) => {
          if (el.parentElement) el.remove();
        });
      });
    });
    return true;
  }
  var import_old_theme_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      let main = document.querySelector("main") || document.querySelector("#contentBody") || document.querySelector("#mainColumns") || document.querySelector("#shell") || document.body;
      cleanup(document, url);
      const shell = document.querySelector("#shell") || document.querySelector(".t8");
      let extractedH1 = null;
      let extractedHero = null;
      if (shell) {
        const titleDiv = shell.querySelector(".c42 h1, #title h1");
        if (titleDiv) {
          extractedH1 = document.createElement("h1");
          extractedH1.textContent = titleDiv.textContent.trim();
        }
        const contentTop2 = shell.querySelector('#contentTop, [id*="contentTop"]');
        if (contentTop2) {
          const heroImg = contentTop2.querySelector("img");
          const heroH2 = contentTop2.querySelector("h2");
          const heroDesc = contentTop2.querySelector("p");
          let ctaLink = contentTop2.querySelector("a");
          if (heroH2) {
            extractedHero = { img: heroImg, h2: heroH2, desc: heroDesc, cta: ctaLink };
          }
          contentTop2.remove();
        }
      }
      main = document.querySelector("#contentBody") || document.querySelector("#mainColumns") || document.querySelector("main") || document.querySelector("#shell") || document.querySelector(".t8") || document.body;
      function flattenMain(el) {
        let changed = true;
        while (changed) {
          changed = false;
          const children2 = Array.from(el.children);
          if (children2.length === 1 && children2[0].tagName === "DIV") {
            const wrapper2 = children2[0];
            while (wrapper2.firstChild) {
              el.appendChild(wrapper2.firstChild);
            }
            wrapper2.remove();
            changed = true;
          }
        }
      }
      flattenMain(main);
      const contentCol = main.querySelector(".mainContentCol") || main.querySelector('[class*="ContentCol"]');
      if (contentCol) {
        let target = contentCol;
        while (target.children.length === 1 && target.children[0].tagName === "DIV") {
          target = target.children[0];
        }
        while (target.firstChild) {
          main.appendChild(target.firstChild);
        }
        contentCol.remove();
      }
      flattenMain(main);
      main.querySelectorAll('.hatched, [class*="hatched"]').forEach((el) => {
        if (el.classList.contains("c55") || el.querySelector(".c55")) return;
        el.remove();
      });
      if (extractedHero) {
        const cellContent = [];
        if (extractedHero.img) {
          const pic = extractedHero.img.closest("picture") || extractedHero.img;
          cellContent.push(pic.cloneNode(true));
        }
        const h2 = document.createElement("h2");
        h2.textContent = extractedHero.h2.textContent.trim();
        cellContent.push(h2);
        if (extractedHero.desc && extractedHero.desc.textContent.trim()) {
          const p = document.createElement("p");
          p.textContent = extractedHero.desc.textContent.trim();
          cellContent.push(p);
        }
        if (extractedHero.cta) {
          const ctaP = document.createElement("p");
          const strong = document.createElement("strong");
          const a = document.createElement("a");
          a.setAttribute("href", extractedHero.cta.getAttribute("href") || "");
          a.textContent = extractedHero.cta.textContent.trim();
          strong.appendChild(a);
          ctaP.appendChild(strong);
          cellContent.push(ctaP);
        }
        const heroBlock = WebImporter.Blocks.createBlock(document, { name: "Hero", cells: [[cellContent]] });
        main.insertBefore(heroBlock, main.firstChild);
      }
      if (extractedH1) {
        main.insertBefore(extractedH1, main.firstChild);
      }
      const contentTop = main.querySelector('#contentTop, [id*="contentTop"]');
      if (contentTop) {
        const heroImg = contentTop.querySelector("img");
        const heroH2 = contentTop.querySelector("h2");
        const heroDesc = contentTop.querySelector("p");
        let ctaLink = contentTop.querySelector("a");
        if (heroH2 && ctaLink) {
          const cellContent = [];
          if (heroImg) cellContent.push((heroImg.closest("picture") || heroImg).cloneNode(true));
          const h2 = document.createElement("h2");
          h2.textContent = heroH2.textContent.trim();
          cellContent.push(h2);
          if (heroDesc && heroDesc.textContent.trim()) {
            const p = document.createElement("p");
            p.textContent = heroDesc.textContent.trim();
            cellContent.push(p);
          }
          const ctaP = document.createElement("p");
          const strong = document.createElement("strong");
          const a = document.createElement("a");
          a.setAttribute("href", ctaLink.getAttribute("href") || "");
          a.textContent = ctaLink.textContent.trim();
          strong.appendChild(a);
          ctaP.appendChild(strong);
          cellContent.push(ctaP);
          const block = WebImporter.Blocks.createBlock(document, { name: "Hero", cells: [[cellContent]] });
          contentTop.replaceWith(block);
        }
      }
      const processed = /* @__PURE__ */ new Set();
      main.querySelectorAll(".c60").forEach((c60) => {
        if (processed.has(c60)) return;
        const childDivs = Array.from(c60.querySelectorAll(":scope > div"));
        if (childDivs.length < 2) return;
        const firstImg = c60.querySelector("img");
        const src = (firstImg && (firstImg.getAttribute("src") || "")).toLowerCase();
        const width = parseInt(firstImg && firstImg.getAttribute("width") || "0", 10);
        const isIcon = width > 0 && width <= 100 || src.includes("64x64") || src.includes("icon") || src.includes("gradient-64") || src.includes("-64x");
        const variant = isIcon ? "Cards (icons, bg-image)" : "Cards (separator)";
        const cells = [];
        childDivs.forEach((div) => {
          const img = div.querySelector("img");
          const heading = div.querySelector("h2, h3, h4");
          const contentCell = [];
          if (heading) {
            const h3 = document.createElement("h3");
            h3.textContent = heading.textContent.trim();
            contentCell.push(h3);
          }
          div.querySelectorAll("p").forEach((p) => {
            if (p.querySelector("img")) return;
            if (p.textContent.trim()) contentCell.push(p.cloneNode(true));
          });
          if (img || contentCell.length > 0) {
            cells.push([img || "", contentCell]);
          }
        });
        if (cells.length > 0) {
          const block = WebImporter.Blocks.createBlock(document, { name: variant, cells });
          c60.replaceWith(block);
        }
      });
      main.querySelectorAll(".c55, .c5").forEach((c55) => {
        if (processed.has(c55)) return;
        const img = c55.querySelector("img");
        if (!img) return;
        const pic = img.closest("picture") || img;
        const contentClone = c55.cloneNode(true);
        const clonedImg = contentClone.querySelector("img");
        if (clonedImg) {
          const imgWrapper = clonedImg.closest("picture") || clonedImg.closest("p") || clonedImg;
          imgWrapper.remove();
        }
        const col2Content = [];
        contentClone.querySelectorAll("p, ul, ol").forEach((el) => {
          if (!el.textContent.trim()) return;
          if (el.tagName === "P" && el.parentElement.closest("p")) return;
          col2Content.push(el.cloneNode(true));
        });
        if (col2Content.length === 0) return;
        const block = WebImporter.Blocks.createBlock(document, {
          name: "Columns (panel)",
          cells: [[[pic.cloneNode(true)], col2Content]]
        });
        processed.add(c55);
        c55.replaceWith(block);
      });
      const tablist = main.querySelector('ul.tabs, [role="tablist"]');
      if (tablist) {
        const tabLinks = tablist.querySelectorAll('a[href^="#"], [role="tab"] a');
        const tabData = [];
        tabLinks.forEach((a) => {
          const label = a.textContent.trim();
          const href = a.getAttribute("href") || "";
          const panelId = href.replace("#", "");
          if (!label || !panelId) return;
          const panel = main.querySelector("#" + panelId) || main.querySelector('[id="' + panelId + '"]');
          if (!panel) return;
          const content = panel.innerHTML || "";
          const hasAccordion = panel.querySelector('.c58, [href="#Expand"], .rebranded-show-hide, details, h2 > button, h3 > a[href*="Expand"]');
          const hasComplexBlock = panel.querySelector('.c60, .c55, .c5, [role="tablist"]');
          const isComplex = !!(hasAccordion || hasComplexBlock);
          const slug = "tab-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
          tabData.push({ label, content, panel, isComplex, slug });
        });
        if (tabData.length >= 2) {
          const useReference = tabData.some((t) => t.isComplex);
          if (useReference) {
            const pagePath = new URL(params.originalURL || url).pathname.replace(/\/$/, "").replace(/^\//, "");
            const fragmentBase = "/fragments/" + pagePath;
            const cells = tabData.map((tab) => [[tab.label], [fragmentBase + "/" + tab.slug]]);
            const block = WebImporter.Blocks.createBlock(document, { name: "Tabs (reference)", cells });
            tablist.before(block);
          } else {
            const cells = tabData.map((tab) => {
              const contentEl = document.createElement("div");
              contentEl.innerHTML = tab.content;
              return [[tab.label], [contentEl]];
            });
            const block = WebImporter.Blocks.createBlock(document, { name: "Tabs", cells });
            tablist.before(block);
          }
          tablist.remove();
          tabData.forEach((tab) => {
            if (tab.panel && tab.panel.parentElement) tab.panel.remove();
          });
        }
      }
      const showHideItems = main.querySelectorAll(".rebranded-show-hide");
      if (showHideItems.length > 0) {
        const parent = showHideItems[0].parentElement;
        if (parent) {
          const siblings = Array.from(parent.children);
          let currentGroup = [];
          let currentHeading = null;
          const groups = [];
          siblings.forEach((el) => {
            const cls = el.className || "";
            if (cls.includes("rebranded-show-hide")) {
              currentGroup.push(el);
            } else if (el.tagName === "H3") {
              if (currentGroup.length > 0) {
                groups.push({ items: currentGroup, heading: currentHeading, beforeEl: currentGroup[0] });
                currentGroup = [];
              }
              currentHeading = el;
            } else if (cls.includes("c54")) {
              if (currentGroup.length > 0) {
                groups.push({ items: currentGroup, heading: currentHeading, beforeEl: currentGroup[0] });
                currentGroup = [];
                currentHeading = null;
              }
            }
          });
          if (currentGroup.length > 0) {
            groups.push({ items: currentGroup, heading: currentHeading, beforeEl: currentGroup[0] });
          }
          groups.forEach(({ items, heading, beforeEl }) => {
            const cells = [];
            items.forEach((item) => {
              const h2 = item.querySelector("h2");
              const questionText = h2 ? h2.textContent.trim() : "";
              const answerEls = Array.from(item.children).filter((c) => c.tagName !== "H2");
              if (questionText) {
                const qH3 = document.createElement("h3");
                qH3.textContent = questionText;
                cells.push([[qH3], answerEls.length > 0 ? answerEls : [""]]);
              }
            });
            if (cells.length > 0) {
              const block = WebImporter.Blocks.createBlock(document, { name: "Accordion (compact)", cells });
              if (heading) {
                beforeEl.before(heading);
              }
              beforeEl.before(block);
              items.forEach((item) => item.remove());
            }
          });
        }
      }
      parseOldThemeAccordion(main, document);
      const mainContent = main.querySelector('.content-area, .main-content, [role="main"]') || main;
      const containers = [mainContent, ...Array.from(main.querySelectorAll(":scope > div, :scope > section"))];
      const processedContainers = /* @__PURE__ */ new Set();
      containers.forEach((container) => {
        if (processedContainers.has(container)) return;
        const h2Buttons = container.querySelectorAll(":scope > h2 > button");
        if (h2Buttons.length >= 2) {
          processedContainers.add(container);
          parse(container, { document });
        }
      });
      if (!processedContainers.has(main)) {
        const mainH2Buttons = main.querySelectorAll(":scope > h2 > button");
        if (mainH2Buttons.length >= 2) {
          const h2Elements = Array.from(main.querySelectorAll(":scope > h2"));
          const firstAccH2 = h2Elements.find((h2) => h2.querySelector("button"));
          if (firstAccH2) {
            const wrapper2 = document.createElement("div");
            wrapper2.className = "__accordion-wrapper";
            firstAccH2.before(wrapper2);
            let sibling = wrapper2.nextSibling;
            while (sibling) {
              const next = sibling.nextSibling;
              wrapper2.appendChild(sibling);
              sibling = next;
            }
            parse(wrapper2, { document });
          }
        }
      }
      main.querySelectorAll(":scope > div, :scope > section").forEach((container) => {
        if (processedContainers.has(container)) return;
        const childDivs = Array.from(container.querySelectorAll(":scope > div"));
        if (childDivs.length < 3) return;
        const resourceDivs = childDivs.filter((div) => {
          const hasLink = div.querySelector("a");
          const hasText = div.querySelector("p");
          return hasLink && hasText;
        });
        if (resourceDivs.length >= 3) {
          processedContainers.add(container);
          const cells = [];
          resourceDivs.forEach((div) => {
            const heading = div.querySelector("h3, h4, strong");
            const link = div.querySelector("a");
            const desc = div.querySelector("p");
            const contentCell = [];
            if (heading) {
              const h3 = document.createElement("h3");
              h3.textContent = heading.textContent.trim();
              contentCell.push(h3);
            }
            if (desc && desc.textContent.trim() !== (link ? link.textContent.trim() : "")) {
              const p = document.createElement("p");
              p.textContent = desc.textContent.trim();
              contentCell.push(p);
            }
            if (link) {
              const p = document.createElement("p");
              const a = document.createElement("a");
              a.setAttribute("href", link.getAttribute("href") || "");
              a.textContent = link.textContent.trim();
              p.appendChild(a);
              contentCell.push(p);
            }
            if (contentCell.length > 0) {
              cells.push([contentCell]);
            }
          });
          if (cells.length > 0) {
            const block = WebImporter.Blocks.createBlock(document, { name: "Cards (separator)", cells });
            container.replaceWith(block);
          }
        }
      });
      Array.from(main.children).forEach((child) => {
        if (child.tagName === "DIV" && child.children.length > 0 && !child.className && child.querySelector(".c54, .rebranded-show-hide, h2, h3, table")) {
          while (child.firstChild) {
            main.insertBefore(child.firstChild, child);
          }
          child.remove();
        }
      });
      const children = Array.from(main.children).filter((el) => {
        if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "LINK") return false;
        if (!el.textContent.trim() && !el.querySelector("img, picture, table") && !(el.className || "").includes("c54")) return false;
        return true;
      });
      const sections = [];
      let current = [];
      children.forEach((el) => {
        const cls = el.className || "";
        if (cls.includes("c54")) {
          if (current.length > 0) {
            sections.push(current);
            current = [];
          }
          return;
        }
        if (el.tagName === "H2" && el.closest("table") === null) {
          if (current.length > 0) {
            sections.push(current);
          }
          current = [el];
        } else {
          current.push(el);
        }
      });
      if (current.length > 0) sections.push(current);
      while (main.firstChild) main.removeChild(main.firstChild);
      sections.forEach((section, i) => {
        if (i > 0) main.appendChild(document.createElement("hr"));
        section.forEach((el) => main.appendChild(el));
      });
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      const pageid = main.getAttribute("data-pageid") || document.body.getAttribute("data-pageid") || "";
      const footnotes = main.getAttribute("data-footnotes") || document.body.getAttribute("data-footnotes") || "";
      if (pageid || footnotes) {
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
          if (pageid) {
            const row = document.createElement("tr");
            row.innerHTML = `<td>pageid</td><td>${pageid}</td>`;
            tbody.appendChild(row);
          }
          if (footnotes) {
            const row = document.createElement("tr");
            row.innerHTML = `<td>footnotes</td><td>${footnotes}</td>`;
            tbody.appendChild(row);
          }
        }
      }
      main.removeAttribute("data-pageid");
      main.removeAttribute("data-footnotes");
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
      const path = new URL(params.originalURL || url).pathname.replace(/\/$/, "").replace(/\.html$/, "") || "/index";
      return [{
        element: main,
        path,
        report: { title: document.title, template: "old-theme" }
      }];
    }
  };
  return __toCommonJS(import_old_theme_exports);
})();
