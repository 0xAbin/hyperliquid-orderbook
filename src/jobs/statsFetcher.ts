import WebSocket from "ws";





export const webSocketConnection = () => {
  const WSS = "wss://api-ui.hyperliquid.xyz/ws";

  const ws = new WebSocket(WSS);

  console.log("Connecting to", WSS);
};
