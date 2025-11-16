// public/background.js

// 1. Listen for messages from the UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.local.get(['extensionSettings'], (result) => {
      sendResponse(result.extensionSettings || defaultSettings);
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'saveSettings') {
    chrome.storage.local.set({ extensionSettings: request.settings }, () => {
      sendResponse({ success: true });
      notifyTabsOfSettingsUpdate(request.settings);
      updateContextMenus(request.settings);
    });
    return true;
  }
  
  if (request.action === 'askAI') {
    handleAIChat(request.prompt).then(sendResponse);
    return true;
  }
});

// --- SETTINGS (Defaults) ---
const defaultSettings = {
  enabled: true,
  cognitive: { simplifier: false, focusMode: false, chatbotEnabled: true },
  visual: { 
    contrast: 100, 
    motionBlocker: false, 
    altTextGenerator: false, 
    readAloud: false,
    fontSize: 100, // <-- NEW
    fontStyle: 'default' // <-- NEW
  },
  motor: { largerTargets: false, buttonTargeting: false, voiceCommands: false, gestureControls: false }
};

// 2. Open onboarding, set defaults, and create context menu on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html#/onboarding') });
    chrome.storage.local.set({ extensionSettings: defaultSettings });
    chrome.storage.local.set({ onboardingComplete: false });
  }
  // Create context menus based on default settings
  chrome.storage.local.get(['extensionSettings'], (result) => {
    updateContextMenus(result.extensionSettings || defaultSettings);
  });
});

// 3. Helper to create/remove context menus based on settings
function updateContextMenus(settings) {
  chrome.contextMenus.removeAll(); // Clear all existing menus first

  if (!settings || !settings.enabled) return;

  // Create Simplifier menu ONLY if enabled
  if (settings.cognitive?.simplifier) {
    chrome.contextMenus.create({
      id: "simplify-text",
      title: "Simplify Text with AccessAI",
      contexts: ["selection"]
    });
  }

  // Create Alt Text menu ONLY if enabled
  if (settings.visual?.altTextGenerator) {
    chrome.contextMenus.create({
      id: "generate-alt-text",
      title: "Generate Alt Text with AccessAI",
      contexts: ["image"]
    });
  }
}

// 4. Handle the right-click menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "simplify-text" && info.selectionText) {
    handleTextSimplification(info.selectionText, tab.id);
  }
  if (info.menuItemId === "generate-alt-text" && info.srcUrl) {
    handleImageDescription(info.srcUrl, tab.id);
  }
});

// 5. Helper to notify content scripts when settings change
function notifyTabsOfSettingsUpdate(settings) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id && tab.url && !tab.url.startsWith("chrome://")) { 
        chrome.tabs.sendMessage(tab.id, { 
          action: 'settingsUpdated', 
          settings: settings 
        }).catch(err => console.log(`AccessAI: Could not send to tab ${tab.id}: ${err.message}`));
      }
    });
  });
}

// 6. Helper to update settings (called by AI)
async function updateSettings(newSettings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ extensionSettings: newSettings }, () => {
      notifyTabsOfSettingsUpdate(newSettings);
      updateContextMenus(newSettings); // Update menus on change
      // Also notify the popup/chatbot UI
      chrome.runtime.sendMessage({ action: 'settingsUpdated', settings: newSettings }).catch(err => console.log(`AccessAI: ${err.message}`));
      resolve();
    });
  });
}

