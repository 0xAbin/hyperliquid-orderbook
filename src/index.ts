import { webSocketConnection } from "./jobs/statsFetcher";
import { asciiArt } from "./utils/ascii-art";

const main = async () => {
    console.log(asciiArt);
    webSocketConnection()
}

main().catch((error) => {
    console.error('Error starting getting data', error);
  }); 