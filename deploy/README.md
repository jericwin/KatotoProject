# Deploying on a Google Cloud e2-micro (Always Free)

1. **Create the VM** (Compute Engine → VM instances → Create): machine type **e2-micro**, region **us-west1, us-central1 or us-east1** (only these are free), boot disk **Debian 12, 30 GB standard persistent disk**, and tick **Allow HTTP traffic** and **Allow HTTPS traffic**. Use the default ephemeral external IP (a reserved static IP is billed when not attached).
2. **Open SSH** (the SSH button next to the VM) and run:
   ```bash
   curl -fsSLO https://raw.githubusercontent.com/jericwin/KatotoProject/main/deploy/setup.sh
   sudo bash setup.sh <admin-email>            # or: sudo bash setup.sh <admin-email> <your-domain>
   ```
   Without a domain, the site gets `https://<ip-with-dashes>.sslip.io` with a free certificate.
3. **Add the secrets on the server** (each prompt hides what you type; nothing goes to GitHub):
   ```bash
   sudo bash /opt/katoto/deploy/set-smtp-password.sh   # a NEW Gmail App Password
   sudo bash /opt/katoto/deploy/admin-password.sh      # creates the admin account
   ```
4. Open the site, sign in at `/admin/login`, and check *Account & security*.

**Updating later:** push to GitHub, then on the VM: `sudo bash /opt/katoto/deploy/update.sh` (backs up first).

| Where | What |
|---|---|
| `/opt/katoto` | Code (read-only for the app) |
| `/etc/katoto/katoto.env` | Settings and secrets (root, mode 600) |
| `/var/lib/katoto` | Database, photos, FOI documents |
| `/var/backups/katoto` | Daily backups (02:30), newest 14 kept |
| `journalctl -u katoto` | Server log |

The VM's backups are on the same disk. Copy them elsewhere now and then (e.g. download them), or they're lost if the VM is deleted.
