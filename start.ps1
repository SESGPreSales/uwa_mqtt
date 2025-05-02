# 1) Grab the first non‐loopback IPv4 address
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.IPAddress -notlike '169.*' -and $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '172.*' } |
       Select-Object -First 1 -ExpandProperty IPAddress)

# 2) Export it as an environment variable
$env:HOST_LAN_IP = $ip

# 3) Spin up your Compose stack
docker compose up -d
