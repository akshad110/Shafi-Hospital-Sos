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
  'path', 'src', 'uri', 'href', 'link', 'imageUrl', 'image', 'photo', 'fullPath',
  'storageUrl', 'mediaUrl', 'previewUrl', 'thumbnailUrl', 'documentUrl', 'assetUrl', 'cdnUrl',
  's3Url', 'bucketUrl', 'blobUrl', 'objectUrl', 'download_link', 'filePath', 'file_path',
]
const FILE_NAME_KEYS = ['fileName', 'filename', 'originalName', 'originalname', 'originalFilename', 'original_filename', 'key']
const DOCUMENT_ID_KEYS = ['documentId', 'requirementId', 'requiredDocumentId', 'docId', 'requirement', 'document_id', 'fileId', 'gridFsId', 'gridfsId']
const BUFFER_KEYS = ['data', 'buffer', 'bytes', 'content', 'file', 'fileData', 'binary', 'blob', 'body', 'image', 'pdf', 'base64', 'base64Data', 'fileBase64', 'data_base64']

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  if (value instanceof Date || Buffer.isBuffer(value) || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return null
  return value as Record<string, unknown>
}

function pick(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function asObjectId(value: unknown) {
  if (!value) return null
  const raw = typeof value === 'string' ? value : (asRecord(value) ? String((value as { _id?: unknown })._id || value) : String(value))
  return mongoose.Types.ObjectId.isValid(raw) && String(new mongoose.Types.ObjectId(raw)) === raw ? new mongoose.Types.ObjectId(raw) : null
}

function fileKey(file: WorkerFile) {
  return `${file.documentId || ''}|${file.url || ''}|${file.fileName || ''}|${file.id}`
}

function looksLikeUrl(value: string) {
  return /^(https?:\/\/|\/\/|\/uploads\/|\/files\/|data:image|data:application\/pdf|gs:\/\/)/i.test(value.trim())
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

export function mimeFromBytes(data?: Buffer, fileName = '', fallback = 'image/jpeg') {
  if (data && data.length >= 4) {
    if (data[0] === 0xff && data[1] === 0xd8) return 'image/jpeg'
    if (data[0] === 0x89 && data[1] === 0x50) return 'image/png'
    if (data.slice(0, 4).toString('ascii') === '%PDF') return 'application/pdf'
    if (data.slice(0, 4).toString('ascii') === 'GIF8') return 'image/gif'
    if (data.slice(0, 4).toString('ascii') === 'RIFF') return 'image/webp'
  }
  return mimeFromName(fileName, fallback)
}

export function asBuffer(value: unknown): Buffer | undefined {
  if (!value) return undefined
  if (Buffer.isBuffer(value)) return value.length ? value : undefined
  if (value instanceof Uint8Array) return value.length ? Buffer.from(value) : undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('data:') && trimmed.includes('base64,')) {
      const bytes = Buffer.from(trimmed.slice(trimmed.indexOf('base64,') + 7), 'base64')
      return bytes.length > 40 ? bytes : undefined
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
  if (typeof (value as { value?: unknown }).value === 'function') {
    try {
      const nested = (value as { value: () => unknown }).value()
      if (nested && nested !== value) {
        const bytes = asBuffer(nested)
        if (bytes) return bytes
      }
    } catch {
      /* ignore */
    }
  }
  const record = asRecord(value)
  if (!record) return undefined
  const typeName = String(record._bsontype || record.constructor?.name || '')
  if ((typeName === 'Binary' || typeName === 'Buffer') && record.buffer) return asBuffer(record.buffer)
  if (record.type === 'Buffer' && Array.isArray(record.data)) {
    const bytes = Buffer.from(record.data as number[])
    return bytes.length > 40 ? bytes : undefined
  }
  const binary = record.$binary
  if (typeof binary === 'string') return asBuffer(binary)
  if (asRecord(binary) && typeof (binary as { base64?: string }).base64 === 'string') {
    return asBuffer((binary as { base64: string }).base64)
  }
  for (const key of BUFFER_KEYS) {
    const nested = record[key]
    if (nested && nested !== value) {
      const bytes = asBuffer(nested)
      if (bytes) return bytes
    }
  }
  return undefined
}

function looksLikeFile(record: Record<string, unknown>) {
  const named = pick(record, FILE_NAME_KEYS) || pick(record, DOCUMENT_ID_KEYS)
  if (named) return true
  for (const key of BUFFER_KEYS) {
    if (asBuffer(record[key])) return true
  }
  const url = pick(record, URL_KEYS)
  return Boolean(url && (looksLikeUrl(url) || publicUrl(url)))
}

function publicUrl(value: string) {
  const raw = value.trim().replace(/^['"]|['"]$/g, '')
  if (!raw || raw.startsWith('file:') || raw.startsWith('content:') || raw.startsWith('/data/') || raw.startsWith('/storage/emulated')) return ''
  if (raw.startsWith('//')) return `https:${raw}`
  if (raw.startsWith('gs://')) {
    const rest = raw.slice(5)
    const slash = rest.indexOf('/')
    if (slash > 0) {
      const bucket = rest.slice(0, slash)
      const object = encodeURIComponent(rest.slice(slash + 1))
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${object}?alt=media`
    }
  }
  if (looksLikeUrl(raw)) return raw
  if (/^(https?:\/\/)/i.test(raw)) return raw
  if (/^firebasestorage\.googleapis\.com\//i.test(raw) || /^res\.cloudinary\.com\//i.test(raw) || /^storage\.googleapis\.com\//i.test(raw)) {
    return `https://${raw}`
  }
  return ''
}

function firstUrl(value: unknown, depth = 0): string {
  if (value == null || depth > 5) return ''
  if (typeof value === 'string') return publicUrl(value)
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstUrl(item, depth + 1)
      if (found) return found
    }
    return ''
  }
  const record = asRecord(value)
  if (!record) return ''
  for (const key of URL_KEYS) {
    const found = publicUrl(typeof record[key] === 'string' ? record[key] as string : '')
    if (found) return found
  }
  for (const nested of Object.values(record)) {
    const found = firstUrl(nested, depth + 1)
    if (found) return found
  }
  return ''
}

function firstBuffer(value: unknown, depth = 0): Buffer | undefined {
  if (value == null || depth > 5) return undefined
  if (Array.isArray(value) && value.length > 200 && typeof value[0] === 'number') return Buffer.from(value as number[])
  const direct = asBuffer(value)
  if (direct && direct.length > 80) return direct
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstBuffer(item, depth + 1)
      if (found) return found
    }
    return undefined
  }
  const record = asRecord(value)
  if (!record) return undefined
  for (const nested of Object.values(record)) {
    const found = firstBuffer(nested, depth + 1)
    if (found) return found
  }
  return undefined
}

function addFile(out: WorkerFile[], seen: Set<string>, value: unknown, fallbackName = '') {
  if (typeof value === 'string' && looksLikeUrl(value)) {
    addFile(out, seen, { url: value, name: fallbackName }, fallbackName)
    return
  }
  const record = asRecord(value)
  if (!record) return
  if (typeof record.file === 'string' && looksLikeUrl(record.file)) {
    addFile(out, seen, { ...record, url: record.file }, fallbackName)
    return
  }
  const nested = asRecord(record.file) || asRecord(record.asset) || asRecord(record.media)
  if (nested) {
    addFile(out, seen, { ...record, ...nested }, fallbackName)
    return
  }
  if (!looksLikeFile(record) && !firstUrl(record) && !firstBuffer(record)) return
  const fileName = pick(record, FILE_NAME_KEYS)
  const name = pick(record, NAME_KEYS) || fallbackName || fileName.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ')
  const url = firstUrl(record)
  const documentId = pick(record, DOCUMENT_ID_KEYS)
  const display = name.trim() || 'Document'
  const contentType = pick(record, ['contentType', 'mimeType', 'mimetype']) || (typeof record.type === 'string' && record.type.includes('/') ? record.type : '') || mimeFromName(fileName)
  const data = firstBuffer(record)
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
    if (looksLikeFile(record)) addFile(out, seen, record, fallbackName)
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

async function readGridStream(bucket: mongoose.mongo.GridFSBucket, id: mongoose.Types.ObjectId) {
  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    bucket.openDownloadStream(id)
      .on('data', (chunk) => chunks.push(chunk as Buffer))
      .on('error', reject)
      .on('end', () => resolve())
  })
  return Buffer.concat(chunks)
}

