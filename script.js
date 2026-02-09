/* ===============================
   SMART BOOKMARK MANAGER
   =============================== */

/* ---------- STORAGE ---------- */
const STORAGE_KEY = "pinpoint_bookmarks";
const THEME_KEY = "pinpoint-theme";

/* ---------- STATE ---------- */
let bookmarks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let currentView = "all";
let selectedBookmarks = new Set();
let editingId = null;

/* ---------- DOM ---------- */
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");

const bookmarksContainer = document.getElementById("bookmarksContainer");
const emptyState = document.getElementById("emptyState");
const bookmarkCount = document.getElementById("bookmarkCount");
const pageTitle = document.getElementById("pageTitle");
const searchInput = document.getElementById("searchInput");

const bookmarkModal = document.getElementById("bookmarkModal");
const exportModal = document.getElementById("exportModal");
const statsModal = document.getElementById("statsModal");

const bookmarkForm = document.getElementById("bookmarkForm");
const titleInput = document.getElementById("bookmarkTitle");
const urlInput = document.getElementById("bookmarkUrl");
const descInput = document.getElementById("bookmarkDescription");
const tagInput = document.getElementById("tagInput");
const tagInputContainer = document.getElementById("tagInputContainer");

/* ---------- INITIALIZE THEME ---------- */
function initializeTheme() {
  const themeToggle = document.getElementById("themeToggle");
  const root = document.documentElement;
  
  // Check saved theme or prefer dark mode
  const savedTheme = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme) {
    root.setAttribute("data-theme", savedTheme);
  } else if (prefersDark) {
    root.setAttribute("data-theme", "dark");
    localStorage.setItem(THEME_KEY, "dark");
  } else {
    root.setAttribute("data-theme", "light");
    localStorage.setItem(THEME_KEY, "light");
  }
  
  // Update toggle button text
  updateThemeToggleText();
  
  // Add event listener
  themeToggle.addEventListener("click", toggleTheme);
}

/* ---------- TOGGLE THEME ---------- */
function toggleTheme() {
  const root = document.documentElement;
  const currentTheme = root.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  
  root.setAttribute("data-theme", newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
  
  updateThemeToggleText();
}

/* ---------- UPDATE TOGGLE TEXT ---------- */
function updateThemeToggleText() {
  const themeToggle = document.getElementById("themeToggle");
  const root = document.documentElement;
  const isDark = root.getAttribute("data-theme") === "dark";
  
  themeToggle.innerHTML = isDark 
    ? '<i class="fas fa-sun"></i> Light'
    : '<i class="fas fa-moon"></i> Dark';
}

/* ---------- SIDEBAR (MOBILE FIX) ---------- */
function openSidebar() {
  sidebar.classList.add("active");
  sidebarOverlay.classList.add("active");
  document.body.style.overflow = "hidden"; // Prevent scrolling when sidebar is open
}

function closeSidebar() {
  sidebar.classList.remove("active");
  sidebarOverlay.classList.remove("active");
  document.body.style.overflow = ""; // Restore scrolling
}

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", openSidebar);
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener("click", closeSidebar);
}

// Close sidebar when clicking on nav links
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', closeSidebar);
});

/* ---------- UTILS ---------- */
function saveBookmarks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  updateStorageStats();
  render();
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/* ---------- STORAGE STATS ---------- */
function updateStorageStats() {
  const storageCount = document.getElementById('storageCount');
  const storageSize = document.getElementById('storageSize');
  const storageBar = document.getElementById('storageBar');
  
  if (!storageCount || !storageSize || !storageBar) return;
  
  const count = bookmarks.length;
  const dataSize = JSON.stringify(bookmarks).length;
  const sizeInMB = (dataSize / (1024 * 1024)).toFixed(2);
  
  // Calculate percentage (assuming 5MB limit for demo)
  const maxStorage = 5 * 1024 * 1024; // 5MB in bytes
  const percentage = Math.min((dataSize / maxStorage) * 100, 100);
  
  storageCount.textContent = `${count} bookmark${count !== 1 ? 's' : ''}`;
  storageSize.textContent = `${sizeInMB} MB`;
  storageBar.style.width = `${percentage}%`;
}

