import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RPC_URL = "https://rpc.ubiqsmart.com";
const EXPECTED_CHAIN_ID = "0x8";
const METHODS = ["eth_chainId", "eth_blockNumber", "web3_clientVersion"] as const;

type Method = (typeof METHODS)[number];

type Check = {
  method: Method;
  value: string | null;
  latencyMs: number;
  error?: string;
};

function isHexQuantity(value: string) {
  return /^0x(?:0|[1-9a-f][0-9a-f]*)$/i.test(value);
}

async function rpcCall(method: Method, id: number): Promise<Check> {
  const started = performance.now();
  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method, params: [], id }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = (await response.json()) as {
      result?: unknown;
      error?: unknown;
    };
    if (body.error !== undefined) {
      throw new Error("The node returned an RPC error");
    }
    if (typeof body.result !== "string" || body.result.length === 0) {
      throw new Error("The node returned an invalid result");
    }
    if (
      (method === "eth_chainId" || method === "eth_blockNumber") &&
      !isHexQuantity(body.result)
    ) {
      throw new Error("The node returned an invalid blockchain value");
    }

    return {
      method,
      value: body.result,
      latencyMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    return {
      method,
      value: null,
      latencyMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET() {
  const checks = await Promise.all(
    METHODS.map((method, index) => rpcCall(method, index + 1)),
  );
  const chain = checks.find((check) => check.method === "eth_chainId");
  const block = checks.find((check) => check.method === "eth_blockNumber");
  const client = checks.find((check) => check.method === "web3_clientVersion");
  const healthy =
    checks.every((check) => !check.error) &&
    chain?.value?.toLowerCase() === EXPECTED_CHAIN_ID;

  return NextResponse.json(
    {
      schemaVersion: 1,
      checkedAt: new Date().toISOString(),
      healthy,
      network: {
        name: "Ubiq Mainnet",
        chainId: 8,
        endpoint: RPC_URL,
        blockNumber: block?.value ? Number.parseInt(block.value, 16) : null,
        client: client?.value ?? null,
        latencyMs: Math.max(...checks.map((check) => check.latencyMs)),
        checks,
      },
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
