// public/content.js
(function() {
  'use strict';

  let settings = {};
  // A list of all style IDs our extension manages
  const styleElementIds = [
    'accessai-focus-mode', 
    'accessai-motion-blocker', 
    'accessai-larger-targets'
    // Note: We manage button-targeting styles directly in JS
  ];

  // --- NEW: Feature-specific state ---
  let cursorGuideEl = null;
  let currentTargetEl = null;
  let recognition = null;
  // ---

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
      // Turn off running features
      toggleButtonTargeting(false);
      toggleVoiceCommands(false);
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

    // --- NEW: Apply new motor features ---
    toggleButtonTargeting(settings.motor?.buttonTargeting);
    toggleVoiceCommands(settings.motor?.voiceCommands);
    // ---
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

  // --- NEW: Feature 1: Button Targeting ---
  
  function getClickableElements(from) {
    return Array.from(
      document.querySelectorAll(
        'a, button, [role="button"], [role="link"], [role="menuitem"], input[type="submit"], input[type="button"]'
      )
    ).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0; // Only visible elements
    });
  }

  function findClosestElement(x, y) {
    const elements = getClickableElements();
    let closest = null;
    let minDistance = 150; // Max distance in pixels to check

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
      // Optional: make guide follow cursor
      // cursorGuideEl.style.left = `${e.clientX}px`;
      // cursorGuideEl.style.top = `${e.clientY}px`;
      // cursorGuideEl.style.width = `40px`;
      // cursorGuideEl.style.height = `40px`;
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

  // --- NEW: Feature 2: Voice Commands ---
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function toggleVoiceCommands(enable) {
    if (enable && SpeechRecognition) {
      if (recognition) return; // Already running

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
          // Restart if it's a common error like 'no-speech'
          if (event.error === 'no-speech' || event.error === 'network') {
            restartRecognition();
          }
        };
        
        recognition.onend = () => {
          // Restart recognition if it was enabled and stops
          if (settings.enabled && settings.motor?.voiceCommands) {
            setTimeout(restartRecognition, 100);
          }
        };
        
        recognition.start();

      } catch (err) {
        console.error("AccessAI: Speech recognition failed to start.", err);
        alert("AccessAI: Could not start voice recognition. Please ensure microphone permissions are granted.");
      }
      
    } else {
      if (recognition) {
        recognition.stop();
        recognition = null;
      }
    }
  }

  function restartRecognition() {
    if (recognition) {
      try {
        recognition.start();
      } catch(e) {
        console.log("AccessAI: Recognition restart failed", e);
      }
    }
  }

  function handleVoiceCommand(command) {
    switch (command) {
      case 'scroll down':
        window.scrollBy(0, window.innerHeight * 0.7);
        break;
      case 'scroll up':
        window.scrollBy(0, -window.innerHeight * 0.7);
        break;
      case 'go back':
        history.back();
        break;
      case 'go forward':
        history.forward();
        break;
      case 'go next':
        // This is a heuristic, it might not always work
        const nextLink = [...document.querySelectorAll('a, button')]
          .find(el => 
            el.textContent.toLowerCase().includes('next') || 
            el.textContent.toLowerCase().includes('continue')
          );
        if (nextLink) {
          nextLink.click();
        } else {
          console.log("AccessAI: Could not find a 'Next' button.");
        }
        break;
      case 'click':
        // Clicks the currently targeted element (if one is targeted)
        if (currentTargetEl) {
          currentTargetEl.click();
        }
        break;
    }
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

  console.log('AccessAI content script (v4 with Targeting and Voice) loaded');
})();
