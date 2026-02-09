/* ===============================
   PINPOINT BOOKMARK MANAGER
   =============================== */

// State Management
let bookmarks = JSON.parse(localStorage.getItem('pinpoint_bookmarks')) || [];
let settings = JSON.parse(localStorage.getItem('pinpoint_settings')) || {
    theme: 'light',
    layout: 'grid',
    defaultView: 'all',
    sortBy: 'date-desc',
    autoFetchFavicon: true
};
let currentView = 'all';
let currentSort = 'date-desc';
let selectedBookmarks = new Set();
let editingId = null;
let searchQuery = '';
let tags = {};

// DOM Elements
const elements = {
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    closeSidebar: document.getElementById('closeSidebar'),
    bookmarksContainer: document.getElementById('bookmarksContainer'),
    emptyState: document.getElementById('emptyState'),
    bookmarkCount: document.getElementById('bookmarkCount'),
    pageTitle: document.getElementById('pageTitle'),
    searchInput: document.getElementById('searchInput'),
    searchClear: document.getElementById('searchClear'),
    bookmarkModal: document.getElementById('bookmarkModal'),
    exportModal: document.getElementById('exportModal'),
    statsModal: document.getElementById('statsModal'),
    settingsModal: document.getElementById('settingsModal'),
    quickAddModal: document.getElementById('quickAddModal'),
    bookmarkForm: document.getElementById('bookmarkForm'),
    quickAddForm: document.getElementById('quickAddForm'),
    addBookmarkBtn: document.getElementById('addBookmarkBtn'),
    addFirstBookmark: document.getElementById('addFirstBookmark'),
    quickAddBtn: document.getElementById('quickAddBtn'),
    themeToggle: document.getElementById('themeToggle'),
    importBtn: document.getElementById('importBtn'),
    exportBtn: document.getElementById('exportBtn'),
    selectBtn: document.getElementById('selectBtn'),
    bulkActions: document.getElementById('bulkActions'),
    selectedCount: document.getElementById('selectedCount'),
    bulkFavoriteBtn: document.getElementById('bulkFavoriteBtn'),
    bulkArchiveBtn: document.getElementById('bulkArchiveBtn'),
    bulkDeleteBtn: document.getElementById('bulkDeleteBtn'),
    bulkCancelBtn: document.getElementById('bulkCancelBtn'),
    bulkReadBtn: document.getElementById('bulkReadBtn'),
    cancelModal: document.getElementById('cancelModal'),
    closeBookmarkModal: document.getElementById('closeBookmarkModal'),
    cancelQuickAdd: document.getElementById('cancelQuickAdd'),
    closeQuickAddModal: document.getElementById('closeQuickAddModal'),
    cancelExport: document.getElementById('cancelExport'),
    closeExportModal: document.getElementById('closeExportModal'),
    closeStatsModal: document.getElementById('closeStatsModal'),
    closeSettingsModal: document.getElementById('closeSettingsModal'),
    confirmExport: document.getElementById('confirmExport'),
    showStats: document.getElementById('showStats'),
    settingsBtn: document.getElementById('settingsBtn'),
    gridViewBtn: document.getElementById('gridViewBtn'),
    listViewBtn: document.getElementById('listViewBtn'),
    sortBtn: document.getElementById('sortBtn'),
    sortDropdown: document.getElementById('sortDropdown'),
    searchOverlay: document.getElementById('searchOverlay'),
    mobileSearchBtn: document.getElementById('mobileSearchBtn'),
    closeSearch: document.getElementById('closeSearch'),
    searchModalInput: document.getElementById('searchModalInput'),
    tagInput: document.getElementById('tagInput'),
    tagInputContainer: document.getElementById('tagInputContainer'),
    storageCount: document.getElementById('storageCount'),
    storageSize: document.getElementById('storageSize'),
    storageBar: document.getElementById('storageBar')
};

