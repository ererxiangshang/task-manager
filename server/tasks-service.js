import { HttpError } from './errors.js'
import * as store from './store.js'

const PRIORITIES = ['高', '中', '低']
const MAX_TITLE_LENGTH = 200

function normalizePriority(value) {
  const priority = String(value ?? '中').trim()
  if (!PRIORITIES.includes(priority)) {
    throw new HttpError(400, '优先级只能是「高」「中」「低」')
  }
  return priority
}

function normalizeTitle(value) {
  const title = String(value ?? '').trim()
  if (!title) throw new HttpError(400, '任务标题不能为空')
  if (title.length > MAX_TITLE_LENGTH) {
    throw new HttpError(400, `任务标题不能超过 ${MAX_TITLE_LENGTH} 个字符`)
  }
  return title
}

export function normalizeId(value) {
  const raw = String(value ?? '').trim()
  if (!/^\d+$/.test(raw)) throw new HttpError(400, '任务 id 必须是正整数')
  return Number(raw)
}

export async function listTasks(query = {}) {
  const rawPriority = query.priority
  const priority = rawPriority ? normalizePriority(rawPriority) : ''
  const tasks = await store.list(priority)
  return tasks
}

export async function createTask(input = {}) {
  const title = normalizeTitle(input.title)
  const priority = normalizePriority(input.priority)
  return store.insert({ title, priority })
}

export async function updateTask(rawId, input = {}) {
  const id = normalizeId(rawId)

  if (typeof input.completed !== 'boolean') {
    throw new HttpError(400, 'completed 必须是布尔值 true / false')
  }

  return store.update(id, { completed: input.completed })
}

export async function deleteTask(rawId) {
  const id = normalizeId(rawId)
  return store.remove(id)
}

export function storageInfo() {
  const mode = store.getStorageMode()
  const modeText =
    mode === 'supabase'
      ? 'Supabase 云端数据库'
      : mode === 'local'
        ? '本地文件（开发预览模式，配置 Supabase 后自动切换）'
        : '未配置 Supabase'
  return { mode, modeText }
}
