// ================================================
// Course Editor Logic — Eduvance LMS Admin
// ================================================

let currentCourseId = null;
let sectionsData = []; // local cache of sections

document.addEventListener('DOMContentLoaded', () => {
    // Auth guard
    if (!Auth.requireAuth()) return;

    // Initialize sidebar
    initSidebar();
    setupLogout();

    // Check if editing existing course
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('id');

    if (courseId) {
        currentCourseId = courseId;
        document.getElementById('pageTitle').textContent = 'Edit';
        document.getElementById('saveBtnText').textContent = 'Update Course';
        loadCourse(courseId);
    }
});

// ---- Sidebar Toggle ----
function initSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
}

// ---- Logout ----
function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
    });
}

// ---- Load Existing Course ----
async function loadCourse(courseId) {
    showLoading('Loading course...');
    try {
        const course = await FirestoreDB.getCourse(courseId);
        if (!course) {
            showToast('Course not found', 'error');
            window.location.href = 'dashboard.html';
            return;
        }

        document.getElementById('courseName').value = course.name || '';
        document.getElementById('courseDescription').value = course.description || '';
        document.getElementById('courseThumbnail').value = course.thumbnail || '';

        // Show sections area
        document.getElementById('sectionsArea').style.display = 'block';

        // Load sections
        await loadSections(courseId);
    } catch (error) {
        console.error('Load course error:', error);
        showToast('Failed to load course', 'error');
    } finally {
        hideLoading();
    }
}

// ---- Save / Update Course ----
async function saveCourse() {
    const name = document.getElementById('courseName').value.trim();
    const description = document.getElementById('courseDescription').value.trim();
    const thumbnail = document.getElementById('courseThumbnail').value.trim();

    if (!name) {
        showToast('Course name is required', 'error');
        document.getElementById('courseName').focus();
        return;
    }

    showLoading('Saving course...');
    try {
        if (currentCourseId) {
            // Update existing
            await FirestoreDB.updateCourse(currentCourseId, { name, description, thumbnail });
            showToast('Course updated successfully!', 'success');
        } else {
            // Create new
            const id = await FirestoreDB.createCourse({ name, description, thumbnail });
            currentCourseId = id;
            document.getElementById('pageTitle').textContent = 'Edit';
            document.getElementById('saveBtnText').textContent = 'Update Course';

            // Update URL without reload
            window.history.replaceState(null, '', `course-editor.html?id=${id}`);
            showToast('Course created successfully!', 'success');
        }

        // Show sections area
        document.getElementById('sectionsArea').style.display = 'block';
    } catch (error) {
        console.error('Save course error:', error);
        showToast('Failed to save course', 'error');
    } finally {
        hideLoading();
    }
}

// ---- Load Sections ----
async function loadSections(courseId) {
    try {
        const sections = await FirestoreDB.getAllSections(courseId);
        sectionsData = [];

        for (const section of sections) {
            const contents = await FirestoreDB.getAllContents(courseId, section.id);
            sectionsData.push({ ...section, contents });
        }

        renderSections();
    } catch (error) {
        console.error('Load sections error:', error);
        showToast('Failed to load sections', 'error');
    }
}

