#!/bin/bash

# Used to open vscode of a fixed size for screenshots for
# Apio IDE docs. 

# Require security settings to allow changing the windows size.
# In Settings / Privacy and Security, allow 'Terminal' to 
# 'control your computer'.

# Launch VS Code in a new window (empty workspace)
open -n -a "Visual Studio Code"

# Wait for the window to appear
sleep 1

# Resize and position the front window
# Adjust {width, height} and {x, y} as needed (pixels)
osascript <<EOF
tell application "System Events"
    tell process "Code"
        if exists window 1 then
            set size of window 1 to {900, 650}
            set position of window 1 to {0, 0}
        end if
    end tell
end tell
EOF

