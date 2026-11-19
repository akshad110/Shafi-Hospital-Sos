import mongoose from 'mongoose'
import { config } from '../config.js'

function summarize(value: unknown, depth = 0): unknown {
  if (value == null) return value
  if (Buffer.isBuffer(value)) return { _type: 'Buffer', bytes: value.length }
  if (value instanceof Uint8Array) return { _type: 'Uint8Array', bytes: value.length }
  if (typeof value === 'string') {
    if (value.length > 80) return `${value.slice(0, 60)}… (${value.length} chars)`
    return value
  }
  if (typeof value !== 'object') return value
  const record = value as Record<string, unknown>
  if (record._bsontype === 'Binary') return { _type: 'Binary', bytes: (record.buffer as Buffer | undefined)?.length }
  if (Array.isArray(value)) return value.slice(0, 8).map((item) => summarize(item, depth + 1))
  if (depth > 4) return `{object keys: ${Object.keys(record).join(',')}}`
  const out: Record<string, unknown> = {}
  for (const [key, nested] of Object.entries(record)) {
    if (key === 'passwordHash' || key === 'password') continue
    out[key] = summarize(nested, depth + 1)
  }
  return out
}

async function main() {
  if (!config.mongoUri) throw new Error('MONGODB_URI missing')
  await mongoose.connect(config.mongoUri)
  const db = mongoose.connection.db
  if (!db) throw new Error('no db')
  const collections = (await db.listCollections().toArray()).map((item) => item.name)
  console.log('collections', collections)
  const app = await db.collection('applications').findOne(
    { $or: [{ id: 'a18d322d' }, { workerName: /aksh/i }] },
    { sort: { appliedAt: -1 } },
  ) || await db.collection('applications').find().sort({ appliedAt: -1 }).limit(1).next()
  console.log('application keys', app ? Object.keys(app) : null)
  console.log('application summary', JSON.stringify(summarize(app), null, 2))
  if (app?.workerId) {
    const worker = await db.collection('workers').findOne({ $or: [{ id: app.workerId }, { workerId: app.workerId }] })
    console.log('worker keys', worker ? Object.keys(worker) : null)
    console.log('worker files', JSON.stringify(summarize({
      documents: worker?.documents,
      files: worker?.files,
      uploads: worker?.uploads,
      kyc: worker?.kyc,
      kycDocuments: worker?.kycDocuments,
    }), null, 2))
  }
  await mongoose.disconnect()
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