// ---- Add New Section ----
async function addSection() {
    if (!currentCourseId) {
        showToast('Please save the course first', 'error');
        return;
    }

    const sectionName = `Section ${sectionsData.length + 1}`;
    const order = sectionsData.length;

    try {
        const sectionId = await FirestoreDB.createSection(currentCourseId, {
            name: sectionName,
            order: order
        });

        sectionsData.push({
            id: sectionId,
            name: sectionName,
            order: order,
            contents: []
        });

        renderSections();
        showToast('Section added', 'success');

        // Scroll to new section
        setTimeout(() => {
            const el = document.getElementById(`section-${sectionId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
    } catch (error) {
        console.error('Add section error:', error);
        showToast('Failed to add section', 'error');
    }
}

// ---- Delete Section ----
async function deleteSection(sectionId) {
    if (!confirm('Delete this section and all its content?')) return;

    showLoading('Deleting section...');
    try {
        await FirestoreDB.deleteSection(currentCourseId, sectionId);
        sectionsData = sectionsData.filter(s => s.id !== sectionId);
        renderSections();
        showToast('Section deleted', 'success');
    } catch (error) {
        console.error('Delete section error:', error);
        showToast('Failed to delete section', 'error');
    } finally {
        hideLoading();
    }
}

// ---- Update Section Name ----
let sectionNameTimeout = {};
function updateSectionName(sectionId, name) {
    if (sectionNameTimeout[sectionId]) clearTimeout(sectionNameTimeout[sectionId]);

    sectionNameTimeout[sectionId] = setTimeout(async () => {
        try {
            await FirestoreDB.updateSection(currentCourseId, sectionId, { name });
            // Update local data
            const section = sectionsData.find(s => s.id === sectionId);
            if (section) section.name = name;
        } catch (error) {
            console.error('Update section name error:', error);
        }
    }, 800);
}

// ---- Add Content to Section ----
async function addContent(sectionId, type) {
    const order = (sectionsData.find(s => s.id === sectionId)?.contents || []).length;

    const contentData = {
        type: type,
        name: '',
        url: '',
        order: order
    };

    try {
        const contentId = await FirestoreDB.createContent(currentCourseId, sectionId, contentData);

        const section = sectionsData.find(s => s.id === sectionId);
        if (section) {
            section.contents.push({ id: contentId, ...contentData });
        }

        renderSections();
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} content added`, 'success');
    } catch (error) {
        console.error('Add content error:', error);
        showToast('Failed to add content', 'error');
    }
}

// ---- Update Content Field ----
let contentUpdateTimeout = {};
function updateContentField(sectionId, contentId, field, value) {
    const key = `${contentId}-${field}`;
    if (contentUpdateTimeout[key]) clearTimeout(contentUpdateTimeout[key]);

    contentUpdateTimeout[key] = setTimeout(async () => {
        try {
            await FirestoreDB.updateContent(currentCourseId, sectionId, contentId, { [field]: value });

            // Update local data
            const section = sectionsData.find(s => s.id === sectionId);
            if (section) {
                const content = section.contents.find(c => c.id === contentId);
                if (content) content[field] = value;
            }

            // If updating video URL, refresh preview
            if (field === 'url') {
                const section = sectionsData.find(s => s.id === sectionId);
                const content = section?.contents.find(c => c.id === contentId);
                if (content?.type === 'video' && value) {
                    const previewEl = document.getElementById(`preview-${contentId}`);
                    if (previewEl) {
                        previewEl.innerHTML = getVideoPreviewHTML(value);
                    }
                }
            }
        } catch (error) {
            console.error('Update content error:', error);
        }
    }, 800);
}

// ---- Delete Content ----
async function deleteContent(sectionId, contentId) {
    if (!confirm('Delete this content item?')) return;

    try {
        await FirestoreDB.deleteContent(currentCourseId, sectionId, contentId);

        const section = sectionsData.find(s => s.id === sectionId);
        if (section) {
            section.contents = section.contents.filter(c => c.id !== contentId);
        }

        renderSections();
        showToast('Content deleted', 'success');
    } catch (error) {
        console.error('Delete content error:', error);
        showToast('Failed to delete content', 'error');
    }
}

// ---- Move Section Up/Down ----
async function moveSection(sectionId, direction) {
    const index = sectionsData.findIndex(s => s.id === sectionId);
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= sectionsData.length) return;

    // Swap
    [sectionsData[index], sectionsData[newIndex]] = [sectionsData[newIndex], sectionsData[index]];

    // Update orders
    try {
        await FirestoreDB.updateSection(currentCourseId, sectionsData[index].id, { order: index });
        await FirestoreDB.updateSection(currentCourseId, sectionsData[newIndex].id, { order: newIndex });
        sectionsData[index].order = index;
        sectionsData[newIndex].order = newIndex;
        renderSections();
    } catch (error) {
        console.error('Move section error:', error);
        showToast('Failed to reorder sections', 'error');
    }
}

// =======================================
// RENDER FUNCTIONS
// =======================================

function renderSections() {
    const container = document.getElementById('sectionsContainer');

    if (sectionsData.length === 0) {
        container.innerHTML = `
      <div class="editor-section" style="opacity:1;">
        <div class="empty-state">
          <i class="bi bi-collection"></i>
          <h6>No Sections Yet</h6>
          <p>Add sections to organize your course content</p>
        </div>
      </div>
    `;
        return;
    }

    container.innerHTML = sectionsData.map((section, index) => `
    <div class="section-item" id="section-${section.id}" style="animation-delay:${index * 0.1}s; opacity: 1;">
      <div class="section-item-header">
        <div class="d-flex align-items-center gap-3 flex-grow-1">
          <span class="section-number">${index + 1}</span>
          <input type="text" class="form-custom section-title-input"
                 value="${escapeAttr(section.name)}"
                 placeholder="Section Name"
                 oninput="updateSectionName('${section.id}', this.value)">
        </div>
        <div class="d-flex gap-2 flex-shrink-0">
          <button class="btn-action" onclick="moveSection('${section.id}', 'up')" title="Move Up" ${index === 0 ? 'disabled style="opacity:0.3"' : ''}>
            <i class="bi bi-chevron-up"></i>
          </button>
          <button class="btn-action" onclick="moveSection('${section.id}', 'down')" title="Move Down" ${index === sectionsData.length - 1 ? 'disabled style="opacity:0.3"' : ''}>
            <i class="bi bi-chevron-down"></i>
          </button>
          <button class="btn-action danger" onclick="deleteSection('${section.id}')" title="Delete Section">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </div>

      <!-- Content List -->
      <div id="contents-${section.id}">
        ${section.contents.map(content => renderContentItem(section.id, content)).join('')}
      </div>

      <!-- Add Content Buttons -->
      <div class="d-flex gap-2 flex-wrap mt-3">
        <div class="add-content-dropdown dropdown">
          <button class="btn-outline-custom dropdown-toggle" data-bs-toggle="dropdown" style="font-size:0.85rem;">
            <i class="bi bi-plus-lg"></i> Add Content
          </button>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="#" onclick="event.preventDefault(); addContent('${section.id}', 'video')">
              <i class="bi bi-play-circle" style="color:var(--primary-light)"></i> Video
            </a></li>
            <li><a class="dropdown-item" href="#" onclick="event.preventDefault(); addContent('${section.id}', 'pdf')">
              <i class="bi bi-file-earmark-pdf" style="color:#E17055"></i> PDF
            </a></li>
            <li><a class="dropdown-item" href="#" onclick="event.preventDefault(); addContent('${section.id}', 'file')">
              <i class="bi bi-file-earmark-arrow-down" style="color:var(--accent)"></i> File Download
            </a></li>
          </ul>
        </div>
      </div>
    </div>
  `).join('');
}

function renderContentItem(sectionId, content) {
    const typeIcons = {
        video: 'bi-play-circle',
        pdf: 'bi-file-earmark-pdf',
        file: 'bi-file-earmark-arrow-down'
    };

    const typePlaceholders = {
        video: { name: 'Video Title', url: 'https://youtube.com/watch?v=...' },
        pdf: { name: 'PDF Title', url: 'https://example.com/document.pdf' },
        file: { name: 'File Name', url: 'https://example.com/file.zip' }
    };

    const ph = typePlaceholders[content.type] || typePlaceholders.file;

    let previewHTML = '';
    if (content.type === 'video' && content.url) {
        previewHTML = `
      <div class="video-preview-wrapper" id="preview-${content.id}">
        ${getVideoPreviewHTML(content.url)}
      </div>
    `;
    } else if (content.type === 'video') {
        previewHTML = `<div id="preview-${content.id}"></div>`;
    }

    let downloadLink = '';
    if ((content.type === 'pdf' || content.type === 'file') && content.url) {
        downloadLink = `
      <a href="${escapeAttr(content.url)}" target="_blank" class="btn-outline-custom mt-2" style="font-size:0.8rem;">
        <i class="bi bi-download"></i> Preview / Download
      </a>
    `;
    }

    return `
    <div class="content-item">
      <div class="content-item-header">
        <div class="d-flex align-items-center gap-2">
          <i class="bi ${typeIcons[content.type]}" style="font-size:1.1rem; color:var(--primary-light)"></i>
          <span class="content-type-badge ${content.type}">${content.type.toUpperCase()}</span>
        </div>
        <button class="btn-action danger" onclick="deleteContent('${sectionId}', '${content.id}')" title="Delete">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <div class="row g-2">
        <div class="col-md-6">
          <input type="text" class="form-custom" style="font-size:0.85rem"
                 value="${escapeAttr(content.name)}"
                 placeholder="${ph.name}"
                 oninput="updateContentField('${sectionId}', '${content.id}', 'name', this.value)">
        </div>
        <div class="col-md-6">
          <input type="url" class="form-custom" style="font-size:0.85rem"
                 value="${escapeAttr(content.url)}"
                 placeholder="${ph.url}"
                 oninput="updateContentField('${sectionId}', '${content.id}', 'url', this.value)">
        </div>
      </div>

      ${previewHTML}
      ${downloadLink}
    </div>
  `;
}

// ---- Video Preview Helper ----
function getVideoPreviewHTML(url) {
    if (!url) return '';

    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
    if (ytMatch) {
        return `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" allowfullscreen loading="lazy"></iframe>`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
        return `<iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" allowfullscreen loading="lazy"></iframe>`;
    }

    // Google Drive
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
    if (driveMatch) {
        return `<iframe src="https://drive.google.com/file/d/${driveMatch[1]}/preview" allowfullscreen loading="lazy"></iframe>`;
    }

    // Direct video file
    if (url.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
        return `<video controls preload="metadata"><source src="${escapeAttr(url)}" type="video/${url.split('.').pop().split('?')[0]}"></video>`;
    }

    // Fallback — try iframe
    return `<iframe src="${escapeAttr(url)}" allowfullscreen loading="lazy"></iframe>`;
}

// =======================================
// UTILITY FUNCTIONS
// =======================================

function showLoading(text = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    document.getElementById('loadingText').textContent = text;
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.opacity = '0';
    setTimeout(() => overlay.style.display = 'none', 300);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = {
        success: 'bi-check-circle-fill',
        error: 'bi-x-circle-fill',
        info: 'bi-info-circle-fill'
    };

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;
    toast.innerHTML = `
    <i class="bi ${icons[type]} toast-icon"></i>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <i class="bi bi-x-lg"></i>
    </button>
  `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.3s ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
