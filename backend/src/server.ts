import http from 'http'
import { Server } from 'socket.io'
import { createApp } from './app.js'
import { config } from './config.js'
import { connectDatabase } from './db.js'
import { ensureHospitalHiring, isDatabaseEmpty, seedDatabase } from './data/seeder.js'
import { watchDatabase } from './realtime.js'
import { startScheduler } from './scheduler.js'
import { attachSocket } from './socket.js'

try {
  await connectDatabase()
} catch (error) {
  console.error((error as Error).message)
  process.exit(1)
}

if (config.autoSeed && (await isDatabaseEmpty())) {
  await seedDatabase()
  console.log('Empty database: loaded demo seed data (admin@cityhospital.com / Hospital@123).')
} else {
  await ensureHospitalHiring()
}

const app = createApp()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: config.clientOrigins, credentials: true } })
attachSocket(io)
await watchDatabase()
startScheduler()

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Another Hospital SOS API is probably running; stop it or set PORT in backend/.env.`)
    process.exit(1)
  }
  throw error
})

server.listen(config.port, '0.0.0.0', () => {
  console.log(`Hospital SOS API listening on port ${config.port}`)
})
