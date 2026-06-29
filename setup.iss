; Inno Setup Script for Nexus Desktop (Electron Edition)
; Download Inno Setup from: https://jrsoftware.org/isdl.php

[Setup]
AppName=Nexus Desktop
AppVersion=1.0.0
DefaultDirName={localappdata}\NexusDesktop
DefaultGroupName=Nexus Desktop
UninstallDisplayIcon={app}\nexus-desktop.exe
Compression=lzma2
SolidCompression=yes
OutputDir=build\installer
OutputBaseFilename=Nexus-Setup
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=lowest

[Files]
; Main Electron application files (from npm run pack)
Source: "dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; Next.js frontend files
Source: "frontend\out\*"; DestDir: "{app}\frontend\out"; Flags: ignoreversion recursesubdirs createallsubdirs

; Python tools and scripts (Excluding virtual environments, caches and generated database results)
Source: "python\*"; DestDir: "{app}\python"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "python\tenants\*,python\.venv\*,python\__pycache__\*,python\build\*,python\dist\*"

[Icons]
Name: "{group}\Nexus Desktop"; Filename: "{app}\nexus-desktop.exe"
Name: "{autodesktop}\Nexus Desktop"; Filename: "{app}\nexus-desktop.exe"

[Run]
Filename: "{app}\nexus-desktop.exe"; Description: "Launch Nexus Desktop"; Flags: postinstall nowait skipifsilent
