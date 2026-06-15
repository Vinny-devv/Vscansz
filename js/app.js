/**
 * js/app.js
 * Main application logic:
 *   - Page navigation (SPA)
 *   - Sidebar + Search toggle
 *   - Profile settings (avatar upload via ImgBB + save to Firestore)
 *   - Library & History rendering
 *   - Sample manga data
 *   - Toast notifications
 */

// ============================================================
// SAMPLE DATA (replace with your real API / Firestore calls)
// ============================================================
const SAMPLE_MANGA = [
  { id: "solo-leveling",   title: "Solo Leveling",      cover: "", genre: "Action",   chapters: 179, status: "completed" },
  { id: "tower-of-god",    title: "Tower of God",       cover: "", genre: "Fantasy",  chapters: 600, status: "ongoing"   },
  { id: "omniscient",      title: "Omniscient Reader",  cover: "", genre: "Action",   chapters: 147, status: "ongoing"   },
  { id: "auto-hunting",    title: "Auto Hunting",       cover: "", genre: "Action",   chapters: 170, status: "completed" },
  { id: "nano-machine",    title: "Nano Machine",       cover: "", genre: "Martial",  chapters: 188, status: "ongoing"   },
  { id: "eleceed",         title: "Eleceed",            cover: "", genre: "Action",   chapters: 260, status: "ongoing"   },
  { id: "windbreaker",     title: "Wind Breaker",       cover: "", genre: "Sports",   chapters: 470, status: "ongoing"   },
  { id: "second-life",     title: "Second Life Ranker", cover: "", genre: "Fantasy",  chapters: 163, status: "hiatus"    },
];

// Gradient colors for placeholder covers
const COVER_GRADIENTS = [
  ["#e63946","#1d1d2e"],["#f4a261","#1d1d2e"],["#2ecc71","#1d1d2e"],
  ["#9b59b6","#1d1d2e"],["#3498db","#1d1d2e"],["#e67e22","#1d1d2e"],
  ["#1abc9c","#1d1d2e"],["#e91e63","#1d1d2e"],
];

function mangaCoverStyle(index) {
  const [a, b] = COVER_GRADIENTS[index % COVER_GRADIENTS.length];
  return `background: linear-gradient(160deg, ${a}, ${b}); display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.15); font-size:2.5rem;`;
}

// ============================================================
// NAVIGATION
// ============================================================
function navigateTo(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add("active");

  // Update bottom nav
  document.querySelectorAll(".bnav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });

  // Update sidebar nav
  document.querySelectorAll(".nav-item[data-page]").forEach(a => {
    a.classList.toggle("active", a.dataset.page === pageId);
  });

  // Close sidebar if open
  closeSidebar();

  // Lazy-load page content
  if (pageId === "home")    renderHome();
  if (pageId === "library") renderLibrary();
  if (pageId === "history") renderHistory();
  if (pageId === "profile") renderProfile();
}

// Bottom nav
document.querySelectorAll(".bnav-item").forEach(btn => {
  btn.addEventListener("click", () => navigateTo(btn.dataset.page));
});

// Sidebar nav links
document.querySelectorAll(".nav-item[data-page]").forEach(a => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo(a.dataset.page);
  });
});

// ============================================================
// SIDEBAR
// ============================================================
const sidebar        = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");

function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

document.getElementById("btn-sidebar")?.addEventListener("click", openSidebar);
document.getElementById("btn-sidebar-close")?.addEventListener("click", closeSidebar);
sidebarOverlay?.addEventListener("click", closeSidebar);

// ============================================================
// SEARCH TOGGLE
// ============================================================
const searchWrap = document.getElementById("search-bar-wrap");

document.getElementById("btn-search-toggle")?.addEventListener("click", () => {
  searchWrap.classList.toggle("open");
  if (searchWrap.classList.contains("open")) {
    document.getElementById("search-input")?.focus();
  }
});

document.getElementById("btn-search-close")?.addEventListener("click", () => {
  searchWrap.classList.remove("open");
  const inp = document.getElementById("search-input");
  if (inp) inp.value = "";
});

// ============================================================
// HOME PAGE — RENDER CARDS
// ============================================================
function renderHome() {
  renderScrollCards("new-releases-list",  SAMPLE_MANGA.slice(0, 6));
  renderGridCards("popular-list",         SAMPLE_MANGA.slice(2));
}

function renderScrollCards(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container || container.dataset.rendered) return;
  container.dataset.rendered = "1";

  container.innerHTML = items.map((m, i) => `
    <div class="manga-card" onclick="openReader('${m.id}', 1)">
      <div class="card-thumb-wrap">
        <div class="card-thumb" style="${mangaCoverStyle(i)}">
          <i class="bi bi-book"></i>
        </div>
        <span class="card-status ${m.status}">${m.status}</span>
      </div>
      <div class="card-body">
        <p class="card-title">${m.title}</p>
        <p class="card-meta"><i class="bi bi-collection"></i> Ch.${m.chapters}</p>
      </div>
    </div>
  `).join("");
}

