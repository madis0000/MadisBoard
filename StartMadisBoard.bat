@echo off
title MadisBoard
cd /d "C:\WorkSpace\MadisBoard"
echo Starting MadisBoard...
echo.
echo Once started, check the console for the URL (usually http://localhost:8080 or 8083)
echo Press Ctrl+C to stop the server
echo.
set NODE_OPTIONS=--max-old-space-size=16384
yarn affine @madisboard/web dev
