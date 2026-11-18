import mongoose from 'mongoose'
import { uid } from './util.js'

export interface WorkerFile {
  id: string
  name: string
  kind?: string
  url?: string
  fileName?: string
  documentId?: string
  contentType?: string
  data?: Buffer
}

const FILE_KEYS = [
  'uploads',
  'documents',
  'files',
  'attachments',
  'kycDocuments',
  'kyc',
  'proofs',
  'idDocuments',
  'documentUploads',
  'submittedDocuments',
  'idProofs',
  'applicationDocuments',
  'workerDocuments',
]

const SKIP_KEYS = new Set([
  '_id', 'id', 'password', 'passwordHash', 'hash', 'token', 'email', 'phone',
  'timeline', 'notes', 'documentReviews', 'payRules', 'payoutAccount', 'reviews',
  'job', 'hospital', 'shift', 'contract', 'notifications',
  'qualifications', 'certifications', 'certificates', 'skills', 'experience', 'messages',
])

const NAME_KEYS = ['name', 'title', 'label', 'type', 'kind', 'documentName', 'documentType', 'requirementName', 'requirement', 'code', 'category']
const URL_KEYS = [
  'url', 'fileUrl', 'secure_url', 'secureUrl', 'downloadURL', 'downloadUrl', 'signedUrl',
  'publicUrl', 'remoteUrl', 'file_url', 'download_url', 'signed_url', 'webViewLink', 'webContentLink',
  'path', 'src', 'uri', 'href', 'link', 'location', 'imageUrl', 'image', 'photo', 'fullPath',
]
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
  return /^(https?:\/\/|\/\/|\/uploads\/|\/files\/|data:|gs:\/\/)/i.test(value)
}

export function mimeFromName(fileName = '', fallback = 'application/octet-stream') {
  const name = fileName.toLowerCase()
  if (name.endsWith('.pdf')) return 'application/pdf'
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.webp')) return 'image/webp'
  if (name.endsWith('.gif')) return 'image/gif'
  if (name.endsWith('.heic') || name.endsWith('.heif')) return 'image/heic'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  return fallback
}

export function asBuffer(value: unknown): Buffer | undefined {
  if (!value) return undefined
  if (Buffer.isBuffer(value)) return value.length ? value : undefined
  if (value instanceof Uint8Array) return value.length ? Buffer.from(value) : undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('data:') && trimmed.includes('base64,')) {
      return Buffer.from(trimmed.slice(trimmed.indexOf('base64,') + 7), 'base64')
    }
    if (trimmed.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(trimmed.slice(0, 120))) {
      try {
        const bytes = Buffer.from(trimmed.replace(/\s+/g, ''), 'base64')
        if (bytes.length > 40) return bytes
      } catch {
        return undefined
      }
    }
    return undefined
  }
  const record = asRecord(value)
  if (!record) return undefined
  if (record._bsontype === 'Binary' && record.buffer) return asBuffer(record.buffer)
  if (record.type === 'Buffer' && Array.isArray(record.data)) return Buffer.from(record.data as number[])
  if (typeof record.base64 === 'string') return asBuffer(record.base64)
  for (const key of ['data', 'buffer', 'bytes', 'content']) {
    const nested = record[key]
    if (nested && nested !== value) {
      const bytes = asBuffer(nested)
      if (bytes) return bytes
    }
  }
  return undefined
}

function looksLikeFile(record: Record<string, unknown>) {
  return Boolean(
    pick(record, URL_KEYS)
    || pick(record, FILE_NAME_KEYS)
    || pick(record, DOCUMENT_ID_KEYS)
    || asBuffer(record.data)
    || asBuffer(record.buffer)
    || asBuffer(record.bytes)
    || asBuffer(record.content)
    || asBuffer(record.file)
    || asBuffer(record.fileData)
  )
}