// Initialize
function init() {
    updateTags();
    applySettings();
    render();
    setupEventListeners();
    
    // Add sample data if empty
    if (bookmarks.length === 0) {
        addSampleData();
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Mobile Menu
    if (elements.mobileMenuBtn) {
        elements.mobileMenuBtn.addEventListener('click', () => toggleSidebar(true));
    }
    if (elements.closeSidebar) {
        elements.closeSidebar.addEventListener('click', () => toggleSidebar(false));
    }
    if (elements.sidebarOverlay) {
        elements.sidebarOverlay.addEventListener('click', () => toggleSidebar(false));
    }

    // Theme Toggle
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
    }

    // Navigation
    document.querySelectorAll('.nav-links a[data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.getAttribute('data-view');
            setCurrentView(view);
            updatePageTitle(link.textContent.trim());
            toggleSidebar(false);
        });
    });

    // Search
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', handleSearch);
    }
    if (elements.searchClear) {
        elements.searchClear.addEventListener('click', clearSearch);
    }

    // Mobile Search
    if (elements.mobileSearchBtn) {
        elements.mobileSearchBtn.addEventListener('click', () => {
            elements.searchOverlay.classList.add('active');
            elements.searchModalInput.focus();
        });
    }
    if (elements.closeSearch) {
        elements.closeSearch.addEventListener('click', () => {
            elements.searchOverlay.classList.remove('active');
        });
    }
    if (elements.searchModalInput) {
        elements.searchModalInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            render();
        });
    }

    // Add Bookmark
    if (elements.addBookmarkBtn) {
        elements.addBookmarkBtn.addEventListener('click', () => showBookmarkModal());
    }
    if (elements.addFirstBookmark) {
        elements.addFirstBookmark.addEventListener('click', () => showBookmarkModal());
    }
    if (elements.quickAddBtn) {
        elements.quickAddBtn.addEventListener('click', () => showQuickAddModal());
    }

    // Modal Controls
    if (elements.cancelModal) {
        elements.cancelModal.addEventListener('click', () => hideModal(elements.bookmarkModal));
    }
    if (elements.closeBookmarkModal) {
        elements.closeBookmarkModal.addEventListener('click', () => hideModal(elements.bookmarkModal));
    }
    if (elements.cancelQuickAdd) {
        elements.cancelQuickAdd.addEventListener('click', () => hideModal(elements.quickAddModal));
    }
    if (elements.closeQuickAddModal) {
        elements.closeQuickAddModal.addEventListener('click', () => hideModal(elements.quickAddModal));
    }

    // Bookmark Form
    if (elements.bookmarkForm) {
        elements.bookmarkForm.addEventListener('submit', handleBookmarkSubmit);
    }
    
    // Quick Add Form
    if (elements.quickAddForm) {
        elements.quickAddForm.addEventListener('submit', handleQuickAddSubmit);
    }

    // Tag Input
    if (elements.tagInput) {
        elements.tagInput.addEventListener('keydown', handleTagInput);
    }

    // Export/Import
    if (elements.importBtn) {
        elements.importBtn.addEventListener('click', handleImport);
    }
    if (elements.exportBtn) {
        elements.exportBtn.addEventListener('click', () => showModal(elements.exportModal));
    }
    if (elements.cancelExport) {
        elements.cancelExport.addEventListener('click', () => hideModal(elements.exportModal));
    }
    if (elements.closeExportModal) {
        elements.closeExportModal.addEventListener('click', () => hideModal(elements.exportModal));
    }
    if (elements.confirmExport) {
        elements.confirmExport.addEventListener('click', handleExport);
    }

    // Statistics
    if (elements.showStats) {
        elements.showStats.addEventListener('click', (e) => {
            e.preventDefault();
            showStatsModal();
        });
    }
    if (elements.closeStatsModal) {
        elements.closeStatsModal.addEventListener('click', () => hideModal(elements.statsModal));
    }

    // Settings
    if (elements.settingsBtn) {
        elements.settingsBtn.addEventListener('click', () => showModal(elements.settingsModal));
    }
    if (elements.closeSettingsModal) {
        elements.closeSettingsModal.addEventListener('click', () => hideModal(elements.settingsModal));
    }

    // View Toggles
    if (elements.gridViewBtn) {
        elements.gridViewBtn.addEventListener('click', () => setLayout('grid'));
    }
    if (elements.listViewBtn) {
        elements.listViewBtn.addEventListener('click', () => setLayout('list'));
    }

    // Sort
    if (elements.sortBtn) {
        elements.sortBtn.addEventListener('click', (e) => {
            elements.sortDropdown.classList.toggle('active');
            e.stopPropagation();
        });
    }
    
    document.querySelectorAll('.sort-option').forEach(option => {
        option.addEventListener('click', () => {
            currentSort = option.getAttribute('data-sort');
            render();
            elements.sortDropdown.classList.remove('active');
        });
    });

    // Bulk Actions
    if (elements.selectBtn) {
        elements.selectBtn.addEventListener('click', toggleSelectionMode);
    }
    if (elements.bulkCancelBtn) {
        elements.bulkCancelBtn.addEventListener('click', cancelSelection);
    }
    if (elements.bulkFavoriteBtn) {
        elements.bulkFavoriteBtn.addEventListener('click', () => bulkAction('favorite'));
    }
    if (elements.bulkArchiveBtn) {
        elements.bulkArchiveBtn.addEventListener('click', () => bulkAction('archive'));
    }
    if (elements.bulkReadBtn) {
        elements.bulkReadBtn.addEventListener('click', () => bulkAction('read'));
    }
    if (elements.bulkDeleteBtn) {
        elements.bulkDeleteBtn.addEventListener('click', () => bulkAction('delete'));
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#sortDropdown') && !e.target.closest('#sortBtn')) {
            elements.sortDropdown.classList.remove('active');
        }
    });

    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideAllModals();
        }
    });
}

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function saveBookmarks() {
    localStorage.setItem('pinpoint_bookmarks', JSON.stringify(bookmarks));
    updateTags();
    updateStorageStats();
}