export async function findGridFile(fileName: string, ids: string[] = []) {
  const db = mongoose.connection.db
  if (!db) return null
  let collections: { name: string }[] = []
  try {
    collections = await db.listCollections().toArray()
  } catch {
    return null
  }
  const buckets = [...new Set(collections.map((item) => item.name).filter((name) => name.endsWith('.files')).map((name) => name.replace(/\.files$/, '')))]
  const objectIds = [...ids, fileName].map(asObjectId).filter(Boolean) as mongoose.Types.ObjectId[]
  const name = (fileName || '').trim()
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const clauses: Record<string, unknown>[] = []
  if (name) {
    clauses.push(
      { filename: name },
      { 'metadata.originalName': name },
      { 'metadata.fileName': name },
      { 'metadata.filename': name },
      { 'metadata.originalname': name },
    )
    if (escaped.length > 3) clauses.push({ filename: { $regex: `${escaped}$`, $options: 'i' } })
  }
  if (objectIds.length) clauses.push({ _id: { $in: objectIds } })
  for (const bucketName of buckets) {
    try {
      const query = clauses.length ? { $or: clauses } : null
      const meta = query
        ? await db.collection(`${bucketName}.files`).findOne(query)
        : null
      if (!meta) continue
      const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName })
      const data = await readGridStream(bucket, meta._id as mongoose.Types.ObjectId)
      if (!data.length) continue
      const storedName = typeof meta.filename === 'string' ? meta.filename : name
      const contentType = typeof meta.contentType === 'string' ? meta.contentType : mimeFromName(storedName || name)
      return { data, contentType, fileName: storedName || name }
    } catch {
      /* skip bucket */
    }
  }
  for (const id of objectIds) {
    for (const bucketName of buckets.length ? buckets : ['fs', 'uploads', 'files']) {
      try {
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName })
        const data = await readGridStream(bucket, id)
        if (data.length) return { data, contentType: mimeFromName(name, 'image/jpeg'), fileName: name }
      } catch {
        /* skip */
      }
    }
  }
  return null
}

