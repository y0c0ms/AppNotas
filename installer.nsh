!macro customInstall
  ; Add custom installer messages
  MessageBox MB_YESNO "Would you like CleanAppNotas to start automatically when you log in to Windows?" IDYES autostart IDNO skipAutostart
  autostart:
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "CleanAppNotas" "$INSTDIR\${APP_EXECUTABLE_FILENAME} --start-minimized"
  skipAutostart:
  
  ; Create uninstaller registry keys
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CleanAppNotas" "DisplayName" "CleanAppNotas"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CleanAppNotas" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CleanAppNotas" "DisplayIcon" "$INSTDIR\resources\app\public\icon-removebg-preview.png"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CleanAppNotas" "Publisher" "CleanAppNotas"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CleanAppNotas" "DisplayVersion" "${VERSION}"
!macroend

!macro customUnInstall
  ; Remove autostart entry
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "CleanAppNotas"
  
  ; Ask if user wants to keep data
  MessageBox MB_YESNO "Do you want to remove all application data? (Notes and settings)" IDYES removeData IDNO keepData
  removeData:
    RMDir /r "$APPDATA\CleanAppNotas-Data"
    Goto end
  keepData:
    MessageBox MB_OK "Your notes and settings have been preserved. You can find them in: $APPDATA\CleanAppNotas-Data"
  end:
    
  ; Remove uninstaller registry keys
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CleanAppNotas"
!macroend 