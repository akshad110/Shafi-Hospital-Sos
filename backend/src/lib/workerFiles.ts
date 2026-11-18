import mongoose from 'mongoose'
import { uid } from './util.js'

export interface WorkerFile {
  id: string
  name: string
  kind?: string
  url?: string
  fileName?: string
  documentId?: string
}

const FILE_KEYS = [
  'uploads',
  'documents',
  'files',
  'attachments',
  'kycDocuments',
  'certificates',
  'kyc',
  'proofs',
  'idDocuments',
  'documentUploads',
  'submittedDocuments',
  'idProofs',
  'requiredDocuments',
  'applicationDocuments',
  'workerDocuments',
  'media',
  'images',
  'photos',
]

const SKIP_KEYS = new Set([
  '_id', 'id', 'password', 'passwordHash', 'hash', 'token', 'email', 'phone',
  'timeline', 'notes', 'documentReviews', 'payRules', 'payoutAccount', 'reviews',
  'job', 'hospital', 'shift', 'contract', 'notifications',
])

const NAME_KEYS = ['name', 'title', 'label', 'type', 'kind', 'documentName', 'documentType', 'requirementName', 'requirement', 'code', 'category']
const URL_KEYS = ['url', 'fileUrl', 'secure_url', 'secureUrl', 'downloadURL', 'downloadUrl', 'signedUrl', 'path', 'src', 'uri', 'href', 'link', 'location', 'imageUrl', 'image', 'photo']
const FILE_NAME_KEYS = ['fileName', 'filename', 'originalName', 'originalname', 'key']
const DOCUMENT_ID_KEYS = ['documentId', 'requirementId', 'requiredDocumentId', 'docId', 'requirement', 'document_id']

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !Buffer.isBuffer(value)
    ? value as Record<string, unknown>
    : null
}

function pick(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function fileKey(file: WorkerFile) {
  return `${file.documentId || ''}|${file.url || ''}|${file.fileName || ''}|${file.id}`
}

function looksLikeUrl(value: string) {
  return /^(https?:\/\/|\/uploads\/|\/files\/|data:)/i.test(value)
}

function looksLikeFile(record: Record<string, unknown>) {
  return Boolean(
    pick(record, URL_KEYS)
    || pick(record, FILE_NAME_KEYS)
    || pick(record, DOCUMENT_ID_KEYS)
    || (typeof record.data === 'string' && record.data.length > 40)
  )
}

function addFile(out: WorkerFile[], seen: Set<string>, value: unknown, fallbackName = '') {
  if (typeof value === 'string' && looksLikeUrl(value)) {
    addFile(out, seen, { url: value, name: fallbackName }, fallbackName)
    return
  }
  const record = asRecord(value)
  if (!record) return
  const nested = asRecord(record.file) || asRecord(record.asset) || asRecord(record.media)
  if (nested) {
    addFile(out, seen, { ...record, ...nested }, fallbackName)
    return
  }
  if (!looksLikeFile(record)) return
  const fileName = pick(record, FILE_NAME_KEYS)
  const name = pick(record, NAME_KEYS) || fallbackName || fileName.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ')
  const url = pick(record, URL_KEYS)
  const documentId = pick(record, DOCUMENT_ID_KEYS)
  const id = pick(record, ['id']) || documentId || (record._id ? String(record._id) : uid())
  const display = name.trim() || 'Document'
  const key = `${documentId}|${url}|${fileName}|${display}`
  if (seen.has(key)) return
  seen.add(key)
  out.push({
    id,
    name: display,
    kind: pick(record, ['kind', 'type']) || undefined,
    url: url || undefined,
    fileName: fileName || undefined,
    documentId: documentId || undefined,
  })
}

export function collectWorkerFiles(...sources: unknown[]): WorkerFile[] {
  const out: WorkerFile[] = []
  const seen = new Set<string>()

  function walk(value: unknown, depth = 0, fallbackName = '') {
    if (value == null || depth > 6) return
    if (typeof value === 'string' && looksLikeUrl(value)) {
      addFile(out, seen, { url: value, name: fallbackName }, fallbackName)
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1, fallbackName)
      return
    }
    const record = asRecord(value)
    if (!record) return
    if (looksLikeFile(record)) {
      addFile(out, seen, record, fallbackName)
      return
    }
    for (const [key, nested] of Object.entries(record)) {
      if (SKIP_KEYS.has(key)) continue
      if (/logo|avatar|thumbnail|icon|banner|cover|favicon/i.test(key) && !/aadhar|aadhaar|pan|licence|license|cert/i.test(key)) continue
      const childName = FILE_KEYS.includes(key) ? fallbackName : key
      if (FILE_KEYS.includes(key) || Array.isArray(nested)) {
        walk(nested, depth + 1, childName)
        continue
      }
      const child = asRecord(nested)
      if (child && looksLikeFile(child)) {
        addFile(out, seen, { name: childName, ...child }, childName)
        continue
      }
      if (typeof nested === 'string' && looksLikeUrl(nested)) {
        addFile(out, seen, { name: childName, url: nested }, childName)
        continue
      }
      if (child) walk(nested, depth + 1, childName)
    }
  }

  for (const source of sources) walk(source)
  return out
}

