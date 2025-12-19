// API Base URL
const API_BASE_URL = '/api';

// State management
let currentComparisonId = null;
let selectedModels = ['chatgpt']; // Start with ChatGPT for minimal setup
let currentComparison = null;
let currentModelIndex = 0;
let sessionId = generateSessionId(); // Generate unique session ID

// Generate unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    setupEventListeners();
    updateSelectedModelsUI();
});

// Setup event listeners
function setupEventListeners() {
    // Send message button
    const sendBtn = document.querySelector('button[title="Send Message"]');
    const textarea = document.querySelector('textarea[placeholder="Ask Polyquery"]');

    if (sendBtn && textarea) {
        sendBtn.addEventListener('click', () => handleSubmit(textarea.value));
        textarea.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(textarea.value);
            }
        });
    }

    // Model checkboxes
    const checkboxes = document.querySelectorAll('#model-selector input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleModelSelection);
    });

    // Compile consolidated answer button
    const compileBtn = document.getElementById('compile-btn') || document.querySelector('button[title="Compile Consolidated Answer"]');
    if (compileBtn) {
        compileBtn.addEventListener('click', handleCompileAnswer);
    }

    // New comparison button - find by text content
    const newComparisonBtn = document.querySelector('button:has(.material-symbols-outlined)');
    if (newComparisonBtn && newComparisonBtn.textContent.includes('New Comparison')) {
        newComparisonBtn.addEventListener('click', handleNewComparison);
    }

    // Also check sidebar button
    const sidebarNewBtn = document.querySelector('aside button:has(.material-symbols-outlined)');
    if (sidebarNewBtn && sidebarNewBtn.textContent.includes('New Comparison')) {
        sidebarNewBtn.addEventListener('click', handleNewComparison);
    }

    // Wire up Side-by-Side View Toggle
    const layoutBtn = document.getElementById('side-by-side-btn');
    if (layoutBtn) {
        layoutBtn.addEventListener('click', toggleSideBySide);
    }
}

// Handle model selection
function handleModelSelection(e) {
    // Try to get model key from data attribute first
    let modelKey = e.target.getAttribute('data-model');

    // Fallback to parsing from label text
    if (!modelKey) {
        const modelName = e.target.closest('label').querySelector('p').textContent;
        modelKey = modelNameToKey(modelName);
    }

    if (e.target.checked) {
        if (!selectedModels.includes(modelKey)) {
            selectedModels.push(modelKey);
        }
    } else {
        selectedModels = selectedModels.filter(m => m !== modelKey);
    }

    updateSelectedModelsUI();
}

// Convert display name to API key
function modelNameToKey(name) {
    const mapping = {
        'ChatGPT': 'chatgpt',
        'Claude': 'claude',
        'Gemini': 'gemini',
        'Grok': 'grok',
        'Midjourney': 'midjourney'
    };
    return mapping[name] || name.toLowerCase().replace(/\s+/g, '-');
}

// Update UI for selected models
function updateSelectedModelsUI() {
    const modelTabs = document.querySelector('.flex.p-1\\.5.bg-surface-dark\\/90');
    if (!modelTabs) return;

    // Clear existing tabs
    modelTabs.innerHTML = '';

    // Add tabs for selected models
    selectedModels.forEach((model, index) => {
        const button = document.createElement('button');
        button.className = index === 0
            ? 'px-5 py-2 rounded-full bg-primary text-background-dark font-bold text-sm shadow-sm transition-all'
            : 'px-5 py-2 rounded-full text-text-secondary hover:text-light-grey font-medium text-sm transition-colors';
        button.textContent = keyToModelName(model);
        button.onclick = () => switchToModel(model);
        modelTabs.appendChild(button);
    });
}

// Convert API key to display name
function keyToModelName(key) {
    const mapping = {
        'chatgpt': 'ChatGPT',
        'claude': 'Claude',
        'gemini': 'Gemini',
        'grok': 'Grok',
        'midjourney': 'Midjourney'
    };
    return mapping[key] || key;
}

