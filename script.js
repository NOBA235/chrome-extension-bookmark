/* ===============================
   PINPOINT - SMART BOOKMARK MANAGER
   Version: 2.0.0
   =============================== */

/* ---------- CONSTANTS & STORAGE KEYS ---------- */
const STORAGE_KEYS = {
  BOOKMARKS: 'pinpoint_bookmarks',
  SETTINGS: 'pinpoint_settings',
  THEME: 'pinpoint_theme',
  TAGS: 'pinpoint_tags',
  BACKUP: 'pinpoint_backup'
};

const DEFAULT_SETTINGS = {
  theme: 'auto',
  layout: 'grid',
  defaultView: 'all',
  itemsPerPage: 50,
  autoFetchFavicon: true,
  autoBackup: false,
  sortBy: 'date-desc',
  showFavicons: true,
  compactView: false,
  confirmDelete: true
};

/* ---------- STATE MANAGEMENT ---------- */
class StateManager {
  constructor() {
    this.bookmarks = this.loadBookmarks();
    this.settings = this.loadSettings();
    this.currentView = 'all';
    this.selectedBookmarks = new Set();
    this.editingId = null;
    this.currentSort = 'date-desc';
    this.searchQuery = '';
    this.isSelectionMode = false;
    this.tags = this.loadTags();
    this.init();
  }

  init() {
    this.applySettings();
    this.updateTagsFromBookmarks();
  }

  loadBookmarks() {
    const data = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    return data ? JSON.parse(data) : [];
  }