function publicUrl(value: string) {
  if (!value) return ''
  if (value.startsWith('//')) return `https:${value}`
  if (looksLikeUrl(value) && !value.startsWith('file:') && !value.startsWith('gs:')) return value
  return ''
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
  const url = publicUrl(pick(record, URL_KEYS))
  const documentId = pick(record, DOCUMENT_ID_KEYS)
  const display = name.trim() || 'Document'
  const contentType = pick(record, ['contentType', 'mimeType', 'mimetype']) || (typeof record.type === 'string' && record.type.includes('/') ? record.type : '') || mimeFromName(fileName)
  const data = asBuffer(record.data) || asBuffer(record.buffer) || asBuffer(record.bytes) || asBuffer(record.content) || asBuffer(record.file) || asBuffer(record.fileData) || asBuffer(record.image) || asBuffer(record.base64)
  const id = pick(record, ['id']) || documentId || (record._id ? String(record._id) : [fileName, display, url, documentId].filter(Boolean).join('|') || uid())
  const key = `${documentId}|${url}|${fileName}|${display}|${data?.length || 0}`
  if (seen.has(key)) return
  seen.add(key)
  if (!url && !fileName && !documentId && !data) return
  out.push({
    id,
    name: display,
    kind: pick(record, ['kind', 'type']) || undefined,
    url: url || undefined,
    fileName: fileName || undefined,
    documentId: documentId || undefined,
    contentType: contentType || undefined,
    data,
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

const GENERIC_TOKENS = new Set(['card', 'file', 'document', 'image', 'photo', 'scan', 'copy', 'pdf', 'id', 'doc', 'upload', 'certificate', 'certification', 'qualification'])

function matchesName(file: WorkerFile, requiredName: string) {
  const need = tokens(requiredName)
  const have = tokens([file.name, file.fileName, file.kind, file.documentId].filter(Boolean).join(' '))
  if (!need || !have) return false
  if (have === need) return true
  if (have.includes(need) || (need.includes(have) && have.length > 3 && !GENERIC_TOKENS.has(have))) return true
  const compactNeed = need.replace(/\s+/g, '')
  const compactHave = have.replace(/\s+/g, '')
  if (compactHave.includes(compactNeed) || (compactNeed.includes(compactHave) && compactHave.length > 3 && !GENERIC_TOKENS.has(have))) return true
  const aliases = [
    ['aadhaar', 'aadhar', 'adhar', 'uidai'],
    ['pan', 'pancard'],
    ['doctor', 'mbbs'],
    ['licence', 'license', 'nursing'],
  ]
  return aliases.some((group) => (
    group.some((alias) => need.includes(alias) || compactNeed.includes(alias))
    && group.some((alias) => have.includes(alias) || compactHave.includes(alias))
  ))
}

function unnamedUpload(file: WorkerFile) {
  const name = tokens(file.name)
  const fileName = tokens(file.fileName || '').replace(/\s[a-z0-9]+$/, '')
  if (!name || GENERIC_TOKENS.has(name) || /^image\d*$/.test(name.replace(/\s+/g, ''))) return true
  if (fileName && (GENERIC_TOKENS.has(fileName) || /^image\d*$/.test(fileName.replace(/\s+/g, '')))) return true
  return false
}

function uniqueRequired(required: { id?: string; name?: string }[]) {
  const seen = new Set<string>()
  const out: { id?: string; name?: string }[] = []
  for (const item of required) {
    const key = tokens(item?.name || '')
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

export function attachFilesToRequirements(
  applicationFiles: WorkerFile[],
  otherFiles: WorkerFile[],
  required: { id?: string; name?: string }[],
) {
  const needed = uniqueRequired(required)
  if (!needed.length) return []
  const used = new Set<string>()
  const assigned: WorkerFile[] = []

  function take(file: WorkerFile, req: { id?: string; name?: string }) {
    assigned.push({ ...file, name: req.name || file.name, documentId: file.documentId || req.id })
    used.add(fileKey(file))
  }

  function findIn(list: WorkerFile[], req: { id?: string; name?: string }) {
    return list.find((file) => {
      if (used.has(fileKey(file))) return false
      if (req.id && (file.documentId === req.id || file.id === req.id)) return true
      return matchesName(file, req.name || '')
    })
  }

  for (const req of needed) {
    const match = findIn(applicationFiles, req) || findIn(otherFiles, req)
    if (match) take(match, req)
  }

  const leftover = applicationFiles.filter((file) => !used.has(fileKey(file)) && unnamedUpload(file))
  for (const req of needed) {
    if (assigned.some((file) => file.documentId === req.id || tokens(file.name) === tokens(req.name || ''))) continue
    const next = leftover.shift()
    if (next) take(next, req)
  }

  return needed.map((req) => assigned.find((file) => file.documentId === req.id || tokens(file.name) === tokens(req.name || ''))).filter(Boolean) as WorkerFile[]
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

export async function findGridFile(fileName: string) {
  const db = mongoose.connection.db
  if (!db || !fileName) return null
  let collections: { name: string }[] = []
  try {
    collections = await db.listCollections().toArray()
  } catch {
    return null
  }
  const buckets = [...new Set(collections.map((item) => item.name).filter((name) => name.endsWith('.files')).map((name) => name.replace(/\.files$/, '')))]
  for (const bucketName of buckets) {
    try {
      const meta = await db.collection(`${bucketName}.files`).findOne({
        $or: [{ filename: fileName }, { 'metadata.originalName': fileName }, { 'metadata.fileName': fileName }],
      })
      if (!meta) continue
      const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName })
      const chunks: Buffer[] = []
      await new Promise<void>((resolve, reject) => {
        bucket.openDownloadStream(meta._id)
          .on('data', (chunk) => chunks.push(chunk as Buffer))
          .on('error', reject)
          .on('end', () => resolve())
      })
      const data = Buffer.concat(chunks)
      if (!data.length) continue
      const contentType = typeof meta.contentType === 'string' ? meta.contentType : mimeFromName(fileName)
      return { data, contentType, fileName }
    } catch {
      /* skip bucket */
    }
  }
  return null
}
