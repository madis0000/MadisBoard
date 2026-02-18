@echo off
cd /d "C:\WorkSpace\MadisBoard"
start "" "node_modules\.bin\electron" "packages\frontend\apps\electron\dist\main.js"
