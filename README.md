# Polyquery - Multi-Model AI Response Comparison

A modern web application for comparing responses from multiple AI models side-by-side using free APIs.

## Features

- **Multiple AI Models**: ChatGPT, Claude, Gemini, Grok (via Groq), and Midjourney (via Pollinations.ai)
- **Side-by-Side Comparison**: View responses from multiple models in a clean grid layout
- **Free APIs**: All models use free API providers
- **Real-time Responses**: Asynchronous processing with live updates

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure API Keys**
   - Copy `.env` and add your Groq API key:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```

3. **Start Server**
   ```bash
   npm start
   ```

4. **Open Browser**
   - Navigate to `http://localhost:3000`

## Project Structure

```
polyquery/
├── public/           # Frontend files
│   ├── index.html   # Main HTML
│   ├── script.js    # Frontend logic
│   └── styles.css   # Styling
├── polyquery_backend.js  # Backend API
├── server.js        # Server entry point
├── package.json     # Dependencies
└── .env            # Configuration
```

## API Models

- **ChatGPT** → Groq Llama 3 70B
- **Claude** → Groq Mixtral 8x7B
- **Gemini** → Groq Gemma 7B
- **Grok** → Groq Llama 3 8B
- **Midjourney** → Pollinations.ai (image generation)

## Usage

1. Select one or more models from the sidebar
2. Enter your prompt
3. Click Send
4. View responses in tabs or click the Side-by-Side button for grid view