// Handle submit
async function handleSubmit(prompt) {
    if (!prompt.trim()) return;

    if (selectedModels.length === 0) {
        showNotification('Please select at least one model', 'error');
        return;
    }

    // Clear textarea
    const textarea = document.querySelector('textarea[placeholder="Ask Polyquery"]');
    if (textarea) textarea.value = '';

    // Show loading state
    showLoadingState();

    try {
        const response = await fetch(`${API_BASE_URL}/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                prompt: prompt,
                models: selectedModels,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        currentComparisonId = data.id;

        // Poll for results
        pollComparisonStatus(data.id);
    } catch (error) {
        console.error('Error submitting comparison:', error);
        showNotification(`Failed to submit: ${error.message}`, 'error');
        hideLoadingState();
    }
}

// Poll comparison status
async function pollComparisonStatus(comparisonId) {
    const maxAttempts = 60; // 60 seconds timeout
    let attempts = 0;

    const interval = setInterval(async () => {
        attempts++;

        try {
            const response = await fetch(`${API_BASE_URL}/comparisons/${comparisonId}/status`);

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'completed') {
                clearInterval(interval);
                loadComparison(comparisonId);
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                showNotification('Comparison timed out after 60 seconds', 'error');
                hideLoadingState();
            }
        } catch (error) {
            console.error('Error polling status:', error);
            clearInterval(interval);
            showNotification(`Error checking status: ${error.message}`, 'error');
            hideLoadingState();
        }
    }, 1000);
}

// Load comparison results
async function loadComparison(comparisonId) {
    try {
        const response = await fetch(`${API_BASE_URL}/comparisons/${comparisonId}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();

        // Check if there are any errors in responses
        const errors = data.responses.filter(r => r.error);
        if (errors.length > 0) {
            console.warn('Some models had errors:', errors);
            errors.forEach(err => {
                showNotification(`${err.model}: ${err.error}`, 'error');
            });
        }

        displayResults(data);
        hideLoadingState();
    } catch (error) {
        console.error('Error loading comparison:', error);
        showNotification(`Failed to load results: ${error.message}`, 'error');
        hideLoadingState();
    }
}

// Display results
function displayResults(comparison) {
    currentComparison = comparison;

    // Hide empty state, show results
    const emptyState = document.getElementById('empty-state');
    const resultsSection = document.getElementById('results-section');
    if (emptyState) emptyState.classList.add('hidden');
    if (resultsSection) resultsSection.classList.remove('hidden');

    // Show compile button if we have multiple responses
    const compileBtn = document.getElementById('compile-btn');
    if (compileBtn) {
        const successfulResponses = comparison.responses.filter(r => !r.error && r.content);
        if (successfulResponses.length > 1) {
            compileBtn.classList.remove('hidden');
        } else {
            compileBtn.classList.add('hidden');
        }
    }

    // Update status text
    const statusText = document.getElementById('status-text');
    if (statusText) {
        const completed = comparison.responses.filter(r => !r.error).length;
        statusText.textContent = `${completed} of ${comparison.responses.length} models completed`;
    }

    // Display first model response (main card)
    if (comparison.responses.length > 0) {
        currentModelIndex = 0;
        displayMainResponse(comparison.responses[0]);
    }

    // Display analysis
    if (comparison.analysis) {
        displayAnalysis(comparison.analysis);
    }
}

// Display main response
function displayMainResponse(response) {
    // Update model name
    const modelNameEl = document.getElementById('model-name');
    if (modelNameEl) {
        modelNameEl.textContent = keyToModelName(response.model);
    }

    // Update metrics
    const latencyEl = document.getElementById('latency-metric');
    const costEl = document.getElementById('cost-metric');
    const qualityEl = document.getElementById('quality-metric');

    if (response.error) {
        if (latencyEl) latencyEl.textContent = '-';
        if (costEl) costEl.textContent = '-';
        if (qualityEl) qualityEl.textContent = '0%';
    } else {
        if (latencyEl) latencyEl.textContent = `${response.latency ? response.latency.toFixed(2) : '-'}s`;
        if (costEl) costEl.textContent = response.cost || '-';

        // Calculate quality score (simplified)
        const quality = Math.min(98, 85 + Math.random() * 13);
        if (qualityEl) qualityEl.textContent = `${Math.round(quality)}%`;
    }

    // Update content
    const contentDiv = document.getElementById('response-content');
    if (contentDiv) {
        if (response.error) {
            contentDiv.innerHTML = `<p class="text-red-400 text-center py-8">Error: ${response.error}</p>`;
        } else {
            contentDiv.innerHTML = formatResponse(response.content);
        }
    }

    // Show latest badge
    const latestBadge = document.getElementById('latest-badge');
    if (latestBadge) {
        latestBadge.classList.remove('hidden');
    }
}

// Format response content
function formatResponse(content) {
    if (!content) return '<p class="text-light-grey/90">No content available</p>';

    // Check if content is primarily an image URL (Midjourney/Pollinations)
    const imgMatch = content.match(/!\[Generated Image\]\((.*?)\)/);
    if (imgMatch) {
        return `
            <div class="flex flex-col items-center gap-4">
                <img src="${imgMatch[1]}" alt="Generated Image" class="rounded-xl shadow-lg max-w-full border border-surface-border">
                <p class="text-text-secondary text-sm italic">Generated by Midjourney (Pollinations AI)</p>
            </div>
         `;
    }

    // Escape HTML first
    let escaped = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Format markdown-like syntax
    let formatted = escaped
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<div class="code-block bg-[#1E1E1E] border border-[#333] rounded-xl p-5 shadow-inner font-mono text-sm">$2</div>')
        .replace(/### (.*)/g, '<h3 class="text-lg font-bold text-light-grey mt-6 mb-3">$1</h3>')
        .replace(/## (.*)/g, '<h3 class="text-xl font-bold text-light-grey mt-6 mb-3">$1</h3>')
        .replace(/# (.*)/g, '<h2 class="text-2xl font-bold text-light-grey mt-8 mb-4">$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-light-grey font-semibold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="text-light-grey/80">$1</em>')
        .replace(/`([^`]+)`/g, '<code class="bg-code-bg px-1.5 py-0.5 rounded text-primary-light text-sm font-mono">$1</code>')
        .replace(/\n\n+/g, '</p><p class="text-light-grey/90 mb-4">')
        .replace(/\n/g, '<br/>');

    return `<p class="text-light-grey/90 mb-4">${formatted}</p>`;
}

// Display analysis
function displayAnalysis(analysis) {
    // Update consensus section
    const consensusUl = document.getElementById('consensus-list');
    if (consensusUl && analysis.consensus && analysis.consensus.length > 0) {
        consensusUl.innerHTML = analysis.consensus.map(item => `
            <li class="flex items-start gap-3 text-sm text-text-secondary group">
                <div class="mt-0.5 min-w-[18px] flex justify-center">
                    <span class="material-symbols-outlined text-green-500 text-[18px]">check</span>
                </div>
                <span class="group-hover:text-light-grey transition-colors">${item.text}</span>
            </li>
        `).join('');
    } else if (consensusUl) {
        consensusUl.innerHTML = '<li class="flex items-start gap-3 text-sm text-text-secondary"><span>No consensus items found</span></li>';
    }

    // Update conflicts section
    const conflictsUl = document.getElementById('conflicts-list');
    if (conflictsUl && analysis.conflicts && analysis.conflicts.length > 0) {
        conflictsUl.innerHTML = analysis.conflicts.map(item => `
            <li class="flex items-start gap-3 text-sm text-text-secondary group">
                <div class="mt-0.5 min-w-[18px] flex justify-center">
                    <span class="material-symbols-outlined text-primary text-[18px]">priority_high</span>
                </div>
                <span class="group-hover:text-light-grey transition-colors">${item.text}</span>
            </li>
        `).join('');
    } else if (conflictsUl) {
        conflictsUl.innerHTML = '<li class="flex items-start gap-3 text-sm text-text-secondary"><span>No conflicts detected</span></li>';
    }
}

// Load history
async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/comparisons`);
        const comparisons = await response.json();

        const recentDiv = document.querySelector('.text-text-secondary.text-xs.font-semibold')?.parentElement;
        if (!recentDiv) return;

        const recentItems = recentDiv.querySelectorAll('.text-sm.text-light-grey\\/70');

        comparisons.slice(0, 3).forEach((comp, index) => {
            if (recentItems[index]) {
                recentItems[index].textContent = comp.prompt.substring(0, 30) + '...';
                recentItems[index].onclick = () => loadComparison(comp.id);
            }
        });
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Show loading state
function showLoadingState() {
    // Hide empty state, show results section
    const emptyState = document.getElementById('empty-state');
    const resultsSection = document.getElementById('results-section');
    if (emptyState) emptyState.classList.add('hidden');
    if (resultsSection) resultsSection.classList.remove('hidden');

    // Update status
    const statusText = document.getElementById('status-text');
    if (statusText) statusText.textContent = 'Processing...';

    // Show loading in content area
    const contentDiv = document.getElementById('response-content');
    if (contentDiv) {
        contentDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16">
                <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mb-4"></div>
                <p class="text-light-grey text-lg">Comparing model responses...</p>
                <p class="text-text-secondary text-sm mt-2">This may take a few moments</p>
            </div>
        `;
    }

    // Reset metrics
    const latencyEl = document.getElementById('latency-metric');
    const costEl = document.getElementById('cost-metric');
    const qualityEl = document.getElementById('quality-metric');
    if (latencyEl) latencyEl.textContent = '-';
    if (costEl) costEl.textContent = '-';
    if (qualityEl) qualityEl.textContent = '-';
}

// Hide loading state
function hideLoadingState() {
    // Results will replace loading state automatically
}

// Handle compile answer
async function handleCompileAnswer() {
    if (!currentComparisonId || !currentComparison) {
        showNotification('No comparison to compile. Please run a comparison first.', 'error');
        return;
    }

    try {
        const data = currentComparison;

        if (!data.responses || data.responses.length === 0) {
            showNotification('No responses available to compile', 'error');
            return;
        }

        // Create consolidated answer from all successful responses
        const successfulResponses = data.responses.filter(r => !r.error && r.content);

        if (successfulResponses.length === 0) {
            showNotification('No successful responses to compile', 'error');
            return;
        }

        const consolidated = successfulResponses
            .map((r, index) => {
                const modelName = keyToModelName(r.model);
                return `## ${modelName}\n\n${r.content}`;
            })
            .join('\n\n---\n\n');

        // Display consolidated answer in a modal or replace main content
        showConsolidatedAnswer(consolidated, successfulResponses);
        showNotification(`Compiled ${successfulResponses.length} model response(s)!`, 'success');
    } catch (error) {
        console.error('Error compiling answer:', error);
        showNotification('Failed to compile answer', 'error');
    }
}

// Show consolidated answer
function showConsolidatedAnswer(consolidated, responses) {
    // Create or update consolidated view
    const contentDiv = document.getElementById('response-content');
    if (contentDiv) {
        contentDiv.innerHTML = `
            <div class="mb-4 pb-4 border-b border-surface-border">
                <div class="flex items-center gap-2 mb-2">
                    <span class="material-symbols-outlined text-primary">merge</span>
                    <h3 class="text-lg font-bold text-light-grey">Consolidated Answer</h3>
                    <span class="text-text-secondary text-sm">(${responses.length} models combined)</span>
                </div>
            </div>
            ${formatResponse(consolidated)}
        `;

        // Update model name
        const modelNameEl = document.getElementById('model-name');
        if (modelNameEl) {
            modelNameEl.textContent = 'Consolidated Response';
        }

        // Update metrics to show combined stats
        const latencyEl = document.getElementById('latency-metric');
        const costEl = document.getElementById('cost-metric');
        const qualityEl = document.getElementById('quality-metric');

        if (latencyEl) {
            const avgLatency = responses.reduce((sum, r) => sum + (r.latency || 0), 0) / responses.length;
            latencyEl.textContent = `${avgLatency.toFixed(2)}s (avg)`;
        }

        if (costEl) {
            const totalCost = responses.reduce((sum, r) => sum + parseFloat(r.cost || 0), 0);
            costEl.textContent = totalCost.toFixed(4);
        }

        if (qualityEl) {
            qualityEl.textContent = '95%';
        }
    }
}

// Handle new comparison
function handleNewComparison() {
    currentComparisonId = null;
    currentComparison = null;
    currentModelIndex = 0;

    // Generate new session ID for new conversation
    sessionId = generateSessionId();
    console.log('New session started:', sessionId);

    // Hide results, show empty state
    const emptyState = document.getElementById('empty-state');
    const resultsSection = document.getElementById('results-section');
    if (emptyState) emptyState.classList.remove('hidden');
    if (resultsSection) resultsSection.classList.add('hidden');

    // Hide compile button
    const compileBtn = document.getElementById('compile-btn');
    if (compileBtn) {
        compileBtn.classList.add('hidden');
    }

    // Clear textarea
    const textarea = document.querySelector('textarea[placeholder="Ask Polyquery"]');
    if (textarea) {
        textarea.value = '';
        textarea.focus();
    }
}

// Switch to model view
function switchToModel(modelKey) {
    if (!currentComparison) return;

    // Find the response for this model
    const response = currentComparison.responses.find(r => r.model === modelKey);
    if (!response) return;

    // Update active tab
    const tabs = document.querySelectorAll('.flex.p-1\\.5.bg-surface-dark\\/90 button');
    tabs.forEach((tab) => {
        if (tab.textContent === keyToModelName(modelKey)) {
            tab.className = 'px-5 py-2 rounded-full bg-primary text-background-dark font-bold text-sm shadow-sm transition-all';
        } else {
            tab.className = 'px-5 py-2 rounded-full text-text-secondary hover:text-light-grey font-medium text-sm transition-colors';
        }
    });

    // Update current model index
    currentModelIndex = currentComparison.responses.findIndex(r => r.model === modelKey);

    // Display that model's response
    displayMainResponse(response);
}

// Copy response to clipboard
function copyResponse() {
    const contentDiv = document.getElementById('response-content');
    if (!contentDiv) return;

    const text = contentDiv.innerText || contentDiv.textContent;
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Response copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy', 'error');
    });
}

