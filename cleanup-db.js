import { MongoClient } from 'mongodb';

const mongoUrl = process.env.MONGO_URL || process.env.DATABASE_URL || process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "bitverse";

if (!mongoUrl) {
  console.error("ERROR: MONGO_URL environment variable is missing.");
  console.log("Usage: MONGO_URL='mongodb+srv://user:pass@cluster.mongodb.net' node cleanup-db.js");
  process.exit(1);
}

async function cleanup() {
  console.log("Connecting to MongoDB Atlas...");
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db(dbName);

  console.log(`Connected to database: ${dbName}`);

  // 1. Clean activity_log
  const activityLogCol = db.collection("activity_log");
  const logCount = await activityLogCol.countDocuments();
  console.log(`Current activity_log document count: ${logCount}`);

  if (logCount > 50) {
    // Keep 50 newest, delete the rest
    const newestLogs = await activityLogCol.find({}, { projection: { _id: 1 } })
      .sort({ time: -1 })
      .limit(50)
      .toArray();
    const keepIds = newestLogs.map(l => l._id);
    const deleteResult = await activityLogCol.deleteMany({ _id: { $nin: keepIds } });
    console.log(`Deleted ${deleteResult.deletedCount} old log records from activity_log.`);
  } else {
    console.log("activity_log count is low, no deletion needed.");
  }

  // 2. Clean soft-deleted files
  const filesCol = db.collection("files");
  const deletedFilesResult = await filesCol.deleteMany({ is_deleted: true });
  console.log(`Permanently removed ${deletedFilesResult.deletedCount} soft-deleted files.`);

  // 3. Remove heavy base64 data for files hosted on external URLs (Cloudinary/Storage)
  const stripB64Result = await filesCol.updateMany(
    { file_data_b64: { $exists: true }, url: { $regex: '^https?://' } },
    { $unset: { file_data_b64: "" } }
  );
  console.log(`Stripped redundant base64 data from ${stripB64Result.modifiedCount} files.`);

  console.log("\nCleanup Complete! Check your MongoDB Atlas storage dashboard now.");
  await client.close();
}

cleanup().catch(err => {
  console.error("Cleanup error:", err);
  process.exit(1);
});
