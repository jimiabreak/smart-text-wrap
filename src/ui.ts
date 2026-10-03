import type { Action, PluginRequest, ToastVariant, UiMessage } from "./messages";

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

/** The window height src/code.ts opens the plugin with. */
const BASE_HEIGHT = 460;

let toastTimer: ReturnType<typeof setTimeout> | null = null;
let toastFrame: number | null = null;
let windowHeight = BASE_HEIGHT;
let isBusy = false;

function send(request: PluginRequest): void {
  parent.postMessage({ pluginMessage: request }, "*");
}

/** Grow the window while a long toast would cover the panel; shrink it back when the toast hides. */
function fitWindow(toastShown: boolean): void {
  const panelBottom = (document.querySelector("main") as HTMLElement).getBoundingClientRect().bottom;
  const needed = toastShown ? Math.ceil(panelBottom + toastEl.offsetHeight + 16) : BASE_HEIGHT;
  const height = Math.max(BASE_HEIGHT, needed);
  if (height === windowHeight) return;
  windowHeight = height;
  send({ type: "resize", height });
}

function hideToast(): void {
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = null;
  // A toast still waiting for its frame must not appear after it was hidden
  if (toastFrame !== null) cancelAnimationFrame(toastFrame);
  toastFrame = null;
  toastEl.classList.remove("toast-visible");
  fitWindow(false);
}

function showToast(message: string, variant: ToastVariant): void {
  hideToast();
  // Empty the region first so a repeated message is announced again
  toastEl.textContent = "";
  toastEl.className = `toast toast-${variant}`;
  toastFrame = requestAnimationFrame(() => {
    toastFrame = null;
    toastEl.textContent = message;
    toastEl.classList.add("toast-visible");
    fitWindow(true);
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
  send({ type });
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
