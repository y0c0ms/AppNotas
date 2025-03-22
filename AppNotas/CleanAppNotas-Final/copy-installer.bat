@echo off
echo Copying installer to releases directory...
if not exist releases mkdir releases
copy /Y dist\CleanAppNotas-Setup-1.0.0.exe releases\
echo Done! 