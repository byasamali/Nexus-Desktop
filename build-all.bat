@echo off
echo ===================================================
echo   NEXUS DESKTOP BUILD PIPELINE (ELECTRON + NEXT.JS)
echo ===================================================

echo [1/5] Frontend Next.js build ediliyor...
cd frontend
call npm run build
cd ..

echo [2/5] Python betikleri PyInstaller ile derleniyor...
cd python
call .venv\Scripts\pyinstaller.exe --onefile --clean --noconfirm sync_and_run.py
call .venv\Scripts\pyinstaller.exe --onefile --clean --noconfirm manage_categories.py
call .venv\Scripts\pyinstaller.exe --onefile --clean --noconfirm db_tool.py
call .venv\Scripts\pyinstaller.exe --clean --noconfirm processor.spec
cd ..

echo [3/5] Electron uygulamasi paketleniyor...
call npm run pack

echo [4/5] Inno Setup ile yukleyici derleniyor...
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" setup.iss

echo ===================================================
echo   ISLEM TAMAMLANDI!
echo   Kurulum dosyasi: build\installer\Nexus-Setup.exe
echo ===================================================
pause
