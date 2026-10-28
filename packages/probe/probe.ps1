param([Parameter(Mandatory = $true)][string]$TracePath)
$ErrorActionPreference = "Stop"

function Trace([string]$Stage) {
    $line = "{0:o} powershell pid={1} {2}" -f [DateTime]::UtcNow, $PID, $Stage
    [Console]::Error.WriteLine($line)
    [System.IO.File]::AppendAllText($TracePath, $line + [Environment]::NewLine)
}

Trace "script started"
Trace "PSVersion=$($PSVersionTable.PSVersion); PSHOME=$PSHOME; Is64BitProcess=$([Environment]::Is64BitProcess)"
Trace "RuntimeDirectory=$([Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory())"
Trace "Add-Type starting"
Add-Type -TypeDefinition 'public static class Repro { public static int Answer() { return 42; } }'
Trace "Add-Type finished"
[Console]::Out.WriteLine("Add-Type result: " + [Repro]::Answer())
Trace "script complete"