function tokens(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function matchesName(file: WorkerFile, requiredName: string) {
  const need = tokens(requiredName)
  const have = tokens([file.name, file.fileName, file.kind, file.documentId].filter(Boolean).join(' '))
  if (!need || !have) return false
  if (have === need || have.includes(need) || need.includes(have)) return true
  const compactNeed = need.replace(/\s+/g, '')
  const compactHave = have.replace(/\s+/g, '')
  if (compactHave.includes(compactNeed) || compactNeed.includes(compactHave)) return true
  const aliases = [
    ['aadhaar', 'aadhar', 'adhar', 'uidai', 'uid'],
    ['pan', 'pancard'],
    ['doctor', 'mbbs', 'medical'],
    ['licence', 'license', 'nursing', 'rn'],
  ]
  return aliases.some((group) => (
    group.some((alias) => need.includes(alias) || compactNeed.includes(alias))
    && group.some((alias) => have.includes(alias) || compactHave.includes(alias))
  ))
}

export function attachFilesToRequirements(files: WorkerFile[], required: { id?: string; name?: string }[]) {
  const needed = required.filter((item) => item?.name)
  if (!files.length) return files
  const used = new Set<string>()
  const assigned: WorkerFile[] = []

  function take(file: WorkerFile, name: string, documentId?: string) {
    assigned.push({ ...file, name, documentId: file.documentId || documentId })
    used.add(fileKey(file))
  }

  for (const req of needed) {
    const match = files.find((file) => {
      if (used.has(fileKey(file))) return false
      if (req.id && (file.documentId === req.id || file.id === req.id)) return true
      return matchesName(file, req.name || '')
    })
    if (match) take(match, req.name || match.name, req.id)
  }

  const leftover = files.filter((file) => !used.has(fileKey(file)))
  const missing = needed.filter((req) => !assigned.some((file) => file.documentId === req.id || tokens(file.name) === tokens(req.name || '')))
  leftover.forEach((file, index) => {
    const req = missing[index]
    if (req) take(file, req.name || file.name, req.id)
    else assigned.push({ ...file, name: file.name || file.fileName || 'Document' })
  })
  return assigned
}

function objectIdsFor(value: string) {
  return mongoose.Types.ObjectId.isValid(value) ? [new mongoose.Types.ObjectId(value)] : []
}

export async function findWorkerRecord(workerId: string) {
  if (!workerId) return null
  const db = mongoose.connection.db
  if (!db) return null
  const objectIds = objectIdsFor(workerId)
  for (const name of ['workers', 'users', 'staff', 'profiles']) {
    try {
      const row = await db.collection(name).findOne({
        $or: [
          { id: workerId },
          { workerId },
          { uid: workerId },
          { userId: workerId },
          ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
        ],
      })
      if (row) return row
    } catch {
      /* collection may not exist */
    }
  }
  return null
}

export async function findRawApplication(id: string, hospitalId: string) {
  const db = mongoose.connection.db
  if (!db) return null
  const objectIds = objectIdsFor(id)
  return db.collection('applications').findOne({
    $or: [
      { id, hospitalId },
      { id },
      ...(objectIds.length ? [{ _id: { $in: objectIds }, hospitalId }, { _id: { $in: objectIds } }] : []),
    ],
  })
}

let relatedCollectionNames: string[] | null = null

export async function findRelatedFileRecords(ids: string[]) {
  const db = mongoose.connection.db
  if (!db) return []
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return []
  const objectIds = unique.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id))
  const clauses: Record<string, unknown>[] = [
    { applicationId: { $in: unique } },
    { workerId: { $in: unique } },
    { jobId: { $in: unique } },
    { userId: { $in: unique } },
    { uid: { $in: unique } },
    { id: { $in: unique } },
  ]
  if (objectIds.length) {
    clauses.push(
      { applicationId: { $in: objectIds } },
      { workerId: { $in: objectIds } },
      { jobId: { $in: objectIds } },
      { userId: { $in: objectIds } },
      { _id: { $in: objectIds } },
    )
  }
  if (!relatedCollectionNames) {
    try {
      const collections = await db.listCollections().toArray()
      relatedCollectionNames = collections
        .map((item) => item.name)
        .filter((name) => /doc|upload|file|kyc|media|attach|cert|proof|image/i.test(name))
        .filter((name) => !/^hospital/i.test(name) && name !== 'system.indexes')
    } catch {
      relatedCollectionNames = []
    }
  }
  const names = relatedCollectionNames
  const out: unknown[] = []
  for (const name of names) {
    try {
      const rows = await db.collection(name).find({ $or: clauses }).limit(80).toArray()
      out.push(...rows)
    } catch {
      /* skip */
    }
  }
  return out
}
