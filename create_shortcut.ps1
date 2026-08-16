$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop "考研英语一真题刷题.lnk"
$ProjectDir = "D:\PersonalFiles\Agents_test\kaoyan-English"
$VbsPath = Join-Path $ProjectDir "launch_silent.vbs"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$VbsPath`""
$Shortcut.WorkingDirectory = $ProjectDir
$Shortcut.Description = "一键打开考研英语一真题刷题系统"
$Shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll, 220"
$Shortcut.Save()

if (Test-Path $ShortcutPath) {
    Write-Output "SUCCESS: Shortcut created at $ShortcutPath"
} else {
    Write-Output "FAILED: Could not create shortcut"
}
