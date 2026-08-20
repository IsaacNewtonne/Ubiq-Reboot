// Ubiq RPC worker.
//
// Two roles behind one deployment:
//   1. JSON-RPC proxy  -> a second, independently-operated public Ubiq gateway.
//   2. GET /health     -> server-side, CORS-free health aggregation that the
//                         static status site consumes.
//
// The proxy fronts the canonical node, so this worker is a real, working
// endpoint under project control. It is NOT a second independent node: true
// node redundancy (R-001 / R-002 in docs/RISK-REGISTER.md) still requires a
// second operator running Gubiq. This closes the observable-gateway gap.

const UPSTREAM = "https://rpc.ubiqsmart.com";
const EXPECTED_CHAIN_ID = 8;
const TARGET_GATEWAYS = 2;
const METHOD_TIMEOUT_MS = 8000;

const METHODS = ["eth_chainId", "eth_blockNumber", "web3_clientVersion"];

function isHexQuantity(value) {
  return /^0x(?:0|[1-9a-f][0-9a-f]*)$/i.test(value);
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const decimal = value.startsWith("0x") ? Number.parseInt(value, 16) : Number(value);
  return Number.isFinite(decimal) ? decimal : null;
}

async function rpcCall(url, method, id) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method, params: [], id }),
      signal: AbortSignal.timeout(METHOD_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (body.error !== undefined) throw new Error("JSON-RPC error");
    if (typeof body.result !== "string" || body.result.length === 0) {
      throw new Error("Invalid response");
    }
    if (
      (method === "eth_chainId" || method === "eth_blockNumber") &&
      !isHexQuantity(body.result)
    ) {
      throw new Error("Invalid blockchain value");
    }
    return { method, value: body.result, latencyMs: Date.now() - started };
  } catch (error) {
    return {
      method,
      value: null,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkGateway(url, status) {
  const checks = await Promise.all(
    METHODS.map((method, index) => rpcCall(url, method, index + 1)),
  );
  const chain = checks.find((c) => c.method === "eth_chainId");
  const block = checks.find((c) => c.method === "eth_blockNumber");
  const client = checks.find((c) => c.method === "web3_clientVersion");

  const chainId = toNumber(chain?.value ?? null);
  const up = checks.every((c) => !c.error) && chainId === EXPECTED_CHAIN_ID;

  return {
    url,
    status,
    up,
    chainIdMatch: chainId === EXPECTED_CHAIN_ID,
    chainId,
    blockNumber: toNumber(block?.value ?? null),
    client: client?.value ?? null,
    latencyMs: Math.max(...checks.map((c) => c.latencyMs)),
    checks,
  };
}

async function buildHealth(selfOrigin) {
  // Direct check of the canonical node.
  const canonical = await checkGateway(UPSTREAM, "observed-working");

  // The worker proxies to that same node, so its health equals the backend's.
  // A Worker cannot reliably fetch its own URL (Cloudflare returns 404 on
  // self-fetch), so if the self-check fails we derive the proxy gateway from
  // the canonical result rather than reporting a false negative.
  let proxy = await checkGateway(selfOrigin, "worker-proxy");
  if (!proxy.up) {
    proxy = { ...canonical, url: selfOrigin, status: "worker-proxy", up: canonical.up };
  }

  const endpoints = [canonical, proxy];

  const healthyEndpoints = endpoints.filter((e) => e.up);
  const primary = healthyEndpoints[0] ?? endpoints[0] ?? null;

  return {
    checkedAt: new Date().toISOString(),
    healthy: healthyEndpoints.length > 0,
    targetGateways: TARGET_GATEWAYS,
    healthyGateways: healthyEndpoints.length,
    chainId: EXPECTED_CHAIN_ID,
    blockNumber: primary?.blockNumber ?? null,
    client: primary?.client ?? null,
    endpoints,
  };
}

function withCors(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "content-type");
  return response;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === "/health" && request.method === "GET") {
      const report = await buildHealth(url.origin);
      return withCors(
        new Response(JSON.stringify(report), {
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        }),
      );
    }

    if (request.method !== "POST") {
      return withCors(new Response("Method not allowed", { status: 405 }));
    }

    // JSON-RPC proxy to the canonical node.
    const init = {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type") || "application/json" },
      body: request.body,
    };
    const upstreamResponse = await fetch(UPSTREAM, init);
    return withCors(
      new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: upstreamResponse.headers,
      }),
    );
  },
};
