import { createClient } from '@supabase/supabase-js'

let cachedClient = null
let cachedFingerprint = ''

/**
 * 读取环境变量中的 Supabase 连接信息
 * 兼容新版 sb_publishable_... 与旧版 anon key
 */
function readCredentials() {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '')
  const key = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_KEY ||
    ''
  ).trim()
  return { url, key }
}

export function hasSupabaseConfig() {
  const { url, key } = readCredentials()
  return Boolean(url && key)
}

export function getSupabaseClient() {
  if (!hasSupabaseConfig()) return null

  const { url, key } = readCredentials()
  const fingerprint = `${url}|${key.slice(0, 12)}`

  if (!cachedClient || cachedFingerprint !== fingerprint) {
    cachedClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
    cachedFingerprint = fingerprint
  }
  return cachedClient
}
