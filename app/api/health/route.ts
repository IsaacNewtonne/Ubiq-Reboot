import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const METHODS = ["eth_chainId", "eth_blockNumber", "web3_clientVersion"] as const;
type Method = (typeof METHODS)[number];

const EXPECTED_CHAIN_ID = 8;
const TARGET_GATEWAYS = 2;
const REQUEST_TIMEOUT_MS = 8_000;

type EndpointCheck = {
  method: Method;
  value: string | null;
  latencyMs: number;
  error?: string;
};

type EndpointReport = {
  url: string;
  status: string;
  up: boolean;
  chainIdMatch: boolean;
  chainId: number | null;
  blockNumber: number | null;
  client: string | null;
  latencyMs: number;
  checks: EndpointCheck[];
};

type HealthReport = {
  checkedAt: string;
  healthy: boolean;
  targetGateways: number;
  healthyGateways: number;
  chainId: number;
  blockNumber: number | null;
  client: string | null;
  endpoints: EndpointReport[];
};

function isHexQuantity(value: string): boolean {
  return /^0x(?:0|[1-9a-f][0-9a-f]*)$/i.test(value);
}

function toNumber(value: string | null): number | null {
  if (value === null) return null;
  const decimal = value.startsWith("0x") ? Number.parseInt(value, 16) : Number(value);
  return Number.isFinite(decimal) ? decimal : null;
}

async function rpcCall(url: string, method: Method, id: number): Promise<EndpointCheck> {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method, params: [], id }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = (await response.json()) as { result?: unknown; error?: unknown };
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
    return {
      method,
      value: body.result,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      method,
      value: null,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkGateway(url: string, status: string): Promise<EndpointReport> {
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

export async function GET() {
  const endpoints = await Promise.all([
    checkGateway("https://rpc.ubiqsmart.com", "observed-working"),
    ...(process.env.WORKER_RPC_URL
      ? [checkGateway(process.env.WORKER_RPC_URL, "worker-proxy")]
      : []),
  ]);

  const healthyEndpoints = endpoints.filter((e) => e.up);
  const primary = healthyEndpoints[0] ?? endpoints[0] ?? null;

  const report: HealthReport = {
    checkedAt: new Date().toISOString(),
    healthy: healthyEndpoints.length > 0,
    targetGateways: TARGET_GATEWAYS,
    healthyGateways: healthyEndpoints.length,
    chainId: EXPECTED_CHAIN_ID,
    blockNumber: primary?.blockNumber ?? null,
    client: primary?.client ?? null,
    endpoints,
  };

  return NextResponse.json(report, {
    headers: { "cache-control": "no-store" },
  });
}
