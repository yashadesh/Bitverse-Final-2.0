import { MongoClient } from 'mongodb';

const mongoUrl = process.env.MONGO_URL || process.env.DATABASE_URL;
const dbName = process.env.DB_NAME || "bitverse";

async function check() {
  if (!mongoUrl) return;
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db(dbName);
  
  const files = await db.collection("files").find({}).toArray();
  console.log("=== FILES IN DB ===");
  for (const f of files) {
    console.log(`File: "${f.display_name}" (${f.original_filename}) | id: ${f.id} | sub: ${f.subject_name} (${f.subject_id}) | mod: ${f.module_name} (${f.module_id}) | category: ${f.category} | deleted: ${f.is_deleted}`);
  }
  
  await client.close();
}

check().catch(console.error);