/* ---------- FILTER ---------- */
function getFilteredBookmarks() {
  let list = [...bookmarks];

  if (currentView === "favorites") list = list.filter(b => b.favorite);
  if (currentView === "archived") list = list.filter(b => b.archived);
  if (currentView === "recent") {
    const week = Date.now() - 7 * 86400000;
    list = list.filter(b => b.createdAt >= week);
  }

  const q = searchInput.value.toLowerCase();
  if (q) {
    list = list.filter(b =>
      (b.title && b.title.toLowerCase().includes(q)) ||
      (b.url && b.url.toLowerCase().includes(q)) ||
      (b.tags && b.tags.join(" ").toLowerCase().includes(q))
    );
  }

  return list;
}

/* ---------- RENDER ---------- */
function render() {
  const list = getFilteredBookmarks();
  bookmarksContainer.innerHTML = "";

  bookmarkCount.textContent = `${list.length} bookmark${list.length !== 1 ? 's' : ''}`;

  if (!list.length) {
    bookmarksContainer.appendChild(emptyState);
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  
  list.forEach(b => {
    const card = document.createElement("div");
    card.className = "bookmark-card";
    card.dataset.id = b.id;
    
    // Format date
    const date = new Date(b.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    // Get favicon URL
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(b.url).hostname}&sz=32`;
    
    card.innerHTML = `
      <div class="selection-checkbox"></div>
      <div class="bookmark-header">
        <div class="bookmark-favicon">
          <img src="${faviconUrl}" alt="favicon">
        </div>
        <div class="bookmark-info">
          <div class="bookmark-title">
            ${b.title}
            ${b.favorite ? '<i class="fas fa-star" style="color: var(--warning);"></i>' : ''}
          </div>
          <a href="${b.url}" target="_blank" class="bookmark-url text-truncate">
            ${b.url}
          </a>
        </div>
        <div class="bookmark-actions">
          <button class="action-menu">
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </div>
      ${b.description ? `<div class="bookmark-description">${b.description}</div>` : ''}
      ${b.tags && b.tags.length ? `
        <div class="bookmark-tags">
          ${b.tags.map(tag => `<span class="bookmark-tag">${tag}</span>`).join('')}
        </div>
      ` : ''}
      <div class="bookmark-footer">
        <div class="bookmark-stats">
          <span class="stat-item">
            <i class="far fa-calendar"></i>
            ${formattedDate}
          </span>
        </div>
        <div class="footer-actions">
          <button class="footer-btn favorite-btn ${b.favorite ? 'active' : ''}" title="Favorite">
            <i class="fas fa-star"></i>
          </button>
          <button class="footer-btn archive-btn ${b.archived ? 'active' : ''}" title="Archive">
            <i class="fas fa-archive"></i>
          </button>
          <button class="footer-btn delete-btn" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    
    // Add event listeners to the buttons
    const favoriteBtn = card.querySelector('.favorite-btn');
    const archiveBtn = card.querySelector('.archive-btn');
    const deleteBtn = card.querySelector('.delete-btn');
    const menuBtn = card.querySelector('.action-menu');
    
    favoriteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(b.id);
    });
    
    archiveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleArchive(b.id);
    });
    
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteBookmark(b.id);
    });
    
    // Open bookmark on card click (except when clicking buttons)
    card.addEventListener('click', (e) => {
      if (!e.target.closest('button') && !e.target.closest('.selection-checkbox')) {
        window.open(b.url, '_blank');
      }
    });
    
    bookmarksContainer.appendChild(card);
  });
}

/* ---------- BOOKMARK ACTIONS ---------- */
function toggleFavorite(id) {
  const index = bookmarks.findIndex(b => b.id === id);
  if (index !== -1) {
    bookmarks[index].favorite = !bookmarks[index].favorite;
    saveBookmarks();
  }
}

function toggleArchive(id) {
  const index = bookmarks.findIndex(b => b.id === id);
  if (index !== -1) {
    bookmarks[index].archived = !bookmarks[index].archived;
    saveBookmarks();
  }
}

function deleteBookmark(id) {
  if (confirm('Are you sure you want to delete this bookmark?')) {
    bookmarks = bookmarks.filter(b => b.id !== id);
    saveBookmarks();
  }
}

/* ---------- ADD BOOKMARK ---------- */
document.getElementById("addBookmarkBtn").onclick = () => {
  editingId = null;
  bookmarkForm.reset();
  clearTags();
  document.getElementById("modalTitle").textContent = "Add New Bookmark";
  bookmarkModal.classList.add("active");
};

