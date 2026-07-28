# BITVERSE — Full-Stack Technical Architectural Blueprint & Deep Study Reference
**A Complete Guide to Code, Databases, Workflows, and Technologies Used in the Digital Library Platform for BIT Mesra**

---

## 1. Executive Summary & Core Purpose
**BITVERSE** is a high-performance, single-instance digital notes library and study resource portal designed specifically for First-Year engineering students at the **Birla Institute of Technology (BIT) Mesra, Ranchi**. 
The application solves the friction of finding syllabus-accurate study materials, semester-wise textbooks, previous year examination papers (PYQs), and announcements. It is constructed to be exceptionally fast, secure, beautiful, and completely offline-resilient through local server storage matched with modern cloud database fallback strategies.

---

## 2. Core Technology Stack & Programming Languages

### Front-End System (Client-Side)
- **Language**: JavaScript (ES6+), JSX
- **Framework**: **React (v18.3.1)**
  - Configured with `craco` (Create React App Configuration Override) to provide customized path mapping alias `@/` pointing directly to the `/frontend/src/` directory.
- **Routing**: **React Router DOM (v7.15.0)**
  - Implements dynamic declarative browser routing, page transitions, parameter extraction (e.g., `:subjectId`, `:moduleId`), and clean global scrolling lifecycle handlers (`ScrollToTop`).
- **Styling & UI Components**:
  - **Tailwind CSS (v3.4.17)**: Fully utility-first layout styling.
  - **Framer Motion (v11.18.0)**: Used for modern, hardware-accelerated animations (e.g., hover scaling, slide-in drawers, bento grid layout pop-ins).
  - **Lucide React**: For unified vector iconography.
  - **Radix UI Primitive foundations** (via shadcn/ui custom components): Provides accessible structural elements (accordions, select dropdowns, modals, and tables).
- **State & Data Fetching**:
  - **Axios (v1.16.0)**: Centralized HTTP client configured with a global base URL `/api` and automatic local token extraction headers for seamless session persistence.

### Back-End System (Server-Side)
- **Language**: JavaScript (ES modules, `"type": "module"`)
- **Runtime**: **Node.js (v18+)**
- **Web Server Framework**: **Express (v4.19.2)**
  - Manages RESTful API routing, cross-origin resource sharing (`cors`), JSON body parsing, URL encoding, static assets hosting, and error-handling middleware.
- **Authentication & Security**:
  - **JSON Web Tokens (`jsonwebtoken` v9.0.2)**: Stateless session management using securely signed bearer tokens.
  - **Bcrypt.js (v2.4.3)**: Strong cryptographic hashing function used to secure administrator credentials.

### Database & Persistence
- **Engine**: **MongoDB (v6.5.0 Native Driver)**
  - Configured to run on MongoDB Atlas (or local instances) using optimized indexing rules for lightning-fast retrieval of nested records.
- **High-Resilience Binary Storage (Self-Healing Storage)**:
  - Express uses `multer` to handle files upload.
  - To survive serverless container scaling resets (such as Cloud Run where local disk storage `/uploads` is wiped upon reboot), files under **15MB** are automatically compiled into a **base64 binary string (`file_data_b64`)** and saved directly inside the MongoDB collection document.
  - When a file request comes, the server checks the local `/uploads` directory first. If missing, it immediately reconstructs the file buffer from the MongoDB document, streams it inline with accurate MIME headers, and rewrites it to local disk — creating an automatically self-healing, durable, zero-data-loss hybrid storage engine.

---

## 3. Directory & File Structure Map

