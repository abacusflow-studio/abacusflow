document.addEventListener("DOMContentLoaded", () => {
  if (window.electronAPI) {
    const versionEl = document.getElementById("version");
    if (versionEl) {
      versionEl.textContent = `Electron v${window.electronAPI.electronVersion}`;
    }
  }
});
