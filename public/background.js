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
    // This is the new chatbot backend logic (see Part 2)
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
  }
});

// 3. Helper to notify content scripts when settings change
function notifyTabsOfSettingsUpdate(settings) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
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

// --------------------------------------------------
// PART 2: AI CHATBOT "BACKEND" LOGIC
// --------------------------------------------------

async function handleAIChat(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  // 1. Get current settings
  const result = await chrome.storage.local.get(['extensionSettings']);
  let settings = result.extensionSettings || {};

  // 2. "Tool Calling" - Check if the prompt is a command
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

  // 3. "Text Generation" - No command found, call an external AI
  // This is a MOCK API call. Replace with your actual AI API (e.g., Gemini).
  try {
    // const API_KEY = "YOUR_GEMINI_API_KEY";
    // const response = await fetch(`https://api.example-ai.com/generate?prompt=${encodeURIComponent(prompt)}`, {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${API_KEY}` }
    // });
    // const data = await response.json();
    // return { response: data.text, settings: settings };

    // --- Mock Response (Remove after adding real API) ---
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    let mockResponse = "I'm not sure how to help with that. You can ask me to 'turn on focus mode' or 'disable animations'.";
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
      mockResponse = "Hello! How can I help you with your accessibility needs today?";
    } else if (lowerPrompt.includes('what can you do')) {
       mockResponse = "I can help you control your accessibility settings. Try asking me to 'turn on focus mode' or 'make buttons bigger'.";
    }
    return { response: mockResponse, settings: settings };
    // --- End Mock Response ---

  } catch (error) {
    console.error("AI API Error:", error);
    return { response: "Sorry, I'm having trouble connecting to the AI. Please try again later.", settings: settings };
  }
}
