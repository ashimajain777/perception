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
  visual: { contrast: 100, motionBlocker: false, altTextGenerator: false, readAloud: false },
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

  // Create Simplifier menu ONLY if enabled
  if (settings.enabled && settings.cognitive?.simplifier) {
    chrome.contextMenus.create({
      id: "simplify-text",
      title: "Simplify Text with AccessAI",
      contexts: ["selection"]
    });
  }

  // Create Alt Text menu ONLY if enabled
  if (settings.enabled && settings.visual?.altTextGenerator) {
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

// 7. --- MODIFIED: AI Chatbot "Brain" ---
// This function now handles:
// 1. Follow-up actions (like "yes" to a recommendation)
// 2. Direct commands (like "turn on focus mode")
// 3. Problem recommendations (like "I get dizzy")
// 4. Generic chat (fallback to proxy)
async function handleAIChat(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  // Get current settings
  const result = await chrome.storage.local.get(['extensionSettings']);
  let settings = result.extensionSettings || defaultSettings;
  
  // --- Step 1: Check for follow-up commands ---
  const session = await chrome.storage.session.get(['pendingAction']);
  const pendingAction = session.pendingAction;

  if (pendingAction) {
    // User said "yes" to our recommendation
    if (lowerPrompt === 'yes' || lowerPrompt === 'ok' || lowerPrompt.includes('yes please')) {
      await chrome.storage.session.remove('pendingAction'); // Clear the action
      // The pendingAction *is* the command we need to run.
      // We re-run handleAIChat with the command.
      return handleAIChat(pendingAction.command);
    }
    // User said "no"
    if (lowerPrompt === 'no' || lowerPrompt === 'no thanks' || lowerPrompt.includes("don't")) {
      await chrome.storage.session.remove('pendingAction');
      return { response: "Okay, I won't change anything. Let me know if you need help with anything else!", settings: settings };
    }
  }

  // --- Step 2: Check for Direct Commands ("Tool Calling") ---
  // This section handles direct toggles
  let commandResponse = null;

  if (lowerPrompt.includes('focus mode')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.cognitive = { ...settings.cognitive, focusMode: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Focus Mode has been enabled." : "Focus Mode has been disabled.";
  } else if (lowerPrompt.includes('simplifier')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.cognitive = { ...settings.cognitive, simplifier: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Text Simplifier is now on. Right-click selected text to use it." : "Text Simplifier is off.";
  } else if (lowerPrompt.includes('motion blocker') || lowerPrompt.includes('animation')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.visual = { ...settings.visual, motionBlocker: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Motion Blocker is now active." : "Motion Blocker is now off.";
  } else if (lowerPrompt.includes('larger targets') || lowerPrompt.includes('bigger buttons')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.motor = { ...settings.motor, largerTargets: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Larger click targets are on." : "Larger click targets are off.";
  } else if (lowerPrompt.includes('button targeting') || lowerPrompt.includes('cursor guide')) {
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
  
  // --- Step 3: Check for Problem Recommendations ---
  // This section handles understanding user problems.
  
  if (lowerPrompt.includes('dizzy') || lowerPrompt.includes('motion') || lowerPrompt.includes('animations') || lowerPrompt.includes('moving too fast')) {
    await chrome.storage.session.set({ pendingAction: { command: "turn on motion blocker" } });
    return { response: "It sounds like all the motion might be bothering you. I can enable the 'Motion Blocker' to pause animations. Would you like me to do that?", settings: settings };
  }
  
  if (lowerPrompt.includes('distracted') || lowerPrompt.includes('ads') || lowerPrompt.includes('sidebar') || lowerPrompt.includes('too much clutter')) {
    await chrome.storage.session.set({ pendingAction: { command: "turn on focus mode" } });
    return { response: "It sounds like there are a lot of distractions on the page. I can enable 'Focus Mode' to fade out ads and sidebars. Would you like me to do that?", settings: settings };
  }
  
  if (lowerPrompt.includes('hard to read') || lowerPrompt.includes('text is small') || lowerPrompt.includes('words are confusing')) {
     await chrome.storage.session.set({ pendingAction: { command: "turn on simplifier" } });
     return { response: "It sounds like the text is hard to read. I can enable the 'Text Simplifier' so you can right-click text to make it simpler. Would you like me to do that?", settings: settings };
  }
  
  if (lowerPrompt.includes('hard to click') || lowerPrompt.includes('buttons are small') || lowerPrompt.includes('keep missing')) {
     await chrome.storage.session.set({ pendingAction: { command: "turn on larger targets" } });
     return { response: "It sounds like the buttons might be too small. I can enable 'Larger Click Targets' to make them easier to click. Would you like me to do that?", settings: settings };
  }

  if (lowerPrompt.includes('lose my place') || lowerPrompt.includes('follow along') || lowerPrompt.includes('read to me')) {
     await chrome.storage.session.set({ pendingAction: { command: "turn on read aloud" } });
     return { response: "It sounds like it's hard to follow the text. I can enable 'Spatial Read-Aloud' which highlights words as they are read to you. Would you like me to do that?", settings: settings };
  }
  
  if (lowerPrompt.includes('cant use mouse') || lowerPrompt.includes('use my voice') || lowerPrompt.includes('speak to page')) {
     await chrome.storage.session.set({ pendingAction: { command: "turn on voice commands" } });
     return { response: "It sounds like you'd prefer to use your voice. I can enable 'Voice Commands' to let you control the page by speaking (e.g., 'scroll down'). Would you like me to do that?", settings: settings };
  }

  // --- Step 4: Fallback to Proxy Server ---
  // If no commands or problems are detected, just chat.
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
      throw new Error(`Proxy server error: ${response.status} ${response.statusText}. Please check your proxy server at http://localhost:3001.`);
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
      throw new Error(`Proxy server error: ${response.status} ${response.statusText}. Please check your proxy server at http://localhost:3001.`);
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
