import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const mongoUrl = process.env.MONGO_URL || process.env.DATABASE_URL || process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "bitverse";

let client = null;
let db = null;
let isConnected = false;

// Mock database store pre-seeded with some initial values
const mockDb = {
  admin_user: [],
  subjects: [],
  modules: [],
  files: [],
  resources: [],
  subject_stats: [],
  announcements: [],
  homepage_content: []
};

let lastConnectionError = null;

export function getDbStatus() {
  return {
    connected: isConnected,
    mode: isConnected ? "mongodb" : "memory_mock",
    mongodbConnected: isConnected,
    databaseName: isConnected ? (process.env.DB_NAME || "bitverse") : "in_memory",
    lastError: lastConnectionError ? lastConnectionError.message : null
  };
}

export async function connectDb() {
  if (isConnected && db) {
    return;
  }
  const connectionString = process.env.MONGO_URL || process.env.DATABASE_URL || process.env.MONGODB_URI;
  const targetDbName = process.env.DB_NAME || "bitverse";

  if (!connectionString) {
    console.warn("MONGO_URL not set, running in MOCK (in-memory) database mode.");
    isConnected = false;
    seedMockDb();
    return;
  }
  try {
    if (!client) {
      client = new MongoClient(connectionString, {
        connectTimeoutMS: 10000,
        serverSelectionTimeoutMS: 10000
      });
      await client.connect();
    }
    db = client.db(targetDbName);
    isConnected = true;
    console.log("Connected to MongoDB successfully.");

    // Create performance indexes to guarantee high scalability and fast queries
    try {
      await db.collection("files").createIndex({ subject_id: 1 });
      await db.collection("files").createIndex({ module_id: 1 });
      await db.collection("files").createIndex({ created_at: -1 });
      await db.collection("modules").createIndex({ subject_id: 1 });
      await db.collection("subject_stats").createIndex({ subject_id: 1 }, { unique: true });
      console.log("Database performance indexes configured successfully.");
    } catch (indexErr) {
      console.warn("Could not create performance indexes during database startup:", indexErr);
    }
  } catch (err) {
    console.error("Failed to connect to MongoDB. Falling back to MOCK (in-memory) database mode.", err);
    lastConnectionError = err;
    isConnected = false;
    seedMockDb();
  }
}

// Canonical Seeding Data
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

