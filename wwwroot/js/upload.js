const API_BASE = '/api/meshes';

// Initialize upload page
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('modelFile');
    const fileInputLabel = document.getElementById('fileInputLabel');

    uploadForm.addEventListener('submit', handleUpload);

    // Drag and drop support
    fileInputLabel.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInputLabel.classList.add('dragover');
    });

    fileInputLabel.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInputLabel.classList.remove('dragover');
    });

    fileInputLabel.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInputLabel.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            updateFileInputLabel(files[0]);
        }
    });

    // File input change event
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            updateFileInputLabel(e.target.files[0]);
        }
    });
}

// Update file input label
function updateFileInputLabel(file) {
    const fileInputLabel = document.getElementById('fileInputLabel');
    const allowedExtensions = ['GLB', 'GLTF', 'OBJ', 'FBX', 'STL', 'PLY'];
    const fileExtension = file.name.split('.').pop().toUpperCase();

    if (allowedExtensions.includes(fileExtension)) {
        fileInputLabel.innerHTML = `
            <div class="file-selected">
                <div style="font-size: 2em; margin-bottom: 10px;">✅</div>
                <div class="file-input-text">${escapeHtml(file.name)}</div>
                <div class="file-input-subtext">${formatFileSize(file.size)}</div>
            </div>
        `;
    }
}

// Handle form submission
async function handleUpload(e) {
    e.preventDefault();

    const title = document.getElementById('modelTitle').value.trim();
    const tags = document.getElementById('modelTags').value.trim();
    const file = document.getElementById('modelFile').files[0];

    if (!title || !file) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }

    // Validate file extension
    const allowedExtensions = ['glb', 'gltf', 'obj', 'fbx', 'stl', 'ply'];
    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
        showMessage(`File type '.${fileExtension}' is not allowed`, 'error');
        return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
        showMessage(`File is too large. Maximum size is 100MB, your file is ${formatFileSize(file.size)}`, 'error');
        return;
    }

    await uploadFile(title, tags, file);
}

// Upload file to server
async function uploadFile(title, tags, file) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('tags', tags);
    formData.append('file', file);

    try {
        showMessage('⏳ Uploading...', 'info');
        
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                updateProgress(percentComplete);
            }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
            const progressDiv = document.getElementById('uploadProgress');
            progressDiv.style.display = 'none';

            if (xhr.status === 201) {
                const data = JSON.parse(xhr.responseText);
                showMessage(`✅ Model "${title}" uploaded successfully!`, 'success');
                document.getElementById('uploadForm').reset();
                document.getElementById('fileInputLabel').innerHTML = `
                    <div>
                        <div class="file-input-icon">📁</div>
                        <div class="file-input-text">Click to select file or drag and drop</div>
                        <div class="file-input-subtext">Supported: GLB, GLTF, OBJ, FBX, STL, PLY (Max 100MB)</div>
                    </div>
                `;
                
                // Redirect to search page after 2 seconds
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                const data = JSON.parse(xhr.responseText);
                showMessage(`❌ ${data.message || 'Upload failed'}`, 'error');
            }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
            const progressDiv = document.getElementById('uploadProgress');
            progressDiv.style.display = 'none';
            showMessage('❌ Network error occurred', 'error');
        });

        xhr.addEventListener('abort', () => {
            const progressDiv = document.getElementById('uploadProgress');
            progressDiv.style.display = 'none';
            showMessage('⚠️ Upload was cancelled', 'error');
        });

        // Send request
        xhr.open('POST', API_BASE);
        xhr.send(formData);
    } catch (error) {
        console.error('Error:', error);
        showMessage(`❌ ${error.message}`, 'error');
    }
}

// Update progress bar
function updateProgress(percent) {
    const progressDiv = document.getElementById('uploadProgress');
    progressDiv.style.display = 'block';
    
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    
    progressFill.style.width = percent + '%';
    progressPercent.textContent = percent;
}

// Show message
function showMessage(message, type) {
    const messageDiv = document.getElementById('uploadMessage');
    messageDiv.textContent = message;
    messageDiv.className = `message show ${type}`;

    // Auto-hide after 5 seconds (except for success, which redirects)
    if (type !== 'info') {
        setTimeout(() => {
            messageDiv.classList.remove('show');
        }, 5000);
    }
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
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
