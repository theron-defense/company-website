$rand = New-Object System.Random(20260911)
function Get-Rand([double]$a, [double]$b) {
  return $a + $rand.NextDouble() * ($b - $a)
}

$w = 2000.0
$h = 520.0
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 520" preserveAspectRatio="xMidYMid meet">')

$y0 = $h * 0.5
$amp = 78
$freq = 2.0
$phase = 0.4
$amp2 = 22
$freq2 = 3.0
$points = 420
$pad = 18.0

for ($p = 0; $p -lt $points; $p++) {
  $u = $p / $points
  $x = $u * $w
  $y = $y0 + [math]::Sin(($u * 2 * [math]::PI * $freq) + $phase) * $amp
  $y += [math]::Sin(($u * 2 * [math]::PI * $freq2) + 0.8) * $amp2

  $thick = [math]::Abs([math]::Sin(($u * 2 * [math]::PI * 2.0) + 0.35))
  $thick = [math]::Pow($thick, 0.55)
  $spread = 6.0 + 96.0 * $thick
  $copies = [int](2 + [math]::Round(18 * $thick)) + $rand.Next(0, 3)

  for ($k = 0; $k -lt $copies; $k++) {
    $jx = $x + (Get-Rand -10.0 10.0)
    if ($jx -lt 0) { $jx += $w }
    if ($jx -ge $w) { $jx -= $w }
    $jy = $y + (Get-Rand (-$spread) $spread) * [math]::Pow($rand.NextDouble(), 0.72)
    if ($jy -lt $pad) { $jy = $pad }
    if ($jy -gt ($h - $pad)) { $jy = $h - $pad }
    $r = [math]::Round((Get-Rand 0.55 0.88), 2)
    $o = [math]::Round((Get-Rand 0.16 0.38), 2)
    $jx = [math]::Round($jx, 1)
    $jy = [math]::Round($jy, 1)
    [void]$sb.AppendLine("  <circle cx=`"$jx`" cy=`"$jy`" r=`"$r`" fill=`"#fff`" fill-opacity=`"$o`"/>")
  }
}

[void]$sb.AppendLine('</svg>')
$out = Join-Path (Split-Path $PSScriptRoot) "assets\contact-dots.svg"
[System.IO.File]::WriteAllText($out, $sb.ToString())
Write-Host ("wrote " + $out)
