import fs from 'node:fs/promises'
import path from 'node:path'
import { HttpError } from './errors.js'
import { getSupabaseClient, hasSupabaseConfig } from './supabase.js'

const TABLE = 'tasks'
const SELECT_FIELDS = 'id, title, priority, completed, created_at'

/* ------------------------------------------------------------------ */
/* 存储模式判定                                                         */
/* ------------------------------------------------------------------ */

export function getStorageMode() {
  if (hasSupabaseConfig()) return 'supabase'
  return process.env.NODE_ENV === 'production' ? 'unconfigured' : 'local'
}

function requireSupabase() {
  const client = getSupabaseClient()
  if (!client) {
    throw new HttpError(
      500,
      '服务端未配置 Supabase：请在 .env 或 Vercel 环境变量中设置 SUPABASE_URL 与 SUPABASE_ANON_KEY'
    )
  }
  return client
}

/**
 * 把 Supabase 的错误码翻译成学生看得懂的中文提示
 */
function toHttpError(error) {
  const code = error?.code || ''
  const message = error?.message || '未知错误'

  if (code === '42P01' || /relation .*tasks.* does not exist/i.test(message)) {
    return new HttpError(500, '数据表 tasks 不存在：请先在 Supabase SQL Editor 执行 supabase/schema.sql 建表')
  }
  if (code === '42501' || /row-level security/i.test(message)) {
    return new HttpError(500, '写入被行级安全策略（RLS）拦截：请执行 supabase/schema.sql 中的 RLS 策略 SQL')
  }
  if (code === '23514' || /check constraint/i.test(message)) {
    return new HttpError(400, 'priority 只能是「高」「中」「低」三个值之一')
  }
  if (code === 'PGRST116') {
    return new HttpError(404, '任务不存在或已被删除')
  }
  return new HttpError(500, `数据库操作失败：${message}`)
}

/* ------------------------------------------------------------------ */
/* Supabase 实现                                                        */
/* ------------------------------------------------------------------ */

async function supabaseList(priority) {
  const client = requireSupabase()
  let query = client.from(TABLE).select(SELECT_FIELDS)

  if (priority) query = query.eq('priority', priority)

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

  if (error) throw toHttpError(error)
  return data ?? []
}

async function supabaseInsert(input) {
  const client = requireSupabase()
  const { data, error } = await client.from(TABLE).insert(input).select(SELECT_FIELDS).single()
  if (error) throw toHttpError(error)
  return data
}

async function supabaseUpdate(id, patch) {
  const client = requireSupabase()
  const { data, error } = await client
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select(SELECT_FIELDS)
    .maybeSingle()

  if (error) throw toHttpError(error)
  if (!data) throw new HttpError(404, '任务不存在或已被删除')
  return data
}

async function supabaseRemove(id) {
  const client = requireSupabase()
  const { error, count } = await client.from(TABLE).delete({ count: 'exact' }).eq('id', id)

  if (error) throw toHttpError(error)
  if (!count) throw new HttpError(404, '任务不存在或已被删除')
  return { id }
}

/* ------------------------------------------------------------------ */
/* 本地演示存储（未配置 Supabase 时使用，仅开发环境）                     */
/* ------------------------------------------------------------------ */

const DATA_DIR = process.env.LOCAL_DATA_DIR || path.resolve(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'tasks.json')

let writeQueue = Promise.resolve()

function withWriteLock(task) {
  const next = writeQueue.then(task, task)
  writeQueue = next.then(
    () => undefined,
    () => undefined
  )
  return next
}

async function readLocalFile() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    if (error.code === 'ENOENT') return []
    if (error instanceof SyntaxError) return []
    throw error
  }
}

async function writeLocalFile(rows) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(rows, null, 2), 'utf8')
}

async function localList(priority) {
  const rows = await readLocalFile()
  const filtered = priority ? rows.filter((row) => row.priority === priority) : rows
  return filtered.sort((a, b) => {
    if (a.created_at === b.created_at) return b.id - a.id
    return a.created_at < b.created_at ? 1 : -1
  })
}

function localInsert(input) {
  return withWriteLock(async () => {
    const rows = await readLocalFile()
    const nextId = rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1
    const row = {
      id: nextId,
      title: input.title,
      priority: input.priority,
      completed: false,
      created_at: new Date().toISOString()
    }
    rows.push(row)
    await writeLocalFile(rows)
    return row
  })
}

function localUpdate(id, patch) {
  return withWriteLock(async () => {
    const rows = await readLocalFile()
    const row = rows.find((item) => Number(item.id) === id)
    if (!row) throw new HttpError(404, '任务不存在或已被删除')
    Object.assign(row, patch)
    await writeLocalFile(rows)
    return row
  })
}

function localRemove(id) {
  return withWriteLock(async () => {
    const rows = await readLocalFile()
    const index = rows.findIndex((item) => Number(item.id) === id)
    if (index === -1) throw new HttpError(404, '任务不存在或已被删除')
    rows.splice(index, 1)
    await writeLocalFile(rows)
    return { id }
  })
}

/* ------------------------------------------------------------------ */
/* 对外统一接口                                                          */
/* ------------------------------------------------------------------ */

function assertStorageReady() {
  const mode = getStorageMode()
  if (mode === 'supabase' || mode === 'local') return mode
  throw new HttpError(
    500,
    '服务端未配置 Supabase：请在 .env 或 Vercel 环境变量中设置 SUPABASE_URL 与 SUPABASE_ANON_KEY'
  )
}

export async function list(priority) {
  return assertStorageReady() === 'supabase' ? supabaseList(priority) : localList(priority)
}

export async function insert(input) {
  return assertStorageReady() === 'supabase' ? supabaseInsert(input) : localInsert(input)
}

export async function update(id, patch) {
  return assertStorageReady() === 'supabase' ? supabaseUpdate(id, patch) : localUpdate(id, patch)
}

export async function remove(id) {
  return assertStorageReady() === 'supabase' ? supabaseRemove(id) : localRemove(id)
}
