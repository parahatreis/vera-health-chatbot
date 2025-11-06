# Vera Health Chatbot

A React Native chatbot app built with Expo Router featuring real-time SSE streaming for clinical questions.

## Features


## Project Structure

```
app/
  _layout.tsx           # Root layout with Stack navigation
  index.tsx             # Main chatbot screen

components/
  header.tsx            # Question row + status chip
  composer.tsx          # Input field with icons
  floating-stop.tsx     # Cancel button (visible during streaming)
  error-banner.tsx      # Inline error display with retry

hooks/
  use-chatbot-state.ts  # Core state management & SSE connection
  use-color-scheme.ts   # Color scheme detection

constants/
  theme.ts              # Colors, spacing, typography tokens
```

## Getting Started

1. **Install dependencies**

   ```bash
   yarn install
   ```

2. **Start the app**

   ```bash
   yarn start
   ```

   Then press:
   - `i` for iOS simulator
   - `a` for Android emulator
   - `w` for web

3. **Run on specific platform**

   ```bash
   yarn ios
   yarn android
   yarn web
   ```

## Usage

1. Type a clinical question in the composer at the bottom
2. Press Return/Send to submit
3. Watch the live streaming response appear
4. Tap **Stop** to cancel mid-stream (idempotent)
5. Question header can be collapsed/expanded via chevron
