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

const FILE_KEYS = ['uploads', 'documents', 'files', 'attachments', 'kycDocuments', 'certificates', 'kyc', 'proofs', 'idDocuments']

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function pick(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function addFile(out: WorkerFile[], seen: Set<string>, value: unknown) {
  const record = asRecord(value)
  if (!record) return
  const nested = record.file
  if (asRecord(nested)) {
    addFile(out, seen, { ...record, ...asRecord(nested) })
    return
  }
  const name = pick(record, ['name', 'title', 'label', 'type', 'kind', 'documentName', 'documentType', 'requirementName', 'code'])
  const url = pick(record, ['url', 'fileUrl', 'secure_url', 'path', 'src', 'uri', 'href', 'link', 'location'])
  const fileName = pick(record, ['fileName', 'filename', 'originalName', 'originalname'])
  const documentId = pick(record, ['documentId', 'requirementId', 'requiredDocumentId', 'docId'])
  const id = pick(record, ['id', 'documentId']) || (record._id ? String(record._id) : uid())
  if (!url && !fileName && !documentId) return
  const key = `${documentId}|${name}|${url}|${fileName}`
  if (seen.has(key)) return
  seen.add(key)
  out.push({
    id,
    name: name || fileName.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ') || 'Document',
    kind: pick(record, ['kind', 'type']) || undefined,
    url: url || undefined,
    fileName: fileName || undefined,
    documentId: documentId || undefined,
  })
}

export function collectWorkerFiles(...sources: unknown[]): WorkerFile[] {
  const out: WorkerFile[] = []
  const seen = new Set<string>()

  function walk(value: unknown, depth = 0) {
    if (value == null || depth > 5) return
    if (Array.isArray(value)) {
      for (const item of value) {
        if (Array.isArray(item) || (item && typeof item === 'object' && FILE_KEYS.some((key) => key in (item as object)))) {
          walk(item, depth + 1)
        } else {
          addFile(out, seen, item)
        }
      }
      return
    }
    const record = asRecord(value)
    if (!record) return
    let nested = false
    for (const key of FILE_KEYS) {
      if (key in record) {
        nested = true
        walk(record[key], depth + 1)
      }
    }
    for (const [key, nestedValue] of Object.entries(record)) {
      const child = asRecord(nestedValue)
      if (!child) continue
      if (pick(child, ['url', 'fileUrl', 'secure_url', 'path', 'src', 'uri', 'href']) || pick(child, ['fileName', 'filename'])) {
        nested = true
        addFile(out, seen, { name: key, ...child })
      }
    }
    if (!nested) addFile(out, seen, record)
  }

  for (const source of sources) walk(source)
  return out
}

export async function findWorkerRecord(workerId: string) {
  if (!workerId) return null
  const db = mongoose.connection.db
  if (!db) return null
  const ids: unknown[] = [workerId]
  if (mongoose.Types.ObjectId.isValid(workerId)) ids.push(new mongoose.Types.ObjectId(workerId))
  const collections = ['workers', 'users', 'staff']
  for (const name of collections) {
    try {
      const row = await db.collection(name).findOne({
        $or: [
          { id: workerId },
          { workerId },
          { uid: workerId },
          { userId: workerId },
          { _id: { $in: ids } },
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
  const ids: unknown[] = [id]
  if (mongoose.Types.ObjectId.isValid(id)) ids.push(new mongoose.Types.ObjectId(id))
  return db.collection('applications').findOne({
    $or: [{ id, hospitalId }, { _id: { $in: ids }, hospitalId }],
  })
}
