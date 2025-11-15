# AccessAI - AI-Powered Accessibility Chrome Extension

A customizable Chrome extension that empowers users with disabilities to personalize and enhance their web experience through AI-driven accessibility tools.

![AccessAI Logo](src/assets/icon-large.png)

## Features

### 🧠 Cognitive Adaptation
- **AI Chatbot**: Maps user problems directly to feature toggles
- **Text Simplifier**: Rewrites complex paragraphs into simple sentences (Coming Soon)
- **Focus Mode**: Automatically fades out ads, sidebars, and distracting visuals

### 👁️ Visual Adaptation
- **Custom Contrast Control**: Adjustable contrast levels for better visibility
- **Motion Blocker**: Pauses or slows down all motion/flashing content
- **Visual Element Explainer**: AI-generated alt text for images (Coming Soon)
- **Spatial Read-Aloud**: Word-by-word reading highlight (Coming Soon)

### 🖐️ Motor Adaptation
- **Larger Click Targets**: Makes clickable areas larger and easier to interact with
- **Button Targeting**: Guides cursor to links and buttons
- **Voice Commands**: Control navigation with voice (Coming Soon)
- **Gesture Controls**: Use gestures for complex actions (Coming Soon)

## Installation for Development

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Project Structure

This is a React-based Chrome extension built with:
- **React** + **TypeScript** for UI components
- **Tailwind CSS** for styling
- **Vite** for building
- **shadcn/ui** for accessible UI components

See [EXTENSION_SETUP.md](EXTENSION_SETUP.md) for detailed setup instructions.

## How to Use

1. **First Install**: Complete the onboarding form to select your accessibility needs
2. **Access Settings**: Click the extension icon and go to Settings
3. **Enable Features**: Toggle the accessibility features you need
4. **Browse**: Visit any website and see your preferences in action

## Roadmap

- [x] Onboarding flow
- [x] Settings management
- [x] Focus Mode
- [x] Motion Blocker
- [x] Contrast Control
- [x] Larger Click Targets
- [ ] AI Chatbot integration
- [ ] Text Simplifier with GPT
- [ ] AI Alt Text Generator
- [ ] Spatial Read-Aloud
- [ ] Voice Commands
- [ ] Gesture Controls

## Technologies Used

- React 18
- TypeScript
- Tailwind CSS
- Chrome Extensions Manifest V3
- shadcn/ui components

## Contributing

This project is built on Lovable. To contribute or customize:
1. Visit the project on Lovable
2. Make changes through the AI or code editor
3. Test in Chrome using developer mode

## License

MIT License - See LICENSE file for details
