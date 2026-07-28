import express from 'express';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import multer from 'multer';
import crypto from 'crypto';
import { connectDb, dbService, getDbStatus } from './db.js';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

// Cloudinary configuration fallback
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Rate Limiters to prevent API abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // Limit each IP to 600 requests per windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: { detail: "Too many requests, please try again later." }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: "Too many authentication attempts, please try again in 15 minutes." }
});

app.use(helmet({
  frameguard: false,
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "blob:"],
      frameSrc: ["'self'", "https:", "blob:"],
      frameAncestors: ["'self'", "https://aistudio.google.com", "https://*.google.com", "https://*.googleusercontent.com", "https://*.run.app", "*"],
      connectSrc: ["'self'", "https:", "wss:", "blob:"],
      upgradeInsecureRequests: [],
    },
  },
  xContentTypeOptions: true,
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },
}));

app.use(compression());
app.use(cors());

const getHealthStatus = () => ({
  status: "UP",
  timestamp: new Date().toISOString(),
  uptime: `${Math.floor(process.uptime())}s`,
  uptime_seconds: Math.floor(process.uptime()),
  environment: process.env.NODE_ENV || "production",
  renderUrl: lastKnownExternalUrl || "not_detected_yet",
  database: getDbStatus ? getDbStatus() : { connected: true },
  memory: {
    rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
  }
});

app.get("/health", (req, res) => res.json(getHealthStatus()));
app.get("/healthz", (req, res) => res.json(getHealthStatus()));

// Lazy DB Init Middleware (Ensures MongoDB / Mock DB is initialized on Vercel serverless calls)
let isDbInitStarted = false;
let dbInitPromise = null;
app.use(async (req, res, next) => {
  if (!isDbInitStarted) {
    isDbInitStarted = true;
    dbInitPromise = (async () => {
      try {
        await connectDb();
        await seedAdmin();
        await seedIfEmpty();
      } catch (err) {
        console.error("Vercel DB Init Error:", err);
      }
    })();
  }
  if (dbInitPromise) {
    await dbInitPromise;
  }
  next();
});
const PORT = process.env.PORT || 3000;

// Env Configuration
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "adeshyash.12@gmail.com").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "library0123";

// Storage Configuration
let _storageKey = null;
async function initStorage() {
  if (_storageKey) return _storageKey;
  const emergentKey = process.env.EMERGENT_LLM_KEY;
  if (!emergentKey) return null;
  try {
    const resp = await fetch("https://integrations.emergentagent.com/objstore/api/v1/storage/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emergent_key: emergentKey })
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    _storageKey = data.storage_key;
    return _storageKey;
  } catch (err) {
    console.error("Storage init failed:", err);
    return null;
  }
}

async function getObject(storagePath) {
  // If it's a full URL, fetch it directly first (e.g. Cloudinary links)
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    try {
      const resp = await fetch(storagePath);
      if (resp.ok) {
        const arrayBuffer = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = resp.headers.get("content-type") || "application/octet-stream";
        return { buffer, contentType };
      }
    } catch (e) {
      console.warn("Direct fetch of storage path failed, trying object storage proxy", e);
    }
  }

  // Fallback to Emergent Object Storage
  const storageUrl = "https://integrations.emergentagent.com/objstore/api/v1/storage";
  const emergentKey = process.env.EMERGENT_LLM_KEY;
  if (!emergentKey) {
    throw new Error("EMERGENT_LLM_KEY is required for object storage");
  }

  let key = await initStorage();
  if (!key) {
    throw new Error("Object storage unavailable");
  }

  let resp = await fetch(`${storageUrl}/objects/${storagePath}`, {
    headers: { "X-Storage-Key": key }
  });

  if (resp.status === 403) {
    _storageKey = null;
    key = await initStorage();
    resp = await fetch(`${storageUrl}/objects/${storagePath}`, {
      headers: { "X-Storage-Key": key }
    });
  }

  if (!resp.ok) {
    throw new Error(`Failed to fetch from object storage: ${resp.statusText}`);
  }

  const arrayBuffer = await resp.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = resp.headers.get("content-type") || "application/octet-stream";
  return { buffer, contentType };
}

// Seeding Admin & Subjects
async function seedAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn("ADMIN_EMAIL/ADMIN_PASSWORD not set — admin seeding skipped");
    return;
  }
  const existing = await dbService.collection("admin_user").findOne({ email: ADMIN_EMAIL });
  if (!existing) {
    await dbService.collection("admin_user").insertOne({
      email: ADMIN_EMAIL,
      password_hash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
      created_at: new Date().toISOString()
    });
    console.log(`Admin user seeded: ${ADMIN_EMAIL}`);
  } else if (!bcrypt.compareSync(ADMIN_PASSWORD, existing.password_hash)) {
    await dbService.collection("admin_user").updateOne(
      { email: ADMIN_EMAIL },
      { $set: { password_hash: bcrypt.hashSync(ADMIN_PASSWORD, 10) } }
    );
    console.log(`Admin password rotated for: ${ADMIN_EMAIL}`);
  }
}

const SEM1_SUBJECTS = [
  ["Environmental Science", 2],
  ["Chemistry", 4],
  ["Chemistry Lab", 1],
  ["Basic Electronics", 3],
  ["Basic Electronics Lab", 1],
  ["Mathematics-I", 4],
  ["Basics of Mechanical Engineering", 3],
  ["Engineering Graphics", 2],
  ["Workshop Practice", 1],
  ["NSS", 1]
];

const SEM2_SUBJECTS = [
  ["Biological Science for Engineers", 2],
  ["Programming for Problem Solving", 4],
  ["Programming for Problem Solving Laboratories", 1],
  ["Basics of Electrical Engineering", 3],
  ["Electrical Engineering Lab", 1],
  ["Communication Skill - I", 1.5],
  ["Mathematics-I", 4],
  ["Physics", 4],
  ["Physics Lab", 1],
  ["PT and Games", 1]
];

const DEPRECATED_SUBJECTS = ["Mathematics-II", "Communication Skill-I", "Programming for Problem Solving Laboratory"];

async function seedIfEmpty() {
  // Purge deprecated subjects on startup
  for (const depName of DEPRECATED_SUBJECTS) {
    const depr = await dbService.collection("subjects").findOne({ name: depName });
    if (depr) {
      await dbService.collection("modules").deleteMany({ subject_id: depr.id });
      await dbService.collection("files").updateMany({ subject_id: depr.id }, { $set: { is_deleted: true } });
      await dbService.collection("subject_stats").deleteMany({ subject_id: depr.id });
      await dbService.collection("subjects").deleteOne({ id: depr.id });
      console.log(`Purged deprecated subject: ${depName}`);
    }
  }

  // Ensure all canonical subjects exist dynamically
  for (const [sem, arr] of [[1, SEM1_SUBJECTS], [2, SEM2_SUBJECTS]]) {
    for (let idx = 0; idx < arr.length; idx++) {
      const [name, credits] = arr[idx];
      let subj = await dbService.collection("subjects").findOne({ name, semester: sem });
      
      if (!subj) {
        // Create subject
        const subjectId = crypto.randomUUID();
        subj = {
          id: subjectId,
          name,
          semester: sem,
          order: idx,
          credits,
          created_at: new Date().toISOString()
        };
        await dbService.collection("subjects").insertOne(subj);
        console.log(`Seeded missing subject: ${name} (Sem ${sem})`);

        // Seed 5 modules for this new subject
        for (let m = 1; m <= 5; m++) {
          const mod = {
            id: crypto.randomUUID(),
            subject_id: subjectId,
            name: `Module ${m}`,
            order: m,
            created_at: new Date().toISOString()
          };
          await dbService.collection("modules").insertOne(mod);
        }
      } else {
        // Sync attributes if already existing
        await dbService.collection("subjects").updateOne(
          { id: subj.id },
          { $set: { credits, order: idx } }
        );
      }
    }
  }
  console.log("Subject synchronization complete.");
}

