import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Manually parse .env.local
try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
} catch {}

const uri = process.env.MONGODB_URI ?? '';
if (!uri) { console.error('MONGODB_URI not set!'); process.exit(1); }

console.log('Connecting to MongoDB...');
await mongoose.connect(uri);
const db = mongoose.connection.db;

// 1. Total chunk count
const count = await db.collection('chunks').countDocuments();
console.log('\n=== Chunk Stats ===');
console.log('Total chunks:', count);

if (count > 0) {
  // 2. Sample chunk - check embedding dimensions
  const chunk = await db.collection('chunks').findOne({});
  const embLen = Array.isArray(chunk.embedding) ? chunk.embedding.length : 'NOT ARRAY / MISSING';
  console.log('Sample embedding dimensions:', embLen);
  console.log('Sample content preview:', chunk.content?.slice(0, 80));
  
  // 3. Check for chunks WITHOUT embeddings
  const noEmbed = await db.collection('chunks').countDocuments({ 
    $or: [{ embedding: { $exists: false } }, { embedding: [] }, { embedding: null }] 
  });
  console.log('Chunks without embeddings:', noEmbed);
}

// 4. Vector Search Live Test (M0-compatible — no listSearchIndexes needed)
console.log('\n=== Vector Search Live Test ===');
if (count > 0) {
  try {
    const sample = await db.collection('chunks').findOne({ embedding: { $exists: true, $ne: [] } });
    if (!sample?.embedding) {
      console.log('⚠️  No chunk with embedding found to run test.');
    } else {
      const testVector = sample.embedding; // use real stored vector as query
      const results = await db.collection('chunks').aggregate([
        {
          $vectorSearch: {
            index: 'chunk_vector_index',
            path: 'embedding',
            queryVector: testVector,
            numCandidates: 10,
            limit: 3,
          },
        },
        { $project: { content: 1, score: { $meta: 'vectorSearchScore' } } },
      ]).toArray();

      if (results.length > 0) {
        console.log(`✅ Vector Search WORKING — returned ${results.length} result(s)`);
        console.log(`   Top score: ${results[0].score?.toFixed(4)}`);
        console.log(`   Top content: "${results[0].content?.slice(0, 80)}"`);
      } else {
        console.log('❌ Vector Search returned 0 results — index may not be active yet.');
        console.log('   Check MongoDB Atlas UI: make sure chunk_vector_index status is READY.');
      }
    }
  } catch (e) {
    console.log('❌ $vectorSearch failed:', e.message);
    console.log('   Possible causes:');
    console.log('   1. Index "chunk_vector_index" not created in Atlas UI yet');
    console.log('   2. Index is still BUILDING — wait a few minutes then retry');
    console.log('   3. Wrong index name or field path');
  }
} else {
  console.log('⚠️  No chunks in DB — upload a PDF first before testing vector search.');
}

await mongoose.disconnect();
console.log('\nDone.');
