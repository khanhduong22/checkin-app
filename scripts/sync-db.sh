#!/bin/bash
set -e

# Neon DB Connection String
NEON_DB_URL="postgresql://neondb_owner:npg_ALj4rNpvPCZ3@ep-orange-dust-a1m4z6so-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Local DB Connection details
LOCAL_DB_USER="kido"
LOCAL_DB_NAME="checkin_db"

echo "=== Starting Database Sync: Neon -> VPS Local DB ==="
echo "Time: $(date)"

# 1. Dump Neon DB from within the checkin-db container
echo "1. Dumping Neon database..."
docker exec checkin-db pg_dump "$NEON_DB_URL" -F c -b -v -f /tmp/neon_dump.dump

# 2. Restore to VPS Local DB
echo "2. Restoring dump to local VPS database..."
# Clean the public schema first to prevent duplicate/key conflicts
docker exec checkin-db psql -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;"
# Restore the database schema and data
docker exec checkin-db pg_restore -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" -v /tmp/neon_dump.dump

# 3. Clean up the dump file
echo "3. Cleaning up..."
docker exec -t checkin-db rm -f /tmp/neon_dump.dump

echo "=== Sync completed successfully! ==="
