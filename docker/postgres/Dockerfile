FROM pgvector/pgvector:pg17

RUN apt-get update && apt-get install -y --no-install-recommends \
    pgbackrest \
    lz4 \
    && rm -rf /var/lib/apt/lists/*

COPY pgbackrest.conf /etc/pgbackrest/pgbackrest.conf
RUN mkdir -p /var/lib/pgbackrest /var/log/pgbackrest \
    && chown -R postgres:postgres /var/lib/pgbackrest /var/log/pgbackrest /etc/pgbackrest \
    && chmod 640 /etc/pgbackrest/pgbackrest.conf
