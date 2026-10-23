#!/usr/bin/env bash
# One-time server set-up for Debian 12 (e.g. a Google Cloud e2-micro VM).
# Installs Node.js 24, Caddy (automatic HTTPS), the app, a systemd service,
# and a daily backup timer. Safe to run again.
#
#   sudo bash setup.sh <admin-email> [domain]
#
# Without a domain, the VM's public IP is used as <ip-with-dashes>.sslip.io,
# which Caddy can get a free HTTPS certificate for.
# Secrets are NOT set here: afterwards run set-smtp-password.sh and
# admin-password.sh, which ask for them without showing them.
set -euo pipefail

ADMIN_EMAIL="${1:?usage: sudo bash setup.sh <admin-email> [domain]}"
REPO="${REPO:-https://github.com/jericwin/KatotoProject.git}"
APP=/opt/katoto
DATA=/var/lib/katoto
BACKUPS=/var/backups/katoto
ENV_FILE=/etc/katoto/katoto.env

if [ -n "${2:-}" ]; then
  DOMAIN="$2"
else
  IP=$(curl -fsS -H 'Metadata-Flavor: Google' \
    http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip)
  DOMAIN="${IP//./-}.sslip.io"
fi
echo "==> Domain: $DOMAIN"

echo "==> Swap (the e2-micro has 1 GB of memory)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Packages and automatic security updates"
apt-get update
apt-get install -y ca-certificates curl gnupg git debian-keyring debian-archive-keyring apt-transport-https unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> Node.js 24"
if ! node -v 2>/dev/null | grep -qE '^v(2[4-9]|[3-9][0-9])\.'; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "==> Caddy"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi

echo "==> App user and code"
id katoto >/dev/null 2>&1 || useradd --system --home-dir "$APP" --shell /usr/sbin/nologin katoto
if [ -d "$APP/.git" ]; then
  git -C "$APP" pull --ff-only
else
  git clone "$REPO" "$APP"
fi
chown -R katoto:katoto "$APP"
sudo -u katoto -H bash -c "cd '$APP' && npm ci --no-audit --no-fund && npm run build && npm prune --omit=dev --no-audit --no-fund"

echo "==> Data, backups, and settings"
install -d -o katoto -g katoto -m 700 "$DATA" "$BACKUPS"
install -d -m 750 /etc/katoto
if [ ! -f "$ENV_FILE" ]; then
  sed -e "s#__DOMAIN__#$DOMAIN#g" -e "s#__ADMIN_EMAIL__#$ADMIN_EMAIL#g" "$APP/deploy/katoto.env.example" > "$ENV_FILE"
fi
chown root:root "$ENV_FILE"
chmod 600 "$ENV_FILE"

echo "==> Services"
install -m 644 "$APP/deploy/katoto.service" "$APP/deploy/katoto-backup.service" "$APP/deploy/katoto-backup.timer" /etc/systemd/system/
sed "s#__DOMAIN__#$DOMAIN#g" "$APP/deploy/Caddyfile" > /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable --now katoto.service katoto-backup.timer
systemctl restart caddy

echo
echo "Done. The site will be at: https://$DOMAIN"
echo "Next (each asks for the secret without showing it):"
echo "  sudo bash $APP/deploy/set-smtp-password.sh   # Gmail App Password"
echo "  sudo bash $APP/deploy/admin-password.sh      # create the admin account"
