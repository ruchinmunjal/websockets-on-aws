// MDN WebSocket documentation
// https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

const socket = new WebSocket(
  "wss://qsr2p7233l.execute-api.eu-west-2.amazonaws.com/production/"
);

socket.addEventListener("open", (e) => {
  console.log("WebSocket is connected");
});

socket.addEventListener("close", (e) => console.log("WebSocket is closed"));

socket.addEventListener("error", (e) =>
  console.error("WebSocket is in error", e)
);

socket.addEventListener("data", (e) => {
  // console.log('WebSocket received a message:', e)
  console.log("Your answer is:", JSON.parse(e.data).message);
});

//select the button and attach an event listener
//when the button is clicked, call the ask function with the message "get filtered data"
//ask function sends the message to the server
//the server sends the message back to the client
//the client logs the message
const button = document.querySelector("button");
button.addEventListener("click", () => {
  console.log("Button clicked");
  ask("get filtered data");
});

window.ask = function (msg) {
  const payload = {
    action: "data",
    msg,
  };
  socket.send(JSON.stringify(payload));
};