function seedMockDb() {
  if (mockDb.subjects.length > 0) return;
  console.log("Seeding in-memory database mock...");
  
  // Seed admin user
  const adminEmail = (process.env.ADMIN_EMAIL || "adeshyash.12@gmail.com").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "library0123";
  mockDb.admin_user.push({
    email: adminEmail,
    password_hash: bcrypt.hashSync(adminPassword, 10),
    created_at: new Date().toISOString()
  });

  // Seed subjects and modules
  let sId = 1;
  let mId = 1;
  
  // Semester 1 Subjects
  SEM1_SUBJECTS.forEach(([name, credits], idx) => {
    const subjectId = `s1-subj-${sId++}`;
    mockDb.subjects.push({
      id: subjectId,
      name,
      semester: 1,
      order: idx,
      credits,
      created_at: new Date().toISOString()
    });
    
    // 5 modules per subject
    for (let m = 1; m <= 5; m++) {
      mockDb.modules.push({
        id: `mod-${mId++}`,
        subject_id: subjectId,
        name: `Module ${m}`,
        order: m,
        created_at: new Date().toISOString()
      });
    }
  });

  // Semester 2 Subjects
  SEM2_SUBJECTS.forEach(([name, credits], idx) => {
    const subjectId = `s2-subj-${sId++}`;
    mockDb.subjects.push({
      id: subjectId,
      name,
      semester: 2,
      order: idx,
      credits,
      created_at: new Date().toISOString()
    });
    
    // 5 modules per subject
    for (let m = 1; m <= 5; m++) {
      mockDb.modules.push({
        id: `mod-${mId++}`,
        subject_id: subjectId,
        name: `Module ${m}`,
        order: m,
        created_at: new Date().toISOString()
      });
    }
  });

  // Seed some initial mock resources
  mockDb.resources.push({
    id: "res-1",
    title: "Thomas' Calculus (14th Edition)",
    url: "https://example.com/thomas-calculus",
    description: "The primary reference book for Mathematics-I and Mathematics-II.",
    resource_type: "book",
    created_at: new Date().toISOString()
  });

  mockDb.resources.push({
    id: "res-2",
    title: "NPTEL Programming for Problem Solving",
    url: "https://nptel.ac.in",
    description: "Excellent video lectures for learning PPS course concepts.",
    resource_type: "youtube",
    created_at: new Date().toISOString()
  });

  // Seed mock announcements
  mockDb.announcements.push({
    id: "ann-1",
    title: "Welcome to BITVERSE 2.0!",
    content: "The digital universe of BIT Mesra has been upgraded with a powerful Express/PostgreSQL/Mongo robust backend, live subject stats, PDF replacement capabilities, book link curation, and custom announcements. Explore now!",
    created_at: new Date().toISOString()
  });

  mockDb.announcements.push({
    id: "ann-2",
    title: "End Sem Syllabus & PYQs Uploaded",
    content: "Physics, Mathematics-II, PPS, and Biological Science PYQs for End Semester exams are now live. Students can check them in the PYQs Hub.",
    created_at: new Date(Date.now() - 86400000).toISOString()
  });

  // Seed homepage custom content
  mockDb.homepage_content.push({
    id: "hp-1",
    hero_title: "BITVERSE",
    hero_subtitle: "The Digital Universe of BIT Mesra",
    hero_description: "Notes · PYQs · Syllabus · Resources — everything a First Year BITian needs, in one beautiful place."
  });

  console.log("In-memory database seed complete.");
}

// Simple query matcher helper
function matches(doc, query) {
  if (!query) return true;
  for (const key in query) {
    const val = query[key];
    
    // Handle $or operator
    if (key === '$or' && Array.isArray(val)) {
      const anyMatch = val.some(subQuery => matches(doc, subQuery));
      if (!anyMatch) return false;
      continue;
    }
    
    // If the value in query is an object/operator
    if (val && typeof val === 'object' && !(val instanceof RegExp)) {
      if ('$ne' in val) {
        if (doc[key] === val['$ne']) return false;
      }
      if ('$exists' in val) {
        const exists = doc[key] !== undefined && doc[key] !== null;
        if (val['$exists'] !== exists) return false;
      }
      if ('$in' in val && Array.isArray(val['$in'])) {
        if (!val['$in'].includes(doc[key])) return false;
      }
      continue;
    }
    
    // Handle RegExp match
    if (val instanceof RegExp) {
      if (typeof doc[key] !== 'string' || !val.test(doc[key])) {
        return false;
      }
      continue;
    }
    
    // Simple direct match
    if (doc[key] !== val) {
      return false;
    }
  }
  return true;
}

// Simple query projection helper
function projectDoc(doc, projection) {
  if (!doc || !projection) return doc;
  const newDoc = { ...doc };
  for (const key in projection) {
    if (projection[key] === 0 || projection[key] === false) {
      delete newDoc[key];
    }
  }
  return newDoc;
}