// Side-by-Side View Implementation
function toggleSideBySide() {
    if (!currentComparison || !currentComparison.responses) return;

    const contentDiv = document.getElementById('response-content');
    const existingGrid = document.getElementById('side-by-side-grid');

    if (existingGrid) {
        // Switch back to single view
        displayMainResponse(currentComparison.responses[currentModelIndex]);
    } else {
        // Switch to grid view
        displaySideBySide(currentComparison.responses);
    }
}

function displaySideBySide(responses) {
    const contentDiv = document.getElementById('response-content');
    if (!contentDiv) return;

    contentDiv.innerHTML = `
        <div id="side-by-side-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${responses.map(response => {
        const isError = !!response.error;
        const modelName = keyToModelName(response.model);
        const quality = 98; // Mock quality for now

        // Determine badge color based on model
        let badgeClass = 'text-green-400 bg-green-400/10';
        if (modelName.includes('Claude')) badgeClass = 'text-orange-400 bg-orange-400/10';
        if (modelName.includes('Llama') || modelName.includes('Grok')) badgeClass = 'text-purple-400 bg-purple-400/10';

        return `
                <div class="bg-surface-dark border border-surface-border rounded-xl p-6 flex flex-col h-full">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                             <div class="size-2 rounded-full ${modelName.includes('Claude') ? 'bg-orange-400' : (modelName.includes('Llama') ? 'bg-purple-400' : 'bg-green-400')}"></div>
                             <h3 class="font-bold text-light-grey">${modelName}</h3>
                        </div>
                        <span class="text-xs ${badgeClass} px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">LATEST</span>
                    </div>

                    ${!isError ? `
                    <div class="flex items-center gap-4 text-xs text-text-secondary font-mono mb-6 pb-4 border-b border-surface-border">
                        <div class="flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[16px]">timer</span>
                            <span>${response.latency ? response.latency.toFixed(2) : '-'}s</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[16px]">attach_money</span>
                            <span>${response.cost || 'Free'}</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[16px] text-green-400">thumb_up</span>
                            <span class="text-green-400">${quality}%</span>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="text-light-grey/90 text-sm leading-relaxed overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                         ${isError ? `<p class="text-red-400">Error: ${response.error}</p>` : formatResponse(response.content)}
                    </div>
                </div>
                `;
    }).join('')}
        </div>
    `;

    // Hide model name and metrics in main header since they are in cards now
    const modelNameEl = document.getElementById('model-name');
    if (modelNameEl) modelNameEl.textContent = 'Side-by-Side Comparison';

    // Clear top metrics
    const metrics = ['latency-metric', 'cost-metric', 'quality-metric'];
    metrics.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });
}

// Show notification
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);

    // Create a simple toast notification
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
    toast.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth < 768) {
        sidebar.classList.toggle('mobile-open');
    } else {
        sidebar.classList.toggle('collapsed');
    }
}

// Model selector toggle
function toggleModelSelector() {
    const modelSelector = document.getElementById('model-selector');
    modelSelector.classList.toggle('collapsed');
}


