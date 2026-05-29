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

  // tools/importer/import-es-product-landing.js
  var import_es_product_landing_exports = {};
  __export(import_es_product_landing_exports, {
    default: () => import_es_product_landing_default
  });

  // tools/importer/transformers/wellsfargo-cleanup.js
  var H = { before: "beforeTransform", after: "afterTransform" };
  var TAG_MAPPINGS = [
    { selector: "div.title2-SemiBold", tag: "h3" },
    { selector: "div.headline", tag: "h4" }
  ];
  function transform(hookName, element, payload) {
    if (hookName === H.before) {
      TAG_MAPPINGS.forEach(({ selector, tag, className }) => {
        element.querySelectorAll(selector).forEach((el) => {
          const replacement = element.ownerDocument.createElement(tag);
          replacement.innerHTML = el.innerHTML;
          if (className) replacement.className = className;
          el.replaceWith(replacement);
        });
      });
      WebImporter.DOMUtils.remove(element, [
        "#onetrust-consent-sdk"
      ]);
      WebImporter.DOMUtils.remove(element, [
        ".signon-container"
      ]);
      WebImporter.DOMUtils.remove(element, [
        ".ep-modal"
      ]);
    }
    if (hookName === H.after) {
      WebImporter.DOMUtils.remove(element, [
        "header",
        ".ps-masthead",
        ".ps-support-dropdown-overlay-container",
        ".ps-support-dropdown-overlay",
        ".ps-fat-nav-overlay",
        ".ps-fat-nav-outer",
        "#containerL3Mobile",
        ".ps-emergency-message",
        'a.hidden[href="#skip"]',
        'nav[aria-label="Breadcrumb"]',
        ".breadcrumb",
        "#feedbackSurvey",
        ".feedback-survey"
      ]);
      WebImporter.DOMUtils.remove(element, [
        "footer",
        ".ps-footer-homepage",
        ".ps-footer-wrapper"
      ]);
      WebImporter.DOMUtils.remove(element, [
        "iframe"
      ]);
      WebImporter.DOMUtils.remove(element, [
        ".visuallyHidden"
      ]);
      WebImporter.DOMUtils.remove(element, [
        "noscript",
        "link"
      ]);
      element.querySelectorAll("a").forEach((a) => {
        const text = a.textContent;
        if (/\s*>+\s*$/.test(text)) {
          a.textContent = text.replace(/\s*>+\s*$/, "").trim();
        }
      });
      element.querySelectorAll("a").forEach((a) => {
        const text = a.textContent || "";
        if (!text.includes("footnote") && !text.includes("modal")) return;
        const match = text.match(/(\d+)\s*$/);
        if (!match) return;
        const num = match[1];
        const href = a.getAttribute("href") || a.href || "#";
        const doc = element.ownerDocument;
        const sup = a.querySelector("sup");
        if (sup) {
          const newSup = doc.createElement("sup");
          const newA = doc.createElement("a");
          newA.setAttribute("href", href);
          newA.textContent = num;
          newSup.appendChild(newA);
          a.replaceWith(newSup);
        } else {
          a.textContent = num;
        }
      });
      element.querySelectorAll("a").forEach((a) => {
        let href = a.getAttribute("href") || "";
        if (href.startsWith("https://www.wellsfargo.com/")) {
          href = href.replace("https://www.wellsfargo.com", "");
        }
        if (href.length > 1 && href.endsWith("/")) {
          href = href.slice(0, -1);
        }
        if (href !== (a.getAttribute("href") || "")) {
          a.setAttribute("href", href);
        }
      });
      element.querySelectorAll('a.ps-btn-primary, a.ps-btn, a[class*="ps-btn-primary"]').forEach((a) => {
        const doc = element.ownerDocument;
        const strong = doc.createElement("strong");
        const newA = doc.createElement("a");
        newA.setAttribute("href", a.getAttribute("href") || "");
        newA.textContent = a.textContent.trim();
        strong.appendChild(newA);
        a.replaceWith(strong);
      });
      element.querySelectorAll('a.ps-btn-secondary, a[class*="ps-btn-secondary"]').forEach((a) => {
        const doc = element.ownerDocument;
        const em = doc.createElement("em");
        const newA = doc.createElement("a");
        newA.setAttribute("href", a.getAttribute("href") || "");
        newA.textContent = a.textContent.trim();
        em.appendChild(newA);
        a.replaceWith(em);
      });
    }
  }

  // tools/importer/parsers/video.js
  function parse(element, { document }) {
    const video = element.querySelector("video");
    if (!video) return;
    const source = video.querySelector("source");
    const videoUrl = source ? source.getAttribute("src") : "";
    const posterUrl = video.getAttribute("poster") || "";
    const row1Content = [];
    if (videoUrl) {
      const p = document.createElement("p");
      const a = document.createElement("a");
      a.href = videoUrl;
      a.textContent = videoUrl;
      p.appendChild(a);
      row1Content.push(p);
    }
    if (posterUrl) {
      const p = document.createElement("p");
      const a = document.createElement("a");
      a.href = posterUrl;
      a.textContent = posterUrl;
      p.appendChild(a);
      row1Content.push(p);
    }
    const cells = [[row1Content]];
    const transcript = element.querySelector('details, [class*="transcript"]');
    if (transcript) {
      const row2Content = [];
      const summary = transcript.querySelector("summary");
      if (summary) {
        const p = document.createElement("p");
        p.textContent = summary.textContent.trim();
        row2Content.push(p);
      }
      const bodyEls = Array.from(transcript.children).filter((c) => c.tagName !== "SUMMARY");
      bodyEls.forEach((el) => {
        const ps = el.querySelectorAll("p");
        if (ps.length > 0) {
          ps.forEach((p) => row2Content.push(p.cloneNode(true)));
        } else if (el.textContent.trim()) {
          const p = document.createElement("p");
          p.textContent = el.textContent.trim();
          row2Content.push(p);
        }
      });
      if (row2Content.length > 0) cells.push([row2Content]);
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "Video", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/tabs.js
  var KNOWN_REFERENCE_TABS = [
    { id: "nationalbanks", label: "National banks", slug: "tab-national-banks" },
    { id: "regionalandcommunitybanks", label: "Regional and community banks", slug: "tab-regional-and-community-banks" },
    { id: "creditunions", label: "Credit unions", slug: "tab-credit-unions" },
    { id: "mortgagebrokers", label: "Mortgage brokers", slug: "tab-mortgage-brokers" },
    { id: "onlineonlymortgagelenders", label: "Online-only mortgage lenders", slug: "tab-online-only-mortgage-lenders" }
  ];
  function isKnownReferenceTab(anchorId) {
    return KNOWN_REFERENCE_TABS.find((t) => t.id === anchorId);
  }
  function parseReferenceTabs(container, document, url, tabAnchors) {
    let pagePath = "";
    try {
      const urlObj = new URL(url);
      pagePath = urlObj.pathname.replace(/\/$/, "").replace(/^\//, "");
    } catch (e) {
      pagePath = url.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "").replace(/^\//, "");
    }
    const fragmentBase = "/fragments/" + pagePath;
    const tabData = [];
    const elementsToRemove = /* @__PURE__ */ new Set();
    let firstTabLabelEl = null;
    for (const tab of KNOWN_REFERENCE_TABS) {
      const anchor = container.querySelector(`a[href="#${tab.id}"]`);
      if (!anchor) continue;
      const labelEl = anchor.closest("p") || anchor.closest("div");
      if (!labelEl) continue;
      if (!firstTabLabelEl) firstTabLabelEl = labelEl;
      const panelEl = labelEl.nextElementSibling;
      if (panelEl) elementsToRemove.add(panelEl);
      elementsToRemove.add(labelEl);
      tabData.push({
        label: tab.label,
        fragmentPath: fragmentBase + "/" + tab.slug
      });
    }
    if (tabData.length < 3) return false;
    const allParagraphs = container.querySelectorAll("p");
    for (const p of allParagraphs) {
      const anchor = p.querySelector('a[href^="#"]');
      if (!anchor) continue;
      const href = (anchor.getAttribute("href") || "").replace("#", "");
      if (isKnownReferenceTab(href)) {
        elementsToRemove.add(p);
        const next = p.nextElementSibling;
        if (next && (next.querySelector("h3") || (next.className || "").includes("cards"))) {
          elementsToRemove.add(next);
        }
      }
    }
    for (const p of allParagraphs) {
      const anchors = p.querySelectorAll('a[href^="#"]');
      if (anchors.length >= 3) {
        const matchCount = Array.from(anchors).filter((a) => isKnownReferenceTab((a.getAttribute("href") || "").replace("#", ""))).length;
        if (matchCount >= 3) elementsToRemove.add(p);
      }
    }
    const cells = tabData.map((tab) => [[tab.label], [tab.fragmentPath]]);
    const block = WebImporter.Blocks.createBlock(document, { name: "Tabs (reference)", cells });
    if (firstTabLabelEl && firstTabLabelEl.parentNode) {
      firstTabLabelEl.parentNode.insertBefore(block, firstTabLabelEl);
    }
    elementsToRemove.forEach((el) => {
      if (el.parentNode) el.remove();
    });
    return true;
  }
  function parseGenericTabs(container, document, tabAnchors) {
    const tabData = [];
    const elementsToRemove = /* @__PURE__ */ new Set();
    let firstTabLabelEl = null;
    for (const { id, label, anchorEl } of tabAnchors) {
      const labelEl = anchorEl.closest("p") || anchorEl.parentElement;
      if (!labelEl) continue;
      if (!firstTabLabelEl) firstTabLabelEl = labelEl;
      const panelEl = labelEl.nextElementSibling;
      if (!panelEl) continue;
      const panelContent = panelEl.innerHTML || "";
      tabData.push({ label, content: panelContent });
      elementsToRemove.add(labelEl);
      elementsToRemove.add(panelEl);
    }
    if (tabData.length < 2) return false;
    const allParagraphs = container.querySelectorAll("p");
    const knownIds = tabAnchors.map((t) => t.id);
    for (const p of allParagraphs) {
      const anchors = p.querySelectorAll('a[href^="#"]');
      if (anchors.length >= tabAnchors.length) {
        const matchCount = Array.from(anchors).filter((a) => knownIds.includes((a.getAttribute("href") || "").replace("#", ""))).length;
        if (matchCount >= tabAnchors.length) elementsToRemove.add(p);
      }
    }
    for (const p of allParagraphs) {
      if (elementsToRemove.has(p)) continue;
      const anchor = p.querySelector('a[href^="#"]');
      if (!anchor) continue;
      const href = (anchor.getAttribute("href") || "").replace("#", "");
      if (knownIds.includes(href)) {
        elementsToRemove.add(p);
        const next = p.nextElementSibling;
        if (next && (next.querySelector("h3") || next.querySelector("p"))) {
          elementsToRemove.add(next);
        }
      }
    }
    const cells = tabData.map((tab) => {
      const contentEl = document.createElement("div");
      contentEl.innerHTML = tab.content;
      return [[tab.label], [contentEl]];
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "Tabs", cells });
    if (firstTabLabelEl && firstTabLabelEl.parentNode) {
      firstTabLabelEl.parentNode.insertBefore(block, firstTabLabelEl);
    }
    elementsToRemove.forEach((el) => {
      if (el.parentNode) el.remove();
    });
    return true;
  }
  function parse2(container, { document, url, params }) {
    if (!url || !container) return false;
    const allAnchors = container.querySelectorAll('a[href^="#"]');
    const tabAnchors = [];
    const seenIds = /* @__PURE__ */ new Set();
    for (const a of allAnchors) {
      const href = (a.getAttribute("href") || "").replace("#", "");
      if (!href || href === "skip" || seenIds.has(href)) continue;
      if (/^[a-z][a-z0-9]*$/.test(href) || /^[a-z]+[a-z!]*$/.test(href)) {
        const label = a.textContent.trim();
        if (label && label.length > 2 && label.length < 80) {
          seenIds.add(href);
          tabAnchors.push({ id: href, label, anchorEl: a });
        }
      }
    }
    if (tabAnchors.length < 2) return false;
    const knownCount = tabAnchors.filter((t) => isKnownReferenceTab(t.id)).length;
    if (knownCount >= 3) {
      return parseReferenceTabs(container, document, url, tabAnchors);
    }
    if (tabAnchors.length >= 2) {
      return parseGenericTabs(container, document, tabAnchors);
    }
    return false;
  }

  // tools/importer/import-es-product-landing.js
  function parseHero(element, { document, isFirstHero }) {
    const img = element.querySelector(
      ".rsk-marquee-img-container img, .marquee-img img, .marquee-wrap img, picture img, img"
    );
    const heading = element.querySelector(
      ".rsk-marquee-inner-content h2, .rsk-marquee-content h2, .marquee-content h2, .marquee-content h1, h2, h1"
    );
    const contentArea = element.querySelector(
      ".rsk-marquee-inner-content, .rsk-marquee-content, .marquee-content"
    ) || element;
    let description = null;
    const paragraphs = contentArea.querySelectorAll("p");
    for (const p of paragraphs) {
      const btnLink = p.querySelector('a.ps-btn-primary, a.ps-btn-secondary, a[class*="btn"]');
      if (btnLink && p.textContent.trim() === btnLink.textContent.trim()) continue;
      if (p.textContent.trim()) {
        description = p;
        break;
      }
    }
    const ctaLink = element.querySelector(
      'a.ps-btn-primary, a.ps-btn-secondary, a[class*="ps-btn"], .ps-padding a'
    );
    const cellContent = [];
    if (img) {
      const picture = img.closest("picture") || img;
      cellContent.push(picture.cloneNode(true));
    }
    if (heading) {
      const h2 = document.createElement("h2");
      h2.innerHTML = heading.innerHTML;
      cellContent.push(h2);
    }
    if (description) {
      const p = document.createElement("p");
      p.innerHTML = description.innerHTML;
      cellContent.push(p);
    }
    if (ctaLink) {
      const p = document.createElement("p");
      const a = document.createElement("a");
      a.href = ctaLink.href;
      a.textContent = ctaLink.textContent.trim();
      const strong = document.createElement("strong");
      strong.appendChild(a);
      p.appendChild(strong);
      cellContent.push(p);
    }
    const cells = [[cellContent]];
    const block = WebImporter.Blocks.createBlock(document, { name: "Hero", cells });
    if (isFirstHero) {
      block.setAttribute("data-section-style", "center-align, heading-bar");
    }
    element.replaceWith(block);
  }
  function parseCardsIcons(element, { document }) {
    let cardItems = Array.from(element.querySelectorAll(".ps-marketing-small-promo-item"));
    if (cardItems.length === 0) {
      cardItems = Array.from(element.querySelectorAll(
        '.enhanced-txt-cm.mid-size-promo, .ps-promo-full-item, [class*="card-content"]:not(.card-container)'
      ));
    }
    if (cardItems.length === 0) {
      const container = element.querySelector('.card-container, [class*="promo-full-items"]');
      if (container) {
        cardItems = Array.from(container.children);
      }
    }
    if (cardItems.length === 0) {
      cardItems = Array.from(element.querySelectorAll(":scope > div")).filter(
        (el) => el.querySelector("h3, h4")
      );
    }
    const cells = [];
    cardItems.forEach((card) => {
      const image = card.querySelector("img");
      const textBody = card.querySelector('.enhanced-txt-body, .ps-marketing-text, [class*="txt-body"]') || card;
      const heading = textBody.querySelector("h3, h4") || card.querySelector("h3, h4");
      let description = null;
      const candidates = textBody.querySelectorAll(":scope > div, :scope > p");
      for (const child of candidates) {
        if (child.querySelector("h2, h3, h4")) continue;
        const link = child.querySelector("a");
        if (link && child.textContent.trim() === link.textContent.trim()) continue;
        if (child.textContent.trim()) {
          description = child;
          break;
        }
      }
      const ctaLink = textBody.querySelector("p > a, a.cta, a.button") || card.querySelector("p > a");
      const contentCell = [];
      if (heading) {
        const h3 = document.createElement("h3");
        h3.innerHTML = heading.innerHTML;
        contentCell.push(h3);
      }
      if (description) {
        const p = document.createElement("p");
        p.innerHTML = description.innerHTML;
        contentCell.push(p);
      }
      if (ctaLink) {
        const p = document.createElement("p");
        const link = document.createElement("a");
        link.href = ctaLink.href;
        link.textContent = ctaLink.textContent.replace(/\s*>+\s*$/, "").trim();
        p.appendChild(link);
        contentCell.push(p);
      }
      if (image || contentCell.length > 0) {
        cells.push([image || "", contentCell]);
      }
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "Cards (icons, bg-image)", cells });
    element.replaceWith(block);
  }
  function parseCardsSeparator(element, { document }) {
    let cardItems = Array.from(element.querySelectorAll(
      '.enhanced-txt-cm.mid-size-promo, .ps-promo-full-item, [class*="card-content"]:not(.card-container)'
    ));
    if (cardItems.length === 0) {
      const container = element.querySelector('.card-container, [class*="promo-full-items"]');
      if (container) {
        cardItems = Array.from(container.children);
      }
    }
    if (cardItems.length === 0) {
      cardItems = Array.from(element.querySelectorAll(":scope > div")).filter(
        (el) => el.querySelector("h3, h4")
      );
    }
    const cells = [];
    cardItems.forEach((card) => {
      const image = card.querySelector("img");
      const textBody = card.querySelector('.enhanced-txt-body, .ps-marketing-text, [class*="txt-body"]') || card;
      const heading = textBody.querySelector("h3, h4") || card.querySelector("h3, h4");
      let description = null;
      const candidates = textBody.querySelectorAll(":scope > div, :scope > p");
      for (const child of candidates) {
        if (child.querySelector("h2, h3, h4")) continue;
        const link = child.querySelector("a");
        if (link && child.textContent.trim() === link.textContent.trim()) continue;
        if (child.textContent.trim()) {
          description = child;
          break;
        }
      }
      const ctaLink = textBody.querySelector("p > a, a.cta, a.button") || card.querySelector("p > a");
      const contentCell = [];
      if (heading) {
        const h3 = document.createElement("h3");
        h3.innerHTML = heading.innerHTML;
        contentCell.push(h3);
      }
      if (description) {
        const p = document.createElement("p");
        p.innerHTML = description.innerHTML;
        contentCell.push(p);
      }
      if (ctaLink) {
        const p = document.createElement("p");
        const link = document.createElement("a");
        link.href = ctaLink.href;
        link.textContent = ctaLink.textContent.replace(/\s*>+\s*$/, "").trim();
        p.appendChild(link);
        contentCell.push(p);
      }
      if (image || contentCell.length > 0) {
        cells.push([image || "", contentCell]);
      }
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "Cards", cells });
    element.replaceWith(block);
  }
  function parseCardsNoImage(element, { document }) {
    let cardItems = Array.from(element.querySelectorAll(".ps-marketing-small-promo-item"));
    if (cardItems.length === 0) {
      cardItems = Array.from(element.querySelectorAll(
        '.card-container > div, .card-theme2 > div, [class*="card-content"]:not(.card-container)'
      ));
    }
    if (cardItems.length === 0) {
      const container = element.querySelector('.card-container, [class*="card-container"]');
      if (container) {
        cardItems = Array.from(container.children).filter((el) => el.querySelector("h3, h4"));
      }
    }
    if (cardItems.length === 0) {
      cardItems = Array.from(element.querySelectorAll(":scope > div > div")).filter(
        (el) => el.querySelector("h3, h4")
      );
    }
    const cells = [];
    cardItems.forEach((card) => {
      const heading = card.querySelector("h3, h4");
      const contentParts = [];
      if (heading) {
        const h3 = document.createElement("h3");
        h3.innerHTML = heading.innerHTML;
        contentParts.push(h3);
      }
      const textBody = card.querySelector('.enhanced-txt-body, .ps-marketing-text, [class*="txt-body"]') || card;
      const paragraphs = textBody.querySelectorAll("p, div:not(:has(h3)):not(:has(h4))");
      paragraphs.forEach((p) => {
        if (p.querySelector("h3, h4")) return;
        if (p.textContent.trim() || p.querySelector("a")) {
          const para = document.createElement("p");
          para.innerHTML = p.innerHTML;
          contentParts.push(para);
        }
      });
      if (contentParts.length > 0) {
        cells.push([[""], contentParts]);
      }
    });
    if (cells.length > 0) {
      const block = WebImporter.Blocks.createBlock(document, { name: "Cards (bg-image)", cells });
      element.replaceWith(block);
    }
  }
  var parseVideo = parse;
  function parseAccordion(element, { document }) {
    const detailsList = element.tagName === "DETAILS" ? [element] : Array.from(element.querySelectorAll("details"));
    const cells = [];
    detailsList.forEach((details) => {
      const summary = details.querySelector("summary");
      if (!summary) return;
      const anchor = summary.querySelector("a");
      const hiddenSpan = summary.querySelector(".hidden");
      const questionText = anchor && anchor.textContent.trim() || hiddenSpan && hiddenSpan.textContent.trim() || summary.textContent.trim();
      const bodyContent = [];
      [...details.children].forEach((child) => {
        if (child.tagName !== "SUMMARY") {
          bodyContent.push(child);
        }
      });
      if (questionText) {
        const questionCell = document.createElement("h3");
        questionCell.textContent = questionText;
        cells.push([[questionCell], bodyContent.length ? bodyContent : [""]]);
      }
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "Accordion (compact)", cells });
    element.replaceWith(block);
  }
  function parseColumns(element, { document }) {
    const items = Array.from(element.querySelectorAll(
      '.ps-text-only-card, [class*="testimonial"], [class*="card-content"]'
    ));
    let testimonials = items;
    if (testimonials.length === 0) {
      const container = element.querySelector('.card-container, [class*="card-container"]') || element;
      testimonials = Array.from(container.children).filter((el) => {
        const text = el.textContent || "";
        return text.includes('"') || text.includes("\u201C") || text.includes("\u201D");
      });
    }
    const row = [];
    testimonials.forEach((item) => {
      const cellContent = [];
      const paras = item.querySelectorAll("p");
      if (paras.length === 0) {
        const p = document.createElement("p");
        p.textContent = item.textContent.trim();
        cellContent.push(p);
      } else {
        paras.forEach((para) => {
          const p = document.createElement("p");
          p.innerHTML = para.innerHTML;
          cellContent.push(p);
        });
      }
      row.push(cellContent);
    });
    if (row.length > 0) {
      const cells = [row];
      const block = WebImporter.Blocks.createBlock(document, { name: "Columns", cells });
      element.replaceWith(block);
    }
  }
  function detectCardsVariant(el) {
    const images = el.querySelectorAll("img");
    const headings = el.querySelectorAll("h3, h4");
    if (images.length === 0) return "bg-image";
    let iconCount = 0;
    let photoCount = 0;
    images.forEach((img) => {
      const w = parseInt(img.getAttribute("width") || "0", 10);
      const h = parseInt(img.getAttribute("height") || "0", 10);
      const src = (img.src || img.getAttribute("src") || "").toLowerCase();
      const isIcon = w > 0 && w <= 100 || h > 0 && h <= 100 || src.includes("64x64") || src.includes("icon") || src.includes("sprite") || src.includes("gradient-64") || src.includes("-64x");
      if (isIcon) iconCount++;
      else photoCount++;
    });
    if (iconCount >= headings.length) return "icons";
    if (photoCount >= headings.length) return "separator";
    if (images.length >= 2) return "separator";
    return "separator";
  }
  function isTestimonialsSection(el) {
    const text = el.textContent || "";
    const cls = el.className || "";
    if (text.includes("Escuche a nuestros clientes") || text.includes("Hear from our customers")) {
      return true;
    }
    if (cls.includes("card-background-white") && !cls.includes("promo") && !cls.includes("small-promo")) {
      const quotes = el.querySelectorAll("p");
      let quoteCount = 0;
      quotes.forEach((p) => {
        const t = p.textContent || "";
        if (t.startsWith('"') || t.startsWith("\u201C")) quoteCount++;
      });
      if (quoteCount >= 2) return true;
    }
    return false;
  }
  function detectSectionStyle(el) {
    const cls = el.className || "";
    const styles = [];
    if (cls.includes("card-background-gray") || cls.includes("background-gray")) styles.push("light");
    if (cls.includes("text-aligned-center")) styles.push("center-align");
    if (el.querySelector && el.querySelector(".ps-mid-page-title-top-line, .ps-mid-page-title-wrapper")) styles.push("heading-bar");
    return styles.length > 0 ? styles.join(", ") : null;
  }
  function getFragmentPatterns(url) {
    const prefix = url && url.includes("/es/") ? "/es" : "";
    return [
      { match: "Hable con un consultor hipotecario", path: prefix + "/fragments/mortgage/talk-to-mortgage-consultant" },
      { match: "Talk to a mortgage consultant", path: prefix + "/fragments/mortgage/talk-to-mortgage-consultant" },
      { match: "Explore el centro de aprendizaje", path: prefix + "/fragments/mortgage/explore-learning-center" },
      { match: "Explore the mortgage learning center", path: prefix + "/fragments/mortgage/explore-learning-center" },
      { match: "How can we help", path: prefix + "/fragments/help-cta-default" },
      { match: "C\xF3mo podemos ayudar", path: prefix + "/fragments/help-cta-default" }
    ];
  }
  function runParsers(main, document, url, params) {
    const processed = /* @__PURE__ */ new Set();
    let learningNavProcessed = false;
    main.querySelectorAll("nav").forEach((nav) => {
      if (processed.has(nav) || learningNavProcessed) return;
      const links = nav.querySelectorAll("a");
      const learnLinks = Array.from(links).filter((a) => {
        const href = a.getAttribute("href") || "";
        return href.includes("/mortgage/learn") || href.includes("/es/mortgage/learn");
      });
      if (learnLinks.length >= 3) {
        processed.add(nav);
        learningNavProcessed = true;
        let heroImg = null;
        let prevEl = nav.previousElementSibling;
        while (prevEl) {
          const img = prevEl.querySelector("picture") || prevEl.querySelector("img");
          if (img) {
            heroImg = img.closest("picture") || img;
            break;
          }
          prevEl = prevEl.previousElementSibling;
        }
        const ul = document.createElement("ul");
        learnLinks.forEach((a) => {
          const li = document.createElement("li");
          const link = document.createElement("a");
          link.setAttribute("href", a.getAttribute("href") || "");
          link.textContent = a.textContent.trim();
          li.appendChild(link);
          ul.appendChild(li);
        });
        const cells = [];
        if (heroImg) {
          cells.push([[heroImg.cloneNode(true)]]);
          const imgParent = heroImg.closest("p") || heroImg.parentElement;
          if (imgParent && imgParent !== main) imgParent.remove();
        }
        cells.push([[ul]]);
        const block = WebImporter.Blocks.createBlock(document, { name: "Learning Navigation", cells });
        nav.replaceWith(block);
        main.querySelectorAll("nav").forEach((dupNav) => {
          const dupLinks = Array.from(dupNav.querySelectorAll("a")).filter((a) => {
            const href = a.getAttribute("href") || "";
            return href.includes("/mortgage/learn") || href.includes("/es/mortgage/learn");
          });
          if (dupLinks.length >= 3) {
            processed.add(dupNav);
            dupNav.remove();
          }
        });
      }
    });
    parse2(main, { document, url, params });
    const fragmentPatterns = getFragmentPatterns(url);
    main.querySelectorAll(':scope > div, :scope > [class*="card-background"]').forEach((el) => {
      if (processed.has(el)) return;
      const h2 = el.querySelector("h2");
      if (!h2) return;
      const headingText = h2.textContent.trim();
      const fragmentMatch = fragmentPatterns.find((p) => headingText.includes(p.match));
      if (fragmentMatch) {
        processed.add(el);
        const block = WebImporter.Blocks.createBlock(document, {
          name: "Fragment",
          cells: [[[fragmentMatch.path]]]
        });
        el.replaceWith(block);
      }
    });
    let heroCount = 0;
    main.querySelectorAll(".rsk-marquee-container, .marquee-container, .ps-large-promo-full-container").forEach((el) => {
      if (processed.has(el)) return;
      const hasImg = el.querySelector("img, picture");
      const hasHeading = el.querySelector("h1, h2");
      const h3Count = el.querySelectorAll("h3").length;
      if (hasImg && hasHeading && h3Count <= 1) {
        processed.add(el);
        heroCount += 1;
        try {
          parseHero(el, { document, isFirstHero: heroCount === 1 });
        } catch (e) {
        }
      }
    });
    main.querySelectorAll(":scope > div").forEach((el) => {
      if (processed.has(el)) return;
      const img = el.querySelector("img, picture img");
      if (!img) return;
      const src = (img.src || img.getAttribute("src") || "").toLowerCase();
      const isLargeHeroImage = src.includes("1600x") || src.includes("1700x") || src.includes("lpromo") || src.includes("marquee");
      if (!isLargeHeroImage) return;
      const hasH2 = el.querySelector("h2");
      const h3Count = el.querySelectorAll("h3").length;
      if (hasH2 && h3Count <= 1) {
        processed.add(el);
        heroCount += 1;
        try {
          parseHero(el, { document, isFirstHero: heroCount === 1 });
        } catch (e) {
        }
      }
    });
    main.querySelectorAll(':scope > div, :scope > [class*="enhanced-txt"]').forEach((el) => {
      if (processed.has(el)) return;
      const video = el.querySelector("video");
      if (!video) return;
      processed.add(el);
      el.querySelectorAll("details").forEach((d) => processed.add(d));
      try {
        parseVideo(el, { document });
      } catch (e) {
      }
    });
    const accordionItems = Array.from(main.querySelectorAll("details.show-hide-content-wrapper")).filter((d) => !processed.has(d));
    if (accordionItems.length > 0) {
      const parent = accordionItems[0].parentElement;
      if (parent === main) {
        const wrapper = document.createElement("div");
        wrapper.className = "__accordion-group";
        accordionItems[0].before(wrapper);
        accordionItems.forEach((item) => {
          processed.add(item);
          wrapper.appendChild(item);
        });
        processed.add(wrapper);
        try {
          parseAccordion(wrapper, { document });
        } catch (e) {
        }
      } else if (!processed.has(parent)) {
        processed.add(parent);
        try {
          parseAccordion(parent, { document });
        } catch (e) {
        }
      }
    }
    main.querySelectorAll(':scope > div, :scope > [class*="card-background"]').forEach((el) => {
      if (processed.has(el)) return;
      if (isTestimonialsSection(el)) {
        processed.add(el);
        const sectionH2 = el.querySelector(":scope > .ps-mid-page-title-wrapper h2, :scope > h2, :scope > div > h2");
        const sectionStyle = detectSectionStyle(el);
        if (sectionH2 || sectionStyle) {
          const wrapper = document.createElement("div");
          wrapper.setAttribute("data-section-style", sectionStyle || "center-align");
          if (sectionH2) {
            const h2 = document.createElement("h2");
            h2.textContent = sectionH2.textContent.trim();
            wrapper.appendChild(h2);
          }
          el.before(wrapper);
        }
        try {
          parseColumns(el, { document });
        } catch (e) {
        }
      }
    });
    const cardCandidates = main.querySelectorAll(
      '.small-promo-combined, [class*="card-background"]:has(.card-container), .ps-marketing-small-promo-items'
    );
    cardCandidates.forEach((el) => {
      if (processed.has(el)) return;
      let ancestor = el.parentElement;
      let isNested = false;
      while (ancestor && ancestor !== main) {
        if (processed.has(ancestor)) {
          isNested = true;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      if (isNested) return;
      const headings = el.querySelectorAll("h3, h4");
      if (headings.length < 2) return;
      processed.add(el);
      el.querySelectorAll(".small-promo-combined, .ps-marketing-small-promo-items").forEach((child) => {
        processed.add(child);
      });
      const variant = detectCardsVariant(el);
      const sectionH2 = el.querySelector(
        ":scope > .ps-mid-page-title-wrapper h2, :scope > h2, :scope > div > h2.ps-mid-page-title, :scope > div > h2"
      );
      const sectionStyle = detectSectionStyle(el);
      if (sectionH2 || sectionStyle) {
        const wrapper = document.createElement("div");
        wrapper.setAttribute("data-section-style", sectionStyle || "center-align");
        if (sectionH2) {
          const h2 = document.createElement("h2");
          h2.textContent = sectionH2.textContent.trim();
          wrapper.appendChild(h2);
        }
        el.before(wrapper);
      }
      if (variant === "bg-image") {
        try {
          parseCardsNoImage(el, { document });
        } catch (e) {
        }
      } else if (variant === "icons") {
        try {
          parseCardsIcons(el, { document });
        } catch (e) {
        }
      } else {
        try {
          parseCardsSeparator(el, { document });
        } catch (e) {
        }
      }
    });
    const footnoteEl = main.querySelector(".ps-footnote");
    if (footnoteEl && !processed.has(footnoteEl)) {
      processed.add(footnoteEl);
      const cids = [];
      let pageid = "";
      footnoteEl.querySelectorAll("[data-cid]").forEach((item) => {
        const cid = item.getAttribute("data-cid");
        if (cid) cids.push(cid);
      });
      if (cids.length === 0) {
        footnoteEl.querySelectorAll(":scope > p, :scope > div").forEach((item) => {
          const cidLink = item.querySelector('a[href*="tcm:"]');
          if (cidLink) {
            const href = cidLink.getAttribute("href") || "";
            const cid = href.replace("#", "");
            if (cid) cids.push(cid);
          }
        });
      }
      if (cids.length === 0) {
        main.querySelectorAll("[data-footnote]").forEach((item) => {
          const cid = item.getAttribute("data-footnote");
          if (cid && !cids.includes(cid)) cids.push(cid);
        });
      }
      const allText = footnoteEl.textContent;
      const dtMatch = allText.match(/(DT\d+-\d+-\d+-\d+-[\d.]+)/);
      if (dtMatch) pageid = dtMatch[1];
      main.setAttribute("data-footnotes", cids.join(", "));
      if (pageid) main.setAttribute("data-pageid", pageid);
      footnoteEl.remove();
    }
    if (!main.getAttribute("data-footnotes")) {
      const cids = [];
      main.querySelectorAll("[data-footnote]").forEach((item) => {
        const cid = item.getAttribute("data-footnote");
        if (cid && !cids.includes(cid)) cids.push(cid);
      });
      if (cids.length > 0) {
        main.setAttribute("data-footnotes", cids.join(", "));
      }
    }
  }
  function buildSections(main, document) {
    const children = Array.from(main.children).filter((el) => {
      if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "LINK") return false;
      if (!el.textContent.trim() && !el.querySelector("img, picture, table") && !(el.className || "").includes("divider")) return false;
      return true;
    });
    function getStyle(el) {
      const cls = el.className || "";
      const styles = [];
      if (cls.includes("card-background-gray") || cls.includes("background-gray")) styles.push("light");
      if (cls.includes("text-aligned-center")) styles.push("center-align");
      if (el.querySelector && el.querySelector(".ps-mid-page-title-top-line, .ps-mid-page-title-wrapper")) styles.push("heading-bar");
      if (el.querySelector && el.querySelector('[class*="accordion"], details')) styles.push("narrow-width");
      return styles.length > 0 ? styles.join(", ") : null;
    }
    const sections = [];
    let current = { els: [], style: null };
    for (let i = 0; i < children.length; i++) {
      const el = children[i];
      const cls = el.className || "";
      if (cls.includes("divider") && !cls.includes("__accordion")) {
        if (cls.includes("desktop-hidden")) continue;
        if (current.els.length > 0) sections.push(current);
        const divBlock = WebImporter.Blocks.createBlock(document, { name: "Divider", cells: [] });
        current = { els: [divBlock], style: null };
        continue;
      }
      if (sections.length > 0) {
        const prevSection = sections[sections.length - 1];
        if (prevSection.els.length > 0) {
          const text = (el.textContent || "").trim();
          if (el.children && el.children.length <= 2) {
            const links = el.querySelectorAll("a");
            if (links.length === 1 && text.length < 100) {
              const prevHasBlock = prevSection.els.some(
                (e) => (e.className || "").includes("accordion") || (e.className || "").includes("cards") || e.tagName === "TABLE"
              );
              if (prevHasBlock) {
                prevSection.els.push(el);
                continue;
              }
            }
          }
          if (text.match(/^(more|review|see all|learn more|view all|más|obtenga más|vea más)/i) && el.querySelector("a")) {
            prevSection.els.push(el);
            continue;
          }
        }
      }
      if (el.hasAttribute && el.hasAttribute("data-section-style")) {
        if (current.els.length > 0) sections.push(current);
        const style2 = el.getAttribute("data-section-style") || null;
        current = { els: [], style: style2 };
        Array.from(el.children).forEach((child) => current.els.push(child));
        continue;
      }
      if (el.querySelector && el.querySelector(".ps-mid-page-title") && !el.querySelector("table, .card-container, details, .enhanced-txt-cm")) {
        if (current.els.length > 0) sections.push(current);
        const heading = el.querySelector("h2, .ps-mid-page-title");
        const style2 = getStyle(el);
        current = { els: [], style: style2 };
        if (heading) {
          const h2 = document.createElement("h2");
          h2.textContent = heading.textContent.trim();
          current.els.push(h2);
        }
        continue;
      }
      const isSectionBoundary = cls.includes("card-background-") || cls.includes("enhanced-txt-cm") && current.els.length > 0;
      if (isSectionBoundary) {
        if (current.els.length > 0) sections.push(current);
        const style2 = getStyle(el);
        current = { els: [], style: style2 };
      }
      const style = getStyle(el);
      if (!isSectionBoundary && style && !current.style) current.style = style;
      current.els.push(el);
      const isBlock = el.tagName === "TABLE" || cls.includes("block") && !cls.includes("card-background");
      if (isBlock) {
        sections.push(current);
        current = { els: [], style: null };
      }
    }
    if (current.els.length > 0) sections.push(current);
    for (let i = sections.length - 2; i >= 0; i--) {
      const sec = sections[i];
      const isH1Only = sec.els.length === 1 && sec.els[0] && sec.els[0].tagName === "H1";
      if (isH1Only && sections[i + 1]) {
        const nextFirst = sections[i + 1].els[0];
        const nextIsBlock = nextFirst && nextFirst.tagName === "TABLE";
        if (!nextIsBlock) {
          sections[i + 1].els.unshift(sec.els[0]);
          if (sec.style && !sections[i + 1].style) sections[i + 1].style = sec.style;
          sections.splice(i, 1);
        }
      }
    }
    sections.forEach((section) => {
      const hasAccordion = section.els.some((el) => {
        const cls = el.className || "";
        if (cls.includes("accordion")) return true;
        if (el.tagName === "TABLE") {
          const firstCell = el.querySelector("th, td");
          if (firstCell && firstCell.textContent.toLowerCase().includes("accordion")) return true;
        }
        return false;
      });
      if (hasAccordion) {
        const existing = section.style || "";
        if (!existing.includes("heading-bar")) {
          section.style = existing ? existing + ", heading-bar" : "center-align, heading-bar";
        }
      }
    });
    while (main.firstChild) main.removeChild(main.firstChild);
    sections.forEach((section, i) => {
      if (section.els.length === 0) return;
      if (i > 0) main.appendChild(document.createElement("hr"));
      section.els.forEach((el) => main.appendChild(el));
      if (section.style) {
        const metaCells = [[["style"], [section.style]]];
        const metaBlock = WebImporter.Blocks.createBlock(document, { name: "Section Metadata", cells: metaCells });
        main.appendChild(metaBlock);
      }
    });
  }
  var import_es_product_landing_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.querySelector("main") || document.body;
      transform("beforeTransform", main, payload);
      transform("afterTransform", main, payload);
      main.querySelectorAll("a").forEach((a) => {
        const text = a.textContent || "";
        if (!text.includes("footnote") && !text.includes("modal")) return;
        const match = text.match(/(\d+)\s*$/);
        if (!match) return;
        const num = match[1];
        const href = a.getAttribute("href") || a.href || "#";
        const sup = a.querySelector("sup");
        if (sup) {
          const newSup = document.createElement("sup");
          const newA = document.createElement("a");
          newA.setAttribute("href", href);
          newA.textContent = num;
          newSup.appendChild(newA);
          a.replaceWith(newSup);
        } else {
          a.textContent = num;
        }
      });
      main.querySelectorAll("a").forEach((a) => {
        const href = a.getAttribute("href") || "";
        if (href.startsWith("https://www.wellsfargo.com/")) {
          a.setAttribute("href", href.replace("https://www.wellsfargo.com", ""));
        }
      });
      runParsers(main, document, url, params);
      buildSections(main, document);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      const footnoteCids = main.getAttribute("data-footnotes");
      const footnotePageid = main.getAttribute("data-pageid");
      if (footnoteCids || footnotePageid) {
        const metaTable = main.querySelector("table:last-of-type");
        if (metaTable) {
          const tbody = metaTable.querySelector("tbody") || metaTable;
          if (footnoteCids) {
            const row = document.createElement("tr");
            row.innerHTML = `<td>footnotes</td><td>${footnoteCids}</td>`;
            tbody.appendChild(row);
          }
          if (footnotePageid) {
            const row = document.createElement("tr");
            row.innerHTML = `<td>pageid</td><td>${footnotePageid}</td>`;
            tbody.appendChild(row);
          }
        }
      }
      main.removeAttribute("data-footnotes");
      main.removeAttribute("data-pageid");
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const path = WebImporter.FileUtils.sanitizePath(
        new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "") || "/index"
      );
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: "es-product-landing"
        }
      }];
    }
  };
  return __toCommonJS(import_es_product_landing_exports);
})();
