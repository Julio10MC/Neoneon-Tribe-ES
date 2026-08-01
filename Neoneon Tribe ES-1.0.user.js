// ==UserScript==
// @name         Neoneon Tribe ES
// @namespace    neo.neon
// @version      1.0
// @description  Traducción al español de Tribe Nine
// @match        *://neoneon-tribe.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      raw.githubusercontent.com
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/Julio10MC/Neoneon-Tribe-ES/main/Neoneon_Tribe_ES.user.js
// @downloadURL  https://raw.githubusercontent.com/Julio10MC/Neoneon-Tribe-ES/main/Neoneon_Tribe_ES.user.js
// ==/UserScript==

(function () {
    'use strict';

    const REPO_BASE = "https://raw.githubusercontent.com/Julio10MC/Neoneon-Tribe-ES/main/";
    const NEW_SCREEN_BTN_URL = REPO_BASE + "media/screen_btn.png";

    const UI_SELECTOR = 'a, h2, h3, h4, span, li, p, .name, .main-txt, .prev, .next';
    const STORY_SELECTOR = '.chapter-tl, .caption, .episode-tl, .story-inner p:not(.illust-img)';

    const dictionaries = { global: {}, local: {} };
    let currentPath = "";
    let observer = null;
    let applyScheduled = false;

    injectFonts();
    observer = new MutationObserver(handleMutation);
    loadDictionaries();
    observer.observe(document.body, { childList: true, subtree: true });

    // ---------- fonts ----------

    function injectFonts() {
        const fonts = [
            { family: 'DotGothic16', file: 'DotGothic16-Regular.ttf', weight: 400 },
            { family: 'Shippori Mincho', file: 'ShipporiMincho-Regular.ttf', weight: 400 },
            { family: 'Shippori Mincho', file: 'ShipporiMincho-Medium.ttf', weight: 500 },
            { family: 'Shippori Mincho', file: 'ShipporiMincho-SemiBold.ttf', weight: 600 },
            { family: 'Shippori Mincho', file: 'ShipporiMincho-Bold.ttf', weight: 700 },
            { family: 'Shippori Mincho', file: 'ShipporiMincho-ExtraBold.ttf', weight: 800 },
            { family: 'Zen Kaku Gothic Antique', file: 'ZenKakuGothicAntique-Light.ttf', weight: 300 },
            { family: 'Zen Kaku Gothic Antique', file: 'ZenKakuGothicAntique-Regular.ttf', weight: 400 },
            { family: 'Zen Kaku Gothic Antique', file: 'ZenKakuGothicAntique-Medium.ttf', weight: 500 },
            { family: 'Zen Kaku Gothic Antique', file: 'ZenKakuGothicAntique-Bold.ttf', weight: 700 },
            { family: 'Zen Kaku Gothic Antique', file: 'ZenKakuGothicAntique-Black.ttf', weight: 900 },
        ];

        const css = fonts.map(f => `
        @font-face {
            font-family: '${f.family}';
            src: url('${REPO_BASE}fonts/${f.file}') format('truetype');
            font-weight: ${f.weight};
            font-style: normal;
        }`).join('\n');

        GM_addStyle(css);
    }

    // ---------- dictionary ----------

    function loadDictionaries() {
        const path = window.location.pathname;
        if (path === currentPath) return;
        currentPath = path;

        fetchData(REPO_BASE + "global_ui.json", (data) => {
            dictionaries.global = data || {};
            scheduleApply();
        });

        let localUrl = "";
        if (path === "/" || path.includes("index.php")) {
            localUrl = REPO_BASE + "main_page.json";
        } else if (path.includes("/character/")) {
            localUrl = REPO_BASE + "characters.json";
        } else if (path.includes("/story/")) {
            const chapterId = path.split('/').filter(Boolean).pop();
            localUrl = REPO_BASE + "story/" + chapterId + ".json";
        }

        if (localUrl) {
            fetchData(localUrl, (data) => {
                dictionaries.local = data || {};
                scheduleApply();
            });
        } else {
            dictionaries.local = {};
        }
    }

    function fetchData(url, callback) {
        GM_xmlhttpRequest({
            method: "GET",
            url: url + "?t=" + Date.now(),
            onload: (res) => {
                if (res.status !== 200) {
                    console.warn("[Neoneon Tribe ES] HTTP", res.status, "fetching", url);
                    return;
                }
                try {
                    callback(JSON.parse(res.responseText));
                } catch (e) {
                    console.error("[Neoneon Tribe ES] Bad JSON:", url, e);
                }
            },
            onerror: (err) => {
                console.error("[Neoneon Tribe ES] Network error fetching", url, err);
            }
        });
    }

    // Story JSON files dictionary level
    function getStoryLines() {
        if (Array.isArray(dictionaries.local)) return dictionaries.local;
        if (Array.isArray(dictionaries.local[0])) return dictionaries.local[0];
        return [];
    }

    // ---------- mutation ----------

    function handleMutation() {
        scheduleApply();
        if (window.location.pathname !== currentPath) {
            loadDictionaries();
        }
    }

    // Single applyAll() for mutations
    function scheduleApply() {
        if (applyScheduled) return;
        applyScheduled = true;
        requestAnimationFrame(() => {
            applyScheduled = false;
            applyAll();
        });
    }

    // ---------- translation pass ----------

    function applyAll() {
        observer?.disconnect();

        translateUiText();
        replaceScreenButton();

        if (window.location.pathname.includes("/story/")) {
            translateStoryLines();
        }

        observer?.observe(document.body, { childList: true, subtree: true });
    }

    function replaceScreenButton() {
        const screenBtn = document.querySelector('.screen-btn.screen-mode-link img');
        if (screenBtn) screenBtn.src = NEW_SCREEN_BTN_URL;
    }

    function translateUiText() {
        const localIsDict = !Array.isArray(dictionaries.local);

        document.querySelectorAll(UI_SELECTOR).forEach(el => {
            el.childNodes.forEach(node => {
                if (node.nodeType !== Node.TEXT_NODE) return;

                const txt = node.nodeValue.replace(/\s+/g, ' ').trim();
                if (!txt) return;

                const globalMatch = dictionaries.global[txt];
                if (globalMatch && node.nodeValue !== globalMatch) {
                    node.nodeValue = globalMatch;
                    return;
                }

                if (localIsDict) {
                    const localMatch = dictionaries.local[txt];
                    if (localMatch && node.nodeValue !== localMatch) {
                        node.nodeValue = localMatch;
                    }
                }
            });
        });
    }

    function translateStoryLines() {
        const lines = getStoryLines();
        let lineIndex = 0;

        document.querySelectorAll(STORY_SELECTOR).forEach(el => {
            if (!el.textContent.trim() && el.querySelector('img')) return;

            const parts = el.innerHTML.split(/<br\s*\/?>/i);
            let changed = false;

            const updatedParts = parts.map(part => {
                if (part.trim().length === 0 || lineIndex >= lines.length) {
                    return part;
                }

                const newText = lines[lineIndex++];
                if (part.trim() === newText.trim()) return part;

                changed = true;
                const tagMatch = part.trim().match(/^(<span[^>]*>)(.*)(<\/span>)$/i);
                if (tagMatch && !newText.trim().startsWith('<span')) {
                    return tagMatch[1] + newText + tagMatch[3];
                }
                return newText;
            });

            if (changed) el.innerHTML = updatedParts.join("<br>");
        });
    }
})();