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

/* ---------- SIDEBAR (MOBILE FIX) ---------- */
function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("active");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("active");
}

mobileMenuBtn.addEventListener("click", openSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);

/* ---------- DARK MODE (FIXED) ---------- */
const themeToggle = document.getElementById("themeToggle");
const root = document.documentElement;

const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme) {
  root.setAttribute("data-theme", savedTheme);
}

themeToggle.addEventListener("click", () => {
  const isDark = root.getAttribute("data-theme") === "dark";
  root.setAttribute("data-theme", isDark ? "light" : "dark");
  localStorage.setItem(THEME_KEY, isDark ? "light" : "dark");

  themeToggle.innerHTML = isDark
    ? '<i class="fas fa-moon"></i> Dark'
    : '<i class="fas fa-sun"></i> Light';
});

/* ---------- UTILS ---------- */
function saveBookmarks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  render();
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
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
      b.title.toLowerCase().includes(q) ||
      b.url.toLowerCase().includes(q) ||
      b.tags.join(" ").toLowerCase().includes(q)
    );
  }

  return list;
}

/* ---------- RENDER ---------- */
function render() {
  const list = getFilteredBookmarks();
  bookmarksContainer.innerHTML = "";

  bookmarkCount.textContent = `${list.length} bookmarks`;

  if (!list.length) {
    bookmarksContainer.appendChild(emptyState);
    return;
  }

  list.forEach(b => {
    const card = document.createElement("div");
    card.className = "bookmark-card";
    card.innerHTML = `
      <h3>${b.title}</h3>
      <a href="${b.url}" target="_blank">${b.url}</a>
      ${b.description ? `<p>${b.description}</p>` : ""}
    `;
    bookmarksContainer.appendChild(card);
  });
}

/* ---------- ADD BOOKMARK ---------- */
document.getElementById("addBookmarkBtn").onclick = () => {
  editingId = null;
  bookmarkForm.reset();
  clearTags();
  bookmarkModal.classList.add("open");
};

document.getElementById("addFirstBookmark").onclick =
  document.getElementById("addBookmarkBtn").onclick;

document.getElementById("cancelModal").onclick = () =>
  bookmarkModal.classList.remove("open");

bookmarkForm.onsubmit = e => {
  e.preventDefault();

  bookmarks.unshift({
    id: uid(),
    title: titleInput.value,
    url: urlInput.value,
    description: descInput.value,
    tags: getTags(),
    favorite: false,
    archived: false,
    createdAt: Date.now()
  });

  bookmarkModal.classList.remove("open");
  saveBookmarks();
};

/* ---------- TAGS ---------- */
function addTag(tag) {
  const el = document.createElement("span");
  el.className = "tag";
  el.textContent = tag;
  el.onclick = () => el.remove();
  tagInputContainer.insertBefore(el, tagInput);
}

function getTags() {
  return [...tagInputContainer.querySelectorAll(".tag")].map(t => t.textContent);
}

function clearTags() {
  tagInputContainer.querySelectorAll(".tag").forEach(t => t.remove());
}

tagInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && tagInput.value.trim()) {
    addTag(tagInput.value.trim());
    tagInput.value = "";
  }
});

/* ---------- NAV ---------- */
document.querySelectorAll(".nav-links a").forEach(a => {
  a.onclick = () => {
    document.querySelector(".nav-links .active")?.classList.remove("active");
    a.classList.add("active");
    currentView = a.dataset.view;
    pageTitle.textContent = a.textContent.trim();
    closeSidebar(); // 👈 mobile UX fix
    render();
  };
});

/* ---------- SEARCH ---------- */
searchInput.oninput = render;

/* ---------- INIT ---------- */
render();
