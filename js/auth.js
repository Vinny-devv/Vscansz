/**
 * js/auth.js
 * Authentication handlers: login, register, logout.
 * Uses Firebase Auth + Firestore via window._firebase.
 */

// ── Tab Switching ─────────────────────────────────────────────
document.querySelectorAll(".auth-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    document.querySelectorAll(".auth-tab").forEach(t  => t.classList.remove("active"));
    document.querySelectorAll(".auth-form").forEach(f  => f.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${target}`).classList.add("active");
    // Clear errors
    document.getElementById("login-error").textContent    = "";
    document.getElementById("register-error").textContent = "";
  });
});

// ── Helpers ───────────────────────────────────────────────────

function setLoading(btnId, loading, originalText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.innerHTML = `<span class="spinner"></span>`;
  } else {
    btn.innerHTML = originalText;
  }
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

// ── Login ─────────────────────────────────────────────────────
async function handleLogin() {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  showAuthError("login-error", "");

  if (!email || !password) {
    showAuthError("login-error", "Please fill in all fields.");
    return;
  }

  setLoading("btn-login", true);
  try {
    const { auth, signInWithEmailAndPassword } = window._firebase;
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged in index.html will call showApp()
  } catch (err) {
    setLoading("btn-login", false, '<i class="bi bi-box-arrow-in-right"></i> Sign In');
    showAuthError("login-error", friendlyAuthError(err.code));
  }
}

// ── Register ──────────────────────────────────────────────────
async function handleRegister() {
  const username = document.getElementById("reg-username").value.trim();
  const email    = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  showAuthError("register-error", "");

  if (!username || !email || !password) {
    showAuthError("register-error", "Please fill in all fields.");
    return;
  }
  if (password.length < 6) {
    showAuthError("register-error", "Password must be at least 6 characters.");
    return;
  }

  setLoading("btn-register", true);
  try {
    const { auth, createUserWithEmailAndPassword, updateProfile } = window._firebase;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    // Set display name on Auth
    await updateProfile(user, { displayName: username });

    // Create Firestore doc
    await createUserDoc(user.uid, { username, email, photoURL: "" });

    showToast("Account created! Welcome 🎉", "success");
    // onAuthStateChanged will handle the rest
  } catch (err) {
    setLoading("btn-register", false, '<i class="bi bi-person-plus"></i> Create Account');
    showAuthError("register-error", friendlyAuthError(err.code));
  }
}

// ── Logout ────────────────────────────────────────────────────
async function handleLogout() {
  try {
    const { auth, signOut } = window._firebase;
    await signOut(auth);
    showToast("Signed out successfully.");
  } catch (err) {
    showToast("Sign out failed. Try again.", "error");
  }
}

// ── Show/Hide Overlay ─────────────────────────────────────────
function showApp(user) {
  document.getElementById("auth-overlay").classList.remove("active");
  document.getElementById("app").classList.remove("hidden");
  populateUserUI(user);
}

function showAuthOverlay() {
  document.getElementById("auth-overlay").classList.add("active");
  document.getElementById("app").classList.add("hidden");
}

// ── Error Code to Human Message ───────────────────────────────
function friendlyAuthError(code) {
  const map = {
    "auth/invalid-email":            "Invalid email address.",
    "auth/user-not-found":           "No account found with this email.",
    "auth/wrong-password":           "Incorrect password.",
    "auth/email-already-in-use":     "Email is already registered.",
    "auth/weak-password":            "Password is too weak.",
    "auth/too-many-requests":        "Too many attempts. Try again later.",
    "auth/network-request-failed":   "Network error. Check your connection.",
    "auth/invalid-credential":       "Invalid email or password.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

// ── Toggle Password Visibility ────────────────────────────────
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";
  btn.innerHTML = isPassword
    ? '<i class="bi bi-eye-slash"></i>'
    : '<i class="bi bi-eye"></i>';
}

// Wire logout buttons
document.getElementById("btn-logout")?.addEventListener("click", handleLogout);
