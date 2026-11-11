import 'dotenv/config'
import { createTask, deleteTask, listTasks, storageInfo, updateTask } from '../server/tasks-service.js'

/**
 * 全链路自检：查询列表 → 新增任务 → 切换完成状态 → 删除任务
 * 用法：npm run check
 */
async function main() {
  const { mode, modeText } = storageInfo()

  console.log('')
  console.log('=== 智能任务管理系统 · 全链路自检 ===')
  console.log(`存储模式：${modeText}`)
  console.log('')

  if (mode === 'unconfigured') {
    console.log('未检测到 Supabase 配置。')
    console.log('请先复制 .env.example 为 .env，并填入 SUPABASE_URL 与 SUPABASE_ANON_KEY。')
    process.exitCode = 1
    return
  }

  let passed = 0
  let failed = 0
  let createdId = null

  const step = async (name, task) => {
    try {
      await task()
      passed += 1
      console.log(`[通过] ${name}`)
    } catch (error) {
      failed += 1
      console.log(`[失败] ${name}：${error.message}`)
    }
  }

  await step('查询任务列表', async () => {
    const tasks = await listTasks({})
    console.log(`      当前共 ${tasks.length} 条任务`)
  })

  await step('新增任务（标题：自检任务，优先级：高）', async () => {
    const task = await createTask({ title: '自检任务（可删除）', priority: '高' })
    createdId = task.id
    console.log(`      新任务 id = ${task.id}`)
  })

  if (createdId) {
    await step('切换完成状态为「已完成」', async () => {
      const task = await updateTask(createdId, { completed: true })
      console.log(`      当前 completed = ${task.completed}`)
    })

    await step('切换完成状态为「未完成」', async () => {
      const task = await updateTask(createdId, { completed: false })
      console.log(`      当前 completed = ${task.completed}`)
    })

    await step('删除自检任务（清理测试数据）', async () => {
      await deleteTask(createdId)
      console.log(`      已删除 id = ${createdId}`)
    })
  }

  console.log('')
  console.log(`结果：通过 ${passed} 项，失败 ${failed} 项`)
  if (failed > 0) {
    console.log('排查提示：表是否建好（supabase/schema.sql）、RLS 策略是否执行、key 是否复制完整。')
    process.exitCode = 1
  } else {
    console.log('全链路正常，可以继续做 GitHub 上传与 Vercel 部署。')
  }
  console.log('')
}

main().catch((error) => {
  console.error('自检脚本异常：', error)
  process.exitCode = 1
})
