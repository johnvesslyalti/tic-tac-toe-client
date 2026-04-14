import { Client } from "@heroiclabs/nakama-js";

// Initialize the Nakama client
// We use 'defaultkey' and port 7350 for local development
const client = new Client(
  "defaultkey", // Server Key
  "localhost", // Server Host
  "7350", // Server Port
  false, // Use SSL (false for localhost)
);

export default client;