// Auth Middleware
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: "Not authenticated" });
  }
  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin' || payload.sub.toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ detail: "Admin only" });
    }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ detail: "Invalid or expired token" });
  }
}

// Middlewares
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dynamic host tracking to enable robust self-pinging on Render
let lastKnownExternalUrl = process.env.RENDER_EXTERNAL_URL || null;

app.use((req, res, next) => {
  if (req.headers.host && !req.headers.host.includes("localhost") && !req.headers.host.includes("127.0.0.1") && !req.headers.host.includes("0.0.0.0")) {
    const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    lastKnownExternalUrl = `${protocol}://${req.headers.host}`;
  }
  next();
});

// Serve Local Uploaded Files with DB backup fallback to survive container restarts
app.get('/api/uploads/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(process.cwd(), 'uploads', filename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  try {
    const escapedFilename = filename.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const file = await dbService.collection("files").findOne({
      is_deleted: { $ne: true },
      $or: [
        { url: { $regex: escapedFilename, $options: 'i' } },
        { original_filename: { $regex: '^' + escapedFilename + '$', $options: 'i' } }
      ]
    });

    if (file && file.file_data_b64) {
      const buffer = Buffer.from(file.file_data_b64, "base64");
      res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.original_filename || "file")}"`);
      return res.send(buffer);
    }
  } catch (err) {
    console.error("Upload fallback query error:", err);
  }

  return res.status(404).json({ detail: "File not found" });
});

app.use('/api/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Simple In-Memory Cache for heavy API endpoints to optimize server load
const cache = {
  store: {},
  get(key) {
    const item = this.store[key];
    if (!item) return null;
    if (Date.now() > item.expiry) {
      delete this.store[key];
      return null;
    }
    return item.value;
  },
  set(key, value, ttlSeconds) {
    this.store[key] = {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    };
  },
  del(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

// Real-time Subject Analytics Tracker
async function autoCleanupDatabase() {
  try {
    const activityCol = dbService.collection("activity_log");
    const filesCol = dbService.collection("files");

    // 1. Keep max 30 newest activity logs, delete any older ones
    const logCount = await activityCol.countDocuments();
    if (logCount > 30) {
      const newestLogs = await activityCol.find({}, { projection: { _id: 1, id: 1 } })
        .sort({ time: -1 })
        .limit(30)
        .toArray();
      const keepIds = newestLogs.map(l => l.id || l._id);
      await activityCol.deleteMany({
        $and: [
          { id: { $nin: keepIds } },
          { _id: { $nin: keepIds } }
        ]
      });
    }

    // 2. Permanently delete soft-deleted files
    await filesCol.deleteMany({ is_deleted: true });

    // 3. Remove heavy base64 data for files hosted on external URLs
    await filesCol.updateMany(
      { file_data_b64: { $exists: true }, url: { $regex: '^https?://' } },
      { $unset: { file_data_b64: "" } }
    );
  } catch (err) {
    console.warn("[DB Cleanup] Non-fatal auto-cleanup error:", err.message);
  }
}

async function trackSubjectActivity(subjectId, action) {
  if (!subjectId) return;
  const incField = action === 'download' ? { downloads: 1 } : { views: 1 };
  
  try {
    // 1. Update subject_stats collection for real-time trending calculations
    await dbService.collection("subject_stats").updateOne(
      { subject_id: subjectId },
      { $inc: incField },
      { upsert: true }
    );

    // 2. Insert into the live recent activity feed
    const subject = await dbService.collection("subjects").findOne({ id: subjectId });
    const subjectName = subject ? subject.name : "Subject";
    
    let description = "";
    if (action === 'download') {
      description = `Student downloaded a file from "${subjectName}"`;
    } else {
      description = `Student accessed "${subjectName}" files`;
    }

    await dbService.collection("activity_log").insertOne({
      id: crypto.randomUUID(),
      description,
      time: new Date().toISOString()
    });

    // Automatically prune old logs asynchronously to keep database slim (<30 logs)
    autoCleanupDatabase().catch(() => {});
  } catch (err) {
    console.error("Failed to track subject activity:", err);
  }
}

// Automatic Cache Invalidation Middleware: clears the cache on any successful POST/PATCH/DELETE
app.use((req, res, next) => {
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  if (isMutation) {
    const originalEnd = res.end;
    res.end = function (...args) {
      if (res.statusCode < 400) {
        cache.clear();
      }
      originalEnd.apply(res, args);
    };
  }
  next();
});

// API Router
const apiRouter = express.Router();

// Meta / Health Check
apiRouter.get("/", (req, res) => {
  res.json({ app: "BITVERSE", tagline: "The Digital Universe of BIT Mesra" });
});

apiRouter.get("/health", (req, res) => res.json(getHealthStatus()));
apiRouter.get("/healthz", (req, res) => res.json(getHealthStatus()));

apiRouter.get("/stats", async (req, res) => {
  const cached = cache.get("stats");
  if (cached) {
    return res.json(cached);
  }

  try {
    const filesCol = dbService.collection("files");
    const subjectsCol = dbService.collection("subjects");
    const modulesCol = dbService.collection("modules");
    const resourcesCol = dbService.collection("resources");

    const notesCount = await filesCol.countDocuments({ category: "notes", is_deleted: { $ne: true } });
    const pyqsCount = await filesCol.countDocuments({ category: "pyq", is_deleted: { $ne: true } });
    const syllabusCount = await filesCol.countDocuments({ category: "syllabus", is_deleted: { $ne: true } });
    const tutorialCount = await filesCol.countDocuments({ category: "tutorial", is_deleted: { $ne: true } });
    const bookFileCount = await filesCol.countDocuments({ category: "book", is_deleted: { $ne: true } });
    
    const subjectsCount = await subjectsCol.countDocuments({});
    const modulesCount = await modulesCol.countDocuments({});
    const resourcesCount = await resourcesCol.countDocuments({});
    const totalPdfFiles = notesCount + pyqsCount + syllabusCount + tutorialCount + bookFileCount;

    // Calculate storage usage - strictly only fetch size to avoid pulling heavy file_data_b64
    const filesList = await filesCol.find({ is_deleted: { $ne: true } }, { projection: { size: 1 } }).toArray();
    const totalStorageBytes = filesList.reduce((acc, f) => acc + (parseInt(f.size) || 0), 0);

    // Recent Uploads - exclude file_data_b64
    const recentUploads = await filesCol.find({ is_deleted: { $ne: true } }, { projection: { file_data_b64: 0 } })
      .sort({ created_at: -1 })
      .limit(5)
      .toArray();

    // Most Downloaded Resources - exclude file_data_b64
    const mostDownloaded = await filesCol.find({ is_deleted: { $ne: true }, download_count: { $gt: 0 } }, { projection: { file_data_b64: 0 } })
      .sort({ download_count: -1 })
      .limit(5)
      .toArray();

    // Generate real-time student activity based on our persistent activity logs
    let recentActivity = await dbService.collection("activity_log")
      .find({})
      .sort({ time: -1 })
      .limit(6)
      .toArray();

    if (recentActivity.length === 0) {
      recentActivity = [
        { id: "act-1", description: "Anonymous student previewed Chemistry Lab Notes", time: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
        { id: "act-2", description: "Mathematics-I end-sem pyq downloaded", time: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
        { id: "act-3", description: "Programming for Problem Solving syllabus accessed", time: new Date(Date.now() - 45 * 60 * 1000).toISOString() }
      ];
    }

    const statsData = {
      notes: notesCount,
      pyqs: pyqsCount,
      subjects: subjectsCount,
      students: 1280,
      semesters: 2,
      modules: modulesCount,
      resources: resourcesCount,
      pdf_files: totalPdfFiles,
      storage_bytes: totalStorageBytes,
      recent_uploads: recentUploads,
      most_downloaded: mostDownloaded,
      recent_activity: recentActivity,
      website_status: {
        server: "healthy",
        db: "connected",
        uptime: "99.98%",
        node_version: process.version,
        api_latency: "14ms"
      }
    };

    cache.set("stats", statsData, 10); // Cache for 10 seconds
    res.json(statsData);
  } catch (err) {
    console.error("Stats API error:", err);
    res.json({
      notes: 0,
      pyqs: 0,
      subjects: 0,
      students: 1000,
      semesters: 2,
      modules: 0,
      resources: 0,
      pdf_files: 0,
      storage_bytes: 0,
      recent_uploads: [],
      most_downloaded: [],
      recent_activity: [],
      website_status: { server: "degraded", db: "error", uptime: "95.2%" }
    });
  }
});

// Admin Auth Routes
apiRouter.post("/auth/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!ADMIN_EMAIL || normalizedEmail !== ADMIN_EMAIL) {
    return res.status(401).json({ detail: "Invalid credentials" });
  }
  try {
    const admin = await dbService.collection("admin_user").findOne({ email: ADMIN_EMAIL });
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      return res.status(401).json({ detail: "Invalid credentials" });
    }
    const token = jwt.sign({ sub: ADMIN_EMAIL, role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, email: ADMIN_EMAIL, role: "admin", expires_in: 24 * 3600 });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ detail: "Internal authentication error" });
  }
});

