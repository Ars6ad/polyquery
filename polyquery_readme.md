# Polyquery - Multi-Model AI Comparison Tool

Compare responses from multiple AI models side-by-side. Get insights on consensus, conflicts, and quality metrics.

## 🚀 Features

- **Multi-Model Comparison**: Compare GPT-4o, Claude 3.5 Sonnet, Llama 3, and more
- **Real-time Metrics**: Latency, cost, and quality scores
- **Smart Analysis**: Automatic detection of consensus and conflicts
- **Beautiful UI**: Modern dark theme with smooth animations
- **History Tracking**: Save and revisit past comparisons

## 📁 Project Structure

```
polyquery/
├── public/
│   ├── index.html          # Frontend HTML
│   ├── styles.css          # Frontend CSS
│   └── app.js              # Frontend JavaScript
├── server.js               # Backend server
├── package.json            # Dependencies
├── .env                    # Environment variables
└── README.md              # This file
```

## 🛠️ Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- API keys for the models you want to use

### Step 1: Clone/Create Project

```bash
mkdir polyquery
cd polyquery
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web server framework
- `cors` - Enable cross-origin requests
- `axios` - HTTP client for API calls
- `dotenv` - Environment variable management
- `nodemon` - Development auto-reload (dev dependency)

### Step 3: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
PORT=3000
NODE_ENV=development

# Add your API keys here
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
TOGETHER_API_KEY=your-together-api-key
```

**Get API Keys:**
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/
- Together AI (for Llama): https://api.together.xyz/

### Step 4: Setup Frontend Files

Create a `public` folder and add these files:
- `index.html` (from artifact)
- `styles.css` (from artifact)
- `app.js` (from artifact)

```bash
mkdir public
# Copy the HTML, CSS, and JS files into the public folder
```

### Step 5: Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000`

## 🎯 Usage

1. **Open Browser**: Navigate to `http://localhost:3000`

2. **Select Models**: Click the models icon in the sidebar to choose which AI models to compare

3. **Enter Prompt**: Type your question or prompt in the input field

4. **View Results**: See responses from all selected models with metrics and analysis

5. **Compare**: Review consensus highlights and conflicts between models

6. **Compile**: Click the merge icon to create a consolidated answer

## 📡 API Endpoints

### Compare Models
```bash
POST /api/compare
Content-Type: application/json

{
  "prompt": "Explain quantum computing",
  "models": ["gpt-4o", "claude-3.5-sonnet", "llama-3"],
  "temperature": 0.7
}
```

### Get Comparison
```bash
GET /api/comparisons/:id
```

### Get All Comparisons
```bash
GET /api/comparisons
```

### Check Status
```bash
GET /api/comparisons/:id/status
```

### Search Comparisons
```bash
GET /api/search?query=quantum
```

### Health Check
```bash
GET /api/health
```

## 🔧 Configuration

### Adding New Models

Edit `server.js` and add to `MODEL_CONFIGS`:

```javascript
'new-model': {
    endpoint: 'https://api.example.com/v1/chat',
    apiKey: process.env.NEW_MODEL_API_KEY,
    model: 'model-name',
    headers: (apiKey) => ({
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    })
}
```

### Adjusting Pricing

Update the `calculateCost` function in `server.js`:

```javascript
const pricing = {
    'your-model': { 
        input: 0.001 / 1000,   // per token
        output: 0.002 / 1000 
    }
};
```

## 🐛 Troubleshooting

### Models Not Responding
- Check API keys in `.env` file
- Verify API key permissions
- Check API rate limits
- Review server logs for errors

### CORS Errors
- Ensure frontend is served from the same domain
- Check CORS configuration in `server.js`

### Port Already in Use
```bash
# Change port in .env file
PORT=3001
```

## 📦 Deployment

### Option 1: Traditional Hosting

1. Set environment variables on server
2. Build and upload files
3. Start with `npm start`
4. Use process manager like PM2:

```bash
npm install -g pm2
pm2 start server.js --name polyquery
```

### Option 2: Docker

Create `Dockerfile`:

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t polyquery .
docker run -p 3000:3000 --env-file .env polyquery
```

### Option 3: Cloud Platforms

- **Heroku**: Add `Procfile` with `web: node server.js`
- **Railway**: Connect GitHub repo and set environment variables
- **Vercel**: Deploy as serverless functions
- **AWS/GCP**: Use Elastic Beanstalk or App Engine

## 🔒 Security Notes

- Never commit `.env` file to git
- Add `.env` to `.gitignore`
- Use environment variables for all secrets
- Implement rate limiting in production
- Add authentication for multi-user deployments
- Validate and sanitize all inputs

## 📝 License

MIT License - feel free to use for personal or commercial projects

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 💡 Future Enhancements

- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] User authentication
- [ ] Save/share comparisons
- [ ] Custom model parameters
- [ ] Export results (PDF/JSON)
- [ ] Webhooks for completion notifications
- [ ] Real-time streaming responses
- [ ] Batch comparisons
- [ ] Advanced analytics dashboard

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check the API documentation
- Review server logs: `tail -f logs/server.log`

---

Built with ❤️ using Node.js, Express, and Modern JavaScript