export const dbService = {
  collection: (name) => {
    // Prevent undefined mock collection crashes on local fallback
    if (!mockDb[name]) {
      mockDb[name] = [];
    }
    return {
      findOne: async (query, options = {}) => {
        if (isConnected) {
          try {
            return await db.collection(name).findOne(query, options);
          } catch (err) {
            console.warn(`MongoDB query failed on ${name}. Falling back to mock.`, err);
          }
        }
        const doc = mockDb[name].find(d => matches(d, query)) || null;
        return doc ? projectDoc(doc, options.projection) : null;
      },
      find: (query, options = {}) => {
        let limitVal = null;
        if (isConnected) {
          try {
            const cursor = db.collection(name).find(query, options);
            const chain = {
              limit: (lim) => {
                limitVal = lim;
                cursor.limit(lim);
                return chain;
              },
              sort: (sortObj) => {
                cursor.sort(sortObj);
                const sortChain = {
                  limit: (lim) => {
                    limitVal = lim;
                    cursor.limit(lim);
                    return sortChain;
                  },
                  to_list: async (limit) => {
                    try {
                      if (limit || limitVal) cursor.limit(limit || limitVal);
                      return await cursor.toArray();
                    } catch (err) {
                      console.warn(`MongoDB to_list/toArray failed on ${name}. Falling back to mock.`, err);
                      let mockResults = mockDb[name].filter(doc => matches(doc, query));
                      const sortKey = Object.keys(sortObj)[0];
                      const sortDir = sortObj[sortKey];
                      mockResults.sort((a, b) => {
                        if (a[sortKey] < b[sortKey]) return sortDir === 1 ? -1 : 1;
                        if (a[sortKey] > b[sortKey]) return sortDir === 1 ? 1 : -1;
                        return 0;
                      });
                      return mockResults.slice(0, limit || limitVal || mockResults.length).map(doc => projectDoc(doc, options.projection));
                    }
                  },
                  toArray: async () => {
                    try {
                      if (limitVal) cursor.limit(limitVal);
                      return await cursor.toArray();
                    } catch (err) {
                      console.warn(`MongoDB toArray failed on ${name}. Falling back to mock.`, err);
                      let mockResults = mockDb[name].filter(doc => matches(doc, query));
                      const sortKey = Object.keys(sortObj)[0];
                      const sortDir = sortObj[sortKey];
                      mockResults.sort((a, b) => {
                        if (a[sortKey] < b[sortKey]) return sortDir === 1 ? -1 : 1;
                        if (a[sortKey] > b[sortKey]) return sortDir === 1 ? 1 : -1;
                        return 0;
                      });
                      return mockResults.slice(0, limitVal || mockResults.length).map(doc => projectDoc(doc, options.projection));
                    }
                  }
                };
                return sortChain;
              },
              to_list: async (limit) => {
                try {
                  if (limit || limitVal) cursor.limit(limit || limitVal);
                  return await cursor.toArray();
                } catch (err) {
                  console.warn(`MongoDB to_list failed on ${name}. Falling back to mock.`, err);
                  return mockDb[name].filter(doc => matches(doc, query)).slice(0, limit || limitVal || mockDb[name].length).map(doc => projectDoc(doc, options.projection));
                }
              },
              toArray: async () => {
                try {
                  if (limitVal) cursor.limit(limitVal);
                  return await cursor.toArray();
                } catch (err) {
                  console.warn(`MongoDB toArray failed on ${name}. Falling back to mock.`, err);
                  return mockDb[name].filter(doc => matches(doc, query)).slice(0, limitVal || mockDb[name].length).map(doc => projectDoc(doc, options.projection));
                }
              }
            };
            return chain;
          } catch (err) {
            console.warn(`MongoDB find failed on ${name}. Falling back to mock.`, err);
          }
        }
        
        // Mock fallback query
        let results = mockDb[name].filter(doc => matches(doc, query)).map(doc => projectDoc(doc, options.projection));
        let mockLimit = null;
        const mockChain = {
          limit: (lim) => {
            mockLimit = lim;
            return mockChain;
          },
          sort: (sortObj) => {
            const sortKey = Object.keys(sortObj)[0];
            const sortDir = sortObj[sortKey];
            results.sort((a, b) => {
              if (a[sortKey] < b[sortKey]) return sortDir === 1 ? -1 : 1;
              if (a[sortKey] > b[sortKey]) return sortDir === 1 ? 1 : -1;
              return 0;
            });
            const mockSortChain = {
              limit: (lim) => {
                mockLimit = lim;
                return mockSortChain;
              },
              to_list: async (limit) => results.slice(0, limit || mockLimit || results.length),
              toArray: async () => results.slice(0, mockLimit || results.length)
            };
            return mockSortChain;
          },
          to_list: async (limit) => results.slice(0, limit || mockLimit || results.length),
          toArray: async () => results.slice(0, mockLimit || results.length)
        };
        return mockChain;
      },
      countDocuments: async (query) => {
        if (isConnected) {
          try {
            return await db.collection(name).countDocuments(query);
          } catch (err) {
            console.warn(`MongoDB count failed on ${name}. Falling back to mock.`, err);
          }
        }
        return mockDb[name].filter(doc => matches(doc, query)).length;
      },
      insertOne: async (doc) => {
        if (isConnected) {
          try {
            const res = await db.collection(name).insertOne(doc);
            return { insertedId: res.insertedId };
          } catch (err) {
            console.warn(`MongoDB insert failed on ${name}. Falling back to mock.`, err);
          }
        }
        mockDb[name].push(doc);
        return { insertedId: doc.id || doc._id };
      },
      updateOne: async (query, update, options = {}) => {
        if (isConnected) {
          try {
            return await db.collection(name).updateOne(query, update, options);
          } catch (err) {
            console.warn(`MongoDB update failed on ${name}. Falling back to mock.`, err);
          }
        }
        let doc = mockDb[name].find(d => matches(d, query));
        if (!doc && options.upsert) {
          doc = { ...query };
          mockDb[name].push(doc);
        }
        if (doc) {
          if (update.$set) {
            Object.assign(doc, update.$set);
          }
          if (update.$inc) {
            for (const k in update.$inc) {
              doc[k] = (doc[k] || 0) + update.$inc[k];
            }
          }
        }
        return { matchedCount: doc ? 1 : 0, modifiedCount: doc ? 1 : 0, upsertedCount: !doc && options.upsert ? 1 : 0 };
      },
      findOneAndUpdate: async (query, update, options = {}) => {
        if (isConnected) {
          try {
            return await db.collection(name).findOneAndUpdate(query, update, options);
          } catch (err) {
            console.warn(`MongoDB findOneAndUpdate failed on ${name}. Falling back to mock.`, err);
          }
        }
        let doc = mockDb[name].find(d => matches(d, query));
        if (doc) {
          if (update.$set) {
            Object.assign(doc, update.$set);
          }
          if (update.$inc) {
            for (const k in update.$inc) {
              doc[k] = (doc[k] || 0) + update.$inc[k];
            }
          }
        }
        return doc;
      },
      updateMany: async (query, update) => {
        if (isConnected) {
          try {
            return await db.collection(name).updateMany(query, update);
          } catch (err) {
            console.warn(`MongoDB updateMany failed on ${name}. Falling back to mock.`, err);
          }
        }
        const docs = mockDb[name].filter(d => matches(d, query));
        docs.forEach(doc => {
          if (update.$set) {
            Object.assign(doc, update.$set);
          }
          if (update.$inc) {
            for (const k in update.$inc) {
              doc[k] = (doc[k] || 0) + update.$inc[k];
            }
          }
        });
        return { matchedCount: docs.length, modifiedCount: docs.length };
      },
      deleteOne: async (query) => {
        if (isConnected) {
          try {
            return await db.collection(name).deleteOne(query);
          } catch (err) {
            console.warn(`MongoDB delete failed on ${name}. Falling back to mock.`, err);
          }
        }
        const index = mockDb[name].findIndex(d => matches(d, query));
        if (index !== -1) {
          mockDb[name].splice(index, 1);
          return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
      },
      deleteMany: async (query) => {
        if (isConnected) {
          try {
            return await db.collection(name).deleteMany(query);
          } catch (err) {
            console.warn(`MongoDB deleteMany failed on ${name}. Falling back to mock.`, err);
          }
        }
        let count = 0;
        mockDb[name] = mockDb[name].filter(d => {
          if (matches(d, query)) {
            count++;
            return false;
          }
          return true;
        });
        return { deletedCount: count };
      },
      createIndex: async (indexSpec, options) => {
        if (isConnected) {
          try {
            return await db.collection(name).createIndex(indexSpec, options);
          } catch (err) {
            console.warn(`MongoDB createIndex failed on ${name}.`, err);
          }
        }
        return null;
      }
    };
  }
};
