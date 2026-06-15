/**
 * js/imgbb.js
 * Handles image uploads to ImgBB API.
 * Paste your ImgBB API key below.
 */

// ── PASTE YOUR IMGBB API KEY HERE ────────────────────────────
const IMGBB_API_KEY = "YOUR_IMGBB_API_KEY";
// ─────────────────────────────────────────────────────────────

/**
 * Upload a File object to ImgBB.
 * @param {File}     file            - The image file to upload
 * @param {Function} onProgress      - Called with progress % (0–100)
 * @returns {Promise<string>}         - Resolves with the permanent image URL
 */
async function uploadToImgBB(file, onProgress = () => {}) {
  if (!file) throw new Error("No file provided.");
  if (!IMGBB_API_KEY || IMGBB_API_KEY === "YOUR_IMGBB_API_KEY") {
    throw new Error("ImgBB API key is not configured. Open js/imgbb.js and paste your key.");
  }

  // Convert file to base64
  const base64 = await fileToBase64(file);

  return new Promise((resolve, reject) => {
    const xhr  = new XMLHttpRequest();
    const form = new FormData();
    form.append("key",   IMGBB_API_KEY);
    form.append("image", base64.split(",")[1]); // strip data URL prefix

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (res.success && res.data?.url) {
          resolve(res.data.url);
        } else {
          reject(new Error(res.error?.message || "Upload failed"));
        }
      } catch {
        reject(new Error("Invalid ImgBB response"));
      }
    });

    xhr.addEventListener("error",  () => reject(new Error("Network error during upload")));
    xhr.addEventListener("abort",  () => reject(new Error("Upload cancelled")));

    xhr.open("POST", "https://api.imgbb.com/1/upload");
    xhr.send(form);
  });
}

/**
 * Convert a File to a base64 data URL.
 * @param {File} file
 * @returns {Promise<string>}
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
