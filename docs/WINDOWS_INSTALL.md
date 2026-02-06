# New install on Windows

Follow these steps to set up **Admin Membri** on a Windows PC from scratch.

---

## 1. Install PostgreSQL 17

1. Download **PostgreSQL 17** for Windows (x64):  
   [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/) or [EnterpriseDB](https://www.enterprise-db.com/downloads/postgres-postgresql-downloads).
2. Run the installer.
3. During setup, set and remember the **postgres** user password (e.g. `Zet2026`).
4. Keep the default port **5432** unless you need another.
5. Finish the installation. PostgreSQL will run as a Windows service.

---

## 2. Install Visual C++ Redistributable (x64)

The app needs the **Microsoft Visual C++ Redistributable** to run.

1. Download **VC_redist.x64.exe**:  
   [https://aka.ms/vs/17/release/vc_redist.x64.exe](https://aka.ms/vs/17/release/vc_redist.x64.exe)  
   (or use the copy included in the app’s `resources/RebuilderC/` folder if you have it.)
2. Run the installer and complete the setup.

---

## 3. Set database environment and details

Before the **first run** of Admin Membri, tell the app how to connect to your PostgreSQL.

**Connection URL format:**  
`postgres://postgres:YOUR_PASSWORD@127.0.0.1:5432/postgres`

Replace `YOUR_PASSWORD` with the postgres password you set in step 1. If you use another user, host, or port, change those in the URL.

**How to set it on Windows:**

- **Option A – System environment (permanent)**  
  1. Press **Win + R**, type `sysdm.cpl`, press Enter.  
  2. Go to **Advanced** → **Environment Variables**.  
  3. Under **User variables** (or **System variables**), click **New**.  
  4. Variable name: `LOCAL_DB_URL`  
  5. Variable value: `postgres://postgres:Zet2026@127.0.0.1:5432/postgres` (use your password).  
  6. OK out. Restart the app (or log off and back on) so it sees the variable.

- **Option B – Batch file (per run)**  
  Create a text file, e.g. `Start Admin Membri.bat`, with:
  ```bat
  set LOCAL_DB_URL=postgres://postgres:Zet2026@127.0.0.1:5432/postgres
  "C:\Program Files\Admin Membri\Admin Membri.exe"
  ```
  Replace the path if you installed the app elsewhere. Save, then double‑click the `.bat` file to start the app.

On first launch, the app will create the database `zet_asociatie`, the role `zet_app`, run migrations, and save config to `%APPDATA%\Admin Membri\`. After that you can start the app normally; you only need `LOCAL_DB_URL` for the first run (or after deleting the config).

---

## 4. Install the app

1. Get the Windows installer (e.g. `Admin Membri Setup x.x.x.exe`) from your admin or build pipeline.
2. Run the installer.
3. Follow the steps (choose install location if needed, then finish).
4. Do **not** run the app as Administrator (right‑click → “Run as administrator”). Use a normal user account.

---

## 5. Run the app

1. Start **Admin Membri** from the Start Menu or desktop shortcut (or your `.bat` file if you use Option B above).
2. Wait a few seconds for the window to load. If the window is blank, wait 10–15 seconds and press **Ctrl + R** to refresh, or open a browser and go to **http://localhost:3000**.
3. On first run you will be sent to **Setup**. Create the first admin account (email + password).
4. Log in and use the app.

**If the app closes immediately:** open `%APPDATA%\Admin Membri\debug.log` in Notepad to see the error.  
**More help:** see `electron/README-electron.md` (troubleshooting, external Postgres, NSIS, etc.).
