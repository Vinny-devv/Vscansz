/**
 * js/db.js
 * Firestore database helpers.
 * All functions wait for window._firebase to be ready (set by index.html).
 */

/** Get Firestore helpers from global Firebase init */
function _fb() {
  if (!window._firebase) throw new Error("Firebase not initialised yet.");
  return window._firebase;
}

// ── User Profile ─────────────────────────────────────────────

/**
 * Create or overwrite a user document on first registration.
 * @param {string} uid
 * @param {object} data  - { username, email, photoURL? }
 */
async function createUserDoc(uid, data) {
  const { db, doc, setDoc, serverTimestamp } = _fb();
  await setDoc(doc(db, "users", uid), {
    username:  data.username  || "Reader",
    email:     data.email     || "",
    photoURL:  data.photoURL  || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Fetch a user's Firestore document.
 * @param {string} uid
 * @returns {Promise<object|null>}
 */
async function getUserDoc(uid) {
  const { db, doc, getDoc } = _fb();
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Update specific fields in a user's document.
 * @param {string} uid
 * @param {object} fields  - Fields to update, e.g. { username, photoURL }
 */
async function updateUserDoc(uid, fields) {
  const { db, doc, updateDoc, serverTimestamp } = _fb();
  await updateDoc(doc(db, "users", uid), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

// ── Library ───────────────────────────────────────────────────

/**
 * Add a manga to the user's saved library.
 * @param {string} uid
 * @param {object} manga  - { id, title, cover, genre }
 */
async function addToLibraryDB(uid, manga) {
  const { db, doc, setDoc, serverTimestamp } = _fb();
  await setDoc(doc(db, "users", uid, "library", manga.id), {
    ...manga,
    savedAt: serverTimestamp(),
  });
}

/**
 * Remove a manga from the user's library.
 * @param {string} uid
 * @param {string} mangaId
 */
async function removeFromLibraryDB(uid, mangaId) {
  const { db, doc } = _fb();
  const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  await deleteDoc(doc(db, "users", uid, "library", mangaId));
}

/**
 * Fetch the user's entire library.
 * @param {string} uid
 * @returns {Promise<Array>}
 */
async function getLibrary(uid) {
  const { db } = _fb();
  const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const snap = await getDocs(collection(db, "users", uid, "library"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Reading History ───────────────────────────────────────────

/**
 * Save or update reading progress for a manga.
 * @param {string} uid
 * @param {object} entry  - { mangaId, title, cover, chapter, page }
 */
async function saveReadingProgress(uid, entry) {
  const { db, doc, setDoc, serverTimestamp } = _fb();
  await setDoc(doc(db, "users", uid, "history", entry.mangaId), {
    ...entry,
    readAt: serverTimestamp(),
  });
}

/**
 * Fetch the user's reading history (most recent first).
 * @param {string} uid
 * @returns {Promise<Array>}
 */
async function getReadingHistory(uid) {
  const { db } = _fb();
  const { collection, getDocs, orderBy, query } = await import(
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
  );
  const q    = query(collection(db, "users", uid, "history"), orderBy("readAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
