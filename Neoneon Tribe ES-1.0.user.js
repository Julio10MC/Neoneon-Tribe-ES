// ==UserScript==
// @name         Neoneon Tribe ES
// @namespace    neo.neon
// @version      1.0
// @description  Traducción al español de Tribe Nine
// @match        *://neoneon-tribe.com/*
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/Julio10MC/Neoneon-Tribe-ES/main/Neoneon_Tribe_ES.user.js
// @downloadURL  https://raw.githubusercontent.com/Julio10MC/Neoneon-Tribe-ES/main/Neoneon_Tribe_ES.user.js
// ==/UserScript==

(function() {
    'use strict';

    const REPO_BASE = "https://raw.githubusercontent.com/Julio10MC/Neoneon-Tribe-ES/main/";
    const NEW_SCREEN_BTN_URL = REPO_BASE + "media/screen_btn.png";

    let dictionaries = { global: {}, local: {} };
    let currentPath = "";

    function loadDictionaries() {
        const path = window.location.pathname;
        if (path === currentPath) return;
        currentPath = path;

        fetchData(REPO_BASE + "global_ui.json", (data) => {
            dictionaries.global = data;
            applyAll();
        });

        let localUrl = "";
        if (path === "/" || path.includes("index.php")) localUrl = REPO_BASE + "main_page.json";
        else if (path.includes("/character/")) localUrl = REPO_BASE + "characters.json";
        else if (path.includes("/story/")) {
            const chapterId = path.split('/').filter(p => p.length > 0).pop();
            localUrl = REPO_BASE + "story/" + chapterId + ".json";
        }

        if (localUrl) {
            fetchData(localUrl, (data) => {
                dictionaries.local = data;
                applyAll();
            });
        }
    }

    function applyAll() {
        const uiTargets = document.querySelectorAll('a, h2, h3, h4, span, li, p, .name, .main-txt, .prev, .next');
        const screenBtn = document.querySelector('.screen-btn.screen-mode-link img');

        if (screenBtn) {
            screenBtn.src = NEW_SCREEN_BTN_URL;
        }
        uiTargets.forEach(el => {
            el.childNodes.forEach(node => {
                if (node.nodeType === 3) {
                    const txt = node.nodeValue.replace(/\s+/g, ' ').trim();

                    if (dictionaries.global[txt] && node.nodeValue !== dictionaries.global[txt]) {
                        node.nodeValue = dictionaries.global[txt];
                    }
                    if (!Array.isArray(dictionaries.local) && dictionaries.local[txt] && node.nodeValue !== dictionaries.local[txt]) {
                        node.nodeValue = dictionaries.local[txt];
                    }
                }
            });
        });

        if (window.location.pathname.includes("/story/")) {
            const lines = Array.isArray(dictionaries.local[0]) ? dictionaries.local[0] : dictionaries.local;
            let lineIndex = 0;

            const elements = document.querySelectorAll('.chapter-tl, .caption, .episode-tl, .story-inner p');

            elements.forEach((el) => {
                if (!el.innerHTML.trim()) return;

                const parts = el.innerHTML.split(/<br\s*\/?>/i);
                let updatedParts = [];
                let changed = false;

                for (let i = 0; i < parts.length; i++) {
                    let part = parts[i];

                    if (part.trim().length > 0) {
                        if (lineIndex < lines.length) {
                            const newText = lines[lineIndex];
                            if (part.trim() !== newText.trim()) {
                                part = newText;
                                changed = true;
                            }
                            lineIndex++;
                        }
                    }
                    updatedParts.push(part);
                }

                if (changed) {
                    el.innerHTML = updatedParts.join("<br>");
                }
            });
        }
    }

    loadDictionaries();

    const observer = new MutationObserver(() => {
        applyAll();
        if (window.location.pathname !== currentPath) {
            loadDictionaries();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    function fetchData(url, callback) {
        GM_xmlhttpRequest({
            method: "GET",
            url: url + "?t=" + new Date().getTime(),
            onload: (res) => {
                if (res.status === 200) {
                    try { callback(JSON.parse(res.responseText)); } catch (e) { console.error("Error JSON:", url); }
                }
            }
        });
    }
})();