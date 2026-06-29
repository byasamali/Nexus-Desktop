@echo off
echo ===================================================
echo   NEXUS DESKTOP BUILD PIPELINE (ELECTRON + NEXT.JS)
echo ===================================================

echo [1/4] Frontend Next.js build ediliyor...
cd frontend
call npm run build
cd ..

echo [2/4] Electron uygulamasi paketleniyor...
call npm run pack

echo [3/4] Inno Setup ile yukleyici derleniyor...
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" setup.iss

echo ===================================================
echo   ISLEM TAMAMLANDI!
echo   Kurulum dosyasi: build\installer\Nexus-Setup.exe
echo ===================================================
pause