document.getElementById("addFirstBookmark").onclick = () => {
  editingId = null;
  bookmarkForm.reset();
  clearTags();
  document.getElementById("modalTitle").textContent = "Add New Bookmark";
  bookmarkModal.classList.add("active");
};

document.getElementById("cancelModal").onclick = () =>
  bookmarkModal.classList.remove("active");

bookmarkForm.onsubmit = e => {
  e.preventDefault();
  
  // Validate URL
  let url = urlInput.value.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  const bookmarkData = {
    id: editingId || uid(),
    title: titleInput.value.trim(),
    url: url,
    description: descInput.value.trim(),
    tags: getTags(),
    favorite: false,
    archived: false,
    createdAt: editingId ? bookmarks.find(b => b.id === editingId)?.createdAt || Date.now() : Date.now(),
    updatedAt: Date.now()
  };
  
  if (editingId) {
    // Update existing bookmark
    const index = bookmarks.findIndex(b => b.id === editingId);
    if (index !== -1) {
      bookmarks[index] = bookmarkData;
    }
  } else {
    // Add new bookmark
    bookmarks.unshift(bookmarkData);
  }
  
  bookmarkModal.classList.remove("active");
  saveBookmarks();
};

/* ---------- TAGS ---------- */
function addTag(tag) {
  const el = document.createElement("span");
  el.className = "tag-pill";
  el.innerHTML = `${tag} <span class="remove-tag"><i class="fas fa-times"></i></span>`;
  el.querySelector('.remove-tag').onclick = () => el.remove();
  tagInputContainer.insertBefore(el, tagInput);
}

function getTags() {
  return [...tagInputContainer.querySelectorAll(".tag-pill")]
    .map(t => t.textContent.replace('×', '').trim());
}

function clearTags() {
  tagInputContainer.querySelectorAll(".tag-pill").forEach(t => t.remove());
}

tagInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && tagInput.value.trim()) {
    e.preventDefault();
    addTag(tagInput.value.trim());
    tagInput.value = "";
  }
});

// Allow comma as separator too
tagInput.addEventListener("keyup", e => {
  if (e.key === "," && tagInput.value.trim()) {
    addTag(tagInput.value.trim().replace(',', ''));
    tagInput.value = "";
  }
});

/* ---------- NAV ---------- */
document.querySelectorAll(".nav-links a").forEach(a => {
  a.onclick = (e) => {
    e.preventDefault();
    document.querySelector(".nav-links .active")?.classList.remove("active");
    a.classList.add("active");
    currentView = a.dataset.view;
    pageTitle.textContent = a.querySelector('span') ? a.querySelector('span').textContent : a.textContent.trim();
    selectedBookmarks.clear();
    render();
  };
});

/* ---------- SEARCH ---------- */
searchInput.addEventListener("input", () => {
  clearTimeout(searchInput.timeout);
  searchInput.timeout = setTimeout(render, 300);
});

/* ---------- EXPORT/IMPORT ---------- */
document.getElementById('exportBtn').addEventListener('click', () => {
  exportModal.classList.add('active');
});

document.getElementById('importBtn').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.html,.csv';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (Array.isArray(data)) {
          bookmarks = data;
          saveBookmarks();
          alert('Bookmarks imported successfully!');
        }
      } catch (error) {
        alert('Error importing bookmarks. Please check the file format.');
      }
    };
    
    reader.readAsText(file);
  };
  
  input.click();
});

/* ---------- INIT ---------- */
initializeTheme();
render();
updateStorageStats();

// Add sample data if empty
if (bookmarks.length === 0) {
  bookmarks = [
    {
      id: uid(),
      title: "GitHub",
      url: "https://github.com",
      description: "Code hosting platform",
      tags: ["development", "code"],
      favorite: true,
      archived: false,
      createdAt: Date.now() - 86400000
    },
    {
      id: uid(),
      title: "MDN Web Docs",
      url: "https://developer.mozilla.org",
      description: "Web development documentation",
      tags: ["development", "documentation"],
      favorite: true,
      archived: false,
      createdAt: Date.now() - 172800000
    },
    {
      id: uid(),
      title: "CSS Tricks",
      url: "https://css-tricks.com",
      description: "Frontend development blog",
      tags: ["css", "frontend"],
      favorite: false,
      archived: false,
      createdAt: Date.now() - 259200000
    }
  ];
  saveBookmarks();
}