function renderGridCards(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container || container.dataset.rendered) return;
  container.dataset.rendered = "1";

  container.innerHTML = items.map((m, i) => `
    <div class="manga-card" onclick="openReader('${m.id}', 1)">
      <div class="card-thumb-wrap">
        <div class="card-thumb" style="${mangaCoverStyle(i + 2)}">
          <i class="bi bi-book"></i>
        </div>
        <span class="card-status ${m.status}">${m.status}</span>
      </div>
      <div class="card-body">
        <p class="card-title">${m.title}</p>
        <p class="card-meta"><i class="bi bi-tag"></i> ${m.genre}</p>
      </div>
    </div>
  `).join("");
}

// ============================================================
// LIBRARY PAGE
// ============================================================
async function renderLibrary() {
  const container = document.getElementById("library-list");
  const empty     = document.getElementById("library-empty");
  if (!container || !window._currentUser) return;

  try {
    const items = await getLibrary(window._currentUser.uid);
    if (!items.length) {
      container.innerHTML = "";
      empty.style.display = "flex";
      return;
    }
    empty.style.display = "none";
    container.innerHTML = items.map((m, i) => `
      <div class="manga-card" onclick="openReader('${m.id}', 1)">
        <div class="card-thumb-wrap">
          <div class="card-thumb" style="${mangaCoverStyle(i)}">
            <i class="bi bi-book"></i>
          </div>
        </div>
        <div class="card-body">
          <p class="card-title">${m.title}</p>
          <p class="card-meta"><i class="bi bi-bookmark-check"></i> Saved</p>
        </div>
      </div>
    `).join("");
  } catch (e) {
    container.innerHTML = `<p style="padding:16px;color:var(--text3)">Failed to load library.</p>`;
  }
}

// ============================================================
// HISTORY PAGE
// ============================================================
async function renderHistory() {
  const container  = document.getElementById("history-list");
  const empty      = document.getElementById("history-empty");
  if (!container || !window._currentUser) return;

  try {
    const items = await getReadingHistory(window._currentUser.uid);
    if (!items.length) {
      container.innerHTML = "";
      empty.style.display = "flex";
      return;
    }
    empty.style.display = "none";
    container.innerHTML = items.map((m, i) => `
      <div class="history-item" onclick="openReader('${m.mangaId}', ${m.chapter || 1})">
        <div class="history-thumb" style="${mangaCoverStyle(i)}; width:52px; height:72px; border-radius:8px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:rgba(255,255,255,0.2)">
          <i class="bi bi-book"></i>
        </div>
        <div class="history-info">
          <p class="history-title">${m.title}</p>
          <p class="history-ch"><i class="bi bi-bookmark"></i> Chapter ${m.chapter || 1}</p>
          <p class="history-date"><i class="bi bi-clock"></i> ${formatDate(m.readAt?.toDate?.() || new Date())}</p>
        </div>
        <i class="bi bi-chevron-right history-continue"></i>
      </div>
    `).join("");
  } catch (e) {
    container.innerHTML = `<p style="padding:16px;color:var(--text3)">Failed to load history.</p>`;
  }
}

// ============================================================
// PROFILE PAGE
// ============================================================
function renderProfile() {
  const user = window._currentUser;
  if (!user) return;

  const usernameInput = document.getElementById("profile-username");
  const emailInput    = document.getElementById("profile-email");
  const avatarPreview = document.getElementById("profile-avatar-preview");

  if (usernameInput) usernameInput.value = user.username || user.displayName || "";
  if (emailInput)    emailInput.value    = user.email || "";
  if (avatarPreview && user.photoURL) avatarPreview.src = user.photoURL;
}

// ── Avatar File Selected ───────────────────────────────────────
let _pendingAvatarURL = null;

async function onAvatarFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  // Validate type & size (max 5 MB)
  if (!file.type.startsWith("image/")) {
    showToast("Please select an image file.", "error");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("Image must be under 5 MB.", "error");
    return;
  }

  // Show instant preview
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("profile-avatar-preview").src = e.target.result;
  };
  reader.readAsDataURL(file);

  // Upload to ImgBB
  const progressWrap = document.getElementById("upload-progress");
  const progressFill = document.getElementById("progress-fill");
  const uploadStatus = document.getElementById("upload-status");

  progressWrap.style.display = "flex";
  progressFill.style.width   = "0%";
  uploadStatus.textContent   = "Uploading…";

  try {
    const url = await uploadToImgBB(file, (pct) => {
      progressFill.style.width = pct + "%";
      uploadStatus.textContent = `Uploading… ${pct}%`;
    });

    _pendingAvatarURL = url;
    progressFill.style.width   = "100%";
    uploadStatus.textContent   = "✓ Upload complete";
    document.getElementById("profile-avatar-preview").src = url;

    setTimeout(() => { progressWrap.style.display = "none"; }, 1800);
    showToast("Photo ready — tap Save Changes.", "success");
  } catch (err) {
    progressWrap.style.display = "none";
    showToast(`Upload failed: ${err.message}`, "error");
    console.error("ImgBB error:", err);
  }
}

