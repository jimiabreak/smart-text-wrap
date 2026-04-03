const balanceCard = document.getElementById("balanceCard") as HTMLDivElement;
const prettyCard = document.getElementById("prettyCard") as HTMLDivElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;
const toastEl = document.getElementById("toast") as HTMLDivElement;

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(message: string, variant: "success" | "error"): void {
  toastEl.textContent = message;
  toastEl.className = `toast toast-${variant} toast-visible`;

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("toast-visible");
  }, 3000);
}

function setDisabled(disabled: boolean): void {
  balanceCard.classList.toggle("disabled", disabled);
  prettyCard.classList.toggle("disabled", disabled);
  resetBtn.classList.toggle("disabled", disabled);
}

function handleAction(type: string): void {
  setDisabled(true);
  parent.postMessage({ pluginMessage: { type } }, "*");
}

function onKeyActivate(e: KeyboardEvent, type: string): void {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    handleAction(type);
  }
}

balanceCard.addEventListener("click", () => handleAction("balance"));
balanceCard.addEventListener("keydown", (e) => onKeyActivate(e, "balance"));

prettyCard.addEventListener("click", () => handleAction("pretty"));
prettyCard.addEventListener("keydown", (e) => onKeyActivate(e, "pretty"));

resetBtn.addEventListener("click", () => handleAction("reset"));

window.onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  if (msg.type === "success") {
    showToast(msg.message, "success");
  }

  if (msg.type === "error") {
    showToast(msg.message, "error");
  }

  if (msg.type === "done") {
    setDisabled(false);
  }
};
