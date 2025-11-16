// public/content.js
(function() {
  'use strict';

  let settings = {};
  const styleElementIds = [
    'accessai-focus-mode',
    'accessai-motion-blocker', 
    'accessai-larger-targets',
    'accessai-font-style' // <-- This ID is for our new font injector
  ];

  // ... (Feature-specific state remains the same) ...
  let cursorGuideEl = null;
  let currentTargetEl = null;
  let recognition = null;
  let isReadAloudActive = false;
  let currentUtterance = null;
  let currentHighlightDiv = null;

  // 1. Load settings from storage
  // ... (This function remains the same as before) ...
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
  // ... (This function remains the same as before) ...
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
  // ... (This function remains the same as before) ...
  function removeStyle(id) {
    let style = document.getElementById(id);
    if (style) {
      style.remove();
    }
  }

  // 4. Main function to apply all settings
  // ... (This function remains the same, but now calls the updated font functions) ...
  function applySettings() {
    if (!settings) return; // Not loaded yet

    if (!settings.enabled) {
      styleElementIds.forEach(removeStyle);
      document.documentElement.style.filter = ''; // Reset contrast
      document.documentElement.style.fontSize = ''; // <-- Reset font size
      toggleButtonTargeting(false);
      toggleVoiceCommands(false);
      toggleReadAloud(false);
      return;
    }

    // --- Cognitive Features ---
    if (settings.cognitive?.focusMode) {
      applyFocusMode();
    } else {
      removeStyle('accessai-focus-mode');
    }

    // --- Visual Features ---
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
    
    // -- NEW FONT FEATURES ---
    applyFontSize(settings.visual?.fontSize);
    applyFontStyle(settings.visual?.fontStyle);
    // --- END NEW FONT FEATURES ---
    
    toggleReadAloud(settings.visual?.readAloud);
    toggleAltTextGenerator(settings.visual?.altTextGenerator);

    // --- Motor Features ---
    if (settings.motor?.largerTargets) {
      enlargeClickTargets();
    } else {
      removeStyle('accessai-larger-targets');
    }

    toggleButtonTargeting(settings.motor?.buttonTargeting);
    toggleVoiceCommands(settings.motor?.voiceCommands);
  }
  
  // --- Feature Implementations (CSS definitions) ---
  // ... (Focus, Motion, Contrast, Enlarge Targets functions remain the same) ...
  function applyFocusMode() {
    const css = `
      aside, [role="complementary"], .sidebar, #sidebar,
      [class*="ad-"], [class*="advertisement"],
      [id*="ad-"], [id*="advertisement"] {
        opacity: 0.15 !important; filter: blur(2px) !important;
        pointer-events: none !important; transition: opacity 0.3s, filter 0.3s !important;
      }
      aside:hover, [role="complementary"]:hover, .sidebar:hover, #sidebar:hover,
      [class*="ad-"]:hover, [class*="advertisement"]:hover,
      [id*="ad-"]:hover, [id*="advertisement"]:hover {
        opacity: 1 !important; filter: none !important; pointer-events: auto !important;
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
  
  // --- NEW FONT FUNCTIONS ---
  function applyFontSize(size) {
    if (!size || size === 100) {
      document.documentElement.style.fontSize = '';
    } else {
      document.documentElement.style.fontSize = `${size}%`;
    }
  }

  // This map contains the CSS font-family value for each font style.
  const fontCssMap = {
    'roboto': '"Roboto", sans-serif',
    'opensans': '"Open Sans", sans-serif',
    'lato': '"Lato", sans-serif',
    'montserrat': '"Montserrat", sans-serif',
    'notosans': '"Noto Sans", sans-serif',
    'merriweather': '"Merriweather", serif',
    'lora': '"Lora", serif',
    'inter': '"Inter", sans-serif',
    'poppins': '"Poppins", sans-serif',
    'sourcesans': '"Source Sans 3", sans-serif', // 'Source Sans 3' is the new name
    'opendyslexic': '"OpenDyslexic", sans-serif'
  };
  
  // This function now imports all fonts and applies the selected one.
  function applyFontStyle(style) {
    removeStyle('accessai-font-style'); // Always remove the old one first
    
    if (!style || style === 'default' || !fontCssMap[style]) {
      return; // Do nothing, leave it removed
    }

    // 1. Define all font imports
    const googleFontNames = [
      "Roboto:400", "Open+Sans:400", "Lato:400", "Montserrat:400",
      "Noto+Sans:400", "Merriweather:400", "Lora:400", "Inter:400",
      "Poppins:400", "Source+Sans+3:400"
    ].join('&family=');
    
    const googleFontImport = `@import url('https://fonts.googleapis.com/css2?family=${googleFontNames}&display=swap');`;
    const dyslexicFontImport = `@import url('https://cdn.jsdelivr.net/npm/open-dyslexic@latest/build/web/opendyslexic.css');`;

    // 2. Get the specific CSS rule for the selected font
    const fontRule = `
      body, body * {
        font-family: ${fontCssMap[style]} !important;
      }
    `;

    // 3. Combine imports and the rule
    let fullCss = '';
    if (style === 'opendyslexic') {
      fullCss = dyslexicFontImport + '\n' + fontRule;
    } else {
      fullCss = googleFontImport + '\n' + fontRule;
    }
    
    // 4. Inject the style
    if (fullCss) {
      injectStyle('accessai-font-style', fullCss);
    }
  }
  // --- END NEW FONT FUNCTIONS ---

  // ... (Other features: Button Targeting, Voice, Alt Text, Read Aloud) ...
  // ... (All these functions remain the same as before) ...
    function getClickableElements(from) {
      // ... (implementation unchanged)
    }
    function findClosestElement(x, y) {
      // ... (implementation unchanged)
    }
    function updateCursorGuide(e) {
      // ... (implementation unchanged)
    }
    function toggleButtonTargeting(enable) {
      // ... (implementation unchanged)
    }
    function toggleVoiceCommands(enable) {
      // ... (implementation unchanged)
    }
    function restartRecognition() {
      // ... (implementation unchanged)
    }
    function handleVoiceCommand(command) {
      // ... (implementation unchanged)
    }
    function toggleAltTextGenerator(enable) {
      // ... (implementation unchanged)
    }
    function displayAltText(text, srcUrl) {
      // ... (implementation unchanged)
    }
    function cleanupHighlight() {
      // ... (implementation unchanged)
    }
    function handleReadAloudClick(e) {
      // ... (implementation unchanged)
    }
    function toggleReadAloud(enable) {
      // ... (implementation unchanged)
    }

  // 5. Initialize on load
  loadSettings();

  // 6. Listen for messages from the background script
  // ... (This function remains the same as before) ...
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
    
    if (request.action === 'altTextResponse') {
      displayAltText(request.text, request.srcUrl);
      sendResponse({status: "success"});
    }
    
    return true; // Keep channel open
  });

  // 7. Function to Display the Popup
  // ... (This function remains the same as before) ...
  function displaySimplifiedText(text) {
    const oldPopup = document.getElementById('accessai-simplify-popup');
    if (oldPopup) {
      oldPopup.remove();
    }

    const popup = document.createElement('div');
    popup.id = 'accessai-simplify-popup';
    // ... (styling)
    popup.style.cssText = `
      position: fixed; top: 20px; right: 20px; width: 350px;
      background: #ffffff; border: 1px solid #e0e0e0;
      border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 16px; z-index: 9999999; color: #000;
      font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;
    `;

    const header = document.createElement('div');
    // ... (styling)
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;";

    const title = document.createElement('h3');
    title.textContent = 'Simplified Text';
    // ... (styling)
    title.style.cssText = "font-size: 16px; font-weight: 600; color: #000; margin: 0;";

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    // ... (styling)
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

  console.log('AccessAI content script (v8 - Top10 Fonts) loaded');
})();
