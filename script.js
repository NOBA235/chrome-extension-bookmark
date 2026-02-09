  // Bookmark Manager Core Application
  class BookmarkManager {
    constructor() {
      this.bookmarks = this.loadBookmarks();
      this.selectedBookmarks = new Set();
      this.currentView = 'all';
      this.currentFilter = 'all';
      this.searchQuery = '';
      this.editingBookmark = null;
      this.exportFormat = 'json';
      this.tags = new Set();
      this.initialize();
    }

    initialize() {
      this.setupEventListeners();
      this.renderBookmarks();
      this.updateTagsList();
      this.updateStats();
      this.setupDemoData();
    }

    loadBookmarks() {
      const saved = localStorage.getItem('markflow_bookmarks');
      if (saved) {
        return JSON.parse(saved);
      }
      return [];
    }

    saveBookmarks() {
      localStorage.setItem('markflow_bookmarks', JSON.stringify(this.bookmarks));
      this.updateStats();
      this.updateTagsList();
    }

    setupDemoData() {
      if (this.bookmarks.length === 0) {
        this.bookmarks = [
          {
            id: '1',
            title: 'Frontend Mentor',
            url: 'https://frontendmentor.io',
            description: 'Improve your front-end coding skills by building real projects.',
            tags: ['Practice', 'Learning', 'Community'],
            favorite: true,
            archived: false,
            visits: 47,
            added: new Date().toISOString().split('T')[0]
          },
          {
            id: '2',
            title: 'React Documentation',
            url: 'https://react.dev',
            description: 'The library for web and native user interfaces.',
            tags: ['JavaScript', 'Framework', 'Reference'],
            favorite: false,
            archived: false,
            visits: 0,
            added: new Date().toISOString().split('T')[0]
          },
          {
            id: '3',
            title: 'Claude AI Assistant',
            url: 'https://claude.ai',
            description: 'AI assistant for analysis, writing, coding, and creative tasks.',
            tags: ['AI', 'Tools', 'Learning'],
            favorite: true,
            archived: false,
            visits: 73,
            added: new Date().toISOString().split('T')[0]
          },
          {
            id: '4',
            title: 'Web.dev by Google',
            url: 'https://web.dev',
            description: 'Build modern web experiences that work on any browser.',
            tags: ['Performance', 'Learning', 'Tips'],
            favorite: false,
            archived: false,
            visits: 15,
            added: new Date().toISOString().split('T')[0]
          }
        ];
        this.saveBookmarks();
      }
    }

    getFilteredBookmarks() {
      let filtered = [...this.bookmarks];

      // Apply view filter
      switch(this.currentView) {
        case 'favorites':
          filtered = filtered.filter(b => b.favorite);
          break;
        case 'archived':
          filtered = filtered.filter(b => b.archived);
          break;
        case 'recent':
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          filtered = filtered.filter(b => new Date(b.added) > weekAgo);
          break;
      }

      // Apply tag filter
      if (this.currentFilter !== 'all') {
        filtered = filtered.filter(b => b.tags.includes(this.currentFilter));
      }

      // Apply search
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(b => 
          b.title.toLowerCase().includes(query) ||
          b.url.toLowerCase().includes(query) ||
          b.description.toLowerCase().includes(query) ||
          b.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }

      return filtered;
    }

    renderBookmarks() {
      const container = document.getElementById('bookmarksContainer');
      const bookmarks = this.getFilteredBookmarks();
      
      if (bookmarks.length === 0) {
        document.getElementById('emptyState').classList.remove('hidden');
        container.innerHTML = '<div class="empty-state" id="emptyState"><i class="fas fa-bookmark"></i><h3>No bookmarks found</h3><p>' + 
          (this.searchQuery ? 'Try a different search' : 'Add your first bookmark to get started!') + '</p></div>';
        return;
      }
      
      document.getElementById('emptyState').classList.add('hidden');
      
      container.innerHTML = bookmarks.map(bookmark => this.createBookmarkHTML(bookmark)).join('');
      
      // Update count
      document.getElementById('bookmarkCount').textContent = 
        `${bookmarks.length} bookmark${bookmarks.length !== 1 ? 's' : ''}`;
    }

    createBookmarkHTML(bookmark) {
      const isSelected = this.selectedBookmarks.has(bookmark.id);
      const faviconColor = this.getFaviconColor(bookmark.url);
      
      return `
        <div class="bookmark-card ${isSelected ? 'selected' : ''}" data-id="${bookmark.id}">
          <div class="selection-checkbox ${isSelected ? 'checked' : ''}" onclick="app.toggleSelect('${bookmark.id}')"></div>
          <div class="bookmark-header">
            <div class="bookmark-favicon" style="background-color: ${faviconColor.bg}; border-color: ${faviconColor.border}">
              <i class="${faviconColor.icon}" style="color: ${faviconColor.color}"></i>
            </div>
            <div class="bookmark-info">
              <h3 class="bookmark-title text-truncate">
                ${bookmark.favorite ? '<i class="fas fa-star" style="color: var(--warning); font-size: 0.875em;"></i>' : ''}
                ${this.escapeHtml(bookmark.title)}
              </h3>
              <a href="${this.escapeHtml(bookmark.url)}" class="bookmark-url text-truncate" target="_blank" onclick="app.incrementVisits('${bookmark.id}')">
                ${this.getDomain(bookmark.url)}
              </a>
            </div>
            <button class="action-menu" onclick="app.showBookmarkMenu('${bookmark.id}')">
              <i class="fas fa-ellipsis-v"></i>
            </button>
          </div>
          <p class="bookmark-description">${this.escapeHtml(bookmark.description)}</p>
          <div class="bookmark-tags">
            ${bookmark.tags.map(tag => `
              <span class="bookmark-tag" onclick="app.filterByTag('${tag}')">${this.escapeHtml(tag)}</span>
            `).join('')}
          </div>
          <div class="bookmark-footer">
            <div class="bookmark-stats">
              <div class="stat-item">
                <i class="far fa-calendar"></i>
                <span>${bookmark.added}</span>
              </div>
              <div class="stat-item">
                <i class="far fa-eye"></i>
                <span>${bookmark.visits} visit${bookmark.visits !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div class="footer-actions">
              <button class="footer-btn ${bookmark.favorite ? 'active' : ''}" onclick="app.toggleFavorite('${bookmark.id}')">
                <i class="${bookmark.favorite ? 'fas' : 'far'} fa-star"></i>
              </button>
              <button class="footer-btn ${bookmark.archived ? 'active' : ''}" onclick="app.toggleArchive('${bookmark.id}')">
                <i class="fas fa-archive"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    getDomain(url) {
      try {
        return new URL(url).hostname.replace('www.', '');
      } catch {
        return url;
      }
    }

    getFaviconColor(url) {
      const domains = {
        'github.com': { icon: 'fab fa-github', color: '#333', bg: '#f3f4f6', border: '#d1d5db' },
        'twitter.com': { icon: 'fab fa-twitter', color: '#1da1f2', bg: '#f0f9ff', border: '#bae6fd' },
        'youtube.com': { icon: 'fab fa-youtube', color: '#ff0000', bg: '#fef2f2', border: '#fecaca' },
        'react.dev': { icon: 'fab fa-react', color: '#61dafb', bg: '#f0f9ff', border: '#bae6fd' },
        'frontendmentor.io': { icon: 'fas fa-code', color: '#3b82f6', bg: '#f0f9ff', border: '#bae6fd' },
        'claude.ai': { icon: 'fas fa-robot', color: '#8b5cf6', bg: '#faf5ff', border: '#e9d5ff' },
        'web.dev': { icon: 'fas fa-globe', color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd' }
      };
      
      const domain = this.getDomain(url);
      return domains[domain] || { 
        icon: 'fas fa-globe', 
        color: '#10b981', 
        bg: '#f0fdf4', 
        border: '#bbf7d0' 
      };
    }

    addBookmark(data) {
      const bookmark = {
        id: Date.now().toString(),
        title: data.title,
        url: data.url,
        description: data.description || '',
        tags: data.tags || [],
        favorite: false,
        archived: false,
        visits: 0,
        added: new Date().toISOString().split('T')[0]
      };
      
      this.bookmarks.unshift(bookmark);
      this.saveBookmarks();
      this.renderBookmarks();
      this.showNotification('Bookmark added successfully!');
    }

    updateBookmark(id, data) {
      const index = this.bookmarks.findIndex(b => b.id === id);
      if (index !== -1) {
        this.bookmarks[index] = { ...this.bookmarks[index], ...data };
        this.saveBookmarks();
        this.renderBookmarks();
        this.showNotification('Bookmark updated successfully!');
      }
    }

    deleteBookmark(id) {
      this.bookmarks = this.bookmarks.filter(b => b.id !== id);
      this.saveBookmarks();
      this.renderBookmarks();
      this.showNotification('Bookmark deleted!');
    }

    toggleFavorite(id) {
      const bookmark = this.bookmarks.find(b => b.id === id);
      if (bookmark) {
        bookmark.favorite = !bookmark.favorite;
        this.saveBookmarks();
        this.renderBookmarks();
      }
    }

    toggleArchive(id) {
      const bookmark = this.bookmarks.find(b => b.id === id);
      if (bookmark) {
        bookmark.archived = !bookmark.archived;
        this.saveBookmarks();
        this.renderBookmarks();
      }
    }

    incrementVisits(id) {
      const bookmark = this.bookmarks.find(b => b.id === id);
      if (bookmark) {
        bookmark.visits = (bookmark.visits || 0) + 1;
        this.saveBookmarks();
      }
    }

    toggleSelect(id) {
      if (this.selectedBookmarks.has(id)) {
        this.selectedBookmarks.delete(id);
      } else {
        this.selectedBookmarks.add(id);
      }
      this.updateSelectionUI();
    }

    selectAll() {
      const bookmarks = this.getFilteredBookmarks();
      bookmarks.forEach(b => this.selectedBookmarks.add(b.id));
      this.updateSelectionUI();
    }

    clearSelection() {
      this.selectedBookmarks.clear();
      this.updateSelectionUI();
    }

    updateSelectionUI() {
      const selectedCount = this.selectedBookmarks.size;
      document.getElementById('selectedCount').textContent = selectedCount;
      
      // Update checkboxes
      document.querySelectorAll('.bookmark-card').forEach(card => {
        const id = card.dataset.id;
        const checkbox = card.querySelector('.selection-checkbox');
        if (this.selectedBookmarks.has(id)) {
          card.classList.add('selected');
          checkbox.classList.add('checked');
        } else {
          card.classList.remove('selected');
          checkbox.classList.remove('checked');
        }
      });
      
      // Show/hide bulk actions
      const bulkActions = document.getElementById('bulkActions');
      if (selectedCount > 0) {
        bulkActions.classList.add('active');
        document.body.classList.add('selection-mode');
      } else {
        bulkActions.classList.remove('active');
        document.body.classList.remove('selection-mode');
      }
    }

    bulkAction(action) {
      const ids = Array.from(this.selectedBookmarks);
      
      switch(action) {
        case 'favorite':
          ids.forEach(id => {
            const bookmark = this.bookmarks.find(b => b.id === id);
            if (bookmark) bookmark.favorite = true;
          });
          break;
        case 'archive':
          ids.forEach(id => {
            const bookmark = this.bookmarks.find(b => b.id === id);
            if (bookmark) bookmark.archived = true;
          });
          break;
        case 'delete':
          if (confirm(`Delete ${ids.length} bookmark${ids.length !== 1 ? 's' : ''}?`)) {
            ids.forEach(id => this.deleteBookmark(id));
          } else {
            return;
          }
          break;
      }
      
      this.saveBookmarks();
      this.renderBookmarks();
      this.clearSelection();
    }

    filterByTag(tag) {
      this.currentFilter = tag;
      document.querySelectorAll('.tag-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tag === tag) {
          item.classList.add('active');
        }
      });
      this.renderBookmarks();
    }

    updateTagsList() {
      // Collect all tags
      const allTags = new Set();
      this.bookmarks.forEach(bookmark => {
        bookmark.tags.forEach(tag => allTags.add(tag));
      });
      
      // Count tag usage
      const tagCounts = {};
      this.bookmarks.forEach(bookmark => {
        bookmark.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });
      
      // Sort by count
      const sortedTags = Array.from(allTags).sort((a, b) => tagCounts[b] - tagCounts[a]);
      
      const tagsList = document.getElementById('tagsList');
      tagsList.innerHTML = `
        <div class="tag-item ${this.currentFilter === 'all' ? 'active' : ''}" data-tag="all" onclick="app.filterByTag('all')">
          <div class="tag-name">All</div>
          <div class="tag-count">${this.bookmarks.length}</div>
        </div>
        ${sortedTags.map(tag => `
          <div class="tag-item ${this.currentFilter === tag ? 'active' : ''}" data-tag="${tag}" onclick="app.filterByTag('${tag}')">
            <div class="tag-name">${tag}</div>
            <div class="tag-count">${tagCounts[tag]}</div>
          </div>
        `).join('')}
      `;
    }

    updateStats() {
      const total = this.bookmarks.length;
      const favorites = this.bookmarks.filter(b => b.favorite).length;
      const tags = new Set(this.bookmarks.flatMap(b => b.tags)).size;
      const recent = this.bookmarks.filter(b => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(b.added) > weekAgo;
      }).length;
      
      // Update storage info
      document.getElementById('storageCount').textContent = `${total} bookmark${total !== 1 ? 's' : ''}`;
      const storageSize = (JSON.stringify(this.bookmarks).length / 1024 / 1024).toFixed(2);
      document.getElementById('storageSize').textContent = `${storageSize} MB`;
      const storagePercent = Math.min((total / 5000) * 100, 100); // 5000 bookmarks max
      document.getElementById('storageBar').style.width = `${storagePercent}%`;
      
      // Update stats modal
      document.getElementById('totalBookmarksStat').textContent = total;
      document.getElementById('favoriteBookmarksStat').textContent = favorites;
      document.getElementById('totalTagsStat').textContent = tags;
      document.getElementById('recentBookmarksStat').textContent = recent;
      
      // Update tag cloud
      const tagCloud = document.getElementById('tagCloud');
      const tagCounts = {};
      this.bookmarks.forEach(bookmark => {
        bookmark.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });
      
      const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      tagCloud.innerHTML = sortedTags.map(([tag, count]) => `
        <span class="bookmark-tag" onclick="app.filterByTag('${tag}')">
          ${tag} <small>(${count})</small>
        </span>
      `).join('');
    }

    exportBookmarks(format) {
      const data = this.bookmarks;
      let content, mimeType, fileName;
      
      switch(format) {
        case 'html':
          content = this.generateHTMLExport(data);
          mimeType = 'text/html';
          fileName = 'bookmarks.html';
          break;
        case 'json':
          content = JSON.stringify(data, null, 2);
          mimeType = 'application/json';
          fileName = 'bookmarks.json';
          break;
        case 'csv':
          content = this.generateCSVExport(data);
          mimeType = 'text/csv';
          fileName = 'bookmarks.csv';
          break;
        case 'markdown':
          content = this.generateMarkdownExport(data);
          mimeType = 'text/markdown';
          fileName = 'bookmarks.md';
          break;
      }
      
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showNotification(`Exported ${data.length} bookmarks as ${format.toUpperCase()}`);
    }

    generateHTMLExport(bookmarks) {
      const date = new Date().toLocaleDateString();
      return `
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks exported from MarkFlow</TITLE>
<H1>MarkFlow Bookmarks</H1>
<DL><p>
  <DT><H3>Exported on ${date}</H3>
${bookmarks.map(b => `
  <DT><A HREF="${b.url}" ADD_DATE="${Math.floor(Date.now()/1000)}" TAGS="${b.tags.join(',')}">${b.title}</A>
  <DD>${b.description}
`).join('')}
</DL><p>
      `;
    }

    generateCSVExport(bookmarks) {
      const headers = ['Title', 'URL', 'Description', 'Tags', 'Favorite', 'Visits', 'Added'];
      const rows = bookmarks.map(b => [
        `"${b.title.replace(/"/g, '""')}"`,
        `"${b.url}"`,
        `"${b.description.replace(/"/g, '""')}"`,
        `"${b.tags.join(',')}"`,
        b.favorite ? 'Yes' : 'No',
        b.visits,
        b.added
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    generateMarkdownExport(bookmarks) {
      return `# MarkFlow Bookmarks

Exported on ${new Date().toLocaleDateString()}

${bookmarks.map(b => `
## ${b.title}

**URL:** ${b.url}

**Description:** ${b.description}

**Tags:** ${b.tags.map(t => `\`${t}\``).join(', ')}

**Visits:** ${b.visits} | **Added:** ${b.added} | **Favorite:** ${b.favorite ? '⭐' : 'No'}

---
`).join('\n')}`;
    }

    importBookmarks(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          let imported;
          
          if (file.name.endsWith('.json')) {
            imported = JSON.parse(content);
          } else if (file.name.endsWith('.html')) {
            imported = this.parseHTMLBookmarks(content);
          }
          
          if (Array.isArray(imported)) {
            imported.forEach(b => {
              b.id = Date.now() + Math.random().toString(36).substr(2, 9);
              b.added = b.added || new Date().toISOString().split('T')[0];
              b.visits = b.visits || 0;
              b.favorite = b.favorite || false;
              b.archived = b.archived || false;
            });
            
            this.bookmarks = [...imported, ...this.bookmarks];
            this.saveBookmarks();
            this.renderBookmarks();
            this.showNotification(`Imported ${imported.length} bookmarks!`);
          }
        } catch (error) {
          alert('Error importing bookmarks: ' + error.message);
        }
      };
      reader.readAsText(file);
    }

    parseHTMLBookmarks(html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const links = doc.querySelectorAll('a');
      const bookmarks = [];
      
      links.forEach(link => {
        bookmarks.push({
          title: link.textContent.trim(),
          url: link.href,
          description: link.nextSibling?.textContent?.trim() || '',
          tags: (link.getAttribute('tags') || '').split(',').filter(t => t),
          added: new Date().toISOString().split('T')[0],
          visits: 0,
          favorite: false,
          archived: false
        });
      });
      
      return bookmarks;
    }

    showBookmarkMenu(id) {
      // In a real app, show a context menu
      const bookmark = this.bookmarks.find(b => b.id === id);
      const actions = [
        { label: bookmark.favorite ? 'Remove from favorites' : 'Add to favorites', action: () => this.toggleFavorite(id) },
        { label: bookmark.archived ? 'Unarchive' : 'Archive', action: () => this.toggleArchive(id) },
        { label: 'Edit', action: () => this.editBookmark(id) },
        { label: 'Delete', action: () => this.deleteBookmark(id) }
      ];
      
      // For now, just show a simple menu
      const action = prompt(`Actions for "${bookmark.title}":\n1. ${actions[0].label}\n2. ${actions[1].label}\n3. ${actions[2].label}\n4. ${actions[3].label}\n\nEnter number (1-4):`);
      
      if (action && actions[parseInt(action) - 1]) {
        actions[parseInt(action) - 1].action();
      }
    }

    editBookmark(id) {
      const bookmark = this.bookmarks.find(b => b.id === id);
      if (!bookmark) return;
      
      this.editingBookmark = bookmark;
      document.getElementById('modalTitle').textContent = 'Edit Bookmark';
      document.getElementById('bookmarkTitle').value = bookmark.title;
      document.getElementById('bookmarkUrl').value = bookmark.url;
      document.getElementById('bookmarkDescription').value = bookmark.description;
      
      // Clear and rebuild tags
      const tagContainer = document.getElementById('tagInputContainer');
      tagContainer.innerHTML = '';
      bookmark.tags.forEach(tag => this.addTagToInput(tag));
      tagContainer.innerHTML += '<input type="text" class="tag-input" id="tagInput" placeholder="Type and press Enter...">';
      
      document.getElementById('bookmarkModal').classList.add('active');
    }

    addTagToInput(tag) {
      const container = document.getElementById('tagInputContainer');
      const tagPill = document.createElement('div');
      tagPill.className = 'tag-pill';
      tagPill.innerHTML = `
        ${tag}
        <span class="remove-tag" onclick="this.parentElement.remove()">×</span>
      `;
      container.insertBefore(tagPill, container.querySelector('.tag-input'));
    }

    getTagsFromInput() {
      const tagPills = document.querySelectorAll('#tagInputContainer .tag-pill');
      return Array.from(tagPills).map(pill => pill.textContent.trim().slice(0, -1)); // Remove ×
    }

    showNotification(message) {
      // Create notification element
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        animation: slideIn 0.3s ease;
      `;
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    }

    setupEventListeners() {
      // Mobile menu
      document.getElementById('mobileMenuBtn').addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('active');
        document.getElementById('sidebarOverlay').classList.add('active');
      });
      
      document.getElementById('sidebarOverlay').addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('sidebarOverlay').classList.remove('active');
      });
      
      // Navigation
      document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
          link.classList.add('active');
          
          this.currentView = link.dataset.view;
          this.currentFilter = 'all';
          this.renderBookmarks();
          
          // Update page title
          const titles = {
            'all': 'All Bookmarks',
            'favorites': 'Favorites',
            'archived': 'Archived',
            'recent': 'Recently Added'
          };
          document.getElementById('pageTitle').textContent = titles[this.currentView] || 'Bookmarks';
          
          // Close mobile menu
          if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('active');
            document.getElementById('sidebarOverlay').classList.remove('active');
          }
        });
      });
      
      // Search
      document.getElementById('searchInput').addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.renderBookmarks();
      });
      
      // Add bookmark button
      document.getElementById('addBookmarkBtn').addEventListener('click', () => {
        this.editingBookmark = null;
        document.getElementById('modalTitle').textContent = 'Add New Bookmark';
        document.getElementById('bookmarkForm').reset();
        document.getElementById('tagInputContainer').innerHTML = '<input type="text" class="tag-input" id="tagInput" placeholder="Type and press Enter...">';
        document.getElementById('bookmarkModal').classList.add('active');
      });
      
      document.getElementById('addFirstBookmark').addEventListener('click', () => {
        document.getElementById('addBookmarkBtn').click();
      });
      
      // Tag input
      document.addEventListener('click', (e) => {
        if (e.target.id === 'tagInput') {
          e.target.focus();
        }
      });
      
      document.addEventListener('keydown', (e) => {
        if (e.target.id === 'tagInput' && e.key === 'Enter') {
          e.preventDefault();
          const tag = e.target.value.trim();
          if (tag) {
            this.addTagToInput(tag);
            e.target.value = '';
          }
        }
      });
      
      // Bookmark form
      document.getElementById('bookmarkForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const data = {
          title: document.getElementById('bookmarkTitle').value.trim(),
          url: document.getElementById('bookmarkUrl').value.trim(),
          description: document.getElementById('bookmarkDescription').value.trim(),
          tags: this.getTagsFromInput()
        };
        
        if (this.editingBookmark) {
          this.updateBookmark(this.editingBookmark.id, data);
        } else {
          this.addBookmark(data);
        }
        
        document.getElementById('bookmarkModal').classList.remove('active');
      });
      
      // Modal cancel buttons
      document.getElementById('cancelModal').addEventListener('click', () => {
        document.getElementById('bookmarkModal').classList.remove('active');
      });
      
      // Quick actions
      document.getElementById('importBtn').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.html';
        input.onchange = (e) => this.importBookmarks(e.target.files[0]);
        input.click();
      });
      
      document.getElementById('exportBtn').addEventListener('click', () => {
        this.exportFormat = 'json';
        document.querySelectorAll('.export-option').forEach(opt => opt.classList.remove('selected'));
        document.querySelector('.export-option[data-format="json"]').classList.add('selected');
        document.getElementById('exportModal').classList.add('active');
      });
      
      document.getElementById('selectBtn').addEventListener('click', () => {
        if (this.selectedBookmarks.size > 0) {
          this.clearSelection();
        } else {
          this.selectAll();
        }
      });
      
      // Export modal
      document.querySelectorAll('.export-option').forEach(option => {
        option.addEventListener('click', () => {
          this.exportFormat = option.dataset.format;
          document.querySelectorAll('.export-option').forEach(opt => opt.classList.remove('selected'));
          option.classList.add('selected');
        });
      });
      
      document.getElementById('confirmExport').addEventListener('click', () => {
        this.exportBookmarks(this.exportFormat);
        document.getElementById('exportModal').classList.remove('active');
      });
      
      document.getElementById('cancelExport').addEventListener('click', () => {
        document.getElementById('exportModal').classList.remove('active');
      });
      
      // Bulk actions
      document.getElementById('bulkFavoriteBtn').addEventListener('click', () => {
        this.bulkAction('favorite');
      });
      
      document.getElementById('bulkArchiveBtn').addEventListener('click', () => {
        this.bulkAction('archive');
      });
      
      document.getElementById('bulkDeleteBtn').addEventListener('click', () => {
        this.bulkAction('delete');
      });
      
      document.getElementById('bulkCancelBtn').addEventListener('click', () => {
        this.clearSelection();
      });
      
      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          document.getElementById('searchInput').focus();
        }
        
        // Ctrl/Cmd + N to add new bookmark
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
          e.preventDefault();
          document.getElementById('addBookmarkBtn').click();
        }
        
        // Escape to clear selection or close modals
        if (e.key === 'Escape') {
          if (this.selectedBookmarks.size > 0) {
            this.clearSelection();
          } else {
            document.querySelectorAll('.modal.active').forEach(modal => {
              modal.classList.remove('active');
            });
          }
        }
      });
    }
  }

  // Initialize the application
  const app = new BookmarkManager();
  window.app = app; // Make app global for inline event handlers

  // Add CSS for notifications
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // PWA Support
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // In a real app, you would register a service worker here
      console.log('PWA ready - service worker would be registered');
    });
  }

  // Install prompt
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button
    const installBtn = document.createElement('button');
    installBtn.className = 'action-btn';
    installBtn.innerHTML = '<i class="fas fa-download"></i> Install App';
    installBtn.style.marginRight = '0.5rem';
    installBtn.onclick = () => {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        deferredPrompt = null;
        installBtn.remove();
      });
    };
    
    document.querySelector('.quick-actions').prepend(installBtn);
  });