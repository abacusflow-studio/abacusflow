const { getGreetingMessage } = require("@abacusflow/core");

window.addEventListener("DOMContentLoaded", () => {
  const messageElement = document.getElementById("shared-message");
  if (messageElement) {
    messageElement.innerText = getGreetingMessage();
  }
});
