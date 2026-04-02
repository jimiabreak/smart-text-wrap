"use strict";
(() => {
  // src/ui.ts
  var fixPageBtn = document.getElementById("fixPageBtn");
  var autoToggle = document.getElementById("autoToggle");
  var statusEl = document.getElementById("status");
  fixPageBtn.addEventListener("click", () => {
    fixPageBtn.disabled = true;
    fixPageBtn.textContent = "Fixing...";
    parent.postMessage({ pluginMessage: { type: "fix-page" } }, "*");
  });
  autoToggle.addEventListener("change", () => {
    parent.postMessage(
      { pluginMessage: { type: "toggle-auto", enabled: autoToggle.checked } },
      "*"
    );
  });
  window.onmessage = (event) => {
    const msg = event.data.pluginMessage;
    if (!msg)
      return;
    if (msg.type === "fix-page-done") {
      statusEl.textContent = `Fixed ${msg.count} text layer${msg.count !== 1 ? "s" : ""}`;
      fixPageBtn.disabled = false;
      fixPageBtn.textContent = "Fix This Page";
    }
    if (msg.type === "auto-state") {
      autoToggle.checked = msg.enabled;
    }
  };
})();