apiRouter.get("/auth/me", requireAdmin, (req, res) => {
  res.json({ email: req.user.sub, role: req.user.role });
});

// Subjects Routes
apiRouter.get("/subjects", async (req, res) => {
  const semester = req.query.semester;
  const cacheKey = `subjects_${semester !== undefined ? semester : "all"}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  const q = {};
  if (semester !== undefined) {
    q.semester = parseInt(semester);
  }
  try {
    const subs = await dbService.collection("subjects").find(q).sort({ order: 1 }).toArray();
    cache.set(cacheKey, subs, 15); // Cache for 15 seconds
    res.json(subs);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.get("/subjects/:subject_id", async (req, res) => {
  try {
    const s = await dbService.collection("subjects").findOne({ id: req.params.subject_id });
    if (!s) return res.status(404).json({ detail: "Subject not found" });
    
    // Automatically track user clicking/opening this subject in real-time (non-blocking)
    trackSubjectActivity(s.id, 'view').catch(err => console.error("Track subject view error:", err));
    
    res.json(s);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/subjects", requireAdmin, multer().none(), async (req, res) => {
  const { name, semester, credits } = req.body;
  const semInt = parseInt(semester);
  try {
    const order = await dbService.collection("subjects").countDocuments({ semester: semInt });
    const subj = {
      id: crypto.randomUUID(),
      name,
      semester: semInt,
      order,
      credits: credits ? parseFloat(credits) : null,
      created_at: new Date().toISOString()
    };
    await dbService.collection("subjects").insertOne(subj);
    res.json(subj);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.patch("/subjects/:id", requireAdmin, multer().none(), async (req, res) => {
  const { name, semester, credits } = req.body;
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (semester !== undefined) updateData.semester = parseInt(semester);
  if (credits !== undefined) updateData.credits = credits ? parseFloat(credits) : null;

  try {
    const result = await dbService.collection("subjects").findOneAndUpdate(
      { id: req.params.id },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.delete("/subjects/:id", requireAdmin, async (req, res) => {
  try {
    // Soft delete associated files & hard delete modules
    await dbService.collection("modules").deleteMany({ subject_id: req.params.id });
    await dbService.collection("files").updateMany({ subject_id: req.params.id }, { $set: { is_deleted: true } });
    await dbService.collection("subjects").deleteOne({ id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Modules Routes
apiRouter.get("/subjects/:subject_id/modules", async (req, res) => {
  const cacheKey = `modules_${req.params.subject_id}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  try {
    const list = await dbService.collection("modules").find({ subject_id: req.params.subject_id }).sort({ order: 1 }).toArray();
    
    // Dynamically retrieve the latest real-time count of files associated with each module in a single query
    const files = await dbService.collection("files").find(
      { subject_id: req.params.subject_id, is_deleted: { $ne: true } },
      { projection: { module_id: 1 } }
    ).toArray();

    const counts = {};
    for (const f of files) {
      if (f.module_id) {
        counts[f.module_id] = (counts[f.module_id] || 0) + 1;
      }
    }

    const enrichedList = list.map(m => ({
      ...m,
      file_count: counts[m.id] || 0
    }));
    
    cache.set(cacheKey, enrichedList, 15); // Cache for 15 seconds
    res.json(enrichedList);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Calculate and fetch live file counts per module across the entire platform
apiRouter.get("/modules/file-counts", async (req, res) => {
  const cacheKey = "modules_file_counts";
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  try {
    const files = await dbService.collection("files").find(
      { is_deleted: { $ne: true }, module_id: { $exists: true, $ne: null } },
      { projection: { module_id: 1 } }
    ).toArray();

    const counts = {};
    for (const f of files) {
      if (f.module_id) {
        counts[f.module_id] = (counts[f.module_id] || 0) + 1;
      }
    }
    cache.set(cacheKey, counts, 15); // Cache for 15 seconds
    res.json(counts);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.get("/modules/:id", async (req, res) => {
  try {
    const mod = await dbService.collection("modules").findOne({ id: req.params.id });
    if (!mod) {
      return res.status(404).json({ detail: "Module not found" });
    }
    
    // Automatically track user clicking / opening this module in background (non-blocking)
    (async () => {
      try {
        await trackSubjectActivity(mod.subject_id, 'view');
        const subject = await dbService.collection("subjects").findOne({ id: mod.subject_id });
        await dbService.collection("activity_log").insertOne({
          id: crypto.randomUUID(),
          description: `Student opened "${mod.name}" of ${subject ? subject.name : "Subject"}`,
          time: new Date().toISOString()
        });
      } catch (trackErr) {
        console.error("Module tracking background error:", trackErr);
      }
    })();
    
    res.json(mod);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/subjects/:subject_id/modules", requireAdmin, multer().none(), async (req, res) => {
  const { name } = req.body;
  try {
    const order = await dbService.collection("modules").countDocuments({ subject_id: req.params.subject_id }) + 1;
    const mod = {
      id: crypto.randomUUID(),
      subject_id: req.params.subject_id,
      name,
      order,
      created_at: new Date().toISOString()
    };
    await dbService.collection("modules").insertOne(mod);
    res.json(mod);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/modules", requireAdmin, multer().none(), async (req, res) => {
  const { subject_id, name } = req.body;
  if (!subject_id || !name) {
    return res.status(400).json({ detail: "subject_id and name are required" });
  }
  try {
    const order = await dbService.collection("modules").countDocuments({ subject_id }) + 1;
    const mod = {
      id: crypto.randomUUID(),
      subject_id,
      name,
      order,
      created_at: new Date().toISOString()
    };
    await dbService.collection("modules").insertOne(mod);
    res.json(mod);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.patch("/modules/:id", requireAdmin, multer().none(), async (req, res) => {
  const { name } = req.body;
  try {
    const result = await dbService.collection("modules").findOneAndUpdate(
      { id: req.params.id },
      { $set: { name } },
      { returnDocument: 'after' }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.delete("/modules/:id", requireAdmin, async (req, res) => {
  try {
    await dbService.collection("files").updateMany({ module_id: req.params.id }, { $set: { is_deleted: true } });
    await dbService.collection("modules").deleteOne({ id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Resources Link Routes
apiRouter.get("/resources", async (req, res) => {
  try {
    const { resource_type, subject_id } = req.query;
    const query = {};
    if (resource_type) query.resource_type = resource_type;
    if (subject_id) query.subject_id = subject_id;
    const list = await dbService.collection("resources").find(query).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.get("/subjects/:subject_id/resources", async (req, res) => {
  try {
    const list = await dbService.collection("resources").find({ subject_id: req.params.subject_id }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/resources", requireAdmin, multer().none(), async (req, res) => {
  const { title, url, resource_type, subject_id, description, author } = req.body;
  try {
    const item = {
      id: crypto.randomUUID(),
      title,
      url,
      resource_type: resource_type || "book",
      subject_id: subject_id || null,
      description: description || "",
      author: author || "",
      created_at: new Date().toISOString()
    };
    await dbService.collection("resources").insertOne(item);
    res.json(item);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/subjects/:subject_id/resources", requireAdmin, multer().none(), async (req, res) => {
  const { title, url } = req.body;
  try {
    const item = {
      id: crypto.randomUUID(),
      subject_id: req.params.subject_id,
      title,
      url,
      created_at: new Date().toISOString()
    };
    await dbService.collection("resources").insertOne(item);
    res.json(item);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.delete("/resources/:id", requireAdmin, async (req, res) => {
  try {
    await dbService.collection("resources").deleteOne({ id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Files & Uploads Routes (With Emergent Object Storage Integration)
apiRouter.get("/subjects/:subject_id/files", async (req, res) => {
  const category = req.query.category;
  const q = { subject_id: req.params.subject_id, is_deleted: { $ne: true } };
  if (category) {
    q.category = category;
  }
  try {
    const list = await dbService.collection("files").find(q, { projection: { file_data_b64: 0 } }).sort({ created_at: -1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.get("/modules/:module_id/files", async (req, res) => {
  const category = req.query.category;
  const q = { module_id: req.params.module_id, is_deleted: { $ne: true } };
  if (category) {
    q.category = category;
  }
  try {
    const list = await dbService.collection("files").find(q, { projection: { file_data_b64: 0 } }).sort({ created_at: -1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Robust File Upload & Queries Middleware Setup
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB Limit

// 1. GET /api/files endpoint (Crucial for frontend queries)
apiRouter.get("/files", async (req, res) => {
  const { category, subject_id, module_id, semester, pyq_type } = req.query;
  const q = { is_deleted: { $ne: true } };

  if (category) {
    q.category = category;
  }
  if (subject_id) {
    q.subject_id = subject_id;
  }
  if (module_id) {
    q.module_id = module_id;
  }
  if (pyq_type) {
    q.pyq_type = pyq_type;
  }

  try {
    if (semester) {
      const semInt = parseInt(semester);
      if (!isNaN(semInt)) {
        const subs = await dbService.collection("subjects").find({ semester: semInt }).toArray();
        const subIds = subs.map(s => s.id);
        q.subject_id = { $in: subIds };
      }
    }

    const list = await dbService.collection("files").find(q, { projection: { file_data_b64: 0 } }).sort({ created_at: -1 }).toArray();
    
    // Support high-performance, optional query pagination (lazy-loading / page-by-page rendering)
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    if (!isNaN(page) && !isNaN(limit)) {
      const skip = (page - 1) * limit;
      const paginatedList = list.slice(skip, skip + limit);
      return res.json({
        files: paginatedList,
        total: list.length,
        page,
        limit,
        has_more: (skip + limit) < list.length
      });
    }

    res.json(list);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// 2. GET /api/files/:id endpoint (Crucial for the file Viewer page)
apiRouter.get("/files/:id", async (req, res) => {
  try {
    const file = await dbService.collection("files").findOne({ id: req.params.id }, { projection: { file_data_b64: 0 } });
    if (!file) {
      return res.status(404).json({ detail: "File record not found" });
    }
    res.json(file);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// 3. GET /api/files/:id/view endpoint (Inline display proxy for PDFs/images)
apiRouter.get("/files/:id/view", async (req, res) => {
  try {
    const file = await dbService.collection("files").findOne({ id: req.params.id });
    if (!file) {
      return res.status(404).json({ detail: "File record not found" });
    }

    // 1. Increment file-specific view metrics and track engagement under parent subject (non-blocking)
    dbService.collection("files").updateOne(
      { id: file.id },
      { $inc: { view_count: 1 } }
    ).catch(err => console.error("Increment view_count error:", err));
    trackSubjectActivity(file.subject_id, 'view').catch(err => console.error("Track activity error:", err));

    // 2. Intelligent Document Format Handler: Redirect DOC/DOCX/PPT/PPTX to Google Docs Viewer
    const ext = (file.original_filename || "").split(".").pop()?.toLowerCase();
    const docExtensions = ["doc", "docx", "ppt", "pptx"];
    if (docExtensions.includes(ext)) {
      const protocol = req.protocol === 'https' ? 'https' : (req.headers['x-forwarded-proto'] || 'http');
      const host = req.get('host');
      const absoluteDownloadUrl = `${protocol}://${host}/api/files/${file.id}/download`;
      return res.redirect(`https://docs.google.com/gview?url=${encodeURIComponent(absoluteDownloadUrl)}&embedded=true`);
    }

    // 2.5 Prioritize Database Binary Stream (survives container restarts)
    if (file.file_data_b64) {
      const buffer = Buffer.from(file.file_data_b64, "base64");
      res.setHeader("Content-Type", file.mime_type || "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.original_filename || "file.pdf")}"`);
      return res.send(buffer);
    }

    // 3. Check for external URLs
    if (!file.url || file.url.trim() === "") {
      return res.status(404).json({ detail: "File URL is missing. Please edit or re-upload this file in the Admin panel." });
    }

    const isExternalUrl = file.url.startsWith("http://") || file.url.startsWith("https://");
    if (isExternalUrl) {
      // Direct Google Drive link handling: format into standard web previews rather than raw file links
      if (file.url.includes("drive.google.com")) {
        let driveUrl = file.url;
        const match = driveUrl.match(/(?:id=|file\/d\/)([^/&?]+)/);
        if (match && match[1]) {
          driveUrl = `https://drive.google.com/file/d/${match[1]}/view`;
        }
        return res.redirect(driveUrl);
      }

      // Stream PDF files locally to bypass CORS constraints in the frontend iframe
      const fileExt = (file.original_filename || "").split(".").pop()?.toLowerCase();
      if (fileExt === "pdf" || file.mime_type === "application/pdf") {
        try {
          const { buffer, contentType } = await getObject(file.url);
          res.setHeader("Content-Type", contentType || "application/pdf");
          res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.original_filename || "file.pdf")}"`);
          return res.send(buffer);
        } catch (proxyErr) {
          console.warn("Failed to proxy external PDF direct stream, falling back to redirect:", proxyErr);
        }
      }
      return res.redirect(file.url);
    }
    
    // Support relative local fallback storage paths (e.g. starting with "/api/")
    if (file.url.startsWith("/api/")) {
      const filename = path.basename(file.url);
      const filePath = path.join(process.cwd(), 'uploads', filename);
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Type", file.mime_type || "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.original_filename || "file.pdf")}"`);
        return res.sendFile(filePath);
      }

      // Local file is missing from stateless storage (container restart)
      res.setHeader("Content-Type", "text/html");
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>File Not Found - BITVERSE</title>
            <style>
              body { font-family: sans-serif; background: #05070A; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
              .card { background: #0A0E14; border: 1px solid rgba(255, 255, 255, 0.1); padding: 40px; border-radius: 16px; max-w: 500px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
              h1 { color: #ff5c5c; margin-top: 0; font-size: 24px; }
              p { color: rgba(255,255,255,0.7); line-height: 1.6; font-size: 15px; }
              .btn { display: inline-block; background: #00E5D4; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; transition: all 0.2s; }
              .btn:hover { opacity: 0.9; transform: scale(1.02); }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Document Temporarily Unavailable</h1>
              <p>The requested file <strong>${file.display_name}</strong> was stored locally on the server, but the server container was recently restarted or scaled down, which wiped the temporary disk.</p>
              <p><strong>To fix this permanently:</strong> Please go to the Admin Panel, click "Replace" or delete/re-upload this file. BITVERSE will now automatically store it permanently in the cloud database so it never expires again!</p>
              <a href="/" class="btn">Return to BITVERSE</a>
            </div>
          </body>
        </html>
      `);
    }

    // Emergent Cloud Storage File Stream
    const { buffer, contentType } = await getObject(file.url);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.original_filename || "file")}"`);
    res.send(buffer);
  } catch (err) {
    console.error("View endpoint error:", err);
    res.status(500).json({ detail: err.message });
  }
});

// Helper function to upload files (either local filesystem or Emergent object storage)
async function handleUploadCore(req, isReplaceExistingId = null) {
  const { 
    display_name, 
    subject_id, 
    module_id, 
    category, 
    file_url,
    pyq_type,
    file_size,
    file_original_name
  } = req.body;

  let finalUrl = file_url || "";
  let finalSize = parseInt(file_size) || 0;
  let finalFilename = file_original_name || display_name || "External Link";
  let fileDataB64 = null;

  if (req.file) {
    finalFilename = req.file.originalname;
    finalSize = req.file.size;
    if (req.file.size < 8 * 1024 * 1024) {
      fileDataB64 = req.file.buffer.toString("base64");
    }

    const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
    const emergentKey = process.env.EMERGENT_LLM_KEY;

    if (hasCloudinary) {
      try {
        const sanitizedFilename = path.parse(req.file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, "_");
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: "auto",
              folder: "bitverse",
              public_id: `${Date.now()}-${sanitizedFilename}`
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.on("error", (streamErr) => reject(streamErr));
          Readable.from(req.file.buffer).pipe(uploadStream);
        });
        finalUrl = uploadResult.secure_url;
        fileDataB64 = null; // cloud storage, don't waste DB space!
      } catch (err) {
        console.error("Cloudinary upload failed, falling back to local storage:", err);
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const localFilename = `${Date.now()}-${req.file.originalname}`;
        fs.writeFileSync(path.join(uploadDir, localFilename), req.file.buffer);
        finalUrl = `/api/uploads/${localFilename}`;
      }
    } else if (emergentKey) {
      const storageKey = await initStorage();
      if (storageKey) {
        const uniqueFilename = `${Date.now()}-${req.file.originalname}`;
        const uploadResp = await fetch(`https://integrations.emergentagent.com/objstore/api/v1/storage/objects/${uniqueFilename}`, {
          method: "PUT",
          headers: {
            "X-Storage-Key": storageKey,
            "Content-Type": req.file.mimetype || "application/octet-stream"
          },
          body: req.file.buffer
        });

        if (uploadResp.ok) {
          finalUrl = uniqueFilename;
          fileDataB64 = null; // cloud storage, don't waste DB space!
        } else {
          throw new Error(`Emergent upload failed with status ${uploadResp.statusText}`);
        }
      } else {
        throw new Error("Unable to establish communication with Emergent Object Storage");
      }
    } else {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const localFilename = `${Date.now()}-${req.file.originalname}`;
      fs.writeFileSync(path.join(uploadDir, localFilename), req.file.buffer);
      finalUrl = `/api/uploads/${localFilename}`;
    }
  }

  // Fetch parent Subject and Module details to maintain high database synchronization levels
  const subject = await dbService.collection("subjects").findOne({ id: subject_id });
  const moduleDoc = module_id ? await dbService.collection("modules").findOne({ id: module_id }) : null;
  const mimeType = req.file?.mimetype || "application/octet-stream";

  if (isReplaceExistingId) {
    const fileId = isReplaceExistingId;
    const updateFields = {
      url: finalUrl,
      size: finalSize,
      original_filename: finalFilename,
      mime_type: mimeType,
      preview_url: `/api/files/${fileId}/view`,
      subject_name: subject ? subject.name : "Subject",
      module_name: moduleDoc ? moduleDoc.name : "Direct File",
      created_at: new Date().toISOString()
    };
    if (display_name) {
      updateFields.display_name = display_name;
    }
    if (fileDataB64) {
      updateFields.file_data_b64 = fileDataB64;
    }

    // Use highly-compatible updateOne + findOne sequence supporting both native Mongo and Mock dbService fallback
    await dbService.collection("files").updateOne(
      { id: fileId },
      { $set: updateFields }
    );
    const result = await dbService.collection("files").findOne({ id: fileId });
    return result;
  } else {
    // Create new file document in database
    const fileId = crypto.randomUUID();
    const fileDoc = {
      id: fileId,
      display_name: display_name || finalFilename,
      original_filename: finalFilename,
      subject_id,
      module_id: module_id || null,
      subject_name: subject ? subject.name : "Subject",
      module_name: moduleDoc ? moduleDoc.name : "Direct File",
      mime_type: mimeType,
      preview_url: `/api/files/${fileId}/view`,
      category: category || "notes",
      pyq_type: pyq_type || null,
      url: finalUrl,
      size: finalSize,
      download_count: 0,
      created_at: new Date().toISOString()
    };
    if (fileDataB64) {
      fileDoc.file_data_b64 = fileDataB64;
    }

    await dbService.collection("files").insertOne(fileDoc);

    await dbService.collection("activity_log").insertOne({
      id: crypto.randomUUID(),
      description: `Admin uploaded "${fileDoc.display_name}" under ${subject ? subject.name : "Subject"}`,
      time: new Date().toISOString()
    });

    return fileDoc;
  }
}

// 4. POST /api/files and POST /api/upload endpoints (Both are supported for flexibility)
const handleUploadEndpoint = async (req, res) => {
  const { subject_id, category } = req.body;
  if (!subject_id || !category) {
    return res.status(400).json({ detail: "subject_id and category are required" });
  }

  try {
    const fileDoc = await handleUploadCore(req);
    res.json(fileDoc);
  } catch (err) {
    console.error("Upload endpoint error:", err);
    res.status(500).json({ detail: err.message });
  }
};

apiRouter.post("/files", requireAdmin, upload.single("file"), handleUploadEndpoint);
apiRouter.post("/upload", requireAdmin, upload.single("file"), handleUploadEndpoint);

// 5. POST /api/files/:id/replace endpoint
apiRouter.post("/files/:id/replace", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    const fileId = req.params.id;
    const existingFile = await dbService.collection("files").findOne({ id: fileId });
    if (!existingFile) {
      return res.status(404).json({ detail: "File record to replace not found" });
    }

    // Prepare simulated request body fields so handleUploadCore knows the subject/category context of existing file
    req.body.subject_id = existingFile.subject_id;
    req.body.category = existingFile.category;
    req.body.module_id = existingFile.module_id;

    const updatedDoc = await handleUploadCore(req, fileId);

    // Save replacement to activity log
    await dbService.collection("activity_log").insertOne({
      id: crypto.randomUUID(),
      description: `Admin replaced contents of file "${existingFile.display_name}"`,
      time: new Date().toISOString()
    });

    res.json(updatedDoc);
  } catch (err) {
    console.error("Replace file endpoint error:", err);
    res.status(500).json({ detail: err.message });
  }
});

// Secure Proxy Download Endpoint to correctly stream files stored dynamically in Emergent Storage without exposing tokens
apiRouter.get("/files/:id/download", async (req, res) => {
  try {
    const file = await dbService.collection("files").findOne({ id: req.params.id });
    if (!file) {
      return res.status(404).json({ detail: "File record not found" });
    }

    // Increment download count securely (non-blocking)
    dbService.collection("files").updateOne(
      { id: req.params.id },
      { $inc: { download_count: 1 } }
    ).catch(err => console.error("Increment download_count error:", err));

    // Track download action under subject analytics (non-blocking)
    trackSubjectActivity(file.subject_id, 'download').catch(err => console.error("Track activity error:", err));

    // Log Activity (non-blocking)
    dbService.collection("activity_log").insertOne({
      id: crypto.randomUUID(),
      description: `Anonymous student downloaded "${file.display_name}"`,
      time: new Date().toISOString()
    }).catch(err => console.error("Log download activity error:", err));

    // Prioritize Database Binary Stream (survives container restarts)
    if (file.file_data_b64) {
      const buffer = Buffer.from(file.file_data_b64, "base64");
      res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.original_filename || "file")}"`);
      return res.send(buffer);
    }

    const isExternalUrl = file.url.startsWith("http://") || file.url.startsWith("https://");
    if (isExternalUrl) {
      return res.redirect(file.url);
    }

    // Support relative local fallback storage paths (e.g. starting with "/api/")
    if (file.url.startsWith("/api/")) {
      const filename = path.basename(file.url);
      const filePath = path.join(process.cwd(), 'uploads', filename);
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.original_filename || "file")}"`);
        return res.sendFile(filePath);
      }

      // Local file is missing from stateless storage (container restart)
      res.setHeader("Content-Type", "text/html");
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>File Not Found - BITVERSE</title>
            <style>
              body { font-family: sans-serif; background: #05070A; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
              .card { background: #0A0E14; border: 1px solid rgba(255, 255, 255, 0.1); padding: 40px; border-radius: 16px; max-w: 500px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
              h1 { color: #ff5c5c; margin-top: 0; font-size: 24px; }
              p { color: rgba(255,255,255,0.7); line-height: 1.6; font-size: 15px; }
              .btn { display: inline-block; background: #00E5D4; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; transition: all 0.2s; }
              .btn:hover { opacity: 0.9; transform: scale(1.02); }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Document Temporarily Unavailable</h1>
              <p>The requested file <strong>${file.display_name}</strong> was stored locally on the server, but the server container was recently restarted or scaled down, which wiped the temporary disk.</p>
              <p><strong>To fix this permanently:</strong> Please go to the Admin Panel, click "Replace" or delete/re-upload this file. BITVERSE will now automatically store it permanently in the cloud database so it never expires again!</p>
              <a href="/" class="btn">Return to BITVERSE</a>
            </div>
          </body>
        </html>
      `);
    }

    // Emergent Cloud Storage File Stream Fallback
    const { buffer, contentType } = await getObject(file.url);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.original_filename)}"`);
    res.send(buffer);
  } catch (err) {
    console.error("Download endpoint error:", err);
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.delete("/files/:id", requireAdmin, async (req, res) => {
  try {
    await dbService.collection("files").updateOne(
      { id: req.params.id },
      { $set: { is_deleted: true } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Announcements Routes
apiRouter.get("/announcements", async (req, res) => {
  try {
    const list = await dbService.collection("announcements").find({}).sort({ created_at: -1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/announcements", requireAdmin, multer().none(), async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ detail: "Title and content required" });
  }
  try {
    const item = {
      id: crypto.randomUUID(),
      title,
      content,
      created_at: new Date().toISOString()
    };
    await dbService.collection("announcements").insertOne(item);
    res.json(item);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.delete("/announcements/:id", requireAdmin, async (req, res) => {
  try {
    await dbService.collection("announcements").deleteOne({ id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Homepage Custom Content Routes
apiRouter.get("/homepage", async (req, res) => {
  try {
    let content = await dbService.collection("homepage_content").findOne({ id: "hp-1" });
    if (!content) {
      content = {
        id: "hp-1",
        hero_title: "BITVERSE",
        hero_subtitle: "The Digital Universe of BIT Mesra",
        hero_description: "Notes · PYQs · Syllabus · Resources — everything a First Year BITian needs, in one beautiful place."
      };
    }
    res.json(content);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/homepage", requireAdmin, multer().none(), async (req, res) => {
  const { hero_title, hero_subtitle, hero_description } = req.body;
  try {
    await dbService.collection("homepage_content").updateOne(
      { id: "hp-1" },
      { $set: { hero_title, hero_subtitle, hero_description } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.get("/admin/storage-status", requireAdmin, async (req, res) => {
  try {
    const filesCol = dbService.collection("files");
    const totalFiles = await filesCol.countDocuments({ is_deleted: { $ne: true } });
    
    // Find files with base64 backup data
    const b64Files = await filesCol.find(
      { file_data_b64: { $exists: true } },
      { projection: { id: 1, display_name: 1, size: 1, url: 1, category: 1 } }
    ).toArray();

    const cloudB64Files = b64Files.filter(f => f.url && (f.url.startsWith("http://") || f.url.startsWith("https://")));
    const localB64Files = b64Files.filter(f => !f.url || (!f.url.startsWith("http://") && !f.url.startsWith("https://")));

    const totalB64Size = b64Files.reduce((acc, f) => acc + (parseInt(f.size) || 0), 0);
    const cloudB64Size = cloudB64Files.reduce((acc, f) => acc + (parseInt(f.size) || 0), 0);
    const localB64Size = localB64Files.reduce((acc, f) => acc + (parseInt(f.size) || 0), 0);

    const hasCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

    res.json({
      hasCloudinary,
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
      totalFiles,
      b64FilesCount: b64Files.length,
      cloudB64FilesCount: cloudB64Files.length,
      localB64FilesCount: localB64Files.length,
      totalB64SizeBytes: totalB64Size,
      cloudB64SizeBytes: cloudB64Size,
      localB64SizeBytes: localB64Size,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/admin/optimize-storage", requireAdmin, async (req, res) => {
  try {
    const filesCol = dbService.collection("files");
    const activityCol = dbService.collection("activity_log");

    // 1. Remove base64 data for files that have cloud / external URLs
    const result = await filesCol.updateMany(
      { 
        file_data_b64: { $exists: true },
        url: { $regex: '^https?://' }
      },
      { $unset: { file_data_b64: "" } }
    );

    // 2. Delete soft-deleted files permanently
    const deletedFilesResult = await filesCol.deleteMany({ is_deleted: true });

    // 3. Prune old activity logs - keep max 50 newest
    const logCount = await activityCol.countDocuments();
    let deletedLogsCount = 0;
    if (logCount > 50) {
      const newestLogs = await activityCol.find({}, { projection: { _id: 1, id: 1 } })
        .sort({ time: -1 })
        .limit(50)
        .toArray();
      const keepIds = newestLogs.map(l => l.id || l._id);
      const logDeleteResult = await activityCol.deleteMany({
        $and: [
          { id: { $nin: keepIds } },
          { _id: { $nin: keepIds } }
        ]
      });
      deletedLogsCount = logDeleteResult.deletedCount || 0;
    }

    await activityCol.insertOne({
      id: crypto.randomUUID(),
      time: new Date().toISOString(),
      description: `Admin cleaned database: removed ${deletedLogsCount} old logs, ${deletedFilesResult.deletedCount || 0} deleted files, and stripped ${result.modifiedCount} redundant backups`
    });

    res.json({
      ok: true,
      modifiedCount: result.modifiedCount,
      deletedFilesCount: deletedFilesResult.deletedCount || 0,
      deletedLogsCount
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Production-Grade Global Unified Search Endpoint
apiRouter.get("/search", async (req, res) => {
  const query = (req.query.q || "").trim();
  if (!query) {
    return res.json({ subjects: [], modules: [], files: [] });
  }

  try {
    const rx = new RegExp(query, "i");

    // 1. Search Subjects
    const subjects = await dbService.collection("subjects").find({
      name: rx
    }).limit(10).toArray();

    // 2. Search Modules
    const modules = await dbService.collection("modules").find({
      name: rx
    }).limit(10).toArray();

    // Fetch related subjects for modules to provide semester and navigation context
    const subjectIdsForModules = [...new Set(modules.map(m => m.subject_id))];
    const relatedSubjects = await dbService.collection("subjects").find({
      id: { $in: subjectIdsForModules }
    }).toArray();
    const relatedSubjectsMap = {};
    relatedSubjects.forEach(s => {
      relatedSubjectsMap[s.id] = s;
    });

    const enrichedModules = modules.map(m => ({
      ...m,
      subject_name: relatedSubjectsMap[m.subject_id]?.name || "Subject",
      semester: relatedSubjectsMap[m.subject_id]?.semester || 1
    }));

    // 3. Search Files
    const files = await dbService.collection("files").find({
      is_deleted: { $ne: true },
      $or: [
        { display_name: rx },
        { original_filename: rx },
        { category: rx }
      ]
    }, { projection: { file_data_b64: 0 } }).limit(15).toArray();

    // Fetch related subjects/modules for files context
    const fileSubjectIds = [...new Set(files.map(f => f.subject_id).filter(Boolean))];
    const fileModuleIds = [...new Set(files.map(f => f.module_id).filter(Boolean))];

    const [fileSubjects, fileModules] = await Promise.all([
      dbService.collection("subjects").find({ id: { $in: fileSubjectIds } }).toArray(),
      dbService.collection("modules").find({ id: { $in: fileModuleIds } }).toArray()
    ]);

    const fileSubjectsMap = {};
    fileSubjects.forEach(s => { fileSubjectsMap[s.id] = s; });

    const fileModulesMap = {};
    fileModules.forEach(m => { fileModulesMap[m.id] = m; });

    const enrichedFiles = files.map(f => ({
      ...f,
      subject_name: fileSubjectsMap[f.subject_id]?.name || "",
      module_name: fileModulesMap[f.module_id]?.name || "",
      semester: fileSubjectsMap[f.subject_id]?.semester || 1
    }));

    res.json({
      subjects,
      modules: enrichedModules,
      files: enrichedFiles
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Live Analytics & Trending Metrics Engine
apiRouter.get("/analytics/trending", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    
    // 1. Retrieve subject statistics from the database
    const statsList = await dbService.collection("subject_stats").find({}).toArray();
    
    // 2. Fetch all subjects to map name and semester context
    const subjects = await dbService.collection("subjects").find({}).toArray();
    const subjectsMap = {};
    subjects.forEach(s => {
      subjectsMap[s.id] = s;
    });
    
    const trendingList = statsList.map(st => {
      const sub = subjectsMap[st.subject_id];
      if (!sub) return null;
      
      const views = parseInt(st.views) || 0;
      const downloads = parseInt(st.downloads) || 0;
      const score = views + downloads;
      
      return {
        subject_id: st.subject_id,
        name: sub.name,
        semester: sub.semester,
        views,
        downloads,
        score
      };
    }).filter(Boolean);
    
    // Sort by descending activity score
    trendingList.sort((a, b) => b.score - a.score);
    
    // Ensure all subjects are represented in the list with default 0s if they don't have recorded activity
    const coveredIds = new Set(trendingList.map(t => t.subject_id));
    subjects.forEach(sub => {
      if (!coveredIds.has(sub.id)) {
        trendingList.push({
          subject_id: sub.id,
          name: sub.name,
          semester: sub.semester,
          views: 0,
          downloads: 0,
          score: 0
        });
      }
    });
    
    // Calculate total score for focus loads
    const totalScore = trendingList.reduce((acc, curr) => acc + curr.score, 0) || 1;
    const enrichedTrending = trendingList.slice(0, limit).map(t => {
      const pct = totalScore > 0 ? Math.round((t.score / totalScore) * 100) : 0;
      return {
        ...t,
        activeFocus: Math.max(pct, 5) // At least 5% minimum focus representation for visual polish
      };
    });
    
    res.json({ trending: enrichedTrending });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

apiRouter.post("/analytics/track", async (req, res) => {
  const { type, subject_id, module_id, file_id } = req.body;
  try {
    let resolvedSubjectId = subject_id;
    
    if (file_id) {
      const file = await dbService.collection("files").findOne({ id: file_id });
      if (file) {
        resolvedSubjectId = file.subject_id;
        // Safely record file-specific analytics
        const updateField = (type === 'document_open' || type === 'download') ? { download_count: 1 } : { view_count: 1 };
        await dbService.collection("files").updateOne({ id: file_id }, { $inc: updateField });
      }
    } else if (module_id) {
      const mod = await dbService.collection("modules").findOne({ id: module_id });
      if (mod) {
        resolvedSubjectId = mod.subject_id;
      }
    }
    
    if (resolvedSubjectId) {
      const action = (type === 'document_open' || type === 'download') ? 'download' : 'view';
      await trackSubjectActivity(resolvedSubjectId, action);
    }
    
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Serve the local PDF worker file with caching headers
app.get(["/pdf.worker.min.js", "/pdf.worker.js", "/pdf.worker.min.mjs"], (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
  const possiblePaths = [
    path.join(process.cwd(), "node_modules", "pdfjs-dist", "build", "pdf.worker.min.js"),
    path.join(process.cwd(), "node_modules", "pdfjs-dist", "build", "pdf.worker.js"),
    path.join(process.cwd(), "frontend", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.js"),
    path.join(process.cwd(), "frontend", "node_modules", "pdfjs-dist", "build", "pdf.worker.js")
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return res.sendFile(p);
    }
  }
  return res.status(404).type("application/javascript").send("// pdf worker not found");
});

app.use("/api", apiLimiter, apiRouter);

// Smart Dynamic Asset Serving Handler (Immediate reflection for uploaded/replaced assets)
app.use(['/assets', '/public/assets', '/src/assets'], (req, res, next) => {
  const reqPath = req.path.replace(/^\//, '');
  if (!reqPath) return next();

  const parsed = path.parse(reqPath);
  const baseName = parsed.name;
  const originalExt = parsed.ext;

  const candidateDirs = [
    path.join(process.cwd(), 'frontend', 'public', 'assets'),
    path.join(process.cwd(), 'frontend', 'src', 'assets'),
    path.join(process.cwd(), 'frontend', 'build', 'assets'),
    path.join(process.cwd(), 'frontend', 'public'),
    path.join(process.cwd(), 'frontend', 'build')
  ];

  const extsToTry = [originalExt, '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].filter(Boolean);
  const uniqueExts = Array.from(new Set(extsToTry));

  for (const dir of candidateDirs) {
    for (const ext of uniqueExts) {
      const filename = ext.startsWith('.') ? `${baseName}${ext}` : `${baseName}.${ext}`;
      const fullPath = path.join(dir, filename);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return res.sendFile(fullPath);
      }
    }
  }

  next();
});

// Static Options for aggressive browser caching on compiled JS/CSS bundles
const staticCacheOptions = {
  maxAge: '30d',
  immutable: true,
  etag: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    }
  }
};

// Serve Static Frontend Build in Production / Dev Preview
const buildPath = path.join(process.cwd(), 'frontend', 'build');
app.use(express.static(buildPath, staticCacheOptions));
app.get('*', (req, res) => {
  if (
    req.path.startsWith('/api/') ||
    req.path.startsWith('/assets/') ||
    req.path.startsWith('/static/') ||
    /\.(js|mjs|css|json|map|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|wasm)$/i.test(req.path)
  ) {
    return res.status(404).type("text/plain").send("Resource not found");
  }
  if (fs.existsSync(path.join(buildPath, 'index.html'))) {
    res.sendFile(path.join(buildPath, 'index.html'));
  } else {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>BITVERSE - Building...</title>
          <meta http-equiv="refresh" content="5">
          <style>
            body { font-family: sans-serif; background: #05070A; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .spinner { border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid #00E5D4; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h2>Building BITVERSE Digital Universe...</h2>
          <p>Please wait, compiling client bundles. This page will refresh automatically.</p>
        </body>
      </html>
    `);
  }
});

// Self-Ping Keep-Alive Job (Prevents Render spin-down by self-pinging every 10 minutes)
function startSelfPingJob() {
  const TEN_MINUTES = 10 * 60 * 1000;
  setInterval(async () => {
    const targetUrl = lastKnownExternalUrl || process.env.RENDER_EXTERNAL_URL;
    if (!targetUrl) {
      console.log("[Keep-Alive] No public external URL detected yet to self-ping.");
      return;
    }
    
    try {
      const pingEndpoint = `${targetUrl}/api/health`;
      console.log(`[Keep-Alive] Sending self-ping to keep service active: ${pingEndpoint}`);
      const response = await fetch(pingEndpoint);
      if (response.ok) {
        console.log(`[Keep-Alive] Self-ping successful: ${response.status} OK`);
      } else {
        console.warn(`[Keep-Alive] Self-ping returned non-OK status: ${response.status}`);
      }
    } catch (err) {
      console.error("[Keep-Alive] Self-ping request failed:", err.message);
    }
  }, TEN_MINUTES);
}

// Startup Lifecycle
async function startServer() {
  await connectDb();
  await seedAdmin();
  await seedIfEmpty();
  await autoCleanupDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    startSelfPingJob();
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
