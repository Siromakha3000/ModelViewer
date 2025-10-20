const API_BASE = '/api/meshes';
let currentModel = null;

// Initialize viewer page
document.addEventListener('DOMContentLoaded', () => {
    loadModelFromURL();
});

// Get model ID from URL and load it
function loadModelFromURL() {
    const params = new URLSearchParams(window.location.search);
    const modelId = params.get('id');

    if (!modelId) {
        showError('No model ID provided. Redirecting...');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    loadModel(modelId);
}

// Load model from API
async function loadModel(id) {
    try {
        const response = await fetch(`${API_BASE}/${id}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                showError('Model not found. It may have been deleted.');
            } else {
                showError('Failed to load model');
            }
            return;
        }

        currentModel = await response.json();
        displayModel(currentModel);
    } catch (error) {
        console.error('Error:', error);
        showError('Error loading model');
    }
}

// Display model information
function displayModel(model) {
    // Update title
    document.getElementById('modelTitle').textContent = model.title;

    // Update format
    const format = getFileExtension(model.modelFileURL).toUpperCase();
    document.getElementById('modelFormat').textContent = format;

    // Update date
    document.getElementById('modelDate').textContent = formatDate(model.createdAt);

    // Update preview
    updatePreview(model);

    // Update download link
    const downloadLink = document.getElementById('downloadLink');
    downloadLink.href = model.modelFileURL;
    downloadLink.download = `${model.title}.${format.toLowerCase()}`;

    // Update tags
    updateTags(model.tags);

    // Hide loading
    document.getElementById('modelPreview').classList.remove('loading');
    const spinner = document.querySelector('.loading-spinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

// Update model preview - Load 3D model with Three.js
async function updatePreview(model) {
    const preview = document.getElementById('modelPreview');
    const format = getFileExtension(model.modelFileURL).toUpperCase();

    try {
        // Do NOT clear innerHTML here; it would remove the Three.js canvas
        // The ThreeJSViewer instance manages replacing the mesh internally.

        // Verify viewer is initialized
        if (typeof viewer === 'undefined') {
            throw new Error('Three.js viewer not initialized. Please refresh the page.');
        }

        // Load model based on format
        switch (format) {
            case 'GLB':
                await viewer.loadGLB(model.modelFileURL);
                break;
            case 'GLTF':
                await viewer.loadGLTF(model.modelFileURL);
                break;
            case 'OBJ':
                await viewer.loadOBJ(model.modelFileURL);
                break;
            case 'STL':
                await viewer.loadSTL(model.modelFileURL);
                break;
            default:
                showMessage(`⚠️ Format .${format} is not yet supported for 3D preview. Download to view in a compatible viewer.`, 'warning');
                displayFallbackPreview(preview, format, model.title);
                break;
        }

        // Hide loading spinner
        const spinner = preview.querySelector('.loading-spinner');
        if (spinner) spinner.style.display = 'none';

    } catch (error) {
        console.error('Error loading 3D model:', error);
        showMessage(`❌ Failed to load 3D model: ${error.message}`, 'error');
        displayFallbackPreview(preview, format, model.title);
    }
}

// Display fallback preview when 3D loading fails
function displayFallbackPreview(preview, format, title) {
    preview.innerHTML = `
        <div style="text-align: center; display: flex; align-items: center; justify-content: center; height: 100%;">
            <div>
                <div style="font-size: 5em; margin-bottom: 20px;">📦</div>
                <div style="font-size: 2em; font-weight: bold; color: #667eea;">${format}</div>
                <div style="font-size: 1.2em; color: #999; margin-top: 15px;">${escapeHtml(title)}</div>
                <p style="color: #999; margin-top: 15px; font-size: 0.9em;">3D preview unavailable</p>
            </div>
        </div>
    `;
}

// Update tags display
function updateTags(tagsString) {
    const container = document.getElementById('tagsContainer');

    if (!tagsString || tagsString.trim() === '') {
        container.innerHTML = '<span style="color: #999;">No tags</span>';
        return;
    }

    const tags = tagsString.split(',').map(t => t.trim()).filter(t => t);
    
    if (tags.length === 0) {
        container.innerHTML = '<span style="color: #999;">No tags</span>';
        return;
    }

    container.innerHTML = tags.map(tag => `
        <span class="tag" onclick="searchByTag('${escapeHtml(tag)}')">${escapeHtml(tag)}</span>
    `).join('');
}

// Search by tag
function searchByTag(tag) {
    window.location.href = `index.html?search=${encodeURIComponent(tag)}`;
}

// Go to search page
function goToSearch() {
    if (currentModel && currentModel.tags) {
        const firstTag = currentModel.tags.split(',')[0].trim();
        window.location.href = `index.html?search=${encodeURIComponent(firstTag)}`;
    } else {
        window.location.href = 'index.html';
    }
}

// Delete current model
async function deleteCurrentModel() {
    if (!currentModel) return;

    const confirmed = confirm(`Are you sure you want to delete "${currentModel.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
        showMessage('⏳ Deleting...', 'info');

        const response = await fetch(`${API_BASE}/${currentModel.id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete model');
        }

        showMessage('✅ Model deleted successfully. Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    } catch (error) {
        console.error('Error:', error);
        showMessage('❌ Error deleting model', 'error');
    }
}

// Show message
function showMessage(message, type) {
    const container = document.getElementById('messageContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message show ${type}`;
    messageDiv.textContent = message;

    container.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Show error and update UI
function showError(message) {
    const preview = document.getElementById('modelPreview');
    preview.innerHTML = `
        <div class="error-state">
            <div class="error-icon">❌</div>
            <h3>${message}</h3>
            <p style="margin-top: 10px; color: #999;">Redirecting to search page...</p>
        </div>
    `;
    showMessage(message, 'error');
}

// Utility functions
function getFileExtension(url) {
    return url.split('.').pop().split('?')[0];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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
