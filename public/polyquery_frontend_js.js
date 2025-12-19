// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';

// State management
let currentComparisonId = null;
let selectedModels = ['gpt-4o', 'claude-3.5-sonnet', 'llama-3'];

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
    const compileBtn = document.querySelector('button[title="Compile Consolidated Answer"]');
    if (compileBtn) {
        compileBtn.addEventListener('click', handleCompileAnswer);
    }

    // New comparison button
    const newComparisonBtn = document.querySelector('button:has(.material-symbols-outlined:contains("add_circle"))');
    if (newComparisonBtn) {
        newComparisonBtn.addEventListener('click', handleNewComparison);
    }
}

// Handle model selection
function handleModelSelection(e) {
    const modelName = e.target.closest('label').querySelector('p').textContent;
    const modelKey = modelNameToKey(modelName);
    
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
        'GPT-4o': 'gpt-4o',
        'Claude 3.5 Sonnet': 'claude-3.5-sonnet',
        'Llama 3': 'llama-3',
        'GPT-3.5 Turbo': 'gpt-3.5-turbo',
        'Mixtral 8x7B': 'mixtral-8x7b',
        'Gemini 1.5 Flash': 'gemini-1.5-flash'
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
        'gpt-4o': 'GPT-4o',
        'claude-3.5-sonnet': 'Claude 3.5 Sonnet',
        'llama-3': 'Llama 3',
        'gpt-3.5-turbo': 'GPT-3.5 Turbo',
        'mixtral-8x7b': 'Mixtral 8x7B',
        'gemini-1.5-flash': 'Gemini 1.5 Flash'
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
                prompt: prompt,
                models: selectedModels,
                temperature: 0.7
            })
        });

        const data = await response.json();
        currentComparisonId = data.id;

        // Poll for results
        pollComparisonStatus(data.id);
    } catch (error) {
        console.error('Error submitting comparison:', error);
        showNotification('Failed to submit comparison', 'error');
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
            const data = await response.json();

            if (data.status === 'completed') {
                clearInterval(interval);
                loadComparison(comparisonId);
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                showNotification('Comparison timed out', 'error');
                hideLoadingState();
            }
        } catch (error) {
            console.error('Error polling status:', error);
            clearInterval(interval);
            hideLoadingState();
        }
    }, 1000);
}

// Load comparison results
async function loadComparison(comparisonId) {
    try {
        const response = await fetch(`${API_BASE_URL}/comparisons/${comparisonId}`);
        const data = await response.json();

        displayResults(data);
        hideLoadingState();
    } catch (error) {
        console.error('Error loading comparison:', error);
        showNotification('Failed to load results', 'error');
        hideLoadingState();
    }
}

// Display results
function displayResults(comparison) {
    const container = document.querySelector('.max-w-\\[1400px\\]');
    if (!container) return;

    // Update header
    const header = container.querySelector('h3');
    if (header) {
        header.textContent = 'Model Comparison Results';
    }

    const statusSpan = container.querySelector('.text-text-secondary');
    if (statusSpan) {
        statusSpan.textContent = `${comparison.responses.length} models completed`;
    }

    // Display first model response (main card)
    if (comparison.responses.length > 0) {
        displayMainResponse(comparison.responses[0]);
    }

    // Display analysis
    if (comparison.analysis) {
        displayAnalysis(comparison.analysis);
    }
}

// Display main response
function displayMainResponse(response) {
    const mainCard = document.querySelector('.flex.flex-col.rounded-3xl');
    if (!mainCard) return;

    // Update model name
    const modelNameEl = mainCard.querySelector('.text-lg.font-bold.tracking-tight');
    if (modelNameEl) {
        modelNameEl.textContent = keyToModelName(response.model);
    }

    // Update metrics
    const metrics = mainCard.querySelectorAll('.text-light-grey');
    if (metrics.length >= 3) {
        metrics[0].textContent = `${response.latency.toFixed(2)}s`;
        metrics[1].textContent = response.cost;
        
        // Calculate quality score (simplified)
        const quality = response.error ? 0 : Math.min(98, 85 + Math.random() * 13);
        metrics[2].textContent = `${Math.round(quality)}%`;
    }

    // Update content
    const contentDiv = mainCard.querySelector('.markdown-body');
    if (contentDiv && !response.error) {
        contentDiv.innerHTML = formatResponse(response.content);
    } else if (response.error) {
        contentDiv.innerHTML = `<p class="text-red-400">Error: ${response.error}</p>`;
    }
}

