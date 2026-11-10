' Hidden launcher for an installed / NSIS Pixel Agents tree.
' Starts the bundled Node server with no console/taskbar window, waits for
' http://127.0.0.1:3100/api/health, then opens pixel-agents-desktop.exe.
'
' Place this file next to pixel-agents-desktop.exe (and the `_up_\resources\server`
' tree from the NSIS install). Point Desktop / Start Menu / taskbar shortcuts here
' (icon: pixel-agents-desktop.exe). Do not pin the .exe alone until a rebuild
' resolves `_up_\resources\server` from resource_dir.
Option Explicit

Dim fso, sh, appDir, serverDir, exePath, nodePath, logPath, http, i, healthy

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)
serverDir = appDir & "\_up_\resources\server"
exePath = appDir & "\pixel-agents-desktop.exe"
logPath = sh.ExpandEnvironmentStrings("%USERPROFILE%\.pixel-agents\desktop-launcher.log")

If Not fso.FolderExists(sh.ExpandEnvironmentStrings("%USERPROFILE%\.pixel-agents")) Then
  fso.CreateFolder sh.ExpandEnvironmentStrings("%USERPROFILE%\.pixel-agents")
End If

Log "launch start"

nodePath = FindNode()
If nodePath = "" Then
  Log "missing node"
  MsgBox "Node.js 20+ is required." & vbCrLf & "Install from https://nodejs.org/ and try again.", vbCritical, "Pixel Agents"
  WScript.Quit 1
End If

If Not fso.FileExists(serverDir & "\dist\cli.js") Then
  Log "missing cli.js at " & serverDir
  MsgBox "Packaged server missing at:" & vbCrLf & serverDir & "\dist\cli.js", vbCritical, "Pixel Agents"
  WScript.Quit 1
End If

If Not fso.FileExists(exePath) Then
  Log "missing exe"
  MsgBox "Missing:" & vbCrLf & exePath, vbCritical, "Pixel Agents"
  WScript.Quit 1
End If

Log "node=" & nodePath & " server=" & serverDir

If Not HealthOk() Then
  ' Window style 0 = hidden (no console, no taskbar button)
  sh.CurrentDirectory = serverDir
  sh.Run """" & nodePath & """ dist\cli.js --port 3100 --host 127.0.0.1 --no-terminal", 0, False
  Log "spawned hidden server, waiting for health"
  healthy = False
  For i = 1 To 150
    WScript.Sleep 400
    If HealthOk() Then
      healthy = True
      Exit For
    End If
  Next
  If Not healthy Then
    Log "health timeout"
    MsgBox "Timed out waiting for Pixel Agents on 127.0.0.1:3100." & vbCrLf & vbCrLf & _
           "Server folder:" & vbCrLf & serverDir & vbCrLf & vbCrLf & _
           "Log:" & vbCrLf & logPath, vbCritical, "Pixel Agents"
    WScript.Quit 1
  End If
Else
  Log "reusing existing server on 3100"
End If

Log "starting GUI"
sh.Run """" & exePath & """", 1, False
WScript.Quit 0

Function FindNode()
  Dim path, outFile, cmd, rc
  path = sh.ExpandEnvironmentStrings("%ProgramFiles%\nodejs\node.exe")
  If fso.FileExists(path) Then
    FindNode = path
    Exit Function
  End If
  path = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%\Programs\nodejs\node.exe")
  If fso.FileExists(path) Then
    FindNode = path
    Exit Function
  End If
  ' Fall back to PATH via `where`, without showing a window
  outFile = sh.ExpandEnvironmentStrings("%TEMP%\pixel-agents-where-node.txt")
  cmd = "cmd /c where node > """ & outFile & """ 2>nul"
  rc = sh.Run(cmd, 0, True)
  If fso.FileExists(outFile) Then
    Dim ts, line
    Set ts = fso.OpenTextFile(outFile, 1)
    If Not ts.AtEndOfStream Then
      line = Trim(ts.ReadLine)
      If fso.FileExists(line) Then path = line
    End If
    ts.Close
    On Error Resume Next
    fso.DeleteFile outFile, True
    On Error GoTo 0
  End If
  If fso.FileExists(path) Then
    FindNode = path
  Else
    FindNode = ""
  End If
End Function

Function HealthOk()
  On Error Resume Next
  ' ServerXMLHTTP supports real timeouts; XMLHTTP can hang forever on a bad port.
  Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  If Err.Number <> 0 Then
    Err.Clear
    Set http = CreateObject("MSXML2.ServerXMLHTTP")
  End If
  http.setTimeouts 1000, 1000, 2000, 2000
  http.Open "GET", "http://127.0.0.1:3100/api/health", False
  http.Send
  If Err.Number <> 0 Then
    Err.Clear
    HealthOk = False
    Exit Function
  End If
  If http.Status = 200 Then
    HealthOk = (InStr(http.responseText, """status"":""ok""") > 0)
  Else
    HealthOk = False
  End If
  On Error GoTo 0
End Function

Sub Log(msg)
  On Error Resume Next
  Dim ts
  Set ts = fso.OpenTextFile(logPath, 8, True)
  ts.WriteLine Now & " " & msg
  ts.Close
  On Error GoTo 0
End Sub
