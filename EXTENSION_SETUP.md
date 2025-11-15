# AccessAI Chrome Extension Setup

This project is built as a Chrome extension for accessibility. Follow these steps to test and use it.

## Development Setup

1. **Build the extension:**
   ```bash
   npm run build
   ```

2. **Load the extension in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

3. **Test the extension:**
   - Click the AccessAI icon in your Chrome toolbar
   - Complete the onboarding flow
   - Try enabling different accessibility features
   - Visit any website to see the features in action

## Project Structure

```
src/
├── pages/
│   ├── Index.tsx          # Main dashboard (accessible via chrome-extension://...)
│   ├── Onboarding.tsx     # First-time setup
│   ├── Settings.tsx       # Full settings page
│   └── Popup.tsx          # Extension popup (when clicking icon)
├── components/            # Reusable UI components
└── assets/               # Images and icons

public/
├── manifest.json         # Extension configuration
├── background.js         # Background service worker
├── content.js           # Scripts injected into web pages
├── content.css          # Styles for content scripts
└── icon*.png            # Extension icons
```

## Features Status

### ✅ Implemented (Proof of Concept)
- Onboarding flow with accessibility need selection
- Settings management and storage
- Extension popup with quick controls
- Basic Focus Mode (fades distractions)
- Motion Blocker (reduces animations)
- Contrast Control
- Larger Click Targets

### 🚧 Coming Soon (Requires AI Integration)
- AI Chatbot for feature assistance
- Text Simplifier (AI-powered rewriting)
- Alt Text Generator (AI vision)
- Spatial Read-Aloud with highlighting
- Voice Commands
- Gesture Controls

## Next Steps for Full Implementation

1. **Connect to Lovable Cloud** for backend AI features
2. **Integrate AI models** for:
   - Text simplification (GPT-4)
   - Alt text generation (Vision API)
   - Chatbot assistance
3. **Add voice recognition** for motor assistance
4. **Implement gesture detection** system
5. **Build analytics** to track feature usage

## Testing Tips

- Test on various websites to see how features adapt
- Try toggling features on/off in real-time
- Check the browser console for any errors
- Test with keyboard-only navigation
- Verify WCAG compliance of the UI itself

## Browser Compatibility

Currently optimized for:
- ✅ Google Chrome (Manifest V3)
- 🔄 Microsoft Edge (should work with same code)
- ❌ Firefox (requires Manifest V2 adaptation)
- ❌ Safari (requires different extension format)
