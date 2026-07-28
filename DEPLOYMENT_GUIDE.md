# BITVERSE Digital Platform — Deployment & Administrative Guide

Welcome to the **BITVERSE Digital Platform** deployment and administration guide. This document is a complete, step-by-step handbook designed to help non-technical and technical administrators set up, deploy, manage, and maintain the BITVERSE library platform without writing a single line of code.

---

## Part 1: Deployment & Server Configuration

### 1. How to Deploy the Website
BITVERSE is built as a highly optimized, full-stack Node.js (Vite + Express) application. The recommended production environments are **Google Cloud Run** or **Render/Railway**.

#### Method: Google Cloud Run (Recommended)
1. **Prepare the container:** A production-ready `Dockerfile` is included in the project.
2. **Build the container image using Google Cloud Build:**
   ```bash
   gcloud builds submit --tag gcr.io/[PROJECT_ID]/bitverse
   ```
3. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy bitverse \
     --image gcr.io/[PROJECT_ID]/bitverse \
     --platform managed \
     --allow-unauthenticated \
     --port 3000
   ```

#### Method: Cloudflare Pages / Cloudflare Workers
1. **Build the frontend:**
   ```bash
   npm run build
   ```
2. **Deploy to Cloudflare Pages using Wrangler:**
   ```bash
   npx wrangler pages deploy frontend/dist --project-name=bitverse
   ```
   *or run:*
   ```bash
   npm run deploy:cloudflare
   ```
3. **Automatic Configuration Included:**
   - `wrangler.toml` in project root.
   - `frontend/public/_headers` for Cloudflare edge security headers.
   - `frontend/public/_routes.json` for SPA route handling.


---

### 2. How to Connect an Existing Domain
To map your custom domain (e.g., `bitverse.co.in` or `notes.bitmesra.ac.in`):

#### Mapping on Google Cloud Run:
1. Go to the **Cloud Run** page in the Google Cloud Console.
2. Click **Manage Custom Domains**.
3. Click **Add Mapping**. Select your Cloud Run service and enter your domain name (`bitverse.co.in`).
4. **Update DNS Records:** The console will generate a set of `CNAME` or `A/AAAA` records. Add these records in your domain registrar's portal (e.g., GoDaddy, Namecheap, Cloudflare).
5. SSL certificates will be automatically provisioned and renewed by Google for free.

---

### 3. How to Configure Environment Variables
Environment variables control backend configuration. In production, these should be added through your hosting dashboard (Cloud Run Environment tab, Render Environment variables, or a `.env` file).

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `PORT` | Server listening port | `3000` |
| `MONGODB_URI` | Connection URI for the MongoDB database | `mongodb+srv://user:pass@cluster.mongodb.net/bitverse` |
| `JWT_SECRET` | Secret key used to encrypt admin tokens | `a_highly_secure_random_string_xyz123` |
| `ADMIN_EMAIL` | Credentials for Admin Login | `admin@bitverse.co.in` |
| `ADMIN_PASSWORD` | Password for Admin Login | `SecureAdminPass101!` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary integration cloud name (Optional) | `bitverse-cloud` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key for uploads (Optional) | `123456789012345` |
| `CLOUDINARY_API_SECRET`| Cloudinary API Secret for secure upload | `your_secret_key` |

---

### 4. How to Create the Database
BITVERSE stores its structured academic metadata and indexing data in **MongoDB** or standard NoSQL document structures (or compatible server-side storage models).
1. Sign up for a free or paid tier on **MongoDB Atlas** (`mongodb.com`).
2. Click **Create a Database Cluster** and select your cloud provider and region.
3. Under **Database Access**, create a user with read/write permissions. Keep the username and password secure.
4. Under **Network Access**, add `0.0.0.0/30` (or select Allow access from anywhere) to allow Cloud Run to communicate with it.
5. Copy your connection URI (`mongodb+srv://...`) and supply it as the `MONGODB_URI` environment variable.

---

### 5. How to Migrate the Database
The backend is engineered with an **automatic schema initialization engine**. 
- You **do not need to write database tables or schemas manually**.
- When the server starts up for the first time, it automatically reads the canonical first-year subjects lists, creates the collection indices, registers initial credentials, and populates five academic modules per subject immediately.
- To trigger a clean re-migration, simply clear the `subjects` collection in your database, restart the server, and the seed sequence will safely repopulate.

---

## Part 2: Content Management from the Admin Dashboard

Access your administrator dashboard securely by logging in with your `ADMIN_EMAIL` and `ADMIN_PASSWORD` at the `/admin` page of your website.

---

### 6. How to Upload PDFs from the Admin Dashboard
The file upload interface supports standard **drag-and-drop** and manual selection.

#### To upload high-quality small documents (under 100MB):
1. Navigate to the **Notes**, **Tutorials**, or **PYQs** tab.
2. Use the "File Upload" box to drag and drop or browse for your PDF.
3. Enter an optional **Display Name** to clean up the filename for students.
4. Click **Upload Resource**.

