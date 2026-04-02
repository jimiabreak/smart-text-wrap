const fixPageBtn = document.getElementById("fixPageBtn") as HTMLButtonElement;
const autoToggle = document.getElementById("autoToggle") as HTMLInputElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;

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

window.onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  if (msg.type === "fix-page-done") {
    statusEl.textContent = `Fixed ${msg.count} text layer${msg.count !== 1 ? "s" : ""}`;
    fixPageBtn.disabled = false;
    fixPageBtn.textContent = "Fix This Page";
  }

  if (msg.type === "auto-state") {
    autoToggle.checked = msg.enabled;
  }
};
