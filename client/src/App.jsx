import { useCallback, useEffect, useState } from 'react'

const PRIORITIES = ['高', '中', '低']
const FILTERS = ['全部', '高', '中', '低']
const PRIORITY_CLASS = { 高: 'tag-high', 中: 'tag-mid', 低: 'tag-low' }

/**
 * 统一的请求封装：失败时抛出后端返回的中文错误信息
 */
async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  let data = {}
  try {
    data = await res.json()
  } catch {
    data = {}
  }
  if (!res.ok) {
    throw new Error(data.error || `请求失败（HTTP ${res.status}）`)
  }
  return data
}

export default function App() {
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('中')
  const [filter, setFilter] = useState('全部')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // 拉取任务列表（按优先级筛选时带上查询参数）
  const loadTasks = useCallback(async (currentFilter) => {
    setLoading(true)
    try {
      const query = currentFilter === '全部' ? '' : `?priority=${encodeURIComponent(currentFilter)}`
      const data = await request(`/api/tasks${query}`)
      setTasks(data.tasks ?? [])
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks(filter)
  }, [filter, loadTasks])

  async function handleAdd(event) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setError('请先输入任务标题')
      return
    }
    setSubmitting(true)
    try {
      await request('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: trimmed, priority })
      })
      setTitle('')
      setError('')
      await loadTasks(filter)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(task) {
    if (pendingId) return
    setPendingId(task.id)
    try {
      await request(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !task.completed })
      })
      setError('')
      await loadTasks(filter)
    } catch (e) {
      setError(e.message)
    } finally {
      setPendingId(null)
    }
  }

  async function handleDelete(task) {
    if (pendingId) return
    if (!window.confirm(`确定删除「${task.title}」吗？`)) return
    setPendingId(task.id)
    try {
      await request(`/api/tasks/${task.id}`, { method: 'DELETE' })
      setError('')
      await loadTasks(filter)
    } catch (e) {
      setError(e.message)
    } finally {
      setPendingId(null)
    }
  }

  const total = tasks.length
  const done = tasks.filter((task) => task.completed).length

  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">TASK MANAGER</p>
        <h1>智能任务管理系统</h1>
        <p className="subtitle">把要做的事写下来，按优先级一件件完成。</p>
      </header>

      <form className="composer" onSubmit={handleAdd}>
        <input
          className="task-input"
          type="text"
          value={title}
          maxLength={200}
          placeholder="写下要做的事，例如：复习数据库范式"
          onChange={(event) => setTitle(event.target.value)}
        />
        <select
          className="priority-select"
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
          aria-label="优先级"
        >
          {PRIORITIES.map((item) => (
            <option key={item} value={item}>
              优先级：{item}
            </option>
          ))}
        </select>
        <button className="add-button" type="submit" disabled={submitting}>
          {submitting ? '添加中…' : '添加'}
        </button>
      </form>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <div className="toolbar">
        <div className="filters">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              className={`filter-chip${filter === item ? ' active' : ''}`}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <p className="stats">
          共 {total} 条 · 已完成 {done} 条
        </p>
      </div>

      {loading ? (
        <div className="state-card">正在加载任务…</div>
      ) : tasks.length === 0 ? (
        <div className="state-card">
          <span className="state-title">{filter === '全部' ? '还没有任务' : `没有「${filter}」优先级的任务`}</span>
          <span className="state-hint">在上方输入框写好内容，点「添加」即可开始。</span>
        </div>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <li key={task.id} className={`task-item${task.completed ? ' done' : ''}`}>
              <button
                type="button"
                className="check-button"
                onClick={() => handleToggle(task)}
                disabled={pendingId === task.id}
                aria-label={task.completed ? '标记为未完成' : '标记为已完成'}
                title={task.completed ? '切换为未完成' : '切换为已完成'}
              >
                <span className="check-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="12" height="12">
                    <path d="M2.5 8.5l3.5 3.5 7-8" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </span>
              </button>

              <div className="task-main">
                <span className="task-title">{task.title}</span>
                <div className="task-meta">
                  <span className={`tag ${PRIORITY_CLASS[task.priority] ?? 'tag-mid'}`}>{task.priority}优先级</span>
                  <span className="status-text">{task.completed ? '已完成' : '进行中'}</span>
                </div>
              </div>

              <button
                type="button"
                className="delete-button"
                onClick={() => handleDelete(task)}
                disabled={pendingId === task.id}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className="footer">
        数据存储于 Supabase（PostgreSQL），关闭浏览器后重新打开，任务依然在。
      </footer>
    </div>
  )
}
