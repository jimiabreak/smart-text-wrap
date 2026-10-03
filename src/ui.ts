import { WINDOW_SIZE, type Action, type PluginRequest, type ToastVariant, type UiMessage } from "./messages";

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
let toastFrame: number | null = null;
let shrinkTimer: ReturnType<typeof setTimeout> | null = null;
let windowHeight = WINDOW_SIZE.height;
let isBusy = false;

function send(request: PluginRequest): void {
  parent.postMessage({ pluginMessage: request }, "*");
}

/** Size the window so the toast, when shown, sits below the panel instead of covering it. */
function fitWindow(): void {
  const panelBottom = (document.querySelector("main") as HTMLElement).getBoundingClientRect().bottom;
  const shown = toastEl.classList.contains("toast-visible");
  const needed = shown ? Math.ceil(panelBottom + toastEl.offsetHeight + 16) : WINDOW_SIZE.height;
  const height = Math.max(WINDOW_SIZE.height, needed);
  if (height === windowHeight) return;
  windowHeight = height;
  send({ type: "resize", height });
}

/** Shrink the window back once a timed-out toast has finished fading (its CSS transition; none under reduced motion). */
function shrinkAfterFade(): void {
  const seconds = Math.max(0, ...getComputedStyle(toastEl).transitionDuration.split(",").map(parseFloat)) || 0;
  if (shrinkTimer) clearTimeout(shrinkTimer);
  shrinkTimer = setTimeout(() => {
    shrinkTimer = null;
    fitWindow();
  }, seconds * 1000);
}

/**
 * Hide the toast. The window keeps its size: during an action the result
 * toast arrives soon and resizes it once, so it never shrinks and regrows.
 */
function hideToast(): void {
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = null;
  // A toast still waiting for its frame must not appear after it was hidden
  if (toastFrame !== null) cancelAnimationFrame(toastFrame);
  toastFrame = null;
  toastEl.classList.remove("toast-visible");
}

function showToast(message: string, variant: ToastVariant): void {
  hideToast();
  // Empty the region first so a repeated message is announced again
  toastEl.textContent = "";
  toastEl.className = `toast toast-${variant}`;
  toastFrame = requestAnimationFrame(() => {
    toastFrame = null;
    if (shrinkTimer) clearTimeout(shrinkTimer);
    shrinkTimer = null;
    toastEl.textContent = message;
    toastEl.classList.add("toast-visible");
    fitWindow();
  });

  const duration = TOAST_MS[variant];
  if (duration !== null) {
    toastTimer = setTimeout(() => {
      hideToast();
      shrinkAfterFade();
    }, duration);
  }
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