function saveSettings() {
    localStorage.setItem('pinpoint_settings', JSON.stringify(settings));
    applySettings();
}

function updateTags() {
    tags = {};
    bookmarks.forEach(bookmark => {
        if (bookmark.tags) {
            bookmark.tags.forEach(tag => {
                tags[tag] = (tags[tag] || 0) + 1;
            });
        }
    });
    renderTags();
}

function updateStorageStats() {
    const data = JSON.stringify(bookmarks);
    const size = new Blob([data]).size;
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    
    if (elements.storageCount) {
        elements.storageCount.textContent = `${bookmarks.length} bookmarks`;
    }
    if (elements.storageSize) {
        elements.storageSize.textContent = `${sizeMB} MB`;
    }
    if (elements.storageBar) {
        const percentage = Math.min((size / (5 * 1024 * 1024)) * 100, 100);
        elements.storageBar.style.width = `${percentage}%`;
    }
}

// Theme Functions
function applySettings() {
    // Apply theme
    const theme = settings.theme === 'auto' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : settings.theme;
    
    document.documentElement.setAttribute('data-theme', theme);
    
    // Apply layout
    if (elements.bookmarksContainer) {
        elements.bookmarksContainer.className = `bookmarks-container ${settings.layout}-view`;
    }
    
    // Update theme toggle button
    updateThemeToggle();
    
    // Update layout buttons
    updateLayoutButtons();
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    settings.theme = newTheme;
    saveSettings();
}

function updateThemeToggle() {
    if (!elements.themeToggle) return;
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    elements.themeToggle.innerHTML = isDark 
        ? '<i class="fas fa-sun"></i><span class="action-text">Light Mode</span>'
        : '<i class="fas fa-moon"></i><span class="action-text">Dark Mode</span>';
}

function setLayout(layout) {
    settings.layout = layout;
    saveSettings();
}

function updateLayoutButtons() {
    if (elements.gridViewBtn && elements.listViewBtn) {
        if (settings.layout === 'grid') {
            elements.gridViewBtn.classList.add('active');
            elements.listViewBtn.classList.remove('active');
        } else {
            elements.listViewBtn.classList.add('active');
            elements.gridViewBtn.classList.remove('active');
        }
    }
}

// View Management
function setCurrentView(view) {
    currentView = view;
    searchQuery = '';
    if (elements.searchInput) {
        elements.searchInput.value = '';
    }
    render();
}

function updatePageTitle(title) {
    if (elements.pageTitle) {
        elements.pageTitle.textContent = title;
    }
}

// Search Functions
function handleSearch(e) {
    searchQuery = e.target.value.toLowerCase();
    if (elements.searchClear) {
        elements.searchClear.style.display = searchQuery ? 'flex' : 'none';
    }
    render();
}

function clearSearch() {
    if (elements.searchInput) {
        elements.searchInput.value = '';
        searchQuery = '';
        elements.searchClear.style.display = 'none';
        render();
    }
}

