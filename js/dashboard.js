// ================================================
// Dashboard Logic — Eduvance LMS Admin
// ================================================

document.addEventListener('DOMContentLoaded', () => {
  // Auth guard
  if (!Auth.requireAuth()) return;

  // Set admin email
  const admin = Auth.getAdmin();
  if (admin) {
    document.getElementById('adminEmail').textContent = admin.email;
  }

  // Initialize
  initSidebar();
  loadDashboard();
  setupLogout();
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

// ---- Load Dashboard Data ----
async function loadDashboard() {
  try {
    // Load stats
    const stats = await FirestoreDB.getStats();
    animateCounter('statCourses', stats.totalCourses);
    animateCounter('statSections', stats.totalSections);
    animateCounter('statVideos', stats.totalVideos);
    animateCounter('statPdfs', stats.totalPdfs);

    // Load new analytics
    const [studentCount, enrollmentCount, announcements, recentStudents] = await Promise.all([
      FirestoreDB.getStudentCount(),
      FirestoreDB.getEnrollmentCount(),
      FirestoreDB.getAllAnnouncements(),
      FirestoreDB.getRecentStudents(100) // Get last 100 to filter by 7 days
    ]);

    animateCounter('statStudents', studentCount);
    animateCounter('statEnrollments', enrollmentCount);

    const activeAnnouncements = announcements.filter(a => a.active).length;
    animateCounter('statAnnouncements', activeAnnouncements);

    // Count signups in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSignupCount = recentStudents.filter(s =>
      s.createdAt && s.createdAt.toDate() >= sevenDaysAgo
    ).length;
    animateCounter('statRecentSignups', recentSignupCount);

    // Load course list
    const courses = await FirestoreDB.getAllCourses();
    renderCourseList(courses);
  } catch (error) {
    console.error('Dashboard load error:', error);
    showToast('Failed to load dashboard data', 'error');
  } finally {
    hideLoading();
  }
}

// ---- Animate Counter ----
function animateCounter(elementId, target) {
  const el = document.getElementById(elementId);
  const duration = 1000;
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = Math.floor(current);
  }, 16);
}

// ---- Render Course List ----
function renderCourseList(courses) {
  const container = document.getElementById('courseListContainer');

  if (courses.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-journal-plus"></i>
        <h6>No Courses Yet</h6>
        <p>Create your first course to get started</p>
        <a href="course-editor.html" class="btn-gradient mt-3">
          <i class="bi bi-plus-lg"></i> Create Course
        </a>
      </div>
    `;
    return;
  }

  let tableHTML = `
    <table class="table-custom">
      <thead>
        <tr>
          <th>#</th>
          <th>Course Name</th>
          <th>Description</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  courses.forEach((course, index) => {
    const createdAt = course.createdAt
      ? new Date(course.createdAt.seconds * 1000).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      })
      : 'N/A';

    const desc = course.description
      ? (course.description.length > 60 ? course.description.substring(0, 60) + '...' : course.description)
      : '—';

    tableHTML += `
      <tr>
        <td data-label="#">${index + 1}</td>
        <td data-label="Name">
          <strong>${escapeHTML(course.name)}</strong>
        </td>
        <td data-label="Description" style="color:var(--text-secondary)">
          ${escapeHTML(desc)}
        </td>
        <td data-label="Created">
          <span class="badge-custom primary">${createdAt}</span>
        </td>
        <td data-label="Actions">
          <div class="d-flex gap-2">
            <a href="course-editor.html?id=${course.id}" class="btn-action" title="Edit">
              <i class="bi bi-pencil"></i>
            </a>
            <button class="btn-action danger" onclick="confirmDelete('${course.id}', '${escapeHTML(course.name)}')" title="Delete">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tableHTML += '</tbody></table>';
  container.innerHTML = tableHTML;
}

// ---- Delete Course ----
let deleteCourseId = null;

function confirmDelete(courseId, courseName) {
  deleteCourseId = courseId;
  document.getElementById('deleteCourseTitle').textContent = courseName;
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (!deleteCourseId) return;

  const btn = document.getElementById('confirmDeleteBtn');
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Deleting...';
  btn.disabled = true;

  try {
    await FirestoreDB.deleteCourse(deleteCourseId);
    showToast('Course deleted successfully', 'success');

    // Close modal and reload
    bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
    loadDashboard();
  } catch (error) {
    console.error('Delete error:', error);
    showToast('Failed to delete course', 'error');
  } finally {
    btn.innerHTML = '<i class="bi bi-trash3"></i> Delete';
    btn.disabled = false;
    deleteCourseId = null;
  }
});

// ---- Toast ----
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

  // Auto remove after 4s
  setTimeout(() => {
    toast.style.animation = 'fadeIn 0.3s ease reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ---- Hide Loading Overlay ----
function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.style.opacity = '0';
  setTimeout(() => overlay.style.display = 'none', 300);
}

// ---- Escape HTML ----
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
