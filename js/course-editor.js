// ================================================
// Course Editor Logic — Eduvance LMS Admin
// ================================================

let currentCourseId = null;
let sectionsData = [];
let collapsedSections = {}; // track collapsed state

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.requireAuth()) return;
    initSidebar();
    setupLogout();
    loadCategoryOptions();

    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('id');

    if (courseId) {
        currentCourseId = courseId;
        document.getElementById('pageTitle').textContent = 'Edit';
        document.getElementById('saveBtnText').textContent = 'Update Course';
        loadCourse(courseId);
    }
});

// ---- Load category options ----
async function loadCategoryOptions() {
    try {
        const cats = await FirestoreDB.getAllCategories();
        const sel = document.getElementById('courseCategory');
        cats.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            sel.appendChild(opt);
        });
    } catch (e) { console.error('Load categories error:', e); }
}

// ---- Sidebar Toggle ----
function initSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeBtn = document.getElementById('sidebarCloseBtn');
    const mainContent = document.getElementById('mainContent');

    // Mobile toggle
    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });

    // Desktop collapse toggle
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            if (mainContent) {
                mainContent.classList.toggle('sidebar-collapsed');
            }
        });
    }
}

function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
    });
}

// ---- Rich Text Editor Commands ----
function execCmd(command, value = null) {
    if (command === 'formatBlock') {
        document.execCommand(command, false, `<${value}>`);
    } else {
        document.execCommand(command, false, value);
    }
    document.getElementById('courseDescription').focus();
}

function insertLink() {
    const url = prompt('Enter URL:', 'https://');
    if (url) {
        document.execCommand('createLink', false, url);
    }
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
        document.getElementById('courseDescription').innerHTML = course.description || '';
        document.getElementById('courseThumbnail').value = course.thumbnail || '';
        if (course.categoryId) document.getElementById('courseCategory').value = course.categoryId;

        document.getElementById('sectionsArea').style.display = 'block';
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
    const description = document.getElementById('courseDescription').innerHTML.trim();
    const thumbnail = document.getElementById('courseThumbnail').value.trim();
    const categoryId = document.getElementById('courseCategory').value;

    if (!name) {
        showToast('Course name is required', 'error');
        document.getElementById('courseName').focus();
        return;
    }

    showLoading('Saving course...');
    try {
        if (currentCourseId) {
            await FirestoreDB.updateCourse(currentCourseId, { name, description, thumbnail, categoryId });
            showToast('Course updated successfully!', 'success');
        } else {
            const id = await FirestoreDB.createCourse({ name, description, thumbnail, categoryId });
            currentCourseId = id;
            document.getElementById('pageTitle').textContent = 'Edit';
            document.getElementById('saveBtnText').textContent = 'Update Course';
            window.history.replaceState(null, '', `course-editor.html?id=${id}`);
            showToast('Course created successfully!', 'success');
        }
        document.getElementById('sectionsArea').style.display = 'block';
    } catch (error) {
        console.error('Save course error:', error);
        showToast('Failed to save course', 'error');
    } finally {
        hideLoading();
    }
}

// ---- Sections ----
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

