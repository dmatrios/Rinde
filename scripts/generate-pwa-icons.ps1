Add-Type -AssemblyName System.Drawing

$publicDirectory = Join-Path (Split-Path $PSScriptRoot -Parent) 'public'
New-Item -ItemType Directory -Path $publicDirectory -Force | Out-Null

@(
  @{ Name = 'icon-192.png'; Size = 192 }
  @{ Name = 'icon-512.png'; Size = 512 }
  @{ Name = 'apple-touch-icon.png'; Size = 180 }
) | ForEach-Object {
  $size = [int]$_.Size
  $image = [System.Drawing.Bitmap]::new($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($image)
  $background = [System.Drawing.Color]::FromArgb(204, 72, 28)
  $graphics.Clear($background)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::White, [single]($size * 38 / 512))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  try {
    $point = { param([double]$coordinate) [single]($coordinate * $size / 512) }
    $graphics.DrawLine($pen, (& $point 170), (& $point 342), (& $point 342), (& $point 170))
    $graphics.DrawLine($pen, (& $point 174), (& $point 170), (& $point 342), (& $point 170))
    $graphics.DrawLine($pen, (& $point 342), (& $point 170), (& $point 342), (& $point 338))
    $image.Save((Join-Path $publicDirectory $_.Name), [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $pen.Dispose()
    $graphics.Dispose()
    $image.Dispose()
  }
}
