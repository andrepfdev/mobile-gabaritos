#!/usr/bin/env bash
# Release build (archive + optional .ipa export) for iOS.
# Only runs on macOS — Xcode/xcodebuild aren't available anywhere else.
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "error: iOS release build requires macOS (Xcode/xcodebuild)." >&2
  exit 1
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ios="$root/ios"
scheme="ProvaZero"
export_options="$ios/ExportOptions.plist"

cd "$ios"

if [ ! -d Pods ] || [ Podfile -nt Podfile.lock ]; then
  echo 'pod install ...'
  pod install
fi

echo 'Removing stale build ...'
rm -rf build

workspace="$ios/${scheme}.xcworkspace"
if [ ! -d "$workspace" ]; then
  echo "error: $workspace not found (pod install should have generated it)." >&2
  exit 1
fi

echo 'archive ...'
xcodebuild archive \
  -workspace "$workspace" \
  -scheme "$scheme" \
  -configuration Release \
  -archivePath "$ios/build/${scheme}.xcarchive" \
  -allowProvisioningUpdates \
  -destination 'generic/platform=iOS'

archive="$ios/build/${scheme}.xcarchive"
echo "Archive: $archive"

if [ -f "$export_options" ]; then
  echo 'exportArchive ...'
  xcodebuild -exportArchive \
    -archivePath "$archive" \
    -exportPath "$ios/build" \
    -exportOptionsPlist "$export_options" \
    -allowProvisioningUpdates

  ipa="$(find "$ios/build" -maxdepth 1 -name '*.ipa' | head -n1)"
  echo "IPA: $ipa"
  [ -n "$ipa" ] && ls -lh "$ipa"
else
  cat <<EOF

No $export_options found — skipping .ipa export.
The signed .xcarchive above is ready; to produce an .ipa create
ios/ExportOptions.plist (method: app-store | ad-hoc | development, teamID: ...)
and re-run this script, or export manually from Xcode Organizer.
EOF
fi