async function addSection() {
    if (!currentCourseId) {
        showToast('Please save the course first', 'error');
        return;
    }

    const sectionName = `Section ${sectionsData.length + 1}`;
    const order = sectionsData.length;

    try {
        const sectionId = await FirestoreDB.createSection(currentCourseId, { name: sectionName, order });
        sectionsData.push({ id: sectionId, name: sectionName, order, contents: [] });
        renderSections();
        showToast('Section added', 'success');
        setTimeout(() => {
            const el = document.getElementById(`section-${sectionId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
    } catch (error) {
        console.error('Add section error:', error);
        showToast('Failed to add section', 'error');
    }
}

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

let sectionNameTimeout = {};
function updateSectionName(sectionId, name) {
    if (sectionNameTimeout[sectionId]) clearTimeout(sectionNameTimeout[sectionId]);
    sectionNameTimeout[sectionId] = setTimeout(async () => {
        try {
            await FirestoreDB.updateSection(currentCourseId, sectionId, { name });
            const section = sectionsData.find(s => s.id === sectionId);
            if (section) section.name = name;
        } catch (error) {
            console.error('Update section name error:', error);
        }
    }, 800);
}

// ---- Toggle Section Collapse ----
function toggleSection(sectionId) {
    collapsedSections[sectionId] = !collapsedSections[sectionId];
    const body = document.getElementById(`section-body-${sectionId}`);
    const icon = document.getElementById(`collapse-icon-${sectionId}`);
    if (body) {
        body.classList.toggle('collapsed');
    }
    if (icon) {
        icon.classList.toggle('rotated');
    }
}

// ---- Content CRUD ----
async function addContent(sectionId, type) {
    const order = (sectionsData.find(s => s.id === sectionId)?.contents || []).length;
    const contentData = { type, name: '', url: '', order };

    try {
        const contentId = await FirestoreDB.createContent(currentCourseId, sectionId, contentData);
        const section = sectionsData.find(s => s.id === sectionId);
        if (section) section.contents.push({ id: contentId, ...contentData });
        renderSections();
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} content added`, 'success');
    } catch (error) {
        console.error('Add content error:', error);
        showToast('Failed to add content', 'error');
    }
}

let contentUpdateTimeout = {};
function updateContentField(sectionId, contentId, field, value) {
    const key = `${contentId}-${field}`;
    if (contentUpdateTimeout[key]) clearTimeout(contentUpdateTimeout[key]);
    contentUpdateTimeout[key] = setTimeout(async () => {
        try {
            await FirestoreDB.updateContent(currentCourseId, sectionId, contentId, { [field]: value });
            const section = sectionsData.find(s => s.id === sectionId);
            if (section) {
                const content = section.contents.find(c => c.id === contentId);
                if (content) content[field] = value;
            }
            if (field === 'url') {
                const section = sectionsData.find(s => s.id === sectionId);
                const content = section?.contents.find(c => c.id === contentId);
                if (content?.type === 'video' && value) {
                    const previewEl = document.getElementById(`preview-${contentId}`);
                    if (previewEl) previewEl.innerHTML = getVideoPreviewHTML(value);
                }
            }
        } catch (error) {
            console.error('Update content error:', error);
        }
    }, 800);
}

async function deleteContent(sectionId, contentId) {
    if (!confirm('Delete this content item?')) return;
    try {
        await FirestoreDB.deleteContent(currentCourseId, sectionId, contentId);
        const section = sectionsData.find(s => s.id === sectionId);
        if (section) section.contents = section.contents.filter(c => c.id !== contentId);
        renderSections();
        showToast('Content deleted', 'success');
    } catch (error) {
        console.error('Delete content error:', error);
        showToast('Failed to delete content', 'error');
    }
}

async function moveSection(sectionId, direction) {
    const index = sectionsData.findIndex(s => s.id === sectionId);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sectionsData.length) return;
    [sectionsData[index], sectionsData[newIndex]] = [sectionsData[newIndex], sectionsData[index]];
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

    container.innerHTML = sectionsData.map((section, index) => {
        const isCollapsed = collapsedSections[section.id] || false;
        const contentCount = section.contents.length;

        return `
    <div class="section-item" id="section-${section.id}" style="opacity:1;">
      <div class="section-item-header">
        <div class="d-flex align-items-center gap-3 flex-grow-1">
          <button class="collapse-toggle-btn" onclick="toggleSection('${section.id}')" title="Expand/Collapse">
            <i class="bi bi-chevron-down collapse-icon ${isCollapsed ? 'rotated' : ''}" id="collapse-icon-${section.id}"></i>
          </button>
          <span class="section-number">${index + 1}</span>
          <input type="text" class="form-custom section-title-input"
                 value="${escapeAttr(section.name)}"
                 placeholder="Section Name"
                 oninput="updateSectionName('${section.id}', this.value)">
          <span class="badge-custom primary" style="white-space:nowrap;">${contentCount} item${contentCount !== 1 ? 's' : ''}</span>
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

      <!-- Collapsible Body -->
      <div class="section-body ${isCollapsed ? 'collapsed' : ''}" id="section-body-${section.id}">
        <div id="contents-${section.id}">
          ${section.contents.map(content => renderContentItem(section.id, content)).join('')}
        </div>

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
    </div>
    `;
    }).join('');
}

function renderContentItem(sectionId, content) {
    const typeIcons = { video: 'bi-play-circle', pdf: 'bi-file-earmark-pdf', file: 'bi-file-earmark-arrow-down' };
    const typePlaceholders = {
        video: { name: 'Video Title', url: 'https://youtube.com/watch?v=...' },
        pdf: { name: 'PDF Title', url: 'https://example.com/document.pdf' },
        file: { name: 'File Name', url: 'https://example.com/file.zip' }
    };
    const ph = typePlaceholders[content.type] || typePlaceholders.file;

    let previewHTML = '';
    if (content.type === 'video' && content.url) {
        previewHTML = `<div class="video-preview-wrapper" id="preview-${content.id}">${getVideoPreviewHTML(content.url)}</div>`;
    } else if (content.type === 'video') {
        previewHTML = `<div id="preview-${content.id}"></div>`;
    }

    let downloadLink = '';
    if ((content.type === 'pdf' || content.type === 'file') && content.url) {
        downloadLink = `<a href="${escapeAttr(content.url)}" target="_blank" class="btn-outline-custom mt-2" style="font-size:0.8rem;"><i class="bi bi-download"></i> Preview / Download</a>`;
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
        ${content.type === 'video' ? `
        <div class="col-12">
          <input type="url" class="form-custom" style="font-size:0.85rem"
                 value="${escapeAttr(content.subtitleUrl || '')}"
                 placeholder="Subtitle URL (.vtt file)"
                 oninput="updateContentField('${sectionId}', '${content.id}', 'subtitleUrl', this.value)">
        </div>` : ''}
      </div>
      ${previewHTML}
      ${downloadLink}
    </div>
  `;
}

// ---- Video Preview (fixed size) ----
function getVideoPreviewHTML(url) {
    if (!url) return '';
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/([\w-]{11}))/);
    const ytMatch2 = url.match(/[?&]v=([\w-]{11})/);
    const ytId = ytMatch?.[1] || ytMatch2?.[1];
    if (ytId) {
        return `<iframe src="https://www.youtube.com/embed/${ytId}" allowfullscreen loading="lazy" style="width:100%;height:100%;border:none;"></iframe>`;
    }
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
        return `<iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" allowfullscreen loading="lazy" style="width:100%;height:100%;border:none;"></iframe>`;
    }
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
    if (driveMatch) {
        return `<iframe src="https://drive.google.com/file/d/${driveMatch[1]}/preview" allowfullscreen loading="lazy" style="width:100%;height:100%;border:none;"></iframe>`;
    }
    if (url.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
        return `<video controls preload="metadata" style="width:100%;height:100%;"><source src="${escapeAttr(url)}"></video>`;
    }
    return `<iframe src="${escapeAttr(url)}" allowfullscreen loading="lazy" style="width:100%;height:100%;border:none;"></iframe>`;
}

// =======================================
// UTILITY FUNCTIONS
// =======================================
function showLoading(text = 'Loading...') {
    const o = document.getElementById('loadingOverlay');
    document.getElementById('loadingText').textContent = text;
    o.style.display = 'flex';
    o.style.opacity = '1';
}
function hideLoading() {
    const o = document.getElementById('loadingOverlay');
    o.style.opacity = '0';
    setTimeout(() => o.style.display = 'none', 300);
}
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', info: 'bi-info-circle-fill' };
    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;
    toast.innerHTML = `<i class="bi ${icons[type]} toast-icon"></i><span class="toast-msg">${message}</span><button class="toast-close" onclick="this.parentElement.remove()"><i class="bi bi-x-lg"></i></button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'fadeIn 0.3s ease reverse forwards'; setTimeout(() => toast.remove(), 300); }, 4000);
}
function escapeHTML(str) { if (!str) return ''; const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
function escapeAttr(str) { if (!str) return ''; return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// =======================================
// HUGGING FACE BROWSER FUNCTIONS
// =======================================

let hfToken = null;
let hfCurrentRepo = null;
let hfCurrentPath = '';
let hfImportData = []; // folders to import
let hfBreadcrumbPath = [];

function hfShowView(viewId) {
    ['hfLoading', 'hfNoToken', 'hfDatasetList', 'hfFileList', 'hfImportPreview'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    if (viewId) document.getElementById(viewId).style.display = 'block';
}

function hfShowFooter(show) {
    document.getElementById('hfModalFooter').style.display = show ? 'flex' : 'none';
}

async function openHFBrowser() {
    if (!currentCourseId) {
        showToast('Please save the course first before importing content', 'error');
        return;
    }

    const modal = new bootstrap.Modal(document.getElementById('hfBrowserModal'));
    modal.show();

    hfShowView('hfLoading');
    hfShowFooter(false);
    document.getElementById('hfBreadcrumb').style.display = 'none';
    document.getElementById('hfModalTitle').textContent = 'Import from Hugging Face';

    try {
        hfToken = await HuggingFaceAPI.getToken();
        if (!hfToken) {
            hfShowView('hfNoToken');
            return;
        }

        const datasets = await HuggingFaceAPI.listDatasets(hfToken);
        renderHFDatasets(datasets);
    } catch (e) {
        hfShowView('hfNoToken');
        console.error('HF Browser error:', e);
    }
}

function renderHFDatasets(datasets) {
    const container = document.getElementById('hfDatasetList');
    hfBreadcrumbPath = [];
    updateHFBreadcrumb();

    if (datasets.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px 0; color:var(--text-muted);">
            <i class="bi bi-database-x" style="font-size:2.5rem; display:block; margin-bottom:12px;"></i>
            <p>No datasets found in your account.</p>
        </div>`;
        hfShowView('hfDatasetList');
        return;
    }

    container.innerHTML = datasets.map(d => `
        <div class="hf-item" onclick="browseHFDataset('${escapeAttr(d.id)}')" style="
            display:flex; align-items:center; justify-content:space-between;
            padding:14px 18px; background:var(--bg-section); border:1px solid var(--border-color);
            border-radius:12px; margin-bottom:8px; cursor:pointer; transition:all 0.2s ease;">
            <div style="display:flex; align-items:center; gap:12px;">
                <i class="bi bi-database" style="font-size:1.3rem; color:var(--primary);"></i>
                <div>
                    <div style="font-weight:600; font-size:0.95rem;">${escapeHTML(d.name)}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">${escapeHTML(d.id)}</div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="padding:3px 10px; border-radius:20px; font-size:0.72rem; font-weight:600;
                    background:${d.private ? 'rgba(255,159,67,0.15)' : 'rgba(0,210,106,0.15)'};
                    color:${d.private ? '#ff9f43' : '#00d26a'};">${d.private ? 'PRIVATE' : 'PUBLIC'}</span>
                <i class="bi bi-chevron-right" style="color:var(--text-muted);"></i>
            </div>
        </div>
    `).join('');

    hfShowView('hfDatasetList');
}