function isRenderableFile(data: Buffer) {
  if (!data || data.length < 80) return false
  if (data[0] === 0xff && data[1] === 0xd8) return true
  if (data[0] === 0x89 && data[1] === 0x50) return true
  if (data.slice(0, 4).toString('ascii') === '%PDF') return true
  if (data.slice(0, 4).toString('ascii') === 'RIFF') return true
  if (data.slice(0, 4).toString('ascii') === 'GIF8') return true
  return data.length > 400
}

export function collectLooseBytes(value: unknown, depth = 0, nearbyName = ''): { fileName: string; data: Buffer }[] {
  if (value == null || depth > 7) return []
  if (Array.isArray(value)) return value.flatMap((item) => collectLooseBytes(item, depth + 1, nearbyName))
  const record = asRecord(value)
  if (!record) {
    const data = asBuffer(value)
    return data && isRenderableFile(data) ? [{ fileName: nearbyName, data }] : []
  }
  const fileName = pick(record, FILE_NAME_KEYS) || nearbyName
  const data = firstBuffer(record)
  const out: { fileName: string; data: Buffer }[] = []
  if (data && isRenderableFile(data)) out.push({ fileName, data })
  for (const [key, nested] of Object.entries(record)) {
    if (SKIP_KEYS.has(key) && key !== 'messages') continue
    out.push(...collectLooseBytes(nested, depth + 1, FILE_KEYS.includes(key) ? fileName : pick(asRecord(nested) || {}, FILE_NAME_KEYS) || fileName))
  }
  return out
}

export function attachLooseBytes(files: WorkerFile[], ...sources: unknown[]) {
  const bins = sources.flatMap((source) => collectLooseBytes(source))
  const used = new Set<number>()
  for (const file of files) {
    if (file.data && file.data.length) continue
    const index = bins.findIndex((item, i) => !used.has(i) && item.fileName && file.fileName && item.fileName === file.fileName)
    const fallback = index < 0 ? bins.findIndex((item, i) => !used.has(i)) : index
    if (fallback < 0) continue
    used.add(fallback)
    file.data = bins[fallback].data
    if (!file.contentType) file.contentType = mimeFromName(file.fileName, 'image/jpeg')
  }
  return files
}
