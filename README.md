# College Bus Website

The website uses a Node.js server and a local SQLite database. Bus routes entered in the admin panel are stored in `data/buses.sqlite`; authenticated students can search routes, and admins can view all saved bus details, edit existing routes, and delete routes from the admin list.

## Run locally

1. Install Node.js 22.13 or newer.
2. In this folder, run `npm start`.
3. Open `http://localhost:3000` for the student website or `http://localhost:3000/admin.html` for the admin panel.
4. The initial admin password is `admin123`. For a custom password, set `ADMIN_PASSWORD` before starting the server.

## Student login

Students can create an account on the student website using their name, college roll number, and a password of at least 8 characters. They must log in to search bus routes. Student accounts are stored in the SQLite database with salted password hashes, and the login session expires after 8 hours. Roll numbers are case-insensitive.

Self-registration does not verify that a roll number belongs to an enrolled student. For a public deployment, add an institution-controlled verification or account-provisioning process before relying on student login to restrict access.

In PowerShell, you can set a password for the current terminal like this:

```powershell
$env:ADMIN_PASSWORD = "choose-a-strong-password"
npm start
```

## Deploy free on Render

1. Push this repository to GitHub.
2. In Render, choose **New + → Blueprint**, connect the repository, and deploy. Render reads `render.yaml`, creates a free web service, and generates a private `ADMIN_PASSWORD`.
3. Open the service's **Environment** settings to view or change `ADMIN_PASSWORD`. Use the deployed site's `/admin.html` page to manage bus routes. Students can register at the main page.

The `/healthz` endpoint is used by Render to check that the service is running. The app serves its frontend and API from the same Node.js service, so no separate static-site setup or CORS configuration is needed.

### Free-tier data storage

The app's SQLite database is stored on the service's local filesystem. Render's free web service has an ephemeral filesystem: routes and student accounts can be lost when the service is redeployed or its instance is replaced. The app works for a demo, but do not rely on free-tier SQLite for durable data. For persistence, either change the app to use an external database or use a hosting plan with a persistent disk. For a Render disk mounted at `/var/data`, set `DATABASE_PATH` to `/var/data/buses.sqlite`. Keep database credentials in Render environment variables, never in source control.

The database file is created automatically and is excluded from source control. Back it up when running locally. Production startup refuses to use the default admin password.