async function browseHFDataset(repoId) {
    hfCurrentRepo = repoId;
    hfCurrentPath = '';
    hfBreadcrumbPath = [{ name: repoId.split('/').pop(), path: '' }];
    await loadHFFolder(repoId, '');
}

async function browseHFFolder(path) {
    const pathParts = path.split('/');
    const name = HuggingFaceAPI.parseFileName(pathParts[pathParts.length - 1]);

    // Find if we're going back in breadcrumb or forward
    const existingIdx = hfBreadcrumbPath.findIndex(b => b.path === path);
    if (existingIdx >= 0) {
        hfBreadcrumbPath = hfBreadcrumbPath.slice(0, existingIdx + 1);
    } else {
        hfBreadcrumbPath.push({ name, path });
    }

    await loadHFFolder(hfCurrentRepo, path);
}

async function loadHFFolder(repoId, path) {
    hfShowView('hfLoading');
    hfShowFooter(false);
    updateHFBreadcrumb();

    try {
        const items = await HuggingFaceAPI.listTree(hfToken, repoId, path);
        renderHFFileList(items, path);
    } catch (e) {
        showToast('Failed to load folder: ' + e.message, 'error');
        console.error('Load folder error:', e);
    }
}

function updateHFBreadcrumb() {
    const container = document.getElementById('hfBreadcrumb');
    if (hfBreadcrumbPath.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    const nav = container.querySelector('nav');

    let html = `<span style="cursor:pointer; color:var(--primary);" onclick="openHFBrowser()">
        <i class="bi bi-box-fill" style="color:#FFD43B; margin-right:4px;"></i>Datasets
    </span>`;

    hfBreadcrumbPath.forEach((item, idx) => {
        html += ` <i class="bi bi-chevron-right" style="font-size:0.7rem; color:var(--text-muted); margin:0 6px;"></i> `;
        if (idx < hfBreadcrumbPath.length - 1) {
            html += `<span style="cursor:pointer; color:var(--primary);" onclick="browseHFFolder('${escapeAttr(item.path)}')">${escapeHTML(item.name)}</span>`;
        } else {
            html += `<span style="color:var(--text-primary); font-weight:600;">${escapeHTML(item.name)}</span>`;
        }
    });

    nav.innerHTML = html;
}

function renderHFFileList(items, currentPath) {
    const container = document.getElementById('hfFileList');
    const folders = items.filter(i => i.type === 'directory');
    const files = items.filter(i => i.type === 'file');

    let html = '';

    // Select All Folder button (if there are folders with importable content)
    if (folders.length > 0) {
        html += `<div style="margin-bottom:12px; display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn-outline-custom" onclick="selectAllFolders()" style="font-size:0.82rem;">
                <i class="bi bi-folder-check"></i> Import All Folders
            </button>
        </div>`;
    }

    // Folders
    folders.forEach(item => {
        const displayName = HuggingFaceAPI.parseFileName(item.name);
        html += `
        <div class="hf-item" style="display:flex; align-items:center; justify-content:space-between;
            padding:12px 16px; background:var(--bg-section); border:1px solid var(--border-color);
            border-radius:10px; margin-bottom:6px; transition:all 0.2s ease;">
            <div style="display:flex; align-items:center; gap:10px; cursor:pointer; flex:1;"
                 onclick="browseHFFolder('${escapeAttr(item.path)}')">
                <i class="bi bi-folder-fill" style="font-size:1.2rem; color:#FFD43B;"></i>
                <span style="font-weight:500; font-size:0.9rem;">${escapeHTML(displayName)}</span>
                <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHTML(item.name)}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <button class="btn-outline-custom" onclick="selectHFFolder('${escapeAttr(item.path)}')"
                    style="font-size:0.78rem; padding:4px 12px;">
                    <i class="bi bi-download"></i> Import
                </button>
                <i class="bi bi-chevron-right" style="color:var(--text-muted); cursor:pointer;"
                   onclick="browseHFFolder('${escapeAttr(item.path)}')"></i>
            </div>
        </div>`;
    });

    // Files
    files.forEach(item => {
        const fileType = HuggingFaceAPI.detectFileType(item.name);
        const typeIcons = { video: 'bi-play-circle', pdf: 'bi-file-earmark-pdf', subtitle: 'bi-badge-cc', file: 'bi-file-earmark', image: 'bi-image' };
        const typeColors = { video: 'var(--primary-light)', pdf: '#E17055', subtitle: '#00cec9', file: 'var(--accent)', image: '#a29bfe' };
        const sizeStr = item.size ? (item.size > 1048576 ? (item.size / 1048576).toFixed(1) + ' MB' : (item.size / 1024).toFixed(0) + ' KB') : '';

        html += `
        <div style="display:flex; align-items:center; justify-content:space-between;
            padding:10px 16px; background:var(--bg-section); border:1px solid var(--border-color);
            border-radius:10px; margin-bottom:4px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <i class="bi ${typeIcons[fileType] || typeIcons.file}" style="color:${typeColors[fileType] || typeColors.file};"></i>
                <span style="font-size:0.85rem;">${escapeHTML(HuggingFaceAPI.parseFileName(item.name, true))}</span>
                <span style="font-size:0.72rem; padding:2px 8px; border-radius:12px; background:rgba(108,92,231,0.1); color:var(--primary-light);">${fileType.toUpperCase()}</span>
            </div>
            <span style="font-size:0.75rem; color:var(--text-muted);">${sizeStr}</span>
        </div>`;
    });

    if (items.length === 0) {
        html = `<div style="text-align:center; padding:40px 0; color:var(--text-muted);">
            <i class="bi bi-folder2-open" style="font-size:2rem; display:block; margin-bottom:8px;"></i>
            <p>This folder is empty.</p>
        </div>`;
    }

    container.innerHTML = html;
    hfShowView('hfFileList');
}

async function selectAllFolders() {
    hfShowView('hfLoading');
    hfShowFooter(false);

    try {
        const items = await HuggingFaceAPI.listTree(hfToken, hfCurrentRepo, hfCurrentPath);
        const folders = items.filter(i => i.type === 'directory');

        if (folders.length === 0) {
            showToast('No folders found to import', 'error');
            hfShowView('hfFileList');
            return;
        }

        hfImportData = [];
        for (const folder of folders) {
            const processed = await HuggingFaceAPI.processFolder(hfToken, hfCurrentRepo, folder.path);
            if (processed.items.length > 0) {
                hfImportData.push(processed);
            }
        }

        if (hfImportData.length === 0) {
            showToast('No importable content found in these folders', 'error');
            hfShowView('hfFileList');
            return;
        }

        renderImportPreview();
    } catch (e) {
        showToast('Failed to process folders: ' + e.message, 'error');
        hfShowView('hfFileList');
    }
}

async function selectHFFolder(folderPath) {
    hfShowView('hfLoading');
    hfShowFooter(false);

    try {
        const processed = await HuggingFaceAPI.processFolder(hfToken, hfCurrentRepo, folderPath);

        if (processed.items.length === 0) {
            showToast('No importable files found in this folder', 'error');
            hfShowView('hfFileList');
            return;
        }

        hfImportData = [processed];
        renderImportPreview();
    } catch (e) {
        showToast('Failed to process folder: ' + e.message, 'error');
        hfShowView('hfFileList');
    }
}

function renderImportPreview() {
    const container = document.getElementById('hfImportPreview');
    document.getElementById('hfModalTitle').textContent = 'Import Preview';

    let html = `<div style="margin-bottom:16px; padding:12px 16px; border-radius:10px; background:rgba(0,210,106,0.08); border:1px solid rgba(0,210,106,0.2); font-size:0.85rem; color:#00d26a;">
        <i class="bi bi-info-circle"></i> Review and edit section/content names before importing. Uncheck items you don't want.
    </div>`;

    hfImportData.forEach((folder, fi) => {
        html += `
        <div style="background:var(--bg-section); border:1px solid var(--border-color); border-radius:12px; padding:16px; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
                <i class="bi bi-folder-fill" style="color:#FFD43B; font-size:1.1rem;"></i>
                <label class="form-label-custom" style="margin:0; font-size:0.8rem;">Section Name</label>
            </div>
            <input type="text" class="form-custom" id="hf-section-${fi}"
                   value="${escapeAttr(folder.folderName)}"
                   style="font-size:0.9rem; font-weight:600; margin-bottom:12px;">
        `;

        folder.items.forEach((item, ii) => {
            const typeIcons = { video: 'bi-play-circle', pdf: 'bi-file-earmark-pdf', file: 'bi-file-earmark-arrow-down' };
            const typeColors = { video: 'var(--primary-light)', pdf: '#E17055', file: 'var(--accent)' };
            const subtitleInfo = item.subtitleUrl ? `<span style="font-size:0.7rem; color:#00cec9; margin-left:8px;"><i class="bi bi-badge-cc"></i> Subtitle matched</span>` : '';

            html += `
            <div style="display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px;
                background:var(--bg-card); border:1px solid var(--border-color); margin-bottom:4px;">
                <input type="checkbox" id="hf-check-${fi}-${ii}" ${item.selected ? 'checked' : ''}
                       onchange="hfImportData[${fi}].items[${ii}].selected = this.checked"
                       style="width:18px; height:18px; accent-color:var(--primary);">
                <i class="bi ${typeIcons[item.type] || 'bi-file-earmark'}" style="color:${typeColors[item.type] || 'var(--accent)'};"></i>
                <input type="text" class="form-custom" id="hf-name-${fi}-${ii}"
                       value="${escapeAttr(item.name)}"
                       oninput="hfImportData[${fi}].items[${ii}].name = this.value"
                       style="font-size:0.82rem; flex:1;">
                <span style="font-size:0.7rem; padding:2px 8px; border-radius:10px; white-space:nowrap;
                    background:rgba(108,92,231,0.1); color:var(--primary-light);">${item.type.toUpperCase()}</span>
                ${subtitleInfo}
            </div>`;
        });

        html += `</div>`;
    });

    container.innerHTML = html;
    hfShowView('hfImportPreview');
    hfShowFooter(true);
}

async function executeHFImport() {
    const btn = document.getElementById('hfImportBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Importing...';

    let sectionsCreated = 0;
    let contentsCreated = 0;

    try {
        for (let fi = 0; fi < hfImportData.length; fi++) {
            const folder = hfImportData[fi];
            const sectionName = document.getElementById(`hf-section-${fi}`).value.trim() || folder.folderName;
            const selectedItems = folder.items.filter(item => item.selected);

            if (selectedItems.length === 0) continue;

            // Create section
            const sectionOrder = sectionsData.length;
            const sectionId = await FirestoreDB.createSection(currentCourseId, {
                name: sectionName,
                order: sectionOrder
            });

            const newSection = { id: sectionId, name: sectionName, order: sectionOrder, contents: [] };

            // Create contents
            for (let ii = 0; ii < selectedItems.length; ii++) {
                const item = selectedItems[ii];
                // Get the potentially edited name from the input field
                const inputEl = document.getElementById(`hf-name-${fi}-${folder.items.indexOf(item)}`);
                const contentName = inputEl ? inputEl.value.trim() : item.name;

                // Build URL without token (token is injected by player)
                const url = HuggingFaceAPI.resolveURL(hfCurrentRepo, folder.folderPath + '/' + item.originalName, null);
                const subtitleUrl = item.subtitleUrl ?
                    HuggingFaceAPI.resolveURL(hfCurrentRepo, folder.folderPath + '/' + (item.subtitle ? item.subtitle.name : ''), null) : '';

                const contentData = {
                    type: item.type === 'subtitle' ? 'file' : item.type,
                    name: contentName,
                    url: url,
                    order: ii
                };

                if (item.type === 'video' && subtitleUrl) {
                    contentData.subtitleUrl = subtitleUrl;
                }

                const contentId = await FirestoreDB.createContent(currentCourseId, sectionId, contentData);
                newSection.contents.push({ id: contentId, ...contentData });
                contentsCreated++;
            }

            sectionsData.push(newSection);
            sectionsCreated++;
        }

        renderSections();
        showToast(`Imported ${sectionsCreated} section(s) with ${contentsCreated} content item(s)!`, 'success');

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('hfBrowserModal')).hide();

    } catch (e) {
        console.error('Import error:', e);
        showToast('Import failed: ' + e.message, 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-download"></i> Import Selected';
}