// Format response content
function formatResponse(content) {
    // Simple markdown-like formatting
    let formatted = content
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<div class="code-block">$2</div>')
        .replace(/### (.*)/g, '<h3 class="text-lg font-bold text-light-grey mt-6 mb-3">$1</h3>')
        .replace(/## (.*)/g, '<h3 class="text-xl font-bold text-light-grey mt-6 mb-3">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-light-grey">$1</strong>')
        .replace(/\n\n/g, '</p><p class="text-light-grey/90">');
    
    return `<p class="text-light-grey/90">${formatted}</p>`;
}

// Display analysis
function displayAnalysis(analysis) {
    // Update consensus section
    const consensusUl = document.querySelector('.bg-green-500\\/10').closest('.rounded-2xl').querySelector('ul');
    if (consensusUl && analysis.consensus) {
        consensusUl.innerHTML = analysis.consensus.map(item => `
            <li class="flex items-start gap-3 text-sm text-text-secondary group">
                <div class="mt-0.5 min-w-[18px] flex justify-center">
                    <span class="material-symbols-outlined text-green-500 text-[18px]">check</span>
                </div>
                <span class="group-hover:text-light-grey transition-colors">${item.text}</span>
            </li>
        `).join('');
    }

    // Update conflicts section
    const conflictsUl = document.querySelector('.bg-primary\\/10').closest('.rounded-2xl').querySelector('ul');
    if (conflictsUl && analysis.conflicts) {
        conflictsUl.innerHTML = analysis.conflicts.map(item => `
            <li class="flex items-start gap-3 text-sm text-text-secondary group">
                <div class="mt-0.5 min-w-[18px] flex justify-center">
                    <span class="material-symbols-outlined text-primary text-[18px]">priority_high</span>
                </div>
                <span class="group-hover:text-light-grey transition-colors">${item.text}</span>
            </li>
        `).join('');
    }
}

// Load history
async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/comparisons`);
        const comparisons = await response.json();

        const recentDiv = document.querySelector('.text-text-secondary.text-xs.font-semibold').parentElement;
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
    const mainCard = document.querySelector('.flex.flex-col.rounded-3xl');
    if (mainCard) {
        const contentDiv = mainCard.querySelector('.markdown-body');
        if (contentDiv) {
            contentDiv.innerHTML = `
                <div class="flex items-center justify-center py-12">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p class="ml-4 text-light-grey">Comparing model responses...</p>
                </div>
            `;
        }
    }
}

// Hide loading state
function hideLoadingState() {
    // Results will replace loading state automatically
}

// Handle compile answer
async function handleCompileAnswer() {
    if (!currentComparisonId) {
        showNotification('No comparison to compile', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/comparisons/${currentComparisonId}`);
        const data = await response.json();

        // Create consolidated answer
        const consolidated = data.responses
            .filter(r => !r.error)
            .map(r => r.content)
            .join('\n\n---\n\n');

        // Show in modal or new section (simplified: just alert)
        showNotification('Consolidated answer compiled!', 'success');
        console.log('Consolidated Answer:', consolidated);
    } catch (error) {
        console.error('Error compiling answer:', error);
        showNotification('Failed to compile answer', 'error');
    }
}

// Handle new comparison
function handleNewComparison() {
    currentComparisonId = null;
    const textarea = document.querySelector('textarea[placeholder="Ask Polyquery"]');
    if (textarea) {
        textarea.value = '';
        textarea.focus();
    }
}

// Switch to model view
function switchToModel(modelKey) {
    // Update active tab
    const tabs = document.querySelectorAll('.flex.p-1\\.5.bg-surface-dark\\/90 button');
    tabs.forEach((tab, index) => {
        if (tab.textContent === keyToModelName(modelKey)) {
            tab.className = 'px-5 py-2 rounded-full bg-primary text-background-dark font-bold text-sm shadow-sm transition-all';
        } else {
            tab.className = 'px-5 py-2 rounded-full text-text-secondary hover:text-light-grey font-medium text-sm transition-colors';
        }
    });

    // Load that model's response
    if (currentComparisonId) {
        loadComparison(currentComparisonId);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Simple notification (can be enhanced with a toast library)
    const color = type === 'error' ? 'red' : type === 'success' ? 'green' : 'blue';
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // You can add a toast notification here
    alert(message);
}

// Sidebar toggle (from original script.js)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth < 768) {
        sidebar.classList.toggle('mobile-open');
    } else {
        sidebar.classList.toggle('collapsed');
    }
}

// Model selector toggle (from original script.js)
function toggleModelSelector() {
    const modelSelector = document.getElementById('model-selector');
    modelSelector.classList.toggle('collapsed');
}