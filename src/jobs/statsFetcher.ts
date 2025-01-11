import WebSocket from "ws";
import axios from "axios";
import fs from "fs";
import { createObjectCsvWriter } from "csv-writer";
import { tradesWS, orderBookWS } from "../utils/wsData";

const csvFilePath = "hyperliquid_orderbook.csv";

export const webSocketConnection = async () => {
  const WSS = "wss://api-ui.hyperliquid.xyz/ws";
  const ws = new WebSocket(WSS);

  const MAX_LVL_EXPORT = 10; 

  const headers = [
    "Last Update",
    "Coin",
    ...Array.from({ length: MAX_LVL_EXPORT }, (_, i) => `Ask L${i + 1} Price`),
    ...Array.from({ length: MAX_LVL_EXPORT }, (_, i) => `Ask L${i + 1} Size`),
    ...Array.from({ length: MAX_LVL_EXPORT }, (_, i) => `Ask L${i + 1} Cumulative BTC`),
    ...Array.from({ length: MAX_LVL_EXPORT }, (_, i) => `Bid L${i + 1} Price`),
    ...Array.from({ length: MAX_LVL_EXPORT }, (_, i) => `Bid L${i + 1} Size`),
    ...Array.from({ length: MAX_LVL_EXPORT }, (_, i) => `Bid L${i + 1} Cumulative BTC`),
    "Mark Price",
    "Oracle Price",
    "Funding Rate",
    "Open Interest",
    "24h Volume",
    "Trade Side",
    "Trade Price",
    "Trade Size",
  ];

  const csvWriter = createObjectCsvWriter({
    path: csvFilePath,
    header: headers.map((title) => ({ id: title, title })),
    append: true,
  });

  if (!fs.existsSync(csvFilePath)) {
    fs.writeFileSync(csvFilePath, headers.join(",") + "\n");
  }

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
        return {
          coin,
          oraclePx,
          markPx,
          funding,
          openInterest,
          dayNtlVlm,
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

        const bids = levels[0].slice(0, MAX_LVL_EXPORT);
        const asks = levels[1].slice(0, MAX_LVL_EXPORT);

        const coinStats = await fetchTokenData(coin);

        let askSum = 0;
        let bidSum = 0;

        const orderBookEntry = {
          "Last Update": new Date(time).toLocaleString(),
          Coin: coin,
          ...Object.fromEntries(
            asks.flatMap((ask: any, i: number) => {
              askSum += parseFloat(ask.sz);
              return [
                [`Ask L${i + 1} Price`, ask.px],
                [`Ask L${i + 1} Size`, ask.sz],
                [`Ask L${i + 1} Cumulative BTC`, askSum.toFixed(4)],
              ];
            })
          ),
          ...Object.fromEntries(
            bids.flatMap((bid: any, i: number) => {
              bidSum += parseFloat(bid.sz);
              return [
                [`Bid L${i + 1} Price`, bid.px],
                [`Bid L${i + 1} Size`, bid.sz],
                [`Bid L${i + 1} Cumulative BTC`, bidSum.toFixed(4)],
              ];
            })
          ),
          "Mark Price": coinStats?.markPx || "",
          "Oracle Price": coinStats?.oraclePx || "",
          "Funding Rate": coinStats?.funding || "",
          "Open Interest": coinStats?.openInterest || "",
          "24h Volume": coinStats?.dayNtlVlm || "",
          "Trade Side": "",
          "Trade Price": "",
          "Trade Size": "",
        };

        await csvWriter.writeRecords([orderBookEntry]);
      }

      if (parsedData.channel === "trades") {
        const trade = parsedData.data[0];
        const { coin, side, px, sz, time } = trade;
        const tradeTime = new Date(time).toLocaleString();
        const sideLabel = side === "B" ? "Buy (Bid)" : "Sell (Ask)";

        const tradeEntry = {
          "Last Update": tradeTime,
          Coin: coin,
          ...Object.fromEntries(
            Array.from({ length: MAX_LVL_EXPORT }, (_, i) => [
              [`Ask L${i + 1} Price`, ""],
              [`Ask L${i + 1} Size`, ""],
              [`Ask L${i + 1} Cumulative BTC`, ""],
              [`Bid L${i + 1} Price`, ""],
              [`Bid L${i + 1} Size`, ""],
              [`Bid L${i + 1} Cumulative BTC`, ""],
            ])
          ),
          "Mark Price": "",
          "Oracle Price": "",
          "Funding Rate": "",
          "Open Interest": "",
          "24h Volume": "",
          "Trade Side": sideLabel,
          "Trade Price": px,
          "Trade Size": sz,
        };

        await csvWriter.writeRecords([tradeEntry]);
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