#!/usr/bin/env bash
# Creates the admin account, or resets its password (this also unlocks it and
# signs out every session). Asks for the password without showing it.
#   sudo bash admin-password.sh
set -euo pipefail
set -a
# shellcheck disable=SC1091
. /etc/katoto/katoto.env
set +a
cd /opt/katoto
exec sudo -E -u katoto node scripts/set-admin-password.js
