const API_BASE = '/api/meshes';

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
    loadAllModels();
    setupEventListeners();
    checkForSearchParam();
});

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchTags');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchByTags();
        }
    });
}

// Check for search parameter in URL
function checkForSearchParam() {
    const params = new URLSearchParams(window.location.search);
    const searchTerm = params.get('search');

    if (searchTerm) {
        document.getElementById('searchTags').value = searchTerm;
        searchByTags();
        // Clean up URL
        window.history.replaceState({}, document.title, 'index.html');
    }
}

// Load all models
async function loadAllModels() {
    try {
        const response = await fetch(`${API_BASE}`);
        if (!response.ok) throw new Error('Failed to load models');
        
        const models = await response.json();
        displayModels(models);
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error loading models', 'error');
    }
}

// Search models by tags
async function searchByTags() {
    const searchInput = document.getElementById('searchTags');
    const tags = searchInput.value.trim();

    if (!tags) {
        loadAllModels();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}?tags=${encodeURIComponent(tags)}`);
        if (!response.ok) throw new Error('Failed to search models');
        
        const models = await response.json();
        displayModels(models);
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error searching models', 'error');
    }
}

// Display models in grid
function displayModels(models) {
    const container = document.getElementById('modelsContainer');
    const countSpan = document.getElementById('modelCount');

    if (!models || models.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1;">
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <h3>No models found</h3>
                    <p>Start by <a href="upload.html" style="color: #667eea; text-decoration: underline;">uploading a model</a></p>
                </div>
            </div>
        `;
        countSpan.textContent = '';
        return;
    }

    countSpan.textContent = `${models.length} model${models.length !== 1 ? 's' : ''} found`;

    container.innerHTML = models.map(model => `
        <div class="mesh-card" onclick="viewModel(${model.id})" style="cursor: pointer;">
            <div class="mesh-preview">
                <span>📦 ${getFileExtension(model.modelFileURL).toUpperCase()}</span>
            </div>
            <div class="mesh-info">
                <div class="mesh-title" title="${model.title}">${escapeHtml(model.title)}</div>
                <div class="mesh-tags">
                    ${model.tags 
                        ? model.tags.split(',').map(tag => {
                            const trimmedTag = tag.trim();
                            return `<span class="tag" onclick="event.stopPropagation(); searchTag('${escapeHtml(trimmedTag)}')">${escapeHtml(trimmedTag)}</span>`;
                        }).join('')
                        : '<span style="color: #999; font-size: 0.9em;">No tags</span>'
                    }
                </div>
                <div class="mesh-meta">
                    📅 ${formatDate(model.createdAt)}
                </div>
                <div class="mesh-actions">
                    <button class="btn-small btn-download" onclick="event.stopPropagation(); downloadModel(${model.id}, '${escapeHtml(model.modelFileURL)}')">⬇️ Download</button>
                    <button class="btn-small btn-delete" onclick="event.stopPropagation(); deleteModel(${model.id})">🗑️ Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Delete model
async function deleteModel(id) {
    if (!confirm('Are you sure you want to delete this model?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete model');

        showMessage('✓ Model deleted successfully', 'success');
        loadAllModels();
    } catch (error) {
        console.error('Error:', error);
        showMessage('✗ Error deleting model', 'error');
    }
}

// Download model
function downloadModel(id, fileUrl) {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = true;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// View model details
function viewModel(id) {
    window.location.href = `viewer.html?id=${id}`;
}

// Search by tag
function searchTag(tag) {
    document.getElementById('searchTags').value = tag;
    searchByTags();
}

// Show message
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message show ${type}`;
    messageDiv.textContent = message;
    
    const container = document.querySelector('.search-section');
    container.insertBefore(messageDiv, container.firstChild);

    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Utility functions
function getFileExtension(url) {
    return url.split('.').pop().split('?')[0].toUpperCase();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
