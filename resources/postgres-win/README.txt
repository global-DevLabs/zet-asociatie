Bundled PostgreSQL for Windows (first-run install)
=================================================

To enable automatic Postgres install on first app launch:

1. Download PostgreSQL 17 Windows x64 (zip or binaries):
   https://www.postgresql.org/download/windows/
   Or: https://get.enterprise-db.com/postgresql/postgresql-17.x-x-windows-x64-binaries.zip

2. Extract so that this folder contains:
   bin\initdb.exe
   bin\postgres.exe
   bin\psql.exe  (optional)
   lib\
   share\

3. Rebuild the Electron app: npm run electron:build

If this folder only contains this README, the app will still build and run but
will not install Postgres automatically; set POSTGRES_BIN and POSTGRES_DATA_DIR
manually or use an existing Postgres installation.
