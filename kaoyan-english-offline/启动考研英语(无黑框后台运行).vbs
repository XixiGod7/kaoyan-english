Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set ws = CreateObject("WScript.Shell")
ws.CurrentDirectory = currentDir
ws.Run "cmd /c """ & currentDir & "\Ò»¼üÆô¶¯¿¼ÑÐÓ¢Óï.bat""", 0, False
