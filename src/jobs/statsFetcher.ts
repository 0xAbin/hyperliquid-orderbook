import WebSocket from "ws";
import axios from "axios";
import { tradesWS, orderBookWS } from "../utils/wsData";

export const webSocketConnection = async () => {
  const WSS = "wss://api-ui.hyperliquid.xyz/ws";
  const ws = new WebSocket(WSS);

  const MAX_DISPLAY_ROWS = 20; // u can udpated the rows to show

  const fetchTokenData = async (coin: string) => {
    try {
      const response = await axios.post("https://api.hyperliquid.xyz/info", {
        type: "metaAndAssetCtxs",
      });

      const [universeData, assetContexts] = response.data;

      const tokenIndex = universeData.universe.findIndex(
        (asset: any) => asset.name === coin
      );

      if (tokenIndex !== -1) {
        const tokenData = assetContexts[tokenIndex];
        const { oraclePx, markPx, funding, openInterest, dayNtlVlm } =
          tokenData;
        const requestTime = new Date().toLocaleString();

        return {
          coin,
          oraclePx,
          markPx,
          funding,
          openInterest,
          dayNtlVlm,
          requestTime,
        };
      } else {
        console.error(`Token ${coin} not found in the universe data.`);
        return null;
      }
    } catch (error) {
      console.error("Error fetching token data:", error);
      return null;
    }
  };

  ws.on("open", () => {
    console.log("HyperLiquid WebSocket connection established.");
    ws.send(JSON.stringify(tradesWS));
    ws.send(JSON.stringify(orderBookWS));
  });

  ws.on("message", async (data: any) => {
    try {
      const parsedData = JSON.parse(data);

      if (parsedData.channel === "l2Book") {
        const { levels, coin, time } = parsedData.data;

        const bids = levels[0];
        const asks = levels[1];
        const coinStats = await fetchTokenData(coin);

        console.clear();
        console.log(
          "====== ORDER BOOK ======||====== COIN STATS ======||====== TRADES ======\n"
        );

        // Format Order Book
        let orderBookString = "Order Book:\n";
        orderBookString += `Coin: ${coin} | Last Update: ${new Date(
          time
        ).toLocaleString()}\n`;
        orderBookString += "Asks (Sell Orders):\n";
        orderBookString += "Price (USDT)     Size (BTC)     Sum (BTC)\n";
        let askSum = 0;
        asks
          .slice(0, MAX_DISPLAY_ROWS)
          .reverse()
          .forEach((ask: any) => {
            askSum += parseFloat(ask.sz);
            orderBookString += `${ask.px.padStart(12)}    ${ask.sz.padStart(
              10
            )}    ${askSum.toFixed(4).padStart(10)}\n`;
          });
        if (asks.length > MAX_DISPLAY_ROWS) {
          orderBookString += "... (more Asks not displayed)\n";
        }

        orderBookString += "\nBids (Buy Orders):\n";
        orderBookString += "Price (USDT)     Size (BTC)     Sum (BTC)\n";
        let bidSum = 0;
        bids.slice(0, MAX_DISPLAY_ROWS).forEach((bid: any) => {
          bidSum += parseFloat(bid.sz);
          orderBookString += `${bid.px.padStart(12)}    ${bid.sz.padStart(
            10
          )}    ${bidSum.toFixed(4).padStart(10)}\n`;
        });
        if (bids.length > MAX_DISPLAY_ROWS) {
          orderBookString += "... (more Bids not displayed)\n";
        }

        // Format Coin Stats
        let coinStatsString = "\n====== COIN STATS ======\n";
        if (coinStats) {
          coinStatsString += `Coin: ${coinStats.coin}\n`;
          coinStatsString += `Oracle Price: ${coinStats.oraclePx}\n`;
          coinStatsString += `Mark Price: ${coinStats.markPx}\n`;
          coinStatsString += `Funding Rate: ${coinStats.funding}\n`;
          coinStatsString += `Open Interest: ${coinStats.openInterest}\n`;
          coinStatsString += `24h Volume: ${coinStats.dayNtlVlm}\n`;
          coinStatsString += `Request Time: ${coinStats.requestTime}\n`;
        }

        // Print Order Book and Coin Stats
        console.log(orderBookString + coinStatsString);
      }

      if (parsedData.channel === "trades") {
        const trade = parsedData.data[0];
        const { coin, side, px, sz, time } = trade;
        const tradeTime = new Date(time).toLocaleString();
        const sideLabel = side === "B" ? "Buy (Bid)" : "Sell (Ask)";

        // Trades formatted inline
        console.log(
          `\n====== TRADES ======\nCoin: ${coin} | Side: ${sideLabel} | Price: ${px} | Size: ${sz} | Time: ${tradeTime}\n`
        );
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