```text
bitverse-root/
│
├── server.js                 # Unified Express Backend Server (API routes, authentication, file storage & streaming)
├── db.js                     # Centralized MongoDB Client configuration, initialization & custom DB service abstraction
├── package.json              # Root workspace manifest containing shared dependencies and compilation commands
├── .env.example              # Blueprint documenting required environment variables (MONGODB_URI, JWT_SECRET, etc.)
│
├── frontend/                 # Client React Application Workspace
│   ├── package.json          # React package metadata, scripts, and dependencies list
│   ├── tailwind.config.js    # Custom brand color definitions, grid settings, and aesthetic extensions
│   ├── craco.config.js       # Webpack override to establish absolute import aliases (@/*)
│   │
│   ├── public/               # Static assets & public access entrypoint
│   │   ├── assets/           # Local core graphics (e.g., logos, developer avatar images)
│   │   ├── index.html        # HTML shell
│   │   └── architecture-guide.html # Gorgeous, printable paper-styled HTML blueprint reference page
│   │
│   └── src/                  # React Application Source Code
│       ├── App.css           # Global custom styled patterns, grain backgrounds, and scrollbars
│       ├── App.js            # Router Core mapping paths to visual Page screens and gating admin routes
│       ├── index.css         # Import configurations for Tailwind CSS utilities, base, and components
│       ├── index.js          # React bootloader and context setup
│       │
│       ├── lib/              # Core API clients and security abstractions
│       │   ├── api.js        # Global Axios instance setup and static media asset pathways
│       │   ├── auth.jsx      # React Context Provider managing login sessions, verify-token, and logout
│       │   └── utils.js      # CSS class concatenation helpers (clsx + tailwind-merge)
│       │
│       ├── components/       # Reusable, high-fidelity React UI elements
│       │   ├── Navbar.jsx    # Top header displaying branding, core navigation, and Admin status
│       │   ├── Footer.jsx    # Footer featuring system-wide quick links, developer credits, and social icons
│       │   ├── FileCard.jsx  # Reusable card for study resources, tracking download counts and rendering type icons
│       │   ├── MobileNav.jsx # Fixed bottom rail optimized for hand-held mobile layout interaction
│       │   ├── DocumentViewer.jsx # Modular panel displaying text/markdown and embedded documents
│       │   └── Backdrop.jsx  # Glowing cosmic background mesh circles with dynamic glassmorphic blurring
│       │
│       └── pages/            # View components corresponding to React Router pathways
│           ├── Home.jsx      # Homepage presenting carousel slideshows, notices, and quick-access semester grids
│           ├── NotesHub.jsx  # Primary search engine page allowing instant, subject-wide study notes filtering
│           ├── PYQsHub.jsx   # Grid allowing students to discover Previous Year Questions filtered by Year/Branch
│           ├── Syllabus.jsx  # Interactive view showing BIT Mesra-approved course syllabi and suggested textbooks
│           ├── Viewer.jsx    # Visual workspace displaying content, reading stats, and opening/downloading files
│           ├── BstExplorer.jsx # Premium interactive Binary Search Tree algorithm simulator (DS coursework utility)
│           ├── About.jsx     # Meet-the-developers page summarizing project goals, tech stack, and background
│           ├── AdminLogin.jsx# Secure credentials submission form for administrator panel authorization
│           └── Admin.jsx     # Master database dashboard implementing full CRUD controls for content
```

---

## 4. Database Schema Design (MongoDB Document Mapping)

### A. Collection: `users`
Saves administrator records.
```json
{
  "_id": "ObjectId",
  "id": "String (UUID)",
  "email": "String (Unique, Normalized)",
  "password": "String (Bcrypt Hashed)",
  "name": "String",
  "role": "String ('admin')",
  "created_at": "String (ISO Date)"
}
```

### B. Collection: `subjects`
Represents individual subjects in the engineering curriculum.
```json
{
  "_id": "ObjectId",
  "id": "String (UUID)",
  "name": "String (e.g. 'Environmental Science')",
  "slug": "String (e.g. 'environmental-science')",
  "semester": "Number (1 to 8)",
  "description": "String",
  "cover_image": "String (URL)",
  "created_at": "String (ISO Date)"
}
```

### C. Collection: `modules`
Chapters or distinct modules belonging to a specific subject.
```json
{
  "_id": "ObjectId",
  "id": "String (UUID)",
  "subject_id": "String (UUID)",
  "name": "String (e.g. 'Module 1: Ecosystems')",
  "order": "Number (used for sorting sequences)",
  "created_at": "String (ISO Date)"
}
```

### D. Collection: `files`
The core resource collection representing study materials, slides, books, or PYQs.
```json
{
  "_id": "ObjectId",
  "id": "String (UUID)",
  "display_name": "String (e.g. 'Environmental Chemistry Notes')",
  "original_filename": "String (e.g. 'Module_1_Chemistry.pdf')",
  "subject_id": "String (UUID)",
  "module_id": "String (UUID, Nullable)",
  "subject_name": "String",
  "module_name": "String (Nullable)",
  "category": "String ('notes' | 'pyq' | 'syllabus' | 'book')",
  "pyq_type": "String ('mid-sem' | 'end-sem' | Nullable)",
  "mime_type": "String (e.g. 'application/pdf')",
  "url": "String (e.g. '/api/uploads/1783680708944-Module_1_Chemistry.pdf')",
  "size": "Number (Bytes)",
  "download_count": "Number (Default: 0)",
  "view_count": "Number (Default: 0)",
  "file_data_b64": "String (Base64 encoded binary data fallback - under 15MB)",
  "is_deleted": "Boolean (Default: false)",
  "created_at": "String (ISO Date)"
}
```

### E. Collection: `announcements`
Noticeboard notifications pinned to the main page.
```json
{
  "_id": "ObjectId",
  "id": "String (UUID)",
  "title": "String",
  "content": "String (Markdown/Rich Text support)",
  "type": "String ('info' | 'important' | 'alert')",
  "link": "String (Optional reference URL)",
  "created_at": "String (ISO Date)"
}
```

### F. Collection: `homepage_slides`
Dynamic slideshow images managed by the administrator.
```json
{
  "_id": "ObjectId",
  "id": "String (UUID)",
  "image_url": "String (Direct URL)",
  "title": "String",
  "subtitle": "String",
  "link": "String (Optional redirection route)",
  "order": "Number"
}
```

