import { webSocketConnection } from "./jobs/statsFetcher";

const main = async () => {
    console.log('HL');
    webSocketConnection()
}

main().catch((error) => {
    console.error('Error starting getting data', error);
  });