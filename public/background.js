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
  cognitive: { simplifier: false, focusMode: false, chatbotEnabled: true },
  visual: { 
    contrast: 100, 
    motionBlocker: false, 
    altTextGenerator: false, // NEW
    readAloud: false        // NEW
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

  // Create the right-click menu items
  chrome.contextMenus.create({
    id: "simplify-text",
    title: "Simplify Text with AccessAI",
    contexts: ["selection"] // Only show when text is selected
  });

  // --- NEW: Context menu for Alt Text ---
  chrome.contextMenus.create({
    id: "generate-alt-text",
    title: "Generate Alt Text with AccessAI",
    contexts: ["image"] // Only show for images
  });
});

// 3. Handle the right-click menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "simplify-text" && info.selectionText) {
    handleTextSimplification(info.selectionText, tab.id);
  }

  // --- NEW: Handle Alt Text click ---
  if (info.menuItemId === "generate-alt-text" && info.srcUrl) {
    // Check settings before running
    chrome.storage.local.get(['extensionSettings'], (result) => {
      if (result.extensionSettings && result.extensionSettings.enabled && result.extensionSettings.visual?.altTextGenerator) {
        handleImageDescription(info.srcUrl, tab.id);
      } else {
        console.log("AccessAI: Alt Text Generator is disabled in settings.");
      }
    });
  }
});

// 4. Helper to notify content scripts when settings change
function notifyTabsOfSettingsUpdate(settings) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id && tab.url && !tab.url.startsWith("chrome://")) { // Avoid restricted chrome pages
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
      // Also notify the popup/chatbot UI
      chrome.runtime.sendMessage({ action: 'settingsUpdated', settings: newSettings }).catch(err => console.log(`AccessAI: ${err.message}`));
      resolve();
    });
  });
}

// 6. AI CHATBOT "BACKEND" LOGIC
async function handleAIChat(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  // Get current settings
  const result = await chrome.storage.local.get(['extensionSettings']);
  let settings = result.extensionSettings || defaultSettings;

  // "Tool Calling" - Check if the prompt is a command
  let commandResponse = null;

  if (lowerPrompt.includes('focus mode')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.cognitive = { ...settings.cognitive, focusMode: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Focus Mode has been enabled." : "Focus Mode has been disabled.";
  
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
    commandResponse = enable ? "Voice Commands are now enabled. Try saying 'Scroll down'!" : "Voice Commands are now disabled.";
  
  // --- NEW: Chat commands for new features ---
  } else if (lowerPrompt.includes('read aloud') || lowerPrompt.includes('read this')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.visual = { ...settings.visual, readAloud: enable };
    await updateSettings(settings);
    commandResponse = enable ? "Spatial Read-Aloud is now on. Click on a paragraph to hear it." : "Spatial Read-Aloud is off.";
  
  } else if (lowerPrompt.includes('alt text') || lowerPrompt.includes('describe images')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.visual = { ...settings.visual, altTextGenerator: enable };
    await updateSettings(settings);
    commandResponse = enable ? "AI Alt Text generator is now on. Right-click an image to use it." : "AI Alt Text generator is off.";
  
  } else if (lowerPrompt.includes('contrast')) {
    const enable = !lowerPrompt.includes('disable') && !lowerPrompt.includes('turn off');
    settings.visual = { ...settings.visual, contrast: enable ? 150 : 100 }; // Set to 150% or default 100%
    await updateSettings(settings);
    commandResponse = enable ? "Contrast has been increased." : "Contrast has been reset to default.";
  // --- END NEW COMMANDS ---

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

  // "Text Generation" - Call your new proxy server
  try {
    const response = await fetch("http://localhost:3001/api/chat", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt 
      })
    });

    if (!response.ok) {
      throw new Error(`Proxy server error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return { response: data.text, settings: settings };

  } catch (error) {
    console.error("Chat Error:", error.message);
    if (error.message.includes('Failed to fetch')) {
      return { response: "Sorry, I can't connect to the AI. Is the local proxy server running?", settings: settings };
    }
    return { response: "Sorry, I'm having trouble connecting to the AI. Please try again later.", settings: settings };
  }
}

// 7. Handle Text Simplification
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
      throw new Error(`Proxy server error: ${response.statusText}`);
    }

    const data = await response.json();
    const simplifiedText = data.text;

    if (tabId) {
      chrome.tabs.sendMessage(tabId, { 
        action: 'simplifiedTextResponse', 
        text: simplifiedText 
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

// 8. --- NEW: Handle Image Description (Alt Text) ---
async function handleImageDescription(srcUrl, tabId) {
  try {
    // We use the same chat endpoint and a prompt that asks Gemini to describe an image from a URL.
    // This assumes your proxy server is configured to handle such a prompt.
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
      throw new Error(`Proxy server error: ${response.statusText}`);
    }

    const data = await response.json();
    const altText = data.text;

    // Send the generated alt text back to the content script
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { 
        action: 'altTextResponse', 
        text: altText,
        srcUrl: srcUrl // Send the URL back so the content script can find the image
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
