// public/background.js

// 1. Listen for messages from the UI (Settings page, Popup, Chatbot)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.local.get(['extensionSettings'], (result) => {
      // Return default settings if none are found
      sendResponse(result.extensionSettings || defaultSettings);
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'saveSettings') {
    chrome.storage.local.set({ extensionSettings: request.settings }, () => {
      sendResponse({ success: true });
      // After saving, notify all active tabs to update their styles
      notifyTabsOfSettingsUpdate(request.settings);
      // --- NEW: Update context menus based on settings ---
      updateContextMenus(request.settings);
    });
    return true;
  }
  
  if (request.action === 'askAI') {
    handleAIChat(request.prompt).then(sendResponse);
    return true; // Keep channel open for async response
  }
});

// --- SETTINGS (Defaults) ---
const defaultSettings = {
  enabled: true,
  cognitive: { 
    simplifier: false, // This is the switch for our feature
    focusMode: false, 
    chatbotEnabled: true 
  },
  visual: { 
    contrast: 100, 
    motionBlocker: false, 
    altTextGenerator: false,
    readAloud: false
  },
  motor: { 
    largerTargets: false, 
    buttonTargeting: false, 
    voiceCommands: false, 
    gestureControls: false 
  }
};

// 2. Open onboarding, set defaults, and create context menu on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open onboarding page
    chrome.tabs.create({
      url: chrome.runtime.getURL('index.html#/onboarding')
    });
    
    // Create default settings object in storage
    chrome.storage.local.set({ extensionSettings: defaultSettings });
    chrome.storage.local.set({ onboardingComplete: false });
  }

  // Create context menus based on default settings
  chrome.storage.local.get(['extensionSettings'], (result) => {
    updateContextMenus(result.extensionSettings || defaultSettings);
  });
});

// --- NEW: Helper to create/remove context menus based on settings ---
function updateContextMenus(settings) {
  // Remove all first to avoid duplicates
  chrome.contextMenus.removeAll();

  // Create Simplifier menu ONLY if enabled
  if (settings.enabled && settings.cognitive?.simplifier) {
    chrome.contextMenus.create({
      id: "simplify-text",
      title: "Simplify Text with AccessAI",
      contexts: ["selection"] // Only show when text is selected
    });
  }

  // Create Alt Text menu ONLY if enabled
  if (settings.enabled && settings.visual?.altTextGenerator) {
    chrome.contextMenus.create({
      id: "generate-alt-text",
      title: "Generate Alt Text with AccessAI",
      contexts: ["image"] // Only show for images
    });
  }
}

// 3. Handle the right-click menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // We no longer need to check settings here, because the menu
  // item wouldn't exist if the setting was disabled.
  if (info.menuItemId === "simplify-text" && info.selectionText) {
    handleTextSimplification(info.selectionText, tab.id);
  }

  if (info.menuItemId === "generate-alt-text" && info.srcUrl) {
    handleImageDescription(info.srcUrl, tab.id);
  }
});

// 4. Helper to notify content scripts when settings change
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

// 5. Helper to update settings (called by AI)
async function updateSettings(newSettings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ extensionSettings: newSettings }, () => {
      notifyTabsOfSettingsUpdate(newSettings);
      updateContextMenus(newSettings); // Update menus on change
      chrome.runtime.sendMessage({ action: 'settingsUpdated', settings: newSettings }).catch(err => console.log(`AccessAI: ${err.message}`));
      resolve();
    });
  });
}

