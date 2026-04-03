const balanceCard = document.getElementById("balanceCard") as HTMLDivElement;
const prettyCard = document.getElementById("prettyCard") as HTMLDivElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;

function setDisabled(disabled: boolean): void {
  balanceCard.classList.toggle("disabled", disabled);
  prettyCard.classList.toggle("disabled", disabled);
  resetBtn.classList.toggle("disabled", disabled);
}

balanceCard.addEventListener("click", () => {
  setDisabled(true);
  parent.postMessage({ pluginMessage: { type: "balance" } }, "*");
});

prettyCard.addEventListener("click", () => {
  setDisabled(true);
  parent.postMessage({ pluginMessage: { type: "pretty" } }, "*");
});

resetBtn.addEventListener("click", () => {
  setDisabled(true);
  parent.postMessage({ pluginMessage: { type: "reset" } }, "*");
});

window.onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  if (msg.type === "done") {
    setDisabled(false);
  }
};
