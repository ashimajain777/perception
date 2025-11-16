// public/content.js
(function() {
  'use strict';

  let settings = {};
  const styleElementIds = [
    'accessai-focus-mode',
    'accessai-motion-blocker', 
    'accessai-larger-targets',
    'accessai-font-style' // <-- NEW
  ];

  // ... (Feature-specific state remains the same) ...
  let cursorGuideEl = null;
  let currentTargetEl = null;
  let recognition = null;
  let isReadAloudActive = false;
  let currentUtterance = null;
  let currentHighlightDiv = null;

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

    if (!settings.enabled) {
      styleElementIds.forEach(removeStyle);
      document.documentElement.style.filter = ''; // Reset contrast
      document.documentElement.style.fontSize = ''; // <-- NEW: Reset font size
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
    if (!size) {
      document.documentElement.style.fontSize = '';
    } else {
      document.documentElement.style.fontSize = `${size}%`;
    }
  }

  function applyFontStyle(style) {
    removeStyle('accessai-font-style'); // Always remove the old one first
    
    if (!style || style === 'default') {
      return; // Do nothing, leave it removed
    }

    let css = '';
    switch (style) {
      case 'readable':
        css = `body * { font-family: Verdana, Arial, sans-serif !important; }`;
        break;
      case 'monospaced':
        css = `body * { font-family: 'Courier New', Courier, monospace !important; }`;
        break;
      case 'opendyslexic':
        css = `
          @import url('https://cdn.jsdelivr.net/npm/open-dyslexic@latest/build/web/opendyslexic.css');
          body * {
            font-family: 'OpenDyslexic', Arial, sans-serif !important;
          }
        `;
        break;
    }
    
    if (css) {
      injectStyle('accessai-font-style', css);
    }
  }
  // --- END NEW FONT FUNCTIONS ---

  // ... (Other features: Button Targeting, Voice, Alt Text, Read Aloud) ...
  // ... (All these functions remain the same as before) ...
    // Button Targeting
    function getClickableElements(from) {
      return Array.from(
        document.querySelectorAll(
          'a, button, [role="button"], [role="link"], [role="menuitem"], input[type="submit"], input[type="button"]'
        )
      ).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    }

    function findClosestElement(x, y) {
      const elements = getClickableElements();
      let closest = null;
      let minDistance = 150;
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        const elX = rect.left + rect.width / 2;
        const elY = rect.top + rect.height / 2;
        const distance = Math.hypot(elX - x, elY - y);
        if (distance < minDistance) {
          minDistance = distance;
          closest = el;
        }
      }
      return closest;
    }

    function updateCursorGuide(e) {
      if (!cursorGuideEl) return;
      const target = findClosestElement(e.clientX, e.clientY);
      if (target) {
        const rect = target.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const size = Math.max(rect.width, rect.height, 60) * 1.25;
        cursorGuideEl.style.opacity = '1';
        cursorGuideEl.style.width = `${size}px`;
        cursorGuideEl.style.height = `${size}px`;
        cursorGuideEl.style.left = `${x}px`;
        cursorGuideEl.style.top = `${y}px`;
        if (target !== currentTargetEl) {
          currentTargetEl?.classList.remove('accessai-targeted-element');
          target.classList.add('accessai-targeted-element');
          currentTargetEl = target;
        }
      } else {
        cursorGuideEl.style.opacity = '0';
        if (currentTargetEl) {
          currentTargetEl.classList.remove('accessai-targeted-element');
          currentTargetEl = null;
        }
      }
    }

    function toggleButtonTargeting(enable) {
      if (enable) {
        if (!cursorGuideEl) {
          cursorGuideEl = document.createElement('div');
          cursorGuideEl.id = 'accessai-cursor-guide';
          cursorGuideEl.classList.add('accessai-cursor-guide');
          document.body.appendChild(cursorGuideEl);
        }
        document.addEventListener('mousemove', updateCursorGuide);
      } else {
        document.removeEventListener('mousemove', updateCursorGuide);
        if (cursorGuideEl) {
          cursorGuideEl.remove();
          cursorGuideEl = null;
        }
        if (currentTargetEl) {
          currentTargetEl.classList.remove('accessai-targeted-element');
          currentTargetEl = null;
        }
      }
    }

    // Voice Commands
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    function toggleVoiceCommands(enable) {
      if (enable && SpeechRecognition) {
        if (recognition) return;
        try {
          recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = false;
          recognition.lang = 'en-US';
          recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
            console.log('AccessAI Voice Command:', transcript);
            handleVoiceCommand(transcript);
          };
          recognition.onerror = (event) => {
            console.error('AccessAI Voice Error:', event.error);
            if (event.error === 'no-speech' || event.error === 'network' || event.error === 'audio-capture') {
              setTimeout(restartRecognition, 500);
            }
          };
          recognition.onend = () => {
            if (settings.enabled && settings.motor?.voiceCommands) {
              setTimeout(restartRecognition, 100);
            }
          };
          recognition.start();
        } catch (err) {
          console.error("AccessAI: Speech recognition failed to start.", err);
        }
      } else {
        if (recognition) {
          recognition.onend = null;
          recognition.stop();
          recognition = null;
        }
      }
    }

    function restartRecognition() {
      if (recognition && settings.enabled && settings.motor?.voiceCommands) {
        try {
          recognition.start();
        } catch(e) {
          console.log("AccessAI: Recognition restart failed", e);
        }
      }
    }

    function handleVoiceCommand(command) {
      switch (command) {
        case 'scroll down': window.scrollBy(0, window.innerHeight * 0.7); break;
        case 'scroll up': window.scrollBy(0, -window.innerHeight * 0.7); break;
        case 'go back': history.back(); break;
        case 'go forward': history.forward(); break;
        case 'go next':
          const nextLink = [...document.querySelectorAll('a, button')].find(el => el.textContent.toLowerCase().includes('next') || el.textContent.toLowerCase().includes('continue'));
          if (nextLink) nextLink.click();
          break;
        case 'click':
          if (currentTargetEl) currentTargetEl.click();
          break;
      }
    }

    // Alt Text
    function toggleAltTextGenerator(enable) {
      if (enable) {
        console.log('AccessAI: Alt Text Generator enabled. Right-click images to use.');
      }
    }

    function displayAltText(text, srcUrl) {
      // ... (implementation unchanged)
    }

    // Read Aloud
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
  function displaySimplifiedText(text) {
    // ... (implementation unchanged)
  }

  console.log('AccessAI content script (v7 - Fonts) loaded');
})();
