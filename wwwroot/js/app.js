const API_BASE = '/api/meshes';

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
    loadAllModels();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    const uploadForm = document.getElementById('uploadForm');
    uploadForm.addEventListener('submit', handleUpload);

    const searchInput = document.getElementById('searchTags');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchByTags();
        }
    });
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

    if (!models || models.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999;">No models found</div>';
        return;
    }

    container.innerHTML = models.map(model => `
        <div class="mesh-card">
            <div class="mesh-preview">
                <span>📦 ${getFileExtension(model.modelFileURL).toUpperCase()}</span>
            </div>
            <div class="mesh-info">
                <div class="mesh-title" title="${model.title}">${escapeHtml(model.title)}</div>
                <div class="mesh-tags">
                    ${model.tags 
                        ? model.tags.split(',').map(tag => {
                            const trimmedTag = tag.trim();
                            return `<span class="tag" onclick="searchTag('${escapeHtml(trimmedTag)}')">${escapeHtml(trimmedTag)}</span>`;
                        }).join('')
                        : '<span style="color: #999; font-size: 0.9em;">No tags</span>'
                    }
                </div>
                <small style="color: #666;">Created: ${formatDate(model.createdAt)}</small>
                <div class="mesh-actions" style="margin-top: 10px;">
                    <button class="btn-small btn-download" onclick="downloadModel(${model.id}, '${escapeHtml(model.modelFileURL)}')">Download</button>
                    <button class="btn-small btn-delete" onclick="deleteModel(${model.id})">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Handle file upload
async function handleUpload(e) {
    e.preventDefault();

    const title = document.getElementById('modelTitle').value.trim();
    const tags = document.getElementById('modelTags').value.trim();
    const file = document.getElementById('modelFile').files[0];

    if (!title || !file) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('tags', tags);
    formData.append('file', file);

    try {
        showMessage('Uploading...', 'success');
        const response = await fetch(API_BASE, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Upload failed');
        }

        showMessage(`✓ Model "${title}" uploaded successfully!`, 'success');
        document.getElementById('uploadForm').reset();
        loadAllModels();
    } catch (error) {
        console.error('Error:', error);
        showMessage(`✗ ${error.message}`, 'error');
    }
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

// Search by tag
function searchTag(tag) {
    document.getElementById('searchTags').value = tag;
    searchByTags();
}

// Show message
function showMessage(message, type) {
    const messageDiv = document.getElementById('uploadMessage');
    messageDiv.textContent = message;
    messageDiv.className = `message show ${type}`;

    setTimeout(() => {
        messageDiv.classList.remove('show');
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
