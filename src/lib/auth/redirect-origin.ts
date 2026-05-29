import { getServerEnv } from "@/lib/env";

function readFirstHeaderValue(value?: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

function isLocalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname === "::" ||
    hostname === "[::]"
  );
}

export function resolveRedirectOrigin(params: {
  requestUrl: string;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  host?: string | null;
}) {
  const requestOrigin = new URL(params.requestUrl);
  const forwardedHost = readFirstHeaderValue(params.forwardedHost);
  const rawHost = forwardedHost || readFirstHeaderValue(params.host);
  const hostname = rawHost.split(":")[0] ?? "";

  if (rawHost) {
    const protocol =
      readFirstHeaderValue(params.forwardedProto) ||
      (isLocalHost(hostname) ? requestOrigin.protocol.replace(":", "") : "https");

    return `${protocol}://${rawHost}`;
  }

  if (isLocalHost(requestOrigin.hostname)) {
    return requestOrigin.origin;
  }

  return getServerEnv().INNOVINK_APP_URL;
}