  saveBookmarks() {
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(this.bookmarks));
    this.updateTagsFromBookmarks();
    this.dispatchEvent('bookmarksUpdated');
  }

  loadSettings() {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  }

  saveSettings() {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    this.applySettings();
    this.dispatchEvent('settingsUpdated');
  }

  loadTags() {
    const data = localStorage.getItem(STORAGE_KEYS.TAGS);
    return data ? JSON.parse(data) : {};
  }

  saveTags() {
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(this.tags));
  }

  updateTagsFromBookmarks() {
    const tagCounts = {};
    this.bookmarks.forEach(bookmark => {
      bookmark.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    this.tags = tagCounts;
    this.saveTags();
  }

  applySettings() {
    // Apply theme
    const theme = this.settings.theme === 'auto' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : this.settings.theme;
    document.documentElement.setAttribute('data-theme', theme);

    // Apply layout
    document.getElementById('bookmarksContainer').className = 
      `bookmarks-container ${this.settings.layout}-view`;
    
    // Update UI elements based on settings
    this.updateThemeToggle();
    this.updateLayoutToggle();
  }

  updateThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeToggle.innerHTML = isDark 
      ? '<i class="fas fa-sun"></i><span class="action-text">Light Mode</span>'
      : '<i class="fas fa-moon"></i><span class="action-text">Dark Mode</span>';
  }

  updateLayoutToggle() {
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');
    
    if (this.settings.layout === 'grid') {
      gridBtn.classList.add('active');
      listBtn.classList.remove('active');
    } else {
      listBtn.classList.add('active');
      gridBtn.classList.remove('active');
    }
  }

  dispatchEvent(eventName, detail = {}) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  addBookmark(bookmark) {
    this.bookmarks.unshift(bookmark);
    this.saveBookmarks();
    this.showToast('Bookmark added successfully!', 'success');
  }

  updateBookmark(id, updates) {
    const index = this.bookmarks.findIndex(b => b.id === id);
    if (index !== -1) {
      this.bookmarks[index] = { ...this.bookmarks[index], ...updates, updatedAt: Date.now() };
      this.saveBookmarks();
      this.showToast('Bookmark updated successfully!', 'success');
    }
  }

  deleteBookmark(id) {
    const index = this.bookmarks.findIndex(b => b.id === id);
    if (index !== -1) {
      this.bookmarks.splice(index, 1);
      this.saveBookmarks();
      this.showToast('Bookmark deleted successfully!', 'success');
    }
  }

  toggleFavorite(id) {
    const bookmark = this.bookmarks.find(b => b.id === id);
    if (bookmark) {
      bookmark.favorite = !bookmark.favorite;
      bookmark.updatedAt = Date.now();
      this.saveBookmarks();
    }
  }

  toggleArchive(id) {
    const bookmark = this.bookmarks.find(b => b.id === id);
    if (bookmark) {
      bookmark.archived = !bookmark.archived;
      bookmark.updatedAt = Date.now();
      this.saveBookmarks();
    }
  }

  toggleRead(id) {
    const bookmark = this.bookmarks.find(b => b.id === id);
    if (bookmark) {
      bookmark.unread = !bookmark.unread;
      bookmark.updatedAt = Date.now();
      this.saveBookmarks();
    }
  }

  getFilteredBookmarks() {
    let bookmarks = [...this.bookmarks];

    // Filter by current view
    switch (this.currentView) {
      case 'favorites':
        bookmarks = bookmarks.filter(b => b.favorite && !b.archived);
        break;
      case 'unread':
        bookmarks = bookmarks.filter(b => b.unread && !b.archived);
        break;
      case 'archived':
        bookmarks = bookmarks.filter(b => b.archived);
        break;
      case 'recent':
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        bookmarks = bookmarks.filter(b => b.createdAt >= weekAgo && !b.archived);
        break;
      default:
        bookmarks = bookmarks.filter(b => !b.archived);
    }

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      bookmarks = bookmarks.filter(b =>
        b.title?.toLowerCase().includes(query) ||
        b.url?.toLowerCase().includes(query) ||
        b.description?.toLowerCase().includes(query) ||
        b.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort bookmarks
    bookmarks.sort((a, b) => {
      switch (this.currentSort) {
        case 'date-desc':
          return b.createdAt - a.createdAt;
        case 'date-asc':
          return a.createdAt - b.createdAt;
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'title-desc':
          return (b.title || '').localeCompare(a.title || '');
        case 'domain':
          return (a.domain || '').localeCompare(b.domain || '');
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return bookmarks;
  }

  getStatistics() {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const stats = {
      total: this.bookmarks.length,
      favorites: this.bookmarks.filter(b => b.favorite).length,
      unread: this.bookmarks.filter(b => b.unread).length,
      archived: this.bookmarks.filter(b => b.archived).length,
      thisWeek: this.bookmarks.filter(b => b.createdAt >= weekAgo).length,
      thisMonth: this.bookmarks.filter(b => b.createdAt >= monthAgo).length,
      uniqueTags: Object.keys(this.tags).length,
      totalDomains: this.getUniqueDomains().size
    };

    // Get top tags
    const topTags = Object.entries(this.tags)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // Get top domains
    const domainCounts = {};
    this.bookmarks.forEach(bookmark => {
      try {
        const domain = new URL(bookmark.url).hostname;
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      } catch (e) {
        // Invalid URL, skip
      }
    });

    const topDomains = Object.entries(domainCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, count }));

    // Get recent activity
    const recentActivity = [...this.bookmarks]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5)
      .map(bookmark => ({
        title: bookmark.title,
        action: bookmark.updatedAt === bookmark.createdAt ? 'added' : 'updated',
        time: bookmark.updatedAt
      }));

    return { ...stats, topTags, topDomains, recentActivity };
  }

  getUniqueDomains() {
    const domains = new Set();
    this.bookmarks.forEach(bookmark => {
      try {
        const domain = new URL(bookmark.url).hostname;
        domains.add(domain);
      } catch (e) {
        // Invalid URL, skip
      }
    });
    return domains;
  }

  async fetchFavicon(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  }

  showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    toast.innerHTML = `
      <i class="fas ${icons[type]} toast-icon"></i>
      <div class="toast-content">
        <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">
        <i class="fas fa-times"></i>
      </button>
    `;

    toastContainer.appendChild(toast);

    const closeToast = () => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast-close').addEventListener('click', closeToast);

    if (duration > 0) {
      setTimeout(closeToast, duration);
    }

    return toast;
  }

  showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
  }

  hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
  }

  async backupBookmarks() {
    const backup = {
      version: '2.0.0',
      timestamp: Date.now(),
      bookmarks: this.bookmarks,
      settings: this.settings,
      tags: this.tags
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pinpoint-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast('Backup created successfully!', 'success');
  }

  async restoreBookmarks(backupData) {
    try {
      const backup = JSON.parse(backupData);
      
      if (!backup.bookmarks || !Array.isArray(backup.bookmarks)) {
        throw new Error('Invalid backup file');
      }

      this.bookmarks = backup.bookmarks;
      this.settings = { ...DEFAULT_SETTINGS, ...backup.settings };
      this.tags = backup.tags || {};
      
      this.saveBookmarks();
      this.saveSettings();
      this.saveTags();
      
      this.showToast('Backup restored successfully!', 'success');
      return true;
    } catch (error) {
      this.showToast('Failed to restore backup: ' + error.message, 'error');
      return false;
    }
  }

  exportBookmarks(format = 'json', options = {}) {
    const bookmarks = this.getFilteredBookmarks();
    let content, mimeType, extension;

    switch (format) {
      case 'json':
        content = JSON.stringify(bookmarks, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'html':
        content = this.generateHTMLExport(bookmarks);
        mimeType = 'text/html';
        extension = 'html';
        break;
      case 'csv':
        content = this.generateCSVExport(bookmarks);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      default:
        throw new Error('Unsupported format');
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pinpoint-export-${new Date().toISOString().split('T')[0]}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast(`Exported ${bookmarks.length} bookmarks as ${format.toUpperCase()}`, 'success');
  }

  generateHTMLExport(bookmarks) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>PinPoint Bookmarks Export</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .bookmark { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
        .url { color: #0066cc; margin-bottom: 10px; }
        .description { color: #666; margin-bottom: 10px; }
        .tags { font-size: 12px; color: #888; }
        .tag { background: #f0f0f0; padding: 2px 8px; border-radius: 10px; margin-right: 5px; }
    </style>
</head>
<body>
    <h1>PinPoint Bookmarks Export</h1>
    <p>Generated on ${new Date().toLocaleString()}</p>
    <p>Total bookmarks: ${bookmarks.length}</p>
    <hr>
    ${bookmarks.map(bookmark => `
        <div class="bookmark">
            <div class="title">${bookmark.title}</div>
            <div class="url"><a href="${bookmark.url}">${bookmark.url}</a></div>
            ${bookmark.description ? `<div class="description">${bookmark.description}</div>` : ''}
            ${bookmark.tags && bookmark.tags.length ? `
                <div class="tags">
                    ${bookmark.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `).join('')}
</body>
</html>`;
  }

  generateCSVExport(bookmarks) {
    const headers = ['Title', 'URL', 'Description', 'Tags', 'Favorite', 'Archived', 'Created'];
    const rows = bookmarks.map(bookmark => [
      `"${bookmark.title.replace(/"/g, '""')}"`,
      `"${bookmark.url}"`,
      `"${(bookmark.description || '').replace(/"/g, '""')}"`,
      `"${(bookmark.tags || []).join(', ')}"`,
      bookmark.favorite ? 'Yes' : 'No',
      bookmark.archived ? 'Yes' : 'No',
      new Date(bookmark.createdAt).toLocaleString()
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

/* ---------- UI COMPONENTS ---------- */
class UI {
  constructor(stateManager) {
    this.state = stateManager;
    this.init();
  }

  init() {
    this.renderBookmarks();
    this.renderTags();
    this.updateStorageStats();
    this.setupEventListeners();
    this.setupSampleData();
  }

  renderBookmarks() {
    const container = document.getElementById('bookmarksContainer');
    const bookmarks = this.state.getFilteredBookmarks();
    const emptyState = document.getElementById('emptyState');

    // Update count
    document.getElementById('bookmarkCount').textContent = 
      `${bookmarks.length} bookmark${bookmarks.length !== 1 ? 's' : ''}`;

    if (bookmarks.length === 0) {
      container.innerHTML = '';
      container.appendChild(emptyState);
      emptyState.style.display = 'flex';
      return;
    }

    emptyState.style.display = 'none';
    container.innerHTML = '';

    const fragment = document.createDocumentFragment();

    bookmarks.forEach(bookmark => {
      const card = this.createBookmarkCard(bookmark);
      fragment.appendChild(card);
    });

    container.appendChild(fragment);
  }

  createBookmarkCard(bookmark) {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    card.dataset.id = bookmark.id;

    if (this.state.selectedBookmarks.has(bookmark.id)) {
      card.classList.add('selected');
    }

    // Format dates
    const createdDate = new Date(bookmark.createdAt);
    const updatedDate = new Date(bookmark.updatedAt || bookmark.createdAt);
    
    const createdStr = createdDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    const updatedStr = updatedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    // Get domain for favicon fallback
    let domain = '';
    try {
      domain = new URL(bookmark.url).hostname.replace('www.', '');
    } catch (e) {
      domain = 'link';
    }

    // Build tags HTML
    const tagsHTML = bookmark.tags && bookmark.tags.length > 0
      ? `<div class="bookmark-tags">
          ${bookmark.tags.map(tag => `<span class="bookmark-tag" data-tag="${tag}">${tag}</span>`).join('')}
        </div>`
      : '';

    card.innerHTML = `
      <div class="selection-checkbox ${this.state.selectedBookmarks.has(bookmark.id) ? 'checked' : ''}"></div>
      <div class="bookmark-header">
        <div class="bookmark-favicon ${!bookmark.favicon ? 'fallback' : ''}" data-domain="${domain}">
          ${bookmark.favicon 
            ? `<img src="${bookmark.favicon}" alt="${domain} favicon" onerror="this.parentElement.className='bookmark-favicon fallback'">`
            : `<span>${domain.charAt(0).toUpperCase()}</span>`
          }
        </div>
        <div class="bookmark-info">
          <div class="bookmark-title">
            <span class="text-truncate">${bookmark.title || 'Untitled'}</span>
            ${bookmark.favorite ? '<i class="fas fa-star favorite-icon"></i>' : ''}
            ${bookmark.unread ? '<i class="fas fa-eye-slash favorite-icon"></i>' : ''}
          </div>
          <a href="${bookmark.url}" target="_blank" class="bookmark-url text-truncate">
            ${bookmark.url}
          </a>
        </div>
      </div>
      ${bookmark.description ? `<div class="bookmark-description">${bookmark.description}</div>` : ''}
      ${tagsHTML}
      <div class="bookmark-footer">
        <div class="bookmark-meta">
          <span class="meta-item" title="Created on ${createdDate.toLocaleString()}">
            <i class="far fa-calendar"></i>
            ${createdStr}
          </span>
          ${bookmark.updatedAt > bookmark.createdAt ? `
            <span class="meta-item" title="Updated on ${updatedDate.toLocaleString()}">
              <i class="fas fa-sync-alt"></i>
              ${updatedStr}
            </span>
          ` : ''}
        </div>
        <div class="bookmark-actions">
          <button class="bookmark-action-btn ${bookmark.unread ? 'active' : ''}" title="Mark as read">
            <i class="fas fa-eye${bookmark.unread ? '-slash' : ''}"></i>
          </button>
          <button class="bookmark-action-btn ${bookmark.favorite ? 'active' : ''}" title="Favorite">
            <i class="fas fa-star"></i>
          </button>
          <button class="bookmark-action-btn ${bookmark.archived ? 'active' : ''}" title="Archive">
            <i class="fas fa-archive"></i>
          </button>
          <button class="bookmark-action-btn delete" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    const selectionCheckbox = card.querySelector('.selection-checkbox');
    const actionButtons = card.querySelectorAll('.bookmark-action-btn');
    const favicon = card.querySelector('.bookmark-favicon');
    const urlLink = card.querySelector('.bookmark-url');
    const tagElements = card.querySelectorAll('.bookmark-tag');

    // Selection checkbox
    selectionCheckbox.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleBookmarkSelection(bookmark.id);
    });

    // Action buttons
    actionButtons[0].addEventListener('click', (e) => {
      e.stopPropagation();
      this.state.toggleRead(bookmark.id);
      this.renderBookmarks();
    });

    actionButtons[1].addEventListener('click', (e) => {
      e.stopPropagation();
      this.state.toggleFavorite(bookmark.id);
      this.renderBookmarks();
    });

    actionButtons[2].addEventListener('click', (e) => {
      e.stopPropagation();
      this.state.toggleArchive(bookmark.id);
      this.renderBookmarks();
    });

    actionButtons[3].addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.state.settings.confirmDelete || confirm('Are you sure you want to delete this bookmark?')) {
        this.state.deleteBookmark(bookmark.id);
        this.renderBookmarks();
      }
    });

    // Favicon loading
    if (!bookmark.favicon && this.state.settings.autoFetchFavicon) {
      this.loadFavicon(bookmark.url).then(faviconUrl => {
        if (faviconUrl) {
          bookmark.favicon = faviconUrl;
          this.state.saveBookmarks();
          const img = document.createElement('img');
          img.src = faviconUrl;
          img.alt = `${domain} favicon`;
          img.onerror = () => favicon.className = 'bookmark-favicon fallback';
          favicon.innerHTML = '';
          favicon.appendChild(img);
          favicon.className = 'bookmark-favicon';
        }
      });
    }

    // URL click (open in new tab)
    urlLink.addEventListener('click', (e) => {
      e.stopPropagation();
      // Mark as read when clicked
      if (bookmark.unread) {
        this.state.toggleRead(bookmark.id);
        this.renderBookmarks();
      }
    });

    // Card click (open in new tab)
    card.addEventListener('click', (e) => {
      if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('.selection-checkbox')) {
        window.open(bookmark.url, '_blank');
        if (bookmark.unread) {
          this.state.toggleRead(bookmark.id);
          this.renderBookmarks();
        }
      }
    });

    // Tag clicks
    tagElements.forEach(tagEl => {
      tagEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const tag = tagEl.dataset.tag;
        this.filterByTag(tag);
      });
    });

    return card;
  }

  async loadFavicon(url) {
    try {
      return await this.state.fetchFavicon(url);
    } catch (error) {
      return null;
    }
  }

  toggleBookmarkSelection(id) {
    if (this.state.selectedBookmarks.has(id)) {
      this.state.selectedBookmarks.delete(id);
    } else {
      this.state.selectedBookmarks.add(id);
    }
    
    this.renderBookmarks();
    this.updateBulkActions();
  }

  updateBulkActions() {
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    const count = this.state.selectedBookmarks.size;

    selectedCount.textContent = count;

    if (count > 0) {
      bulkActions.classList.add('active');
      document.body.classList.add('selection-mode');
    } else {
      bulkActions.classList.remove('active');
      document.body.classList.remove('selection-mode');
    }
  }

  renderTags() {
    const container = document.getElementById('tagsList');
    const tags = this.state.tags;
    const sortedTags = Object.entries(tags).sort(([, a], [, b]) => b - a);

    if (sortedTags.length === 0) {
      container.innerHTML = '<div class="no-tags">No tags yet</div>';
      return;
    }

    container.innerHTML = sortedTags.map(([tag, count]) => `
      <div class="tag-item" data-tag="${tag}">
        <div class="tag-info">
          <div class="tag-color"></div>
          <span class="tag-name">${tag}</span>
        </div>
        <span class="tag-count">${count}</span>
      </div>
    `).join('');

    // Add event listeners
    container.querySelectorAll('.tag-item').forEach(item => {
      item.addEventListener('click', () => {
        const tag = item.dataset.tag;
        this.filterByTag(tag);
      });
    });
  }

  filterByTag(tag) {
    this.state.currentView = 'all';
    this.state.searchQuery = tag;
    document.getElementById('searchInput').value = tag;
    document.querySelector('.nav-links .active')?.classList.remove('active');
    document.querySelector('.nav-links a[data-view="all"]').classList.add('active');
    document.getElementById('pageTitle').textContent = `Tag: ${tag}`;
    this.renderBookmarks();
  }

  updateStorageStats() {
    const data = JSON.stringify(this.state.bookmarks);
    const sizeInBytes = new Blob([data]).size;
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
    const count = this.state.bookmarks.length;

    // Assume 5MB limit for localStorage (actual limit varies)
    const maxSize = 5 * 1024 * 1024;
    const percentage = Math.min((sizeInBytes / maxSize) * 100, 100);

    document.getElementById('storageCount').textContent = 
      `${count} bookmark${count !== 1 ? 's' : ''}`;
    document.getElementById('storageSize').textContent = `${sizeInMB} MB`;
    document.getElementById('storageBar').style.width = `${percentage}%`;
  }

  updateStatsModal() {
    const stats = this.state.getStatistics();

    // Update stats cards
    document.getElementById('totalBookmarksStat').textContent = stats.total;
    document.getElementById('favoriteBookmarksStat').textContent = stats.favorites;
    document.getElementById('totalTagsStat').textContent = stats.uniqueTags;
    document.getElementById('recentBookmarksStat').textContent = stats.thisWeek;

    // Update tag cloud
    const tagCloud = document.getElementById('tagCloud');
    tagCloud.innerHTML = stats.topTags.map(({ tag, count }) => `
      <span class="bookmark-tag" style="font-size: ${Math.min(1 + count / 10, 1.5)}rem">
        ${tag} <small>(${count})</small>
      </span>
    `).join('');

    // Update domain list
    const domainList = document.getElementById('domainList');
    domainList.innerHTML = stats.topDomains.map(({ domain, count }) => `
      <div class="domain-item">
        <div class="domain-name">
          <i class="fas fa-globe"></i>
          <span>${domain}</span>
        </div>
        <span class="domain-count">${count}</span>
      </div>
    `).join('');

    // Update activity list
    const activityList = document.getElementById('activityList');
    activityList.innerHTML = stats.recentActivity.map(({ title, action, time }) => `
      <div class="activity-item">
        <div class="activity-text">
          "${title}" was ${action}
        </div>
        <div class="activity-time">
          ${this.formatRelativeTime(time)}
        </div>
      </div>
    `).join('');
  }

  formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;
    const year = 365 * day;

    if (diff < minute) return 'Just now';
    if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
    if (diff < day) return `${Math.floor(diff / hour)}h ago`;
    if (diff < week) return `${Math.floor(diff / day)}d ago`;
    if (diff < month) return `${Math.floor(diff / week)}w ago`;
    if (diff < year) return `${Math.floor(diff / month)}mo ago`;
    return `${Math.floor(diff / year)}y ago`;
  }

  showBookmarkModal(bookmark = null) {
    const modal = document.getElementById('bookmarkModal');
    const form = document.getElementById('bookmarkForm');
    const titleInput = document.getElementById('bookmarkTitle');
    const urlInput = document.getElementById('bookmarkUrl');
    const descInput = document.getElementById('bookmarkDescription');
    const notesInput = document.getElementById('bookmarkNotes');
    const favoriteInput = document.getElementById('bookmarkFavorite');
    const unreadInput = document.getElementById('bookmarkUnread');
    const tagInput = document.getElementById('tagInput');
    const tagContainer = document.getElementById('tagInputContainer');
    const modalTitle = document.getElementById('modalTitle');

    // Clear form
    form.reset();
    tagContainer.innerHTML = '';

    if (bookmark) {
      // Edit mode
      modalTitle.textContent = 'Edit Bookmark';
      this.state.editingId = bookmark.id;
      
      titleInput.value = bookmark.title || '';
      urlInput.value = bookmark.url || '';
      descInput.value = bookmark.description || '';
      notesInput.value = bookmark.notes || '';
      favoriteInput.checked = bookmark.favorite || false;
      unreadInput.checked = bookmark.unread || false;
      
      // Add tags
      if (bookmark.tags) {
        bookmark.tags.forEach(tag => this.addTagToInput(tag));
      }
    } else {
      // Add mode
      modalTitle.textContent = 'Add New Bookmark';
      this.state.editingId = null;
    }

    modal.classList.add('active');
    titleInput.focus();
  }

  addTagToInput(tag) {
    const container = document.getElementById('tagInputContainer');
    const tagEl = document.createElement('span');
    tagEl.className = 'tag-pill';
    tagEl.innerHTML = `
      ${tag}
      <span class="remove-tag">
        <i class="fas fa-times"></i>
      </span>
    `;
    
    tagEl.querySelector('.remove-tag').addEventListener('click', () => {
      tagEl.remove();
    });
    
    container.insertBefore(tagEl, container.querySelector('.tag-input'));
  }

  getTagsFromInput() {
    const tagPills = document.querySelectorAll('.tag-pill');
    return Array.from(tagPills).map(pill => 
      pill.textContent.replace('×', '').trim()
    );
  }

  setupEventListeners() {
    // Mobile menu
    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.add('active');
      document.getElementById('sidebarOverlay').classList.add('active');
    });

    document.getElementById('closeSidebar')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('active');
      document.getElementById('sidebarOverlay').classList.remove('active');
    });

    document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('active');
      document.getElementById('sidebarOverlay').classList.remove('active');
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      this.state.settings.theme = newTheme;
      this.state.saveSettings();
      this.state.updateThemeToggle();
    });

    // Navigation
    document.querySelectorAll('.nav-links a[data-view]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Update active state
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');
        
        // Update view
        this.state.currentView = link.dataset.view;
        this.state.searchQuery = '';
        document.getElementById('searchInput').value = '';
        
        // Update page title
        const pageTitle = document.getElementById('pageTitle');
        pageTitle.textContent = link.textContent.trim();
        
        // Close sidebar on mobile
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('sidebarOverlay').classList.remove('active');
        
        // Render bookmarks
        this.renderBookmarks();
      });
    });

    // Search
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      
      if (e.target.value) {
        searchClear.style.display = 'flex';
      } else {
        searchClear.style.display = 'none';
      }
      
      searchTimeout = setTimeout(() => {
        this.state.searchQuery = e.target.value;
        this.renderBookmarks();
      }, 300);
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.style.display = 'none';
      this.state.searchQuery = '';
      this.renderBookmarks();
    });

    // Mobile search
    document.getElementById('mobileSearchBtn')?.addEventListener('click', () => {
      document.getElementById('searchOverlay').classList.add('active');
      document.getElementById('searchModalInput').focus();
    });

    document.getElementById('closeSearch')?.addEventListener('click', () => {
      document.getElementById('searchOverlay').classList.remove('active');
    });

    // Quick actions
    document.getElementById('addBookmarkBtn').addEventListener('click', () => {
      this.showBookmarkModal();
    });

    document.getElementById('addFirstBookmark').addEventListener('click', () => {
      this.showBookmarkModal();
    });

    document.getElementById('quickAddBtn').addEventListener('click', () => {
      document.getElementById('quickAddModal').classList.add('active');
      document.getElementById('quickAddUrl').focus();
    });

    // Import/Export
    document.getElementById('importBtn').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.html,.csv';
      
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          this.state.showLoading();
          const text = await file.text();
          
          if (file.name.endsWith('.json')) {
            await this.state.restoreBookmarks(text);
          } else {
            // Handle other formats if needed
            this.state.showToast('Only JSON format is supported for import', 'warning');
          }
          
          this.renderBookmarks();
          this.renderTags();
          this.updateStorageStats();
        } catch (error) {
          this.state.showToast('Failed to import bookmarks: ' + error.message, 'error');
        } finally {
          this.state.hideLoading();
        }
      });
      
      input.click();
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
      document.getElementById('exportModal').classList.add('active');
    });

    // Settings
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.showSettingsModal();
    });

    // Bulk actions
    document.getElementById('selectBtn').addEventListener('click', () => {
      this.state.isSelectionMode = !this.state.isSelectionMode;
      if (!this.state.isSelectionMode) {
        this.state.selectedBookmarks.clear();
        this.updateBulkActions();
      }
      this.renderBookmarks();
    });

    document.getElementById('bulkCancelBtn').addEventListener('click', () => {
      this.state.selectedBookmarks.clear();
      this.state.isSelectionMode = false;
      this.updateBulkActions();
      this.renderBookmarks();
    });

    document.getElementById('bulkFavoriteBtn').addEventListener('click', () => {
      this.state.selectedBookmarks.forEach(id => {
        const bookmark = this.state.bookmarks.find(b => b.id === id);
        if (bookmark) bookmark.favorite = true;
      });
      this.state.saveBookmarks();
      this.renderBookmarks();
      this.state.selectedBookmarks.clear();
      this.updateBulkActions();
    });

    document.getElementById('bulkArchiveBtn').addEventListener('click', () => {
      this.state.selectedBookmarks.forEach(id => {
        const bookmark = this.state.bookmarks.find(b => b.id === id);
        if (bookmark) bookmark.archived = true;
      });
      this.state.saveBookmarks();
      this.renderBookmarks();
      this.state.selectedBookmarks.clear();
      this.updateBulkActions();
    });

    document.getElementById('bulkReadBtn').addEventListener('click', () => {
      this.state.selectedBookmarks.forEach(id => {
        const bookmark = this.state.bookmarks.find(b => b.id === id);
        if (bookmark) bookmark.unread = false;
      });
      this.state.saveBookmarks();
      this.renderBookmarks();
      this.state.selectedBookmarks.clear();
      this.updateBulkActions();
    });

    document.getElementById('bulkDeleteBtn').addEventListener('click', () => {
      if (confirm(`Delete ${this.state.selectedBookmarks.size} bookmarks?`)) {
        this.state.bookmarks = this.state.bookmarks.filter(
          b => !this.state.selectedBookmarks.has(b.id)
        );
        this.state.saveBookmarks();
        this.renderBookmarks();
        this.state.selectedBookmarks.clear();
        this.updateBulkActions();
      }
    });

    // Sort
    document.getElementById('sortBtn').addEventListener('click', (e) => {
      const dropdown = document.getElementById('sortDropdown');
      dropdown.classList.toggle('active');
      e.stopPropagation();
    });

    document.querySelectorAll('.sort-option').forEach(option => {
      option.addEventListener('click', () => {
        this.state.currentSort = option.dataset.sort;
        document.querySelectorAll('.sort-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        document.getElementById('sortDropdown').classList.remove('active');
        this.renderBookmarks();
      });
    });

    // Layout toggle
    document.getElementById('gridViewBtn').addEventListener('click', () => {
      this.state.settings.layout = 'grid';
      this.state.saveSettings();
      this.renderBookmarks();
    });

    document.getElementById('listViewBtn').addEventListener('click', () => {
      this.state.settings.layout = 'list';
      this.state.saveSettings();
      this.renderBookmarks();
    });

    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
      // Close sort dropdown
      if (!e.target.closest('#sortBtn') && !e.target.closest('#sortDropdown')) {
        document.getElementById('sortDropdown').classList.remove('active');
      }
      
      // Close modals
      if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
      }
    });

    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
          modal.classList.remove('active');
        });
        document.getElementById('sortDropdown').classList.remove('active');
      }
    });

    // Tag input
    const tagInput = document.getElementById('tagInput');
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && tagInput.value.trim()) {
        e.preventDefault();
        this.addTagToInput(tagInput.value.trim());
        tagInput.value = '';
      }
    });

    // Bookmark form submission
    document.getElementById('bookmarkForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const title = document.getElementById('bookmarkTitle').value.trim();
      const url = document.getElementById('bookmarkUrl').value.trim();
      const description = document.getElementById('bookmarkDescription').value.trim();
      const notes = document.getElementById('bookmarkNotes').value.trim();
      const favorite = document.getElementById('bookmarkFavorite').checked;
      const unread = document.getElementById('bookmarkUnread').checked;
      const tags = this.getTagsFromInput();
      
      // Validate URL
      let finalUrl = url;
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }
      
      try {
        new URL(finalUrl);
      } catch {
        this.state.showToast('Please enter a valid URL', 'error');
        return;
      }
      
      const bookmarkData = {
        id: this.state.editingId || this.generateId(),
        title: title || this.extractTitleFromUrl(finalUrl),
        url: finalUrl,
        description,
        notes,
        tags,
        favorite,
        unread,
        archived: false,
        createdAt: this.state.editingId 
          ? this.state.bookmarks.find(b => b.id === this.state.editingId)?.createdAt || Date.now()
          : Date.now(),
        updatedAt: Date.now()
      };
      
      if (this.state.editingId) {
        this.state.updateBookmark(this.state.editingId, bookmarkData);
      } else {
        this.state.addBookmark(bookmarkData);
      }
      
      document.getElementById('bookmarkModal').classList.remove('active');
      this.renderBookmarks();
      this.renderTags();
      this.updateStorageStats();
    });

    // Quick add form
    document.getElementById('quickAddForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const url = document.getElementById('quickAddUrl').value.trim();
      if (!url) return;
      
      let finalUrl = url;
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }
      
      try {
        new URL(finalUrl);
      } catch {
        this.state.showToast('Please enter a valid URL', 'error');
        return;
      }
      
      const bookmarkData = {
        id: this.generateId(),
        title: await this.fetchPageTitle(finalUrl) || this.extractTitleFromUrl(finalUrl),
        url: finalUrl,
        description: '',
        notes: '',
        tags: [],
        favorite: false,
        unread: true,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      this.state.addBookmark(bookmarkData);
      document.getElementById('quickAddModal').classList.remove('active');
      document.getElementById('quickAddUrl').value = '';
      this.renderBookmarks();
      this.renderTags();
      this.updateStorageStats();
    });

    // Export functionality
    document.getElementById('confirmExport').addEventListener('click', () => {
      const format = document.querySelector('input[name="exportFormat"]:checked').value;
      this.state.exportBookmarks(format);
      document.getElementById('exportModal').classList.remove('active');
    });

    // Statistics
    document.getElementById('showStats').addEventListener('click', (e) => {
      e.preventDefault();
      this.updateStatsModal();
      document.getElementById('statsModal').classList.add('active');
    });

    // Backup/Restore
    document.getElementById('backupBtn').addEventListener('click', () => {
      this.state.backupBookmarks();
    });

    document.getElementById('restoreBtn').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          this.state.showLoading();
          const text = await file.text();
          await this.state.restoreBookmarks(text);
          this.renderBookmarks();
          this.renderTags();
          this.updateStorageStats();
        } catch (error) {
          this.state.showToast('Failed to restore backup', 'error');
        } finally {
          this.state.hideLoading();
        }
      });
      
      input.click();
    });

    // Paste URL button
    document.getElementById('pasteUrlBtn').addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        document.getElementById('bookmarkUrl').value = text;
      } catch (error) {
        this.state.showToast('Failed to paste from clipboard', 'error');
      }
    });

    // Close buttons for all modals
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.modal').classList.remove('active');
      });
    });

    document.querySelectorAll('#cancelModal, #cancelQuickAdd, #cancelExport, #closeStats').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.modal').classList.remove('active');
      });
    });

    // Listen for state changes
    window.addEventListener('bookmarksUpdated', () => {
      this.renderBookmarks();
      this.renderTags();
      this.updateStorageStats();
    });

    window.addEventListener('settingsUpdated', () => {
      this.renderBookmarks();
    });
  }

  showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const settings = this.state.settings;

    // Set current values
    document.getElementById('defaultView').value = settings.defaultView;
    document.getElementById('itemsPerPage').value = settings.itemsPerPage;
    document.getElementById('autoFetchFavicon').checked = settings.autoFetchFavicon;
    document.getElementById('autoBackup').checked = settings.autoBackup;

    // Set active theme option
    document.querySelectorAll('.theme-option').forEach(option => {
      option.classList.remove('active');
      if (option.dataset.theme === settings.theme) {
        option.classList.add('active');
      }
    });

    // Set active layout option
    document.querySelectorAll('.layout-option').forEach(option => {
      option.classList.remove('active');
      if (option.dataset.layout === settings.layout) {
        option.classList.add('active');
      }
    });

    // Tab switching
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        
        // Update active tab
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show corresponding pane
        document.querySelectorAll('.settings-pane').forEach(pane => {
          pane.classList.remove('active');
        });
        document.getElementById(`${tabId}Tab`).classList.add('active');
      });
    });

    // Theme selection
    document.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', () => {
        const theme = option.dataset.theme;
        this.state.settings.theme = theme;
        this.state.saveSettings();
        document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
      });
    });

    // Layout selection
    document.querySelectorAll('.layout-option').forEach(option => {
      option.addEventListener('click', () => {
        const layout = option.dataset.layout;
        this.state.settings.layout = layout;
        this.state.saveSettings();
        document.querySelectorAll('.layout-option').forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
      });
    });

    // Backup now
    document.getElementById('backupNowBtn').addEventListener('click', () => {
      this.state.backupBookmarks();
    });

    // Restore now
    document.getElementById('restoreNowBtn').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          this.state.showLoading();
          const text = await file.text();
          await this.state.restoreBookmarks(text);
        } catch (error) {
          this.state.showToast('Failed to restore backup', 'error');
        } finally {
          this.state.hideLoading();
        }
      });
      
      input.click();
    });

    // Save settings changes
    document.querySelectorAll('#defaultView, #itemsPerPage').forEach(input => {
      input.addEventListener('change', () => {
        this.state.settings[input.id] = input.value;
        this.state.saveSettings();
      });
    });

    document.querySelectorAll('#autoFetchFavicon, #autoBackup').forEach(input => {
      input.addEventListener('change', () => {
        this.state.settings[input.id] = input.checked;
        this.state.saveSettings();
      });
    });

    modal.classList.add('active');
  }

  async fetchPageTitle(url) {
    try {
      // This is a simplified version - in production, you'd want to use a proxy
      // or backend service to avoid CORS issues
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');
      return doc.title;
    } catch (error) {
      return null;
    }
  }

  extractTitleFromUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '').split('.')[0];
    } catch {
      return 'Bookmark';
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  setupSampleData() {
    if (this.state.bookmarks.length === 0) {
      const sampleBookmarks = [
        {
          id: this.generateId(),
          title: 'GitHub',
          url: 'https://github.com',
          description: 'Code hosting platform for version control and collaboration',
          tags: ['development', 'code', 'git'],
          favorite: true,
          unread: false,
          archived: false,
          createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now() - 10 * 24 * 60 * 60 * 1000
        },
        {
          id: this.generateId(),
          title: 'MDN Web Docs',
          url: 'https://developer.mozilla.org',
          description: 'Resources for developers, by developers',
          tags: ['documentation', 'web', 'development'],
          favorite: true,
          unread: false,
          archived: false,
          createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000
        },
        {
          id: this.generateId(),
          title: 'CSS-Tricks',
          url: 'https://css-tricks.com',
          description: 'Front-end development blog and community',
          tags: ['css', 'frontend', 'blog'],
          favorite: false,
          unread: true,
          archived: false,
          createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000
        },
        {
          id: this.generateId(),
          title: 'React Documentation',
          url: 'https://react.dev',
          description: 'Official React documentation',
          tags: ['react', 'javascript', 'framework'],
          favorite: false,
          unread: false,
          archived: false,
          createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000
        },
        {
          id: this.generateId(),
          title: 'Tailwind CSS',
          url: 'https://tailwindcss.com',
          description: 'A utility-first CSS framework',
          tags: ['css', 'framework', 'ui'],
          favorite: false,
          unread: true,
          archived: false,
          createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000
        }
      ];

      this.state.bookmarks = sampleBookmarks;
      this.state.saveBookmarks();
      this.renderBookmarks();
      this.renderTags();
      this.updateStorageStats();
    }
  }
}

/* ---------- INITIALIZATION ---------- */
// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize state manager
  const stateManager = new StateManager();
  
  // Initialize UI
  const ui = new UI(stateManager);
  
  // Make UI available globally for debugging
  window.pinpoint = { state: stateManager, ui };
  
  // Show welcome message
  setTimeout(() => {
    stateManager.showToast('Welcome to PinPoint!', 'info', 5000);
  }, 1000);
});

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.log('Service Worker registration failed:', error);
    });
  });
}