// Modal Functions
function showModal(modal) {
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modal) {
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function hideAllModals() {
    const modals = document.querySelectorAll('.modal.active');
    modals.forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = '';
}

function toggleSidebar(show) {
    if (show) {
        elements.sidebar.classList.add('active');
        elements.sidebarOverlay.classList.add('active');
    } else {
        elements.sidebar.classList.remove('active');
        elements.sidebarOverlay.classList.remove('active');
    }
}

// Bookmark Functions
function showBookmarkModal(bookmark = null) {
    const form = elements.bookmarkForm;
    const titleInput = document.getElementById('bookmarkTitle');
    const urlInput = document.getElementById('bookmarkUrl');
    const descInput = document.getElementById('bookmarkDescription');
    const notesInput = document.getElementById('bookmarkNotes');
    const favoriteInput = document.getElementById('bookmarkFavorite');
    const unreadInput = document.getElementById('bookmarkUnread');
    const modalTitle = document.getElementById('modalTitle');
    
    // Reset form
    if (form) form.reset();
    
    // Clear tags
    if (elements.tagInputContainer) {
        elements.tagInputContainer.innerHTML = '';
    }
    
    if (bookmark) {
        // Edit mode
        editingId = bookmark.id;
        if (modalTitle) modalTitle.textContent = 'Edit Bookmark';
        if (titleInput) titleInput.value = bookmark.title || '';
        if (urlInput) urlInput.value = bookmark.url || '';
        if (descInput) descInput.value = bookmark.description || '';
        if (notesInput) notesInput.value = bookmark.notes || '';
        if (favoriteInput) favoriteInput.checked = bookmark.favorite || false;
        if (unreadInput) unreadInput.checked = bookmark.unread || false;
        
        // Add tags
        if (bookmark.tags) {
            bookmark.tags.forEach(tag => addTagToInput(tag));
        }
    } else {
        // Add mode
        editingId = null;
        if (modalTitle) modalTitle.textContent = 'Add New Bookmark';
    }
    
    showModal(elements.bookmarkModal);
    if (titleInput) titleInput.focus();
}

function showQuickAddModal() {
    const urlInput = document.getElementById('quickAddUrl');
    if (urlInput) {
        urlInput.value = '';
        urlInput.focus();
    }
    showModal(elements.quickAddModal);
}

function handleBookmarkSubmit(e) {
    e.preventDefault();
    
    const titleInput = document.getElementById('bookmarkTitle');
    const urlInput = document.getElementById('bookmarkUrl');
    const descInput = document.getElementById('bookmarkDescription');
    const notesInput = document.getElementById('bookmarkNotes');
    const favoriteInput = document.getElementById('bookmarkFavorite');
    const unreadInput = document.getElementById('bookmarkUnread');
    
    if (!titleInput || !urlInput) return;
    
    let title = titleInput.value.trim();
    let url = urlInput.value.trim();
    const description = descInput ? descInput.value.trim() : '';
    const notes = notesInput ? notesInput.value.trim() : '';
    const favorite = favoriteInput ? favoriteInput.checked : false;
    const unread = unreadInput ? unreadInput.checked : false;
    const tags = getTagsFromInput();
    
    // Validate URL
    if (!url) {
        showToast('URL is required', 'error');
        return;
    }
    
    // Add https:// if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    // Validate URL format
    try {
        new URL(url);
    } catch {
        showToast('Please enter a valid URL', 'error');
        return;
    }
    
    // Use URL as title if empty
    if (!title) {
        try {
            const urlObj = new URL(url);
            title = urlObj.hostname.replace('www.', '');
        } catch {
            title = 'Untitled Bookmark';
        }
    }
    
    const bookmarkData = {
        id: editingId || generateId(),
        title,
        url,
        description,
        notes,
        tags,
        favorite,
        unread,
        archived: false,
        createdAt: editingId ? bookmarks.find(b => b.id === editingId)?.createdAt || Date.now() : Date.now(),
        updatedAt: Date.now()
    };
    
    if (editingId) {
        // Update existing bookmark
        const index = bookmarks.findIndex(b => b.id === editingId);
        if (index !== -1) {
            bookmarks[index] = bookmarkData;
            showToast('Bookmark updated successfully', 'success');
        }
    } else {
        // Add new bookmark
        bookmarks.unshift(bookmarkData);
        showToast('Bookmark added successfully', 'success');
    }
    
    saveBookmarks();
    hideModal(elements.bookmarkModal);
    render();
}

function handleQuickAddSubmit(e) {
    e.preventDefault();
    
    const urlInput = document.getElementById('quickAddUrl');
    if (!urlInput) return;
    
    let url = urlInput.value.trim();
    
    if (!url) {
        showToast('Please enter a URL', 'error');
        return;
    }
    
    // Add https:// if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    // Validate URL
    try {
        new URL(url);
    } catch {
        showToast('Please enter a valid URL', 'error');
        return;
    }
    
    // Extract title from URL
    let title;
    try {
        const urlObj = new URL(url);
        title = urlObj.hostname.replace('www.', '');
    } catch {
        title = 'Untitled Bookmark';
    }
    
    const bookmarkData = {
        id: generateId(),
        title,
        url,
        description: '',
        notes: '',
        tags: [],
        favorite: false,
        unread: true,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    bookmarks.unshift(bookmarkData);
    saveBookmarks();
    showToast('Bookmark added successfully', 'success');
    hideModal(elements.quickAddModal);
    render();
}

// Tag Functions
function handleTagInput(e) {
    if (e.key === 'Enter' && e.target.value.trim()) {
        e.preventDefault();
        addTagToInput(e.target.value.trim());
        e.target.value = '';
    }
}

function addTagToInput(tag) {
    if (!elements.tagInputContainer) return;
    
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
    
    elements.tagInputContainer.insertBefore(tagEl, elements.tagInput);
}

function getTagsFromInput() {
    const tagPills = document.querySelectorAll('.tag-pill');
    return Array.from(tagPills).map(pill => 
        pill.textContent.replace('×', '').trim()
    );
}

// Render Functions
function render() {
    const filteredBookmarks = getFilteredBookmarks();
    const container = elements.bookmarksContainer;
    
    if (!container) return;
    
    // Update count
    if (elements.bookmarkCount) {
        elements.bookmarkCount.textContent = `${filteredBookmarks.length} bookmark${filteredBookmarks.length !== 1 ? 's' : ''}`;
    }
    
    // Show empty state if no bookmarks
    if (filteredBookmarks.length === 0) {
        container.innerHTML = '';
        if (elements.emptyState) {
            container.appendChild(elements.emptyState);
            elements.emptyState.style.display = 'flex';
        }
        return;
    }
    
    // Hide empty state
    if (elements.emptyState) {
        elements.emptyState.style.display = 'none';
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Render bookmarks
    filteredBookmarks.forEach(bookmark => {
        const card = createBookmarkCard(bookmark);
        container.appendChild(card);
    });
    
    updateBulkActions();
}

function createBookmarkCard(bookmark) {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    card.dataset.id = bookmark.id;
    
    if (selectedBookmarks.has(bookmark.id)) {
        card.classList.add('selected');
    }
    
    // Format dates
    const createdDate = new Date(bookmark.createdAt);
    const createdStr = createdDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    
    // Get domain for favicon
    let domain = '';
    try {
        domain = new URL(bookmark.url).hostname.replace('www.', '');
    } catch {
        domain = 'link';
    }
    
    // Build tags HTML
    const tagsHTML = bookmark.tags && bookmark.tags.length > 0
        ? `<div class="bookmark-tags">
            ${bookmark.tags.map(tag => `<span class="bookmark-tag">${tag}</span>`).join('')}
          </div>`
        : '';
    
    card.innerHTML = `
        <div class="selection-checkbox ${selectedBookmarks.has(bookmark.id) ? 'checked' : ''}"></div>
        <div class="bookmark-header">
            <div class="bookmark-favicon fallback" data-domain="${domain}">
                <span>${domain.charAt(0).toUpperCase()}</span>
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
    const urlLink = card.querySelector('.bookmark-url');
    
    // Selection checkbox
    selectionCheckbox.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBookmarkSelection(bookmark.id);
    });
    
    // Action buttons
    actionButtons[0].addEventListener('click', (e) => {
        e.stopPropagation();
        toggleRead(bookmark.id);
    });
    
    actionButtons[1].addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(bookmark.id);
    });
    
    actionButtons[2].addEventListener('click', (e) => {
        e.stopPropagation();
        toggleArchive(bookmark.id);
    });
    
    actionButtons[3].addEventListener('click', (e) => {
        e.stopPropagation();
        deleteBookmark(bookmark.id);
    });
    
    // URL click
    urlLink.addEventListener('click', (e) => {
        e.stopPropagation();
        if (bookmark.unread) {
            toggleRead(bookmark.id);
        }
    });
    
    // Card click (opens URL)
    card.addEventListener('click', (e) => {
        if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('.selection-checkbox')) {
            window.open(bookmark.url, '_blank');
            if (bookmark.unread) {
                toggleRead(bookmark.id);
            }
        }
    });
    
    return card;
}

function getFilteredBookmarks() {
    let filtered = [...bookmarks];
    
    // Filter by view
    switch (currentView) {
        case 'favorites':
            filtered = filtered.filter(b => b.favorite && !b.archived);
            break;
        case 'unread':
            filtered = filtered.filter(b => b.unread && !b.archived);
            break;
        case 'archived':
            filtered = filtered.filter(b => b.archived);
            break;
        case 'recent':
            const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            filtered = filtered.filter(b => b.createdAt >= weekAgo && !b.archived);
            break;
        default:
            filtered = filtered.filter(b => !b.archived);
    }
    
    // Filter by search query
    if (searchQuery) {
        filtered = filtered.filter(b => 
            (b.title && b.title.toLowerCase().includes(searchQuery)) ||
            (b.url && b.url.toLowerCase().includes(searchQuery)) ||
            (b.description && b.description.toLowerCase().includes(searchQuery)) ||
            (b.tags && b.tags.some(tag => tag.toLowerCase().includes(searchQuery)))
        );
    }
    
    // Sort
    filtered.sort((a, b) => {
        switch (currentSort) {
            case 'date-desc':
                return b.createdAt - a.createdAt;
            case 'date-asc':
                return a.createdAt - b.createdAt;
            case 'title-asc':
                return (a.title || '').localeCompare(b.title || '');
            case 'title-desc':
                return (b.title || '').localeCompare(a.title || '');
            case 'domain':
                const domainA = new URL(a.url).hostname;
                const domainB = new URL(b.url).hostname;
                return domainA.localeCompare(domainB);
            default:
                return b.createdAt - a.createdAt;
        }
    });
    
    return filtered;
}

function renderTags() {
    const container = document.getElementById('tagsList');
    if (!container) return;
    
    const sortedTags = Object.entries(tags).sort(([, a], [, b]) => b - a);
    
    if (sortedTags.length === 0) {
        container.innerHTML = '<div class="no-tags">No tags yet</div>';
        return;
    }
    
    container.innerHTML = sortedTags.map(([tag, count]) => `
        <div class="tag-item">
            <div class="tag-info">
                <div class="tag-color"></div>
                <span class="tag-name">${tag}</span>
            </div>
            <span class="tag-count">${count}</span>
        </div>
    `).join('');
    
    // Add event listeners to tags
    container.querySelectorAll('.tag-item').forEach(item => {
        const tagName = item.querySelector('.tag-name').textContent;
        item.addEventListener('click', () => {
            searchQuery = tagName;
            if (elements.searchInput) {
                elements.searchInput.value = tagName;
            }
            setCurrentView('all');
            updatePageTitle(`Tag: ${tagName}`);
        });
    });
}

// Bookmark Actions
function toggleBookmarkSelection(id) {
    if (selectedBookmarks.has(id)) {
        selectedBookmarks.delete(id);
    } else {
        selectedBookmarks.add(id);
    }
    render();
}

function toggleFavorite(id) {
    const bookmark = bookmarks.find(b => b.id === id);
    if (bookmark) {
        bookmark.favorite = !bookmark.favorite;
        bookmark.updatedAt = Date.now();
        saveBookmarks();
        render();
    }
}

function toggleArchive(id) {
    const bookmark = bookmarks.find(b => b.id === id);
    if (bookmark) {
        bookmark.archived = !bookmark.archived;
        bookmark.updatedAt = Date.now();
        saveBookmarks();
        render();
    }
}

function toggleRead(id) {
    const bookmark = bookmarks.find(b => b.id === id);
    if (bookmark) {
        bookmark.unread = !bookmark.unread;
        bookmark.updatedAt = Date.now();
        saveBookmarks();
        render();
    }
}

function deleteBookmark(id) {
    if (confirm('Are you sure you want to delete this bookmark?')) {
        bookmarks = bookmarks.filter(b => b.id !== id);
        saveBookmarks();
        render();
        showToast('Bookmark deleted', 'success');
    }
}

// Bulk Actions
function toggleSelectionMode() {
    if (selectedBookmarks.size > 0) {
        selectedBookmarks.clear();
    }
    render();
}

function cancelSelection() {
    selectedBookmarks.clear();
    render();
}

function bulkAction(action) {
    if (selectedBookmarks.size === 0) return;
    
    let message = '';
    
    switch (action) {
        case 'favorite':
            bookmarks.forEach(b => {
                if (selectedBookmarks.has(b.id)) {
                    b.favorite = true;
                    b.updatedAt = Date.now();
                }
            });
            message = 'Bookmarks favorited';
            break;
            
        case 'archive':
            bookmarks.forEach(b => {
                if (selectedBookmarks.has(b.id)) {
                    b.archived = true;
                    b.updatedAt = Date.now();
                }
            });
            message = 'Bookmarks archived';
            break;
            
        case 'read':
            bookmarks.forEach(b => {
                if (selectedBookmarks.has(b.id)) {
                    b.unread = false;
                    b.updatedAt = Date.now();
                }
            });
            message = 'Bookmarks marked as read';
            break;
            
        case 'delete':
            if (!confirm(`Delete ${selectedBookmarks.size} bookmark${selectedBookmarks.size !== 1 ? 's' : ''}?`)) {
                return;
            }
            bookmarks = bookmarks.filter(b => !selectedBookmarks.has(b.id));
            message = 'Bookmarks deleted';
            break;
    }
    
    saveBookmarks();
    selectedBookmarks.clear();
    render();
    showToast(message, 'success');
}

function updateBulkActions() {
    if (!elements.bulkActions || !elements.selectedCount) return;
    
    const count = selectedBookmarks.size;
    elements.selectedCount.textContent = count;
    
    if (count > 0) {
        elements.bulkActions.classList.add('active');
        document.body.classList.add('selection-mode');
    } else {
        elements.bulkActions.classList.remove('active');
        document.body.classList.remove('selection-mode');
    }
}

// Import/Export Functions
function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedBookmarks = JSON.parse(event.target.result);
                
                if (!Array.isArray(importedBookmarks)) {
                    throw new Error('Invalid file format');
                }
                
                // Merge with existing bookmarks (avoid duplicates by URL)
                importedBookmarks.forEach(imported => {
                    const exists = bookmarks.some(b => b.url === imported.url);
                    if (!exists) {
                        bookmarks.unshift({
                            ...imported,
                            id: generateId(),
                            createdAt: imported.createdAt || Date.now(),
                            updatedAt: Date.now()
                        });
                    }
                });
                
                saveBookmarks();
                render();
                showToast(`${importedBookmarks.length} bookmarks imported`, 'success');
            } catch (error) {
                showToast('Error importing bookmarks: ' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

function handleExport() {
    const format = document.querySelector('input[name="exportFormat"]:checked').value;
    const includeFavorites = document.getElementById('exportFavorites')?.checked ?? true;
    const includeArchived = document.getElementById('exportArchived')?.checked ?? false;
    const includeTags = document.getElementById('exportTags')?.checked ?? true;
    const includeNotes = document.getElementById('exportNotes')?.checked ?? true;
    
    let dataToExport = [...bookmarks];
    
    // Apply filters
    if (!includeFavorites) {
        dataToExport = dataToExport.filter(b => !b.favorite);
    }
    if (!includeArchived) {
        dataToExport = dataToExport.filter(b => !b.archived);
    }
    
    // Remove fields if not included
    if (!includeTags) {
        dataToExport = dataToExport.map(({ tags, ...rest }) => rest);
    }
    if (!includeNotes) {
        dataToExport = dataToExport.map(({ notes, ...rest }) => rest);
    }
    
    let content, mimeType, extension;
    
    switch (format) {
        case 'json':
            content = JSON.stringify(dataToExport, null, 2);
            mimeType = 'application/json';
            extension = 'json';
            break;
            
        case 'html':
            content = generateHTMLExport(dataToExport);
            mimeType = 'text/html';
            extension = 'html';
            break;
            
        case 'csv':
            content = generateCSVExport(dataToExport);
            mimeType = 'text/csv';
            extension = 'csv';
            break;
            
        default:
            content = JSON.stringify(dataToExport, null, 2);
            mimeType = 'application/json';
            extension = 'json';
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
    
    showToast(`Exported ${dataToExport.length} bookmarks`, 'success');
    hideModal(elements.exportModal);
}

function generateHTMLExport(bookmarks) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>PinPoint Bookmarks Export</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .bookmark { margin-bottom: 20px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; }
        .title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
        .url { color: #0066cc; margin-bottom: 10px; word-break: break-all; }
        .description { color: #666; margin-bottom: 10px; }
        .tags { font-size: 12px; color: #888; margin-top: 5px; }
        .tag { display: inline-block; background: #f0f0f0; padding: 2px 8px; border-radius: 10px; margin-right: 5px; }
        .metadata { font-size: 12px; color: #999; margin-top: 5px; }
    </style>
</head>
<body>
    <h1>PinPoint Bookmarks Export</h1>
    <p>Generated on ${new Date().toLocaleString()} | Total: ${bookmarks.length} bookmarks</p>
    <hr>
    ${bookmarks.map(bookmark => `
        <div class="bookmark">
            <div class="title">${bookmark.title || 'Untitled'}</div>
            <div class="url"><a href="${bookmark.url}" target="_blank">${bookmark.url}</a></div>
            ${bookmark.description ? `<div class="description">${bookmark.description}</div>` : ''}
            ${bookmark.tags && bookmark.tags.length ? `
                <div class="tags">
                    Tags: ${bookmark.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            <div class="metadata">
                Created: ${new Date(bookmark.createdAt).toLocaleDateString()} | 
                ${bookmark.favorite ? '⭐ ' : ''}
                ${bookmark.unread ? '👁️ ' : ''}
                ${bookmark.archived ? '📁 ' : ''}
            </div>
        </div>
    `).join('')}
</body>
</html>`;
}

function generateCSVExport(bookmarks) {
    const headers = ['Title', 'URL', 'Description', 'Tags', 'Favorite', 'Unread', 'Archived', 'Created'];
    const rows = bookmarks.map(bookmark => [
        `"${(bookmark.title || '').replace(/"/g, '""')}"`,
        `"${bookmark.url.replace(/"/g, '""')}"`,
        `"${(bookmark.description || '').replace(/"/g, '""')}"`,
        `"${(bookmark.tags || []).join(', ').replace(/"/g, '""')}"`,
        bookmark.favorite ? 'Yes' : 'No',
        bookmark.unread ? 'Yes' : 'No',
        bookmark.archived ? 'Yes' : 'No',
        new Date(bookmark.createdAt).toISOString()
    ]);
    
    return [headers.join(','), ...rows].join('\n');
}

