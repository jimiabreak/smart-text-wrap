import type { Action, ToastVariant, UiMessage } from "./messages";

const balanceCard = document.getElementById("balanceCard") as HTMLButtonElement;
const prettyCard = document.getElementById("prettyCard") as HTMLButtonElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;
const toastEl = document.getElementById("toast") as HTMLDivElement;

const controls = [balanceCard, prettyCard, resetBtn];

/** How long a toast stays up. Errors stay until the next action. */
const TOAST_MS: Record<ToastVariant, number | null> = {
  success: 5000,
  info: 5000,
  error: null,
};

let toastTimer: ReturnType<typeof setTimeout> | null = null;
let isBusy = false;

function hideToast(): void {
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = null;
  toastEl.classList.remove("toast-visible");
}

function showToast(message: string, variant: ToastVariant): void {
  hideToast();
  // Empty the region first so a repeated message is announced again
  toastEl.textContent = "";
  toastEl.className = `toast toast-${variant}`;
  requestAnimationFrame(() => {
    toastEl.textContent = message;
    toastEl.classList.add("toast-visible");
  });

  const duration = TOAST_MS[variant];
  if (duration !== null) toastTimer = setTimeout(hideToast, duration);
}

/** aria-disabled keeps focus on the pressed control; native `disabled` would drop it to <body>. */
function setBusy(busy: boolean): void {
  isBusy = busy;
  for (const control of controls) {
    if (busy) control.setAttribute("aria-disabled", "true");
    else control.removeAttribute("aria-disabled");
  }
}

function handleAction(type: Action): void {
  if (isBusy) return;
  hideToast();
  setBusy(true);
  parent.postMessage({ pluginMessage: { type } }, "*");
}

balanceCard.addEventListener("click", () => handleAction("balance"));
prettyCard.addEventListener("click", () => handleAction("pretty"));
resetBtn.addEventListener("click", () => handleAction("reset"));

window.onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage as UiMessage | undefined;
  if (!msg) return;

  if (msg.type === "done") {
    setBusy(false);
    return;
  }

  showToast(msg.message, msg.type);
};
