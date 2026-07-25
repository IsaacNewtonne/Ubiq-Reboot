[CmdletBinding()]
param(
    [string]$ConfigPath = (Join-Path $PSScriptRoot '..\config\networks.json'),
    [int]$TimeoutSeconds = 15,
    [switch]$IncludeKnownFailures
)

$ErrorActionPreference = 'Stop'

function Invoke-JsonRpc {
    param(
        [Parameter(Mandatory)] [string]$Endpoint,
        [Parameter(Mandatory)] [string]$Method,
        [Parameter(Mandatory)] [int]$Id
    )

    $request = @{
        jsonrpc = '2.0'
        method = $Method
        params = @()
        id = $Id
    } | ConvertTo-Json -Compress

    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $response = Invoke-RestMethod `
            -Uri $Endpoint `
            -Method Post `
            -ContentType 'application/json' `
            -Body $request `
            -TimeoutSec $TimeoutSeconds
        $timer.Stop()

        if ($null -ne $response.error) {
            throw "JSON-RPC error $($response.error.code): $($response.error.message)"
        }

        [pscustomobject]@{
            Method = $Method
            Success = $true
            LatencyMs = $timer.ElapsedMilliseconds
            Result = [string]$response.result
            Error = $null
        }
    }
    catch {
        $timer.Stop()
        [pscustomobject]@{
            Method = $Method
            Success = $false
            LatencyMs = $timer.ElapsedMilliseconds
            Result = $null
            Error = $_.Exception.Message
        }
    }
}

if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
    throw "Network configuration not found: $ConfigPath"
}

$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$methods = @('eth_chainId', 'eth_blockNumber', 'web3_clientVersion')
$results = @()

foreach ($network in $config.networks) {
    foreach ($rpc in $network.rpc) {
        if (-not $IncludeKnownFailures -and $rpc.status -eq 'observed-dns-failure') {
            continue
        }

        $checks = for ($index = 0; $index -lt $methods.Count; $index++) {
            Invoke-JsonRpc -Endpoint $rpc.url -Method $methods[$index] -Id ($index + 1)
        }

        $chainCheck = $checks | Where-Object Method -eq 'eth_chainId'
        $expectedChainId = '0x{0:x}' -f [int64]$network.chainId
        $chainMatches = $chainCheck.Success -and $chainCheck.Result -eq $expectedChainId

        $results += [pscustomobject]@{
            Network = $network.name
            Endpoint = $rpc.url
            Healthy = ($checks.Success -notcontains $false) -and $chainMatches
            ChainMatches = $chainMatches
            ExpectedChainId = $expectedChainId
            ReportedChainId = $chainCheck.Result
            BlockNumber = ($checks | Where-Object Method -eq 'eth_blockNumber').Result
            ClientVersion = ($checks | Where-Object Method -eq 'web3_clientVersion').Result
            MaxLatencyMs = ($checks | Measure-Object LatencyMs -Maximum).Maximum
            Errors = ($checks | Where-Object { -not $_.Success } | ForEach-Object Error) -join '; '
            CheckedAt = (Get-Date).ToUniversalTime().ToString('o')
        }
    }
}

$results | Format-Table -AutoSize

if ($results.Count -eq 0 -or $results.Healthy -contains $false) {
    exit 1
}

