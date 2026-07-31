interface Message {
  role: "user" | "assistant";
  text: string;
}

interface AppState {
  messages: Message[];
}

interface VsCodeMessage {
  command: string;
  text?: string;
}

declare function acquireVsCodeApi(): {
  getState(): AppState | undefined;
  setState(state: AppState): void;
  postMessage(message: VsCodeMessage): void;
};

(function () {
  const vscode = acquireVsCodeApi();

  const chatArea = document.getElementById("chat-area") as HTMLElement;
  const inputEl = document.getElementById("instruction-input") as HTMLTextAreaElement;
  const sendBtn = document.getElementById("send-btn") as HTMLButtonElement;

  const state: AppState = vscode.getState() ?? { messages: [] };

  function renderMessages(): void {
    if (!chatArea) return;
    chatArea.innerHTML = "";
    state.messages.forEach((msg) => {
      const div = document.createElement("div");
      div.className = `message ${msg.role}`;
      div.textContent = msg.text;
      chatArea.appendChild(div);
    });
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function addMessage(role: "user" | "assistant", text: string): void {
    state.messages.push({ role, text });
    vscode.setState(state);
    renderMessages();
  }

  function sendInstruction(): void {
    const text = inputEl.value.trim();
    if (!text) return;
    addMessage("user", text);
    vscode.postMessage({ command: "submit", text });
    inputEl.value = "";
  }

  sendBtn.addEventListener("click", sendInstruction);

  inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendInstruction();
    }
  });

  window.addEventListener("message", (event: MessageEvent<VsCodeMessage>) => {
    const message = event.data;
    switch (message.command) {
      case "welcome":
        addMessage("assistant", message.text ?? "Ready.");
        break;
      case "instruction":
        addMessage("assistant", `Processing: ${message.text}`);
        break;
    }
  });

  renderMessages();

  vscode.postMessage({ command: "ready" });
})();