// 6. AI CHATBOT "BACKEND" LOGIC
async function handleAIChat(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  const result = await chrome.storage.local.get(['extensionSettings']);
  let settings = result.extensionSettings || defaultSettings;

  let commandResponse = null;

  // --- FOCUS MODE COMMAND ---
  if (lowerPrompt.includes('focus mode')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.cognitive = { ...settings.cognitive, focusMode: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Focus Mode has been enabled." : "Focus Mode has been disabled.";
  
  // --- SIMPLIFIER COMMAND ---
  } else if (lowerPrompt.includes('simplifier') || lowerPrompt.includes('simple text')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.cognitive = { ...settings.cognitive, simplifier: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Text Simplifier is now on. Right-click selected text to use it." : "Text Simplifier is off.";

  } else if (lowerPrompt.includes('motion blocker')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.visual = { ...settings.visual, motionBlocker: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Motion Blocker is now active." : "Motion Blocker is now off.";
  
  } else if (lowerPrompt.includes('larger targets')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.motor = { ...settings.motor, largerTargets: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Larger click targets are on." : "Larger click targets are off.";
  
  } else if (lowerPrompt.includes('button targeting')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.motor = { ...settings.motor, buttonTargeting: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Button Targeting is now on." : "Button Targeting is now off.";
  
  } else if (lowerPrompt.includes('voice command')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.motor = { ...settings.motor, voiceCommands: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Voice Commands are now enabled." : "Voice Commands are now disabled.";
  
  } else if (lowerPrompt.includes('read aloud')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.visual = { ...settings.visual, readAloud: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Spatial Read-Aloud is now on." : "Spatial Read-Aloud is off.";
  
  } else if (lowerPrompt.includes('alt text')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.visual = { ...settings.visual, altTextGenerator: enable };
    await updateSettings(settings);
    commandResponse = enable ? "AI Alt Text generator is now on." : "AI Alt Text generator is off.";
  
  } else if (lowerPrompt.includes('contrast')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.visual = { ...settings.visual, contrast: enable ? 150 : 100 };
    await updateSettings(settings);
    commandResponse = enable ? "Contrast has been increased." : "Contrast has been reset to default.";

  } else if (lowerPrompt.includes('extension') && (lowerPrompt.includes('disable') || lowerPrompt.includes('turn off'))) {
    settings.enabled = false;
    await updateSettings(settings);
    commandResponse = "AccessAI extension has been disabled.";
  } else if (lowerPrompt.includes('extension') && (lowerPrompt.includes('enable') || lowerPrompt.includes('turn on'))) {
    settings.enabled = true;
    await updateSettings(settings);
    commandResponse = "AccessAI extension is now enabled.";
  }

  if (commandResponse) {
    return { response: commandResponse, settings: settings };
  }

  // "Text Generation" - Call your proxy server
  try {
    const response = await fetch("http://localhost:3001/api/chat", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt })
    });
    if (!response.ok) throw new Error(`Proxy server error: ${response.statusText}`);
    const data = await response.json();
    return { response: data.text, settings: settings };
  } catch (error) {
    console.error("Chat Error:", error.message);
    if (error.message.includes('Failed to fetch')) {
      return { response: "Sorry, I can't connect to the AI. Is the local proxy server running?", settings: settings };
    }
    return { response: "Sorry, I'm having trouble connecting to the AI.", settings: settings };
  }
}

// 7. Handle Text Simplification (This is the backend for the Simplifier feature)
async function handleTextSimplification(text, tabId) {
  try {
    const response = await fetch("http://localhost:3001/api/chat", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Please simplify the following text:\n\n"${text}"`
      })
    });
    if (!response.ok) throw new Error(`Proxy server error: ${response.statusText}`);
    const data = await response.json();
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { 
        action: 'simplifiedTextResponse', 
        text: data.text 
      }).catch(err => console.log(`AccessAI: Could not send to tab ${tabId}: ${err.message}`));
    }
  } catch (error) {
    console.error("Simplification Error:", error.message);
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        action: 'simplifiedTextResponse',
        text: `Error simplifying text: ${error.message}`
      }).catch(err => console.log(`AccessAI: Could not send to tab ${tabId}: ${err.message}`));
    }
  }
}

// 8. Handle Image Description (Alt Text)
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
    if (!response.ok) throw new Error(`Proxy server error: ${response.statusText}`);
    const data = await response.json();
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { 
        action: 'altTextResponse', 
        text: data.text,
        srcUrl: srcUrl
      }).catch(err => console.log(`AccessAI: Could not send to tab ${tabId}: ${err.message}`));
    }
  } catch (error) {
    console.error("Alt Text Error:", error.message);
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        action: 'altTextResponse',
        text: `Error generating alt text: ${error.message}`,
        srcUrl: srcUrl
      }).catch(err => console.log(`AccessAI: Could not send to tab ${tabId}: ${err.message}`));
    }
  }
}
