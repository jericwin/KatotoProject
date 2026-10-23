#!/usr/bin/env bash
# Stores the Gmail App Password in /etc/katoto/katoto.env without showing it,
# then restarts the site.   sudo bash set-smtp-password.sh
set -euo pipefail
ENV_FILE=/etc/katoto/katoto.env
read -r -s -p "Gmail App Password (16 letters; input is hidden): " PASS
echo
PASS="${PASS// /}"
if [ ${#PASS} -lt 16 ]; then
  echo "That doesn't look like a 16-letter App Password. Nothing was changed."
  exit 1
fi
tmp=$(mktemp)
grep -v '^SMTP_PASS=' "$ENV_FILE" > "$tmp"
printf 'SMTP_PASS=%s\n' "$PASS" >> "$tmp"
install -o root -g root -m 600 "$tmp" "$ENV_FILE"
rm -f "$tmp"
unset PASS
systemctl restart katoto
echo "Saved. The site was restarted."
