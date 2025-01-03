import WebSocket from "ws";
import { tradesWS, orderBookWS } from "../utils/wsData";

export const webSocketConnection = () => {
  const WSS = "wss://api-ui.hyperliquid.xyz/ws";
  const ws = new WebSocket(WSS);

  ws.on("open", () => {
    console.log("HyperLiquid WebSocket connection established.");
    ws.send(JSON.stringify(tradesWS));
    ws.send(JSON.stringify(orderBookWS));
  });

  ws.on("message", (data: any) => {
    try {
      const parsedData = JSON.parse(data);

      if (parsedData.channel === "l2Book") {
        const { levels, coin, time } = parsedData.data;

        const bids = levels[0]; 
        const asks = levels[1]; 

        console.clear(); 
        console.log(`Order Book for ${coin}`);
        console.log(`Last Update: ${new Date(time).toLocaleString()}`);
        console.log("\nAsks (Sell Orders):");
        console.log("Price (USDT)     Size (BTC)     Sum (BTC)");

        let askSum = 0;
        asks.forEach((ask: any) => {
          askSum += parseFloat(ask.sz);
          console.log(
            `${ask.px.padStart(12)}    ${ask.sz.padStart(10)}    ${askSum.toFixed(4).padStart(10)}`
          );
        });

        console.log("\nBids (Buy Orders):");
        console.log("Price (USDT)     Size (BTC)     Sum (BTC)");

        let bidSum = 0;
        bids.forEach((bid: any) => {
          bidSum += parseFloat(bid.sz);
          console.log(
            `${bid.px.padStart(12)}    ${bid.sz.padStart(10)}    ${bidSum.toFixed(4).padStart(10)}`
          );
        });
      }
    } catch (err) {
      console.error("Failed to parse message:", data, err);
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed.");
  });
};