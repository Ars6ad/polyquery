// Toggle Sidebar Function
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    
    // Check if we are on mobile or desktop based on window width
    if (window.innerWidth < 768) {
        // Mobile: toggle mobile-open class
        sidebar.classList.toggle('mobile-open');
    } else {
        // Desktop: toggle collapsed class
        sidebar.classList.toggle('collapsed');
    }
}

// Toggle Model Selector Function
function toggleModelSelector() {
    const modelSelector = document.getElementById('model-selector');
    modelSelector.classList.toggle('collapsed');
}