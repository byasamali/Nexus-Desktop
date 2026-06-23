; Inno Setup Script for Nexus Desktop
; Download Inno Setup from: https://jrsoftware.org/isdl.php

[Setup]
AppName=Nexus Desktop
AppVersion=1.0.0
DefaultDirName={localappdata}\NexusDesktop
DefaultGroupName=Nexus Desktop
UninstallDisplayIcon={app}\Nexus-Desktop.exe
Compression=lzma2
SolidCompression=yes
OutputDir=build\installer
OutputBaseFilename=Nexus-Setup
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=lowest

[Files]
; Main Executable
Source: "build\bin\Nexus-Desktop.exe"; DestDir: "{app}"; Flags: ignoreversion

; Python Processor
Source: "build\bin\processor.exe"; DestDir: "{app}"; Flags: ignoreversion

; Database Folder (master_db.sqlite)
Source: "build\bin\database\master_db.sqlite"; DestDir: "{app}\database"; Flags: ignoreversion

; Configs Folder
Source: "build\bin\configs\db_connections.json"; DestDir: "{app}\configs"; Flags: ignoreversion
Source: "build\bin\configs\sql_queries.json"; DestDir: "{app}\configs"; Flags: ignoreversion

[Icons]
Name: "{group}\Nexus Desktop"; Filename: "{app}\Nexus-Desktop.exe"
Name: "{autodesktop}\Nexus Desktop"; Filename: "{app}\Nexus-Desktop.exe"

[Run]
Filename: "{app}\Nexus-Desktop.exe"; Description: "Launch Nexus Desktop"; Flags: postinstall nowait skipifsilent
