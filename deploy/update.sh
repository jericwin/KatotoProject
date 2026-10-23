#!/usr/bin/env bash
# Deploys the latest code from GitHub: backup, pull, build, restart.
#   sudo bash /opt/katoto/deploy/update.sh
set -euo pipefail
APP=/opt/katoto
systemctl start katoto-backup.service
git -C "$APP" pull --ff-only
chown -R katoto:katoto "$APP"
sudo -u katoto -H bash -c "cd '$APP' && npm ci --no-audit --no-fund && npm run build && npm prune --omit=dev --no-audit --no-fund"
install -m 644 "$APP/deploy/katoto.service" "$APP/deploy/katoto-backup.service" "$APP/deploy/katoto-backup.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl restart katoto
echo "Updated and restarted."
