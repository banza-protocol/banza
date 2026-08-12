#!/usr/bin/env bash
# BANZA dedicated VM — Phase 1 bootstrap (hardening + structure).
# Run AS ROOT on a FRESH Ubuntu 24.04 VM (BANZA/BanzAI only).
# Idempotent where possible. NO DNS cutover here. NO operator logic.
set -euo pipefail

### ── 0. Parameters (edit before running) ─────────────────────────────────────
BANZA_USER="banza"                       # non-root sudo service user
SSH_PUBKEY_FILE="${SSH_PUBKEY_FILE:-/root/.ssh/authorized_keys}"  # keys to copy to $BANZA_USER
SWAP_GB=4
SRV="/srv/banza-protocol"

echo "== BANZA VM bootstrap =="

### ── 1. Base packages ────────────────────────────────────────────────────────
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg ufw fail2ban unattended-upgrades \
  git age postgresql-client jq

### ── 2. Service user (sudo, key-based) ───────────────────────────────────────
if ! id "$BANZA_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$BANZA_USER"
  usermod -aG sudo "$BANZA_USER"
fi
install -d -m 700 -o "$BANZA_USER" -g "$BANZA_USER" "/home/$BANZA_USER/.ssh"
if [ -f "$SSH_PUBKEY_FILE" ]; then
  install -m 600 -o "$BANZA_USER" -g "$BANZA_USER" "$SSH_PUBKEY_FILE" "/home/$BANZA_USER/.ssh/authorized_keys"
fi
# passwordless sudo optional; keep password-sudo by default (safer). Uncomment if desired:
# echo "$BANZA_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-banza

### ── 3. SSH hardening ────────────────────────────────────────────────────────
install -d -m 755 /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/10-banza-hardening.conf <<'SSHCONF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PubkeyAuthentication yes
X11Forwarding no
AllowTcpForwarding no
MaxAuthTries 3
LoginGraceTime 30
SSHCONF
# WARNING: verify key login for $BANZA_USER works BEFORE relying on this.
sshd -t && systemctl reload ssh

### ── 4. Firewall (only what's needed) ────────────────────────────────────────
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp        # SSH
ufw allow 80/tcp        # HTTP (redirect)
ufw allow 443/tcp       # HTTPS
ufw --force enable
# NOTE: PostgreSQL 5432 is NEVER opened — Docker-internal network only.

### ── 5. Swap (4 GB) ──────────────────────────────────────────────────────────
if ! swapon --show | grep -q .; then
  fallocate -l "${SWAP_GB}G" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10
  grep -q 'vm.swappiness' /etc/sysctl.d/99-banza.conf 2>/dev/null || echo 'vm.swappiness=10' > /etc/sysctl.d/99-banza.conf
fi

### ── 6. fail2ban + unattended-upgrades ──────────────────────────────────────
systemctl enable --now fail2ban
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'AU'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
AU

### ── 7. Docker Engine + Compose plugin ──────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  usermod -aG docker "$BANZA_USER"
  systemctl enable --now docker
fi

### ── 8. Directory structure (owned by $BANZA_USER) ──────────────────────────
install -d -o "$BANZA_USER" -g "$BANZA_USER" \
  "$SRV" "$SRV/nginx/conf.d" "$SRV/nginx/certs" \
  "$SRV/website" "$SRV/banzai" "$SRV/verification-api" \
  "$SRV/postgres/data" "$SRV/postgres/init" \
  "$SRV/artifacts/manifests" "$SRV/artifacts/evidence" \
  "$SRV/backups" "$SRV/logs"
chmod 700 "$SRV/nginx/certs" "$SRV/backups"

echo "== bootstrap done =="
echo "NEXT: (1) copy compose.yml, nginx/conf.d/banza.conf, postgres/init/*.sql, .env into $SRV"
echo "      (2) place Cloudflare Origin Cert in $SRV/nginx/certs/ (origin.pem/.key, chmod 600)"
echo "      (3) as $BANZA_USER: cd $SRV && docker compose up -d"
echo "      (4) validate origin locally BEFORE any DNS cutover."
