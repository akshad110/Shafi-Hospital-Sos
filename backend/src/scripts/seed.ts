import { connectDatabase, disconnectDatabase } from '../db.js'
import { seedDatabase } from '../data/seeder.js'

try {
  await connectDatabase()
  const counts = await seedDatabase()
  console.table(counts)
  console.log('Seed complete. Sign in with admin@cityhospital.com / Hospital@123')
} catch (error) {
  console.error((error as Error).message)
  process.exitCode = 1
} finally {
  await disconnectDatabase()
}
