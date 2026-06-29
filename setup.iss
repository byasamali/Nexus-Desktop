; Inno Setup Script for Nexus Desktop (Electron Edition)
; Download Inno Setup from: https://jrsoftware.org/isdl.php

[Setup]
AppName=Nexus Desktop
AppVersion=1.0.0
DefaultDirName={localappdata}\NexusDesktop
DefaultGroupName=Nexus Desktop
UninstallDisplayIcon={app}\nexus-desktop.exe
Compression=lzma2/ultra64
SolidCompression=yes
OutputDir=build\installer
OutputBaseFilename=Nexus-Setup
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=lowest

[Files]
; Main Electron application files (from npm run pack) - Exclude unused locales and license documents
Source: "dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "locales\*.pak, LICENSES.chromium.html, LICENSE.electron.txt"

; Only bundle Turkish and English locales to reduce size
Source: "dist\win-unpacked\locales\tr.pak"; DestDir: "{app}\locales"; Flags: ignoreversion
Source: "dist\win-unpacked\locales\en-US.pak"; DestDir: "{app}\locales"; Flags: ignoreversion
Source: "dist\win-unpacked\locales\en-GB.pak"; DestDir: "{app}\locales"; Flags: ignoreversion

; Next.js frontend files
Source: "frontend\out\*"; DestDir: "{app}\frontend\out"; Flags: ignoreversion recursesubdirs createallsubdirs

; Python derlenmiş ikili dosyaları (Executables)
Source: "python\dist\*.exe"; DestDir: "{app}\python\dist"; Flags: ignoreversion

; Konfigürasyon ve yerel veritabanı dosyaları
Source: "python\configs\*"; DestDir: "{app}\python\configs"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "python\database\*"; DestDir: "{app}\python\database"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Nexus Desktop"; Filename: "{app}\nexus-desktop.exe"
Name: "{autodesktop}\Nexus Desktop"; Filename: "{app}\nexus-desktop.exe"

[Run]
Filename: "{app}\nexus-desktop.exe"; Description: "Launch Nexus Desktop"; Flags: postinstall nowait skipifsilent
