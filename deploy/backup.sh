#!/bin/sh
# Sauvegarde quotidienne chiffrée de la base (à planifier avec cron, par ex. 3 h du matin) :
#   0 3 * * * cd /opt/kle/deploy && ./backup.sh
# BACKUP_PASSPHRASE doit être défini dans l'environnement ; garder une copie hors du serveur.
set -eu
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE manquant}"
mkdir -p backups
file="backups/kle-$(date +%Y%m%d-%H%M).sql.gz.gpg"
docker compose exec -T postgres pg_dump -U kle kle | gzip | \
  gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase "$BACKUP_PASSPHRASE" -o "$file"
find backups -name 'kle-*.gpg' -mtime +30 -delete
echo "Sauvegarde : $file"