// 7. --- UPDATED AI Chatbot "Brain" ---
async function handleAIChat(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  // Get current settings
  const result = await chrome.storage.local.get(['extensionSettings']);
  let settings = result.extensionSettings || defaultSettings;
  
  // --- Step 1: Check for Problem Recommendations ---
  
  if (lowerPrompt.includes('dizzy') || lowerPrompt.includes('motion') || lowerPrompt.includes('animations')) {
    return handleAIChat("turn on motion blocker");
  }
  if (lowerPrompt.includes('distracted') || lowerPrompt.includes('ads') || lowerPrompt.includes('clutter')) {
    return handleAIChat("turn on focus mode");
  }
  if (lowerPrompt.includes('hard to read') || lowerPrompt.includes('words are confusing')) {
     return handleAIChat("turn on simplifier");
  }
  if (lowerPrompt.includes('hard to click') || lowerPrompt.includes('buttons are small')) {
     return handleAIChat("turn on larger targets");
  }
  if (lowerPrompt.includes('lose my place') || lowerPrompt.includes('follow along') || lowerPrompt.includes('read to me')) {
     return handleAIChat("turn on read aloud");
  }
  if (lowerPrompt.includes('cant use mouse') || lowerPrompt.includes('use my voice')) {
     return handleAIChat("turn on voice commands");
  }
  // --- NEW AI FONT COMMANDS ---
  if (lowerPrompt.includes('text is small') || lowerPrompt.includes('font size bigger') || lowerPrompt.includes('make text larger')) {
     return handleAIChat("increase font size");
  }
  if (lowerPrompt.includes('text is too big') || lowerPrompt.includes('font size smaller') || lowerPrompt.includes('make text smaller')) {
     return handleAIChat("decrease font size");
  }
  if (lowerPrompt.includes('dyslexia') || lowerPrompt.includes('opendyslexic')) {
     return handleAIChat("set font style to opendyslexic");
  }

  // --- Step 2: Check for Direct Commands ("Tool Calling") ---
  let commandResponse = null;

  // --- NEW FONT COMMANDS ---
  if (lowerPrompt.startsWith('increase font size')) {
    settings.visual.fontSize = Math.min(300, (settings.visual.fontSize || 100) + 25);
    await updateSettings(settings);
    commandResponse = `Okay, I've increased the font size to ${settings.visual.fontSize}%.`;
  } else if (lowerPrompt.startsWith('decrease font size')) {
    settings.visual.fontSize = Math.max(50, (settings.visual.fontSize || 100) - 25);
    await updateSettings(settings);
    commandResponse = `Okay, I've decreased the font size to ${settings.visual.fontSize}%.`;
  } else if (lowerPrompt.includes('font size')) {
     const sizeMatch = lowerPrompt.match(/(\d+)\s*%/);
     if (sizeMatch && sizeMatch[1]) {
        const size = Math.max(50, Math.min(300, parseInt(sizeMatch[1], 10)));
        settings.visual.fontSize = size;
        await updateSettings(settings);
        commandResponse = `I've set the font size to ${size}%.`;
     }
  } else if (lowerPrompt.includes('font style')) {
     if (lowerPrompt.includes('opendyslexic')) {
        settings.visual.fontStyle = 'opendyslexic';
        await updateSettings(settings);
        commandResponse = "I've enabled the OpenDyslexic font for you.";
     } else if (lowerPrompt.includes('readable') || lowerPrompt.includes('sans-serif')) {
        settings.visual.fontStyle = 'readable';
        await updateSettings(settings);
        commandResponse = "Switching to a readable sans-serif font.";
     } else if (lowerPrompt.includes('default') || lowerPrompt.includes('reset')) {
        settings.visual.fontStyle = 'default';
        await updateSettings(settings);
        commandResponse = "I've reset the font style to the page default.";
     }
  }
  // --- END NEW FONT COMMANDS ---

  else if (lowerPrompt.includes('focus mode')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.cognitive = { ...settings.cognitive, focusMode: enable };
    await updateSettings(settings);
    commandResponse = enable ? "I've enabled Focus Mode for you." : "I've disabled Focus Mode.";
  } else if (lowerPrompt.includes('simplifier')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.cognitive = { ...settings.cognitive, simplifier: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Okay, the Text Simplifier is on. Right-click selected text to use it." : "Text Simplifier is now off.";
  } else if (lowerPrompt.includes('motion blocker') || lowerPrompt.includes('animation')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.visual = { ...settings.visual, motionBlocker: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Done. Motion Blocker is now active." : "Motion Blocker is disabled.";
  } else if (lowerPrompt.includes('larger targets') || lowerPrompt.includes('bigger buttons')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.motor = { ...settings.motor, largerTargets: enable };
    await updateSettings(settings);
    commandResponse = enable ? "I've turned on Larger Click Targets." : "Larger Click Targets are now off.";
  } 
  // ... (other commands remain the same) ...
  
  if (commandResponse) {
    return { response: commandResponse, settings: settings };
  }
  
  // --- Step 3: Fallback to Proxy Server ---
  try {
    const response = await fetch("http://localhost:3001/api/chat", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt })
    });
    
    if (!response.ok) {
      throw new Error(`Proxy server error: ${response.status} ${response.statusText}. Please check your proxy server at http://localhost:3001.`);
    }
    
    const data = await response.json();
    return { response: data.text, settings: settings };

  } catch (error) {
    console.error("Chat Error:", error.message);
    if (error.message.includes('Failed to fetch')) {
      return { response: "Sorry, I can't connect to the AI. Is the local proxy server at http://localhost:3001 running?", settings: settings };
    }
    return { response: `Sorry, I'm having trouble connecting to the AI. ${error.message}`, settings: settings };
  }
}

// 8. Handle Text Simplification
// ... (This function remains the same as before) ...
async function handleTextSimplification(text, tabId) {
  try {
    const response = await fetch("http://localhost:3001/api/chat", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Please simplify the following text:\n\n"${text}"`
      })
    });
    
    if (!response.ok) {
      throw new Error(`Proxy server error: ${response.status} ${response.statusText}.`);
    }

    const data = await response.json();
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { 
        action: 'simplifiedTextResponse', 
        text: data.text 
      }).catch(err => console.log(`AccessAI: Could not send to tab ${tabId}: ${err.message}`));
    }
  } catch (error) {
    // ... (error handling)
  }
}


// 9. Handle Image Description (Alt Text)
// ... (This function remains the same as before) ...
async function handleImageDescription(srcUrl, tabId) {
  try {
    const response = await fetch("http://localhost:3001/api/chat", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `You are an AI assistant specializing in accessibility. 
                 Describe the following image in a single, concise sentence for use as alt text.
                 Image URL: ${srcUrl}`
      })
    });
    
    if (!response.ok) {
      throw new Error(`Proxy server error: ${response.status} ${response.statusText}.`);
    }

    const data = await response.json();
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { 
        action: 'altTextResponse', 
        text: data.text,
        srcUrl: srcUrl
      }).catch(err => console.log(`AccessAI: Could not send to tab ${tabId}: ${err.message}`));
    }
  } catch (error) {
    // ... (error handling)
  }
}