// Statistics Functions
function showStatsModal() {
    updateStats();
    showModal(elements.statsModal);
}

function updateStats() {
    // Update basic stats
    document.getElementById('totalBookmarksStat').textContent = bookmarks.length;
    document.getElementById('favoriteBookmarksStat').textContent = bookmarks.filter(b => b.favorite).length;
    document.getElementById('totalTagsStat').textContent = Object.keys(tags).length;
    
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentCount = bookmarks.filter(b => b.createdAt >= weekAgo).length;
    document.getElementById('recentBookmarksStat').textContent = recentCount;
    
    // Update tag cloud
    const tagCloud = document.getElementById('tagCloud');
    if (tagCloud) {
        const topTags = Object.entries(tags)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }));
        
        tagCloud.innerHTML = topTags.map(({ tag, count }) => `
            <span class="bookmark-tag" style="font-size: ${0.8 + (count / Math.max(...topTags.map(t => t.count))) * 0.7}rem">
                ${tag} <small>(${count})</small>
            </span>
        `).join('');
    }
    
    // Update domain list
    const domainList = document.getElementById('domainList');
    if (domainList) {
        const domainCounts = {};
        bookmarks.forEach(bookmark => {
            try {
                const domain = new URL(bookmark.url).hostname;
                domainCounts[domain] = (domainCounts[domain] || 0) + 1;
            } catch (e) {
                // Skip invalid URLs
            }
        });
        
        const topDomains = Object.entries(domainCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([domain, count]) => ({ domain, count }));
        
        domainList.innerHTML = topDomains.map(({ domain, count }) => `
            <div class="domain-item">
                <div class="domain-name">
                    <i class="fas fa-globe"></i>
                    <span>${domain}</span>
                </div>
                <span class="domain-count">${count}</span>
            </div>
        `).join('');
    }
}

// Toast Notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type] || 'fa-info-circle'} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
    
    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    });
}

// Sample Data
function addSampleData() {
    const sampleBookmarks = [
        {
            id: generateId(),
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
            id: generateId(),
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
            id: generateId(),
            title: 'CSS-Tricks',
            url: 'https://css-tricks.com',
            description: 'Front-end development blog and community',
            tags: ['css', 'frontend', 'blog'],
            favorite: false,
            unread: true,
            archived: false,
            createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
            updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000
        }
    ];
    
    bookmarks = sampleBookmarks;
    saveBookmarks();
    render();
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);