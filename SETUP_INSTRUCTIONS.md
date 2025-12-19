# Polyquery Setup Instructions

## ✅ What Was Fixed

### Issues Found and Fixed:

1. **Frontend was showing static demo content** ❌ → ✅ Fixed
   - HTML had hardcoded Fibonacci example responses
   - Now shows empty state initially, updates dynamically with real API responses

2. **JavaScript wasn't properly connecting to backend** ❌ → ✅ Fixed
   - `displayResults()` function couldn't find elements properly
   - `displayMainResponse()` was using wrong selectors
   - Model switching didn't work
   - All fixed with proper element IDs and state management

3. **Initial state showed demo instead of empty** ❌ → ✅ Fixed
   - Now shows welcome message when no results
   - Properly hides/shows sections based on state

4. **Model selection defaulted to 3 models** ❌ → ✅ Fixed
   - Now defaults to just GPT-4o (minimal setup)
   - You can check/uncheck models as needed

5. **Missing .env file** ❌ → ✅ Created template
   - Created `.env.example` as template
   - You need to create `.env` file with your API key

## 🚀 Setup Steps (Do This Now)

### Step 1: Create `.env` File

Create a file named `.env` in the root directory (`C:\Users\Dudekula arshad\Downloads\polyquery\.env`) with this content:

```env
PORT=3000
NODE_ENV=development

# Replace with your actual ChatGPT API key
OPENAI_API_KEY=sk-your-actual-api-key-here
ANTHROPIC_API_KEY=
TOGETHER_API_KEY=
```

**To get your OpenAI API key:**
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key and paste it in `.env` file

### Step 2: Start the Server

Open a terminal in the project folder and run:

```bash
npm start
```

You should see:
```
🚀 Polyquery backend running on http://localhost:3000
📊 API endpoints available at http://localhost:3000/api
```

### Step 3: Open in Browser

1. Open your browser
2. Go to: `http://localhost:3000`
3. You should see the welcome screen (not demo content)

### Step 4: Test It

1. Make sure **GPT-4o** is checked in the model selector (left sidebar)
2. Type a question in the "Ask Polyquery" box at the bottom
3. Click the send button (up arrow)
4. You should see:
   - Loading spinner
   - Then real AI response from GPT-4o
   - Metrics (latency, cost, quality)

## 📋 What Each File Does

- **`server.js`** - Entry point, loads backend
- **`polyquery_backend.js`** - Main backend API server
- **`public/index.html`** - Frontend HTML (now dynamic, not static)
- **`public/script.js`** - Frontend JavaScript (connects to API)
- **`public/styles.css`** - Custom CSS styles
- **`.env`** - Your API keys (create this file!)

## 🔧 How It Works Now

1. **User types question** → Frontend sends POST to `/api/compare`
2. **Backend receives request** → Creates comparison entry, starts processing
3. **Backend calls AI APIs** → Gets responses from selected models
4. **Frontend polls status** → Checks `/api/comparisons/:id/status` every second
5. **When complete** → Frontend loads results and displays them
6. **User can switch models** → Click model tabs to see different responses

## ⚠️ Common Issues

### "Failed to submit comparison"
- Check if server is running (`npm start`)
- Check browser console (F12) for errors
- Verify API key is correct in `.env` file

### "Model not configured or API key missing"
- Make sure `.env` file exists
- Make sure `OPENAI_API_KEY` has your actual key (not "your_openai_api_key_here")
- Restart server after changing `.env`

### "CORS error" or "Network error"
- Make sure server is running on port 3000
- Check that you're accessing `http://localhost:3000` (not file://)

### Frontend shows demo content
- Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)
- Clear browser cache
- Make sure you're using the updated `index.html`

## 🎯 Next Steps

1. ✅ Create `.env` file with your API key
2. ✅ Start server with `npm start`
3. ✅ Open browser to `http://localhost:3000`
4. ✅ Test with a simple question
5. ✅ Add more models (Claude, Llama) if you have their API keys

## 💡 Tips

- **Start with just GPT-4o** - It's the easiest to set up
- **Check browser console** (F12) if something doesn't work - errors will show there
- **Server logs** will show API calls and any errors
- **Model tabs** at the top let you switch between different AI responses

---

**You're all set!** The frontend is now fully functional and connected to the backend. Just add your API key and you're ready to go! 🚀




