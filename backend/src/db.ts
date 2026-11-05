import mongoose from 'mongoose'
import { config } from './config.js'
import { allModels } from './models.js'

export async function connectDatabase() {
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI is not set. Add it to backend/.env (see .env.example).')
  }
  mongoose.set('strictQuery', true)
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 })
  } catch (error) {
    const message = (error as Error).message
    const hint = /whitelist|IP/i.test(message)
      ? 'Atlas refused this machine. Add your current IP under Atlas → Network Access, then restart.'
      : 'Check that MongoDB is running and MONGODB_URI is correct.'
    throw new Error(`Could not connect to MongoDB. ${hint}\n${message}`)
  }
  await Promise.all(allModels.map((model) => model.syncIndexes()))
  console.log(`MongoDB connected (${mongoose.connection.name})`)
}

export async function disconnectDatabase() {
  await mongoose.disconnect()
}

export async function supportsChangeStreams() {
  const db = mongoose.connection.db
  if (!db) return false
  const hello = await db.admin().command({ hello: 1 })
  return Boolean(hello.setName || hello.msg === 'isdbgrid')
}
