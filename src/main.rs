use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    env, fs,
    process::ExitCode,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
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

#[derive(Debug, Clone, Copy, PartialEq)]
enum OutputFormat {
    Table,
    Json,
}

#[derive(Debug)]
struct Options {
    config: Option<String>,
    timeout: u64,
    include_known_failures: bool,
    format: OutputFormat,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct MethodCheck {
    method: String,
    value: Option<String>,
    latency_ms: u128,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct EndpointReport {
    url: String,
    configured_status: String,
    healthy: bool,
    expected_chain_id: String,
    actual_chain_id: Option<String>,
    latency_ms: u128,
    checks: Vec<MethodCheck>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NetworkReport {
    name: String,
    chain_id: u64,
    endpoints: Vec<EndpointReport>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HealthReport {
    schema_version: u8,
    checked_at_unix: u64,
    healthy: bool,
    networks: Vec<NetworkReport>,
}

fn usage() {
    println!(
        "Ubiq RPC health checker

Usage: ubiq-health [OPTIONS]

Options:
  --config <PATH>             Use a network configuration file
  --timeout <SECONDS>         Request timeout (default: 15)
  --format <table|json>       Output format (default: table)
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
        format: OutputFormat::Table,
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
            "--format" => {
                options.format = match args.next().as_deref() {
                    Some("table") => OutputFormat::Table,
                    Some("json") => OutputFormat::Json,
                    Some(value) => {
                        return Err(format!(
                            "unsupported format: {value} (expected table or json)"
                        ));
                    }
                    None => return Err("--format requires table or json".into()),
                }
            }
            "--include-known-failures" => options.include_known_failures = true,
            _ => return Err(format!("unknown option: {arg}")),
        }
    }
    Ok(Some(options))
}

fn parse_rpc_response(body: Value) -> Result<String, String> {
    if let Some(error) = body.get("error") {
        return Err(format!("JSON-RPC error: {error}"));
    }
    match body.get("result") {
        Some(value) if value.is_null() => Err("invalid JSON-RPC response: null result".into()),
        Some(value) => Ok(value_text(value)),
        None => Err("invalid JSON-RPC response: missing result and error".into()),
    }
}

fn is_hex_quantity(value: &str) -> bool {
    let Some(digits) = value.strip_prefix("0x") else {
        return false;
    };
    !digits.is_empty()
        && digits.bytes().all(|byte| byte.is_ascii_hexdigit())
        && (digits == "0" || !digits.starts_with('0'))
}

fn validate_method_result(method: &str, value: &str) -> Result<(), String> {
    match method {
        "eth_chainId" | "eth_blockNumber" if !is_hex_quantity(value) => {
            Err(format!("invalid {method} result: expected a hex quantity"))
        }
        "web3_clientVersion" if value.trim().is_empty() => {
            Err("invalid web3_clientVersion result: expected a non-empty string".into())
        }
        _ => Ok(()),
    }
}

fn rpc_call(client: &Client, endpoint: &str, method: &str, id: usize) -> MethodCheck {
    let started = Instant::now();
    let result = client
        .post(endpoint)
        .json(&json!({"jsonrpc": "2.0", "method": method, "params": [], "id": id}))
        .send()
        .and_then(|response| response.error_for_status())
        .and_then(|response| response.json::<Value>());
    let latency_ms = started.elapsed().as_millis();
    match result {
        Ok(body) => match parse_rpc_response(body)
            .and_then(|value| validate_method_result(method, &value).map(|()| value))
        {
            Ok(value) => MethodCheck {
                method: method.to_owned(),
                value: Some(value),
                latency_ms,
                error: None,
            },
            Err(error) => MethodCheck {
                method: method.to_owned(),
                value: None,
                latency_ms,
                error: Some(error),
            },
        },
        Err(error) => MethodCheck {
            method: method.to_owned(),
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

fn collect_report(options: &Options) -> Result<HealthReport, String> {
    let config_text = match options.config {
        Some(ref path) => fs::read_to_string(path)
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

    let mut checked = 0;
    let mut all_healthy = true;
    let mut network_reports = Vec::new();
    for network in config.networks {
        let mut endpoint_reports = Vec::new();
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
            endpoint_reports.push(EndpointReport {
                url: rpc.url,
                configured_status: rpc.status,
                healthy,
                expected_chain_id: expected_chain,
                actual_chain_id: checks[0].value.clone(),
                latency_ms: max_latency,
                checks,
            });
        }
        network_reports.push(NetworkReport {
            name: network.name,
            chain_id: network.chain_id,
            endpoints: endpoint_reports,
        });
    }
    if checked == 0 {
        return Err("no RPC endpoints were selected".into());
    }
    let checked_at_unix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("system clock is before the Unix epoch: {error}"))?
        .as_secs();
    Ok(HealthReport {
        schema_version: 1,
        checked_at_unix,
        healthy: all_healthy,
        networks: network_reports,
    })
}

fn render_table(report: &HealthReport) {
    println!(
        "{:<18} {:<34} {:<8} {:<8} {:<12} CLIENT",
        "NETWORK", "ENDPOINT", "HEALTH", "CHAIN", "LATENCY"
    );
    for network in &report.networks {
        for endpoint in &network.endpoints {
            let client = endpoint
                .checks
                .iter()
                .find(|check| check.method == "web3_clientVersion")
                .and_then(|check| check.value.as_deref())
                .unwrap_or("-");
            println!(
                "{:<18} {:<34} {:<8} {:<8} {:>8} ms {}",
                network.name,
                endpoint.url,
                if endpoint.healthy {
                    "healthy"
                } else {
                    "FAILED"
                },
                if endpoint.actual_chain_id.as_deref() == Some(endpoint.expected_chain_id.as_str())
                {
                    "match"
                } else {
                    "MISMATCH"
                },
                endpoint.latency_ms,
                client
            );
            for check in &endpoint.checks {
                if let Some(error) = &check.error {
                    eprintln!("  {}: {error}", check.method);
                }
            }
        }
    }
}

fn run(options: Options) -> Result<bool, String> {
    let report = collect_report(&options)?;
    match options.format {
        OutputFormat::Table => render_table(&report),
        OutputFormat::Json => println!(
            "{}",
            serde_json::to_string_pretty(&report)
                .map_err(|error| format!("could not serialize health report: {error}"))?
        ),
    }
    Ok(report.healthy)
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
        assert_eq!(options.format, OutputFormat::Table);
    }
    #[test]
    fn parses_json_output_format() {
        let options = parse_options(["--format", "json"].map(str::to_owned))
            .unwrap()
            .unwrap();
        assert_eq!(options.format, OutputFormat::Json);
    }
    #[test]
    fn rejects_unsupported_output_format() {
        let error = parse_options(["--format", "xml"].map(str::to_owned)).unwrap_err();
        assert!(error.contains("unsupported format"));
    }
    #[test]
    fn rejects_rpc_response_without_result_or_error() {
        let error = parse_rpc_response(json!({"jsonrpc": "2.0", "id": 1})).unwrap_err();
        assert!(error.contains("missing result and error"));
    }
    #[test]
    fn preserves_rpc_error_details() {
        let error = parse_rpc_response(
            json!({"jsonrpc": "2.0", "id": 1, "error": {"code": -1, "message": "no"}}),
        )
        .unwrap_err();
        assert!(error.contains("\"code\":-1"));
    }
    #[test]
    fn rejects_null_rpc_result() {
        let error =
            parse_rpc_response(json!({"jsonrpc": "2.0", "id": 1, "result": null})).unwrap_err();
        assert!(error.contains("null result"));
    }
    #[test]
    fn validates_hex_quantities() {
        for value in ["0x0", "0x8", "0xabcdef", "0xABCDEF"] {
            assert!(is_hex_quantity(value), "{value}");
        }
        for value in ["", "0x", "8", "0x00", "0xgg"] {
            assert!(!is_hex_quantity(value), "{value}");
        }
    }
    #[test]
    fn rejects_invalid_method_results() {
        assert!(validate_method_result("eth_blockNumber", "100").is_err());
        assert!(validate_method_result("web3_clientVersion", " ").is_err());
    }
}
