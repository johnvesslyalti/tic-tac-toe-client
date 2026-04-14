import { Client } from "@heroiclabs/nakama-js";

const fallbackHost =
  typeof window !== "undefined" ? window.location.hostname : "localhost";
const useSSL =
  process.env.NEXT_PUBLIC_NAKAMA_USE_SSL === "true" ||
  (typeof window !== "undefined" && window.location.protocol === "https:");

const host = process.env.NEXT_PUBLIC_NAKAMA_HOST || fallbackHost;
const port =
  process.env.NEXT_PUBLIC_NAKAMA_PORT || (useSSL ? "443" : "7350");
const serverKey = process.env.NEXT_PUBLIC_NAKAMA_SERVER_KEY || "defaultkey";

const client = new Client(serverKey, host, port, useSSL);

export const nakamaConfig = {
  host,
  port,
  serverKey,
  useSSL,
};

export function getNakamaSocketUrl(): string {
  const scheme = nakamaConfig.useSSL ? "wss://" : "ws://";
  return `${scheme}${nakamaConfig.host}:${nakamaConfig.port}/ws`;
}

export default client;
