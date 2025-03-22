#!/bin/bash
echo "Copying installer to releases directory..."
mkdir -p releases
cp -f dist/CleanAppNotas-Setup-1.0.0.exe releases/
echo "Done!" 