#### To host extremely large books/materials (up to 2GB):
1. Upload the heavy file to **Google Drive**, **Dropbox**, **Cloudinary**, or **OneDrive**.
2. Make sure the file is shared as "Anyone with link can view" and obtain the **direct download link**.
3. Under the file upload form on the BITVERSE Dashboard, look for the **— OR — Direct File URL** input box.
4. Paste the direct file link, specify the estimated file size (e.g. `2000` for 2GB), and click **Upload**.
5. The resource is immediately recorded with its real-world metadata and will redirect seamlessly when students click "Download" or "Preview"!

---

### 7. How to Add a New Semester
By default, BITVERSE is optimized for the two standard first-year semesters (Semester 1 and Semester 2). 
To add custom semester classifications:
1. Semesters are handled dynamically as categories under the **Subjects & Modules** management section.
2. When creating a new subject, simply specify the target Semester integer (e.g., `1` or `2`). The system will dynamically compile and display tabs for students accordingly.

---

### 8. How to Add a New Subject
1. Click the **Subjects & Modules** tab in your Admin Dashboard.
2. Under **Add Subject**, enter the complete subject name (e.g., *Engineering Mathematics-I*).
3. Select the Semester (Semester 1 or Semester 2).
4. Enter the academic credits assigned to this subject (e.g. `4`).
5. Click **Add Subject**. It will instantly appear on both the home dashboard and subjects list.

---

### 9. How to Set Subject Credits
1. Under **Subjects & Modules**, scroll to the **Edit / Delete Subjects** list.
2. Locate the subject you want to modify and click the **Edit** (pencil) icon.
3. Update the **Credits** input box to the correct value (e.g. `3` or `1.5` credits).
4. Click **Save**. The updated credit rating will automatically reflect on all student search result rows and subject page cards.

---

### 10. How to Create Modules
1. Click the **Subjects & Modules** tab.
2. Locate the **Add Module** section.
3. Select the parent subject from the drop-down menu.
4. Enter the module's designation/title (e.g., *Module 6: Laplace Transforms*).
5. Click **Add Module**. This allows unlimited custom modules for complex or specialized curriculums.

---

### 11. How to Upload Notes
1. Click the **Notes** tab.
2. Select the **Subject** from the drop-down list.
3. Select the specific **Module** you want to associate the notes with.
4. Drop your file or supply an external link.
5. Click **Upload**. Students browsing that module will immediately see the file under their module folders.

---

### 12. How to Replace Existing PDFs
If a professor updates a syllabus or notes pack, you can swap the document without deleting and recreating its entry (retaining all search indexing & download stats!):
1. Go to the relevant file tab (e.g., **Notes** or **PYQs**).
2. On the right-hand panel, find the file under **Uploaded Files**.
3. Click the **Upload** (arrow-up icon) next to the download link.
4. Select the new PDF. The file is automatically replaced in background storage and the metadata is refreshed.

---

### 13. How to Delete PDFs
1. Locate the file in the files list under the corresponding content tab.
2. Click the **Trash** (red) button next to the file.
3. Confirm the delete prompt. The file will be marked deleted and immediately removed from the student-facing search index and browse menus.

---

### 14. How to Publish Announcements
1. Select the **Announcements** tab in the dashboard.
2. Enter an attractive, concise **Title** (e.g., *Mid-Sem Exams Schedule released!*).
3. Type the detail message under **Content**.
4. Click **Post Announcement**. The notice will immediately light up on the student homepage and announcements dashboard.

---

## Part 3: System Maintenance & Advanced Procedures

---

### 15. How to Maintain the Website After Deployment
- **Review Stats Tab weekly:** Access the **Dashboard** and **Analytics** tabs to monitor your Total Storage, active resources count, and the "Subject Engagement Scoreboard" to see what topics students are studying most.
- **Run Regular Key Rotations:** Change the `ADMIN_PASSWORD` in your cloud config environment variable once every semester to ensure authorization credentials remain secure.

---

### 16. How to Back Up the Database and Uploaded Files
1. **Database Backup (MongoDB Atlas):**
   - In Atlas, go to your cluster and select the **Backup** tab.
   - Configure a regular snapshot schedule (daily or weekly is standard).
   - You can also manually download a database dump using the standard tools:
     ```bash
     mongodump --uri="your_mongodb_uri" --out="./backup-folder"
     ```
2. **Local Uploads Backup:**
   - If using local storage, back up the `./uploads` directory regularly using cron scripts or standard ZIP tools.

---

### 17. How to Restore Backups
1. **Restore Database:**
   - Use Atlas's "Restore Snapshot" UI to roll back to any historical date.
   - Or restore manually using:
     ```bash
     mongorestore --uri="your_mongodb_uri" "./backup-folder"
     ```
2. **Restore Files:**
   - Replace the `./uploads` folder in your server structure with your backed-up folder.

---

### 18. How to Update the Website with New Features
1. Pull the repository onto your workspace or editor.
2. Implement your frontend/backend code updates.
3. Test locally using `npm run dev`.
4. Rebuild the bundle:
   ```bash
   npm run build
   ```
5. Commit and push the changes to trigger a rolling update on Cloud Run (zero downtime).

---
*Created with care for the students and admin curators of BIT Mesra.*