---

## 5. Back-End API Routing Architecture (`server.js`)

The Express application maps routes under the `/api` route group:

| Endpoint | Method | Middleware | Description |
|---|---|---|---|
| `/api/auth/register` | `POST` | *None (Init)* | Creates an initial root admin account if no accounts exist. |
| `/api/auth/login` | `POST` | *None* | Validates password via `bcrypt` and signs JWT session tokens. |
| `/api/auth/me` | `GET` | `requireAdmin` | Returns authorized user details to verify state on page load. |
| `/api/subjects` | `GET` | *None* | Fetches active subjects. Cache-enabled to reduce database queries. |
| `/api/subjects` | `POST` | `requireAdmin` | Adds new subjects (supports multi-part forms via `multer`). |
| `/api/subjects/:id` | `PATCH` | `requireAdmin` | Updates subject title, cover image, and metadata. |
| `/api/subjects/:id` | `DELETE` | `requireAdmin` | Soft deletes or drops a subject and cascades deletion. |
| `/api/modules` | `POST` | `requireAdmin` | Adds a module chapter linked to a parent subject ID. |
| `/api/files` | `GET` | *None* | Lists study files (notes, PYQs, syllabi) with query filtering parameters. |
| `/api/files` | `POST` | `requireAdmin` | Uploads files. High-resilience binary parsing saves to database. |
| `/api/files/:id` | `DELETE` | `requireAdmin` | Marks files as deleted (`is_deleted: true`). |
| `/api/files/:id/view` | `GET` | *None* | Tracks view analytics and streams binary data inline (`Content-Disposition: inline`). |
| `/api/files/:id/download` | `GET` | *None* | Increments downloads and sends file as an attachment (`Content-Disposition: attachment`). |
| `/api/uploads/:filename`| `GET` | *None* | Handles file retrieval, falling back to db database binary reconstruction. |

---

## 6. Critical Operational Workflows & Features

### A. Dynamic File Streaming & Binary Database Fallback
When a student opens a PDF study resource or triggers a download, the backend performs this operation:
1. It queries MongoDB for the file metadata based on the `id` property.
2. If the local `/uploads/` file matches and is physically present on disk, it streams it directly.
3. If the server is restarted (ephemeral stateless disk storage reset):
   - The stream checks if `file.file_data_b64` exists in MongoDB.
   - It decodes the base64 string back to a binary Buffer: `Buffer.from(file.file_data_b64, "base64")`.
   - It sets appropriate HTTP header properties (`Content-Type`, `Content-Disposition`, `Content-Length`).
   - It streams the decoded buffer directly to the user's browser, preventing "404 Not Found" failures.

### B. High-Fidelity PDF Viewer Page (`Viewer.jsx`)
- Integrates both direct native-browser PDF rendering for a clean reading experience and an inline viewing frame for other files.
- Provides real-time view counts, file size descriptions, direct download actions, and fullscreen capability.

### C. Search Engine with Fuzzy Filter (`NotesHub.jsx`)
- The search page handles deep client-side queries across subjects, modules, files, and resources.
- Filters results based on key parameters such as Semesters (1st, 2nd, etc.), branches, and category types.

### D. Interactive Binary Search Tree (BST) Visualizer (`BstExplorer.jsx`)
- Tailored for First-Year Data Structures students.
- Allows students to type in numbers, click "Insert", and see a custom canvas-rendered SVG Binary Search Tree animate in real-time.
- Shows dynamic traversal routes: **Preorder**, **Inorder**, and **Postorder** tree nodes, making abstract computer science concepts fully concrete.

---

## 7. Setup & Build Requirements (Step-by-Step Production Setup)

To recreate, build, and deploy the **BITVERSE** digital library system from scratch, the following components are required:

### 1. System Requirements
- **Node.js**: Version 18.0.0 or higher.
- **npm**: Version 9.0.0 or higher.
- **MongoDB**: A running MongoDB instance (either local Community Edition or cloud-hosted MongoDB Atlas Cluster).

### 2. Environment Configuration (`.env` file)
Create a `.env` file at the root folder containing:
```env
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/bitverse
JWT_SECRET=super_secure_cryptographic_key_here
ADMIN_EMAIL=admin@bitverse.co
ADMIN_PASSWORD=secure_admin_password
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 3. Installation & Preparation
Install packages across all workspaces by executing:
```bash
npm install
```

### 4. Compiling the React Production Build
Compile the frontend code into optimized, high-speed static assets:
```bash
npm run build
```
This output is saved to the `/frontend/build` folder, which is then mapped automatically as static server-side files in `server.js` using `express.static()`.

### 5. Running the Application
Launch the server:
- For development: `npm run dev`
- For production: `npm start`
The platform will start and can be accessed at `http://localhost:3000`.

---
*Document compiled on Friday, July 10, 2026. Tailored specifically for the BITVERSE Platform development and maintenance team.*
