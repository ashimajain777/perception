// public/content.js
(function() {
  'use strict';

  let settings = {};
  let styleElements = {}; // Keep track of our injected style tags

  // 1. Load settings from storage
  function loadSettings() {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
      settings = response || {};
      applySettings();
    });
  }

  // 2. Remove all injected styles
  function clearAllStyles() {
    for (const key in styleElements) {
      if (styleElements[key]) {
        styleElements[key].remove();
        styleElements[key] = null;
      }
    }
    // Also remove any global filters
    document.documentElement.style.filter = '';
  }

  // 3. Apply accessibility modifications based on settings
  function applySettings() {
    // First, clear all existing modifications
    clearAllStyles();
    
    // If extension is disabled, stop here
    if (!settings.enabled) {
      return;
    }

    // Focus Mode
    if (settings.cognitive?.focusMode) {
      applyFocusMode();
    }

    // Motion Blocker
    if (settings.visual?.motionBlocker) {
      blockMotion();
    }

    // Contrast Control
    if (settings.visual?.contrast && settings.visual.contrast > 100) {
      applyContrastBoost(settings.visual.contrast);
    }

    // Larger Click Targets
    if (settings.motor?.largerTargets) {
      enlargeClickTargets();
    }
  }

  function injectStyle(id, css) {
    // Remove old style if it exists
    if (styleElements[id]) {
      styleElements[id].remove();
    }
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
    styleElements[id] = style;
  }

  // Focus Mode Implementation
  function applyFocusMode() {
    const css = `
      aside, [role="complementary"],
      .sidebar, #sidebar,
      [class*="ad-"], [class*="advertisement"],
      [id*="ad-"], [id*="advertisement"] {
        opacity: 0.15 !important;
        filter: blur(2px) !important;
        pointer-events: none !important;
        transition: opacity 0.3s, filter 0.3s;
      }
      
      aside:hover, [role="complementary"]:hover,
      .sidebar:hover, #sidebar:hover,
      [class*="ad-"]:hover, [class*="advertisement"]:hover,
      [id*="ad-"]:hover, [id*="advertisement"]:hover {
        opacity: 1 !important;
        filter: none !important;
      }
    `;
    injectStyle('accessai-focus-mode', css);
  }

  // Motion Blocker Implementation
  function blockMotion() {
    const css = `
      * {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
      }
    `;
    injectStyle('accessai-motion-blocker', css);
  }

  // Contrast Boost Implementation
  function applyContrastBoost(level) {
    // Note: This is a global filter. `injectStyle` isn't needed.
    const filterValue = (level / 100).toFixed(2);
    document.documentElement.style.filter = `contrast(${filterValue})`;
  }

  // Larger Click Targets Implementation
  function enlargeClickTargets() {
    const css = `
      a, button, input, select, textarea,
      [role="button"], [role="link"],
      [onclick], [tabindex] {
        min-width: 44px !important;
        min-height: 44px !important;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
    `;
    injectStyle('accessai-larger-targets', css);
  }

  // Initialize on load
  loadSettings();

  // 4. Listen for settings changes from the background/popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'settingsUpdated') {
      settings = request.settings || {};
      applySettings();
    }
  });

  console.log('AccessAI content script loaded');
})();