// ── Save Profile ──────────────────────────────────────────────
async function saveProfile() {
  const user     = window._currentUser;
  const msgEl    = document.getElementById("profile-msg");
  const saveBtn  = document.getElementById("btn-save-profile");
  if (!user || !msgEl || !saveBtn) return;

  const username = document.getElementById("profile-username").value.trim();
  msgEl.textContent  = "";
  msgEl.className    = "profile-msg";

  if (!username) {
    msgEl.textContent = "Username cannot be empty.";
    msgEl.className   = "profile-msg error";
    return;
  }

  saveBtn.disabled      = true;
  saveBtn.innerHTML     = `<span class="spinner"></span> Saving…`;

  try {
    const updates = { username };
    if (_pendingAvatarURL) updates.photoURL = _pendingAvatarURL;

    // Update Firestore
    await updateUserDoc(user.uid, updates);

    // Update Firebase Auth display name
    const { auth, updateProfile } = window._firebase;
    await updateProfile(auth.currentUser, {
      displayName: username,
      ...(updates.photoURL ? { photoURL: updates.photoURL } : {}),
    });

    // Sync local state
    window._currentUser = { ...window._currentUser, ...updates };
    _pendingAvatarURL   = null;

    // Update all UI instances
    populateUserUI(window._currentUser);

    msgEl.textContent = "✓ Profile updated successfully!";
    showToast("Profile saved!", "success");
  } catch (err) {
    msgEl.textContent = "Save failed: " + err.message;
    msgEl.className   = "profile-msg error";
    console.error("Save profile error:", err);
  } finally {
    saveBtn.disabled  = false;
    saveBtn.innerHTML = `<i class="bi bi-check-lg"></i> Save Changes`;
  }
}

// ============================================================
// POPULATE USER UI (topbar avatar, sidebar name, profile)
// ============================================================
function populateUserUI(user) {
  if (!user) return;

  const avatar   = user.photoURL || "assets/default-avatar.svg";
  const username = user.username || user.displayName || "Reader";
  const email    = user.email || "";

  // Topbar
  const topbarAvatar = document.getElementById("topbar-avatar");
  if (topbarAvatar) topbarAvatar.src = avatar;

  // Sidebar
  const sidebarAvatar    = document.getElementById("sidebar-avatar");
  const sidebarUsername  = document.getElementById("sidebar-username");
  const sidebarEmail     = document.getElementById("sidebar-email");
  if (sidebarAvatar)   sidebarAvatar.src       = avatar;
  if (sidebarUsername) sidebarUsername.textContent = username;
  if (sidebarEmail)    sidebarEmail.textContent    = email;

  // Profile page (if open)
  const profileAvatarPreview = document.getElementById("profile-avatar-preview");
  const profileUsername      = document.getElementById("profile-username");
  const profileEmail         = document.getElementById("profile-email");
  if (profileAvatarPreview && !_pendingAvatarURL) profileAvatarPreview.src = avatar;
  if (profileUsername) profileUsername.value = username;
  if (profileEmail)    profileEmail.value    = email;
}

// ============================================================
// READER (stub — wire to your reader view)
// ============================================================
function openReader(mangaId, chapter) {
  showToast(`Opening ${mangaId} — Ch.${chapter}`);
  // Save reading progress
  if (window._currentUser) {
    const manga = SAMPLE_MANGA.find(m => m.id === mangaId);
    if (manga) {
      saveReadingProgress(window._currentUser.uid, {
        mangaId,
        title:   manga.title,
        chapter,
        page:    1,
      }).catch(console.error);
    }
  }
  // TODO: load your reader page here
}

// ============================================================
// LIBRARY ADD (callable from buttons)
// ============================================================
async function addToLibrary(mangaId) {
  if (!window._currentUser) { showToast("Sign in first.", "error"); return; }
  const manga = SAMPLE_MANGA.find(m => m.id === mangaId);
  if (!manga) return;
  try {
    await addToLibraryDB(window._currentUser.uid, manga);
    showToast("Saved to library!", "success");
  } catch (e) {
    showToast("Could not save. Try again.", "error");
  }
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
let _toastTimeout;
function showToast(message, type = "") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent  = message;
  toast.className    = `toast show${type ? " " + type : ""}`;
  clearTimeout(_toastTimeout);
  _toastTimeout = setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

// ============================================================
// UTILITIES
// ============================================================
function formatDate(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ============================================================
// INIT — run home on load
// ============================================================
(function init() {
  // Will be called once auth state resolves and showApp() runs
  // Fallback: render home if already on home page
  renderHome();
})();
