// public/content.js
(function() {
  'use strict';

  let settings = {};
  // A list of all style IDs our extension manages
  const styleElementIds = [
    'accessai-focus-mode', 
    'accessai-motion-blocker', 
    'accessai-larger-targets'
  ];

  // 1. Load settings from storage
  function loadSettings() {
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
      console.log("AccessAI: Not in an extension context.");
      return;
    }

    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("AccessAI: Could not load settings.", chrome.runtime.lastError.message);
        setTimeout(loadSettings, 500);
      } else {
        settings = response || {};
        applySettings();
      }
    });
  }

  // 2. Helper to add/update a style tag
  function injectStyle(id, css) {
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      (document.documentElement || document.head || document.body).appendChild(style);
    }
    if (style.textContent !== css) {
      style.textContent = css;
    }
  }

  // 3. Helper to remove a style tag
  function removeStyle(id) {
    let style = document.getElementById(id);
    if (style) {
      style.remove();
    }
  }

  // 4. Main function to apply all settings
  function applySettings() {
    if (!settings) return; // Not loaded yet

    // Global Enable/Disable Switch
    if (!settings.enabled) {
      styleElementIds.forEach(removeStyle);
      document.documentElement.style.filter = ''; // Reset contrast
      return;
    }

    // Cognitive Features
    if (settings.cognitive?.focusMode) {
      applyFocusMode();
    } else {
      removeStyle('accessai-focus-mode');
    }

    // Visual Features
    if (settings.visual?.motionBlocker) {
      blockMotion();
    } else {
      removeStyle('accessai-motion-blocker');
    }

    if (settings.visual?.contrast && settings.visual.contrast > 100) {
      applyContrastBoost(settings.visual.contrast);
    } else {
      document.documentElement.style.filter = '';
    }

    // Motor Features
    if (settings.motor?.largerTargets) {
      enlargeClickTargets();
    } else {
      removeStyle('accessai-larger-targets');
    }
  }
  
  // --- Feature Implementations (CSS definitions) ---

  function applyFocusMode() {
    const css = `
      aside, [role="complementary"],
      .sidebar, #sidebar,
      [class*="ad-"], [class*="advertisement"],
      [id*="ad-"], [id*="advertisement"] {
        opacity: 0.15 !important;
        filter: blur(2px) !important;
        pointer-events: none !important;
        transition: opacity 0.3s, filter 0.3s !important;
      }
      aside:hover, [role="complementary"]:hover,
      .sidebar:hover, #sidebar:hover,
      [class*="ad-"]:hover, [class*="advertisement"]:hover,
      [id*="ad-"]:hover, [id*="advertisement"]:hover {
        opacity: 1 !important;
        filter: none !important;
        pointer-events: auto !important;
      }
    `;
    injectStyle('accessai-focus-mode', css);
  }

  function blockMotion() {
    const css = `
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        transition-delay: 0.001ms !important;
        scroll-behavior: auto !important;
      }
    `;
    injectStyle('accessai-motion-blocker', css);
  }

  function applyContrastBoost(level) {
    const filterValue = (level / 100).toFixed(2);
    document.documentElement.style.filter = `contrast(${filterValue})`;
  }

  function enlargeClickTargets() {
    const css = `
      a, button, input[type="button"], input[type="submit"], input[type="reset"],
      [role="button"], [role="link"], [role="menuitem"],
      [onclick], [tabindex]:not(body, html, iframe) {
        min-width: 44px !important;
        min-height: 44px !important;
      }
      a:not([role]), [role="link"] {
         padding-top: 8px !important;
         padding-bottom: 8px !important;
      }
    `;
    injectStyle('accessai-larger-targets', css);
  }

  // 5. Initialize on load
  loadSettings();

  // 6. Listen for messages from the background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'settingsUpdated') {
      settings = request.settings || {};
      applySettings();
      sendResponse({status: "success"});
    }
    
    if (request.action === 'simplifiedTextResponse') {
      displaySimplifiedText(request.text);
      sendResponse({status: "success"});
    }
    
    return true; // Keep channel open
  });

  // 7. Function to Display the Popup
  function displaySimplifiedText(text) {
    const oldPopup = document.getElementById('accessai-simplify-popup');
    if (oldPopup) {
      oldPopup.remove();
    }

    const popup = document.createElement('div');
    popup.id = 'accessai-simplify-popup';
    popup.style.cssText = `
      position: fixed; top: 20px; right: 20px; width: 350px;
      background: #ffffff; border: 1px solid #e0e0e0;
      border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 16px; z-index: 9999999; color: #000;
      font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;
    `;

    const header = document.createElement('div');
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;";

    const title = document.createElement('h3');
    title.textContent = 'Simplified Text';
    title.style.cssText = "font-size: 16px; font-weight: 600; color: #000; margin: 0;";

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
      font-size: 24px; font-weight: 300; color: #888;
      background: none; border: none; cursor: pointer; padding: 0; line-height: 1;
    `;
    closeButton.onclick = () => popup.remove();
    
    header.appendChild(title);
    header.appendChild(closeButton);

    const content = document.createElement('div');
    content.textContent = text;
    content.style.cssText = "max-height: 200px; overflow-y: auto;";

    popup.appendChild(header);
    popup.appendChild(content);
    document.body.appendChild(popup);
  }

  console.log('AccessAI content script (v3 with simplifier) loaded');
})();
