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
    fontSize: 100,
    fontStyle: 'default'
  },
  motor: { largerTargets: false, buttonTargeting: false, voiceCommands: false, gestureControls: false }
};

// 2. Open onboarding, set defaults, and create context menu on install
// ... (This function remains the same as before) ...
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html#/onboarding') });
    chrome.storage.local.set({ extensionSettings: defaultSettings });
    chrome.storage.local.set({ onboardingComplete: false });
  }
  chrome.storage.local.get(['extensionSettings'], (result) => {
    updateContextMenus(result.extensionSettings || defaultSettings);
  });
});


// 3. Helper to create/remove context menus based on settings
// ... (This function remains the same as before) ...
function updateContextMenus(settings) {
  chrome.contextMenus.removeAll();
  if (!settings || !settings.enabled) return;
  if (settings.cognitive?.simplifier) {
    chrome.contextMenus.create({
      id: "simplify-text",
      title: "Simplify Text with AccessAI",
      contexts: ["selection"]
    });
  }
  if (settings.visual?.altTextGenerator) {
    chrome.contextMenus.create({
      id: "generate-alt-text",
      title: "Generate Alt Text with AccessAI",
      contexts: ["image"]
    });
  }
}

// 4. Handle the right-click menu click
// ... (This function remains the same as before) ...
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "simplify-text" && info.selectionText) {
    handleTextSimplification(info.selectionText, tab.id);
  }
  if (info.menuItemId === "generate-alt-text" && info.srcUrl) {
    handleImageDescription(info.srcUrl, tab.id);
  }
});

// 5. Helper to notify content scripts when settings change
// ... (This function remains the same as before) ...
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
// ... (This function remains the same as before) ...
async function updateSettings(newSettings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ extensionSettings: newSettings }, () => {
      notifyTabsOfSettingsUpdate(newSettings);
      updateContextMenus(newSettings);
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
  if (lowerPrompt.includes('text is small') || lowerPrompt.includes('font size bigger') || lowerPrompt.includes('make text larger')) {
     return handleAIChat("increase font size");
  }
  if (lowerPrompt.includes('text is too big') || lowerPrompt.includes('font size smaller') || lowerPrompt.includes('make text smaller')) {
     return handleAIChat("decrease font size");
  }
  
  // --- Step 2: Check for Direct Commands ("Tool Calling") ---
  let commandResponse = null;

  // --- NEW FONT COMMANDS (Data-driven) ---
  const fontCommandMap = {
    'roboto': 'roboto',
    'open sans': 'opensans',
    'lato': 'lato',
    'montserrat': 'montserrat',
    'noto sans': 'notosans',
    'merriweather': 'merriweather',
    'lora': 'lora',
    'inter': 'inter',
    'poppins': 'poppins',
    'source sans': 'sourcesans',
    'opendyslexic': 'opendyslexic'
  };

  // Check for font style commands
  for (const name in fontCommandMap) {
    if (lowerPrompt.includes(name)) {
      const styleValue = fontCommandMap[name];
      settings.visual.fontStyle = styleValue;
      await updateSettings(settings);
      // Capitalize font name for response
      const readableName = name.split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
      commandResponse = `I've set the font to ${readableName}.`;
      return { response: commandResponse, settings: settings };
    }
  }
  if (lowerPrompt.includes('reset font') || lowerPrompt.includes('default font')) {
    return handleAIChat("set font style to default");
  }

  // Check for font size commands
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
  } else if (lowerPrompt.includes('set font style to default')) {
      settings.visual.fontStyle = 'default';
      await updateSettings(settings);
      commandResponse = "I've reset the font style to the page default.";
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
  } 
  // ... (other commands remain the same: motion blocker, larger targets, etc.) ...
  else if (lowerPrompt.includes('motion blocker') || lowerPrompt.includes('animation')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.visual = { ...settings.visual, motionBlocker: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Done. Motion Blocker is now active." : "Motion Blocker is now off.";
  } else if (lowerPrompt.includes('larger targets') || lowerPrompt.includes('bigger buttons')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.motor = { ...settings.motor, largerTargets: enable };
    await updateSettings(settings);
    commandResponse = enable ? "I've turned on Larger Click Targets." : "Larger Click Targets are now off.";
  } else if (lowerPrompt.includes('button targeting') || lowerPrompt.includes('cursor guide')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.motor = { ...settings.motor, buttonTargeting: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Button Targeting is now on." : "Button Targeting is now off.";
  } else if (lowerPrompt.includes('voice command')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.motor = { ...settings.motor, voiceCommands: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Voice Commands are enabled. You can now say things like 'scroll down'." : "Voice Commands are disabled.";
  } else if (lowerPrompt.includes('read aloud')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.visual = { ...settings.visual, readAloud: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Spatial Read-Aloud is on. Click on a paragraph to hear it." : "Spatial Read-Aloud is off.";
  } else if (lowerPrompt.includes('alt text')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.visual = { ...settings.visual, altTextGenerator: enable };
    await updateSettings(settings);
    commandResponse = enable ? "AI Alt Text generator is on. Right-click an image to use it." : "AI Alt Text generator is off.";
  } else if (lowerPrompt.includes('contrast')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.visual = { ...settings.visual, contrast: enable ? 150 : 100 };
    await updateSettings(settings);
    commandResponse = enable ? "I've increased the page contrast." : "I've reset the contrast to default.";
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
    console.error("Simplification Error:", error.message);
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        action: 'simplifiedTextResponse',
        text: `Error simplifying text: ${error.message}`
      }).catch(err => console.log(`AccessAI: Could not send to tab ${tabId}: ${err.message}`));
    }
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
