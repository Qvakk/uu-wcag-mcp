#!/bin/sh
# Chrome wrapper to handle crash reporter issues
export CHROME_FLAGS="$CHROME_FLAGS --crash-dumps-dir=/tmp/chromium"
exec /usr/bin/google-chrome-stable "$@"
