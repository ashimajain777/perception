// public/background.js

// 1. Listen for messages from the UI (Settings page, Popup, Chatbot)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.local.get(['extensionSettings'], (result) => {
      sendResponse(result.extensionSettings || {});
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

// 2. Open onboarding page on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('index.html#/onboarding')
    });
    // Set default settings on install
    chrome.storage.local.set({ 
      extensionSettings: {
        enabled: true,
        cognitive: { simplifier: false, focusMode: false, chatbotEnabled: true },
        visual: { contrast: 100, motionBlocker: false, altTextGenerator: false, readAloud: false },
        motor: { largerTargets: false, voiceCommands: false, gestureControls: false }
      }
    });
  }
});

// 3. Helper to notify content scripts when settings change
function notifyTabsOfSettingsUpdate(settings) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id && tab.url && !tab.url.startsWith("chrome://")) { // Avoid restricted chrome pages
        chrome.tabs.sendMessage(tab.id, { 
          action: 'settingsUpdated', 
          settings: settings 
        }).catch(err => console.log(`Could not send to tab ${tab.id}: ${err.message}`));
      }
    });
  });
}

// 4. Helper to update settings (called by AI)
async function updateSettings(newSettings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ extensionSettings: newSettings }, () => {
      notifyTabsOfSettingsUpdate(newSettings);
      // Also notify the popup/chatbot UI
      chrome.runtime.sendMessage({ action: 'settingsUpdated', settings: newSettings }).catch(err => console.log(err.message));
      resolve();
    });
  });
}

// 5. AI CHATBOT "BACKEND" LOGIC
async function handleAIChat(prompt) {
  const lowerPrompt = prompt.toLowerCase();

  // Get current settings
  const result = await chrome.storage.local.get(['extensionSettings']);
  let settings = result.extensionSettings || {};

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

    // This 'data.text' must match what your server sends back
    return { response: data.text, settings: settings };

  } catch (error) {
    console.error("Chat Error:", error.message);
    if (error.message.includes('Failed to fetch')) {
      return { response: "Sorry, I can't connect to the AI. Is the local proxy server running?", settings: settings };
    }
    return { response: "Sorry, I'm having trouble connecting to the AI. Please try again later.", settings: settings };
  }
}
