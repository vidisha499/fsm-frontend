$headers = @{'Content-Type'='application/json'}
$body = '{"company_id":"1"}'
$resp = Invoke-WebRequest -Uri 'https://fms.pugarch.in/public/api/assignable-users' -Method Post -Body $body -Headers $headers -UseBasicParsing
$content = $resp.Content
Write-Output $content.Substring(0, [Math]::Min(3000, $content.Length))
