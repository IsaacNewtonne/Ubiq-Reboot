use reqwest::blocking::Client;
use serde::Deserialize;
use serde_json::{Value, json};
use std::{
    env, fs,
    process::ExitCode,
    time::{Duration, Instant},
};

const DEFAULT_CONFIG: &str = include_str!("../config/networks.json");
const METHODS: [&str; 3] = ["eth_chainId", "eth_blockNumber", "web3_clientVersion"];

#[derive(Debug, Deserialize)]
struct Config {
    networks: Vec<Network>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Network {
    name: String,
    chain_id: u64,
    rpc: Vec<Rpc>,
}

#[derive(Debug, Deserialize)]
struct Rpc {
    url: String,
    status: String,
}

#[derive(Debug)]
struct Options {
    config: Option<String>,
    timeout: u64,
    include_known_failures: bool,
}

#[derive(Debug)]
struct Check {
    value: Option<String>,
    latency_ms: u128,
    error: Option<String>,
}

fn usage() {
    println!(
        "Ubiq RPC health checker

Usage: ubiq-health [OPTIONS]

Options:
  --config <PATH>             Use a network configuration file
  --timeout <SECONDS>         Request timeout (default: 15)
  --include-known-failures    Check endpoints marked as DNS failures
  -h, --help                  Print help
  -V, --version               Print version"
    );
}

fn parse_options(args: impl IntoIterator<Item = String>) -> Result<Option<Options>, String> {
    let mut args = args.into_iter();
    let mut options = Options {
        config: None,
        timeout: 15,
        include_known_failures: false,
    };
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "-h" | "--help" => {
                usage();
                return Ok(None);
            }
            "-V" | "--version" => {
                println!("ubiq-health {}", env!("CARGO_PKG_VERSION"));
                return Ok(None);
            }
            "--config" => options.config = Some(args.next().ok_or("--config requires a path")?),
            "--timeout" => {
                options.timeout = args
                    .next()
                    .ok_or("--timeout requires a number")?
                    .parse()
                    .map_err(|_| "--timeout must be a positive integer")?;
                if options.timeout == 0 {
                    return Err("--timeout must be greater than zero".into());
                }
            }
            "--include-known-failures" => options.include_known_failures = true,
            _ => return Err(format!("unknown option: {arg}")),
        }
    }
    Ok(Some(options))
}

fn rpc_call(client: &Client, endpoint: &str, method: &str, id: usize) -> Check {
    let started = Instant::now();
    let result = client
        .post(endpoint)
        .json(&json!({"jsonrpc": "2.0", "method": method, "params": [], "id": id}))
        .send()
        .and_then(|response| response.error_for_status())
        .and_then(|response| response.json::<Value>());
    let latency_ms = started.elapsed().as_millis();
    match result {
        Ok(body) if body.get("error").is_some() => Check {
            value: None,
            latency_ms,
            error: Some(format!("JSON-RPC error: {}", body["error"])),
        },
        Ok(body) => Check {
            value: body.get("result").map(value_text),
            latency_ms,
            error: None,
        },
        Err(error) => Check {
            value: None,
            latency_ms,
            error: Some(error.to_string()),
        },
    }
}

fn value_text(value: &Value) -> String {
    value
        .as_str()
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| value.to_string())
}

fn run(options: Options) -> Result<bool, String> {
    let config_text = match options.config {
        Some(path) => fs::read_to_string(&path)
            .map_err(|error| format!("could not read configuration {path}: {error}"))?,
        None => DEFAULT_CONFIG.to_owned(),
    };
    let config: Config = serde_json::from_str(&config_text)
        .map_err(|error| format!("invalid network configuration: {error}"))?;
    let client = Client::builder()
        .timeout(Duration::from_secs(options.timeout))
        .user_agent(concat!("ubiq-health/", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|error| format!("could not create HTTP client: {error}"))?;

    println!(
        "{:<18} {:<34} {:<8} {:<8} {:<12} CLIENT",
        "NETWORK", "ENDPOINT", "HEALTH", "CHAIN", "LATENCY"
    );
    let mut checked = 0;
    let mut all_healthy = true;
    for network in config.networks {
        for rpc in network.rpc {
            if !options.include_known_failures && rpc.status == "observed-dns-failure" {
                continue;
            }
            checked += 1;
            let checks: Vec<_> = METHODS
                .iter()
                .enumerate()
                .map(|(index, method)| rpc_call(&client, &rpc.url, method, index + 1))
                .collect();
            let expected_chain = format!("0x{:x}", network.chain_id);
            let chain_matches = checks[0].value.as_deref() == Some(expected_chain.as_str());
            let healthy = chain_matches && checks.iter().all(|check| check.error.is_none());
            all_healthy &= healthy;
            let max_latency = checks
                .iter()
                .map(|check| check.latency_ms)
                .max()
                .unwrap_or(0);
            println!(
                "{:<18} {:<34} {:<8} {:<8} {:>8} ms {}",
                network.name,
                rpc.url,
                if healthy { "healthy" } else { "FAILED" },
                if chain_matches { "match" } else { "MISMATCH" },
                max_latency,
                checks[2].value.as_deref().unwrap_or("-")
            );
            for (method, check) in METHODS.iter().zip(&checks) {
                if let Some(error) = &check.error {
                    eprintln!("  {method}: {error}");
                }
            }
        }
    }
    if checked == 0 {
        return Err("no RPC endpoints were selected".into());
    }
    Ok(all_healthy)
}

fn main() -> ExitCode {
    let options = match parse_options(env::args().skip(1)) {
        Ok(Some(options)) => options,
        Ok(None) => return ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("error: {error}\n");
            usage();
            return ExitCode::from(2);
        }
    };
    match run(options) {
        Ok(true) => ExitCode::SUCCESS,
        Ok(false) => ExitCode::FAILURE,
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::FAILURE
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn embedded_config_is_valid() {
        let config: Config = serde_json::from_str(DEFAULT_CONFIG).unwrap();
        assert!(!config.networks.is_empty());
        assert_eq!(config.networks[0].chain_id, 8);
    }
    #[test]
    fn parses_cross_platform_options() {
        let options = parse_options(
            [
                "--config",
                "custom.json",
                "--timeout",
                "5",
                "--include-known-failures",
            ]
            .map(str::to_owned),
        )
        .unwrap()
        .unwrap();
        assert_eq!(options.config.as_deref(), Some("custom.json"));
        assert_eq!(options.timeout, 5);
        assert!(options.include_known_failures);
    }
}
