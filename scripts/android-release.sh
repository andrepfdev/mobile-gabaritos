#!/usr/bin/env bash
# Safe release APK build — avoids broken `gradlew clean` (CMake/codegen chicken-and-egg).
# Linux/macOS counterpart of android-release.ps1.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
android="$root/android"

cd "$android"
export NODE_ENV=production

for p in app/.cxx app/build build; do
  full="$android/$p"
  if [ -e "$full" ]; then
    echo "Removing $p ..."
    rm -rf "$full"
  fi
done

echo 'assembleRelease ...'
chmod +x ./gradlew
./gradlew assembleRelease --no-daemon

apk="$android/app/build/outputs/apk/release/app-release.apk"
echo "APK: $apk"
ls -lh "$apk"
