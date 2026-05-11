import { useEffect, useMemo, useState } from 'react'
import {
  AlarmClock,
  Bell,
  CalendarClock,
  Check,
  Circle,
  ClipboardList,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import rankEmblem from './assets/task-rank-emblem.png'
import './App.css'

const STORAGE_KEY = 'todo-reminder-items'

const initialTasks = [
  {
    id: crypto.randomUUID(),
    title: '整理本周重点事项',
    note: '把优先级最高的 3 件事放到今天',
    dueAt: getLocalDateTime(2),
    priority: 'high',
    done: false,
    reminded: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    title: '检查项目进度',
    note: '确认未完成任务是否需要延期',
    dueAt: getLocalDateTime(26),
    priority: 'medium',
    done: false,
    reminded: false,
    createdAt: new Date().toISOString(),
  },
]

const priorityLabels = {
  high: '高',
  medium: '中',
  low: '低',
}

const completionRanks = [
  { min: 0, name: '坚韧黑铁', tier: 'Iron IV', next: 1, className: 'iron' },
  { min: 1, name: '英勇黄铜', tier: 'Bronze IV', next: 3, className: 'bronze' },
  { min: 3, name: '不屈白银', tier: 'Silver IV', next: 6, className: 'silver' },
  { min: 6, name: '荣耀黄金', tier: 'Gold IV', next: 10, className: 'gold' },
  { min: 10, name: '华贵铂金', tier: 'Platinum IV', next: 15, className: 'platinum' },
  { min: 15, name: '璀璨钻石', tier: 'Diamond IV', next: 21, className: 'diamond' },
  { min: 21, name: '超凡大师', tier: 'Master', next: 28, className: 'master' },
  { min: 28, name: '傲世宗师', tier: 'Grandmaster', next: 36, className: 'grandmaster' },
  { min: 36, name: '最强王者', tier: 'Challenger', next: null, className: 'challenger' },
]

function getLocalDateTime(hoursFromNow = 1) {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000)
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5)
  date.setSeconds(0, 0)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

function readStoredTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : initialTasks
  } catch {
    return initialTasks
  }
}

function formatDueTime(value) {
  if (!value) return '未设置提醒'

  const date = new Date(value)
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getTaskState(task) {
  if (task.done) return 'done'
  if (!task.dueAt) return 'open'

  const dueDate = new Date(task.dueAt)
  const now = new Date()
  const isSameDay = dueDate.toDateString() === now.toDateString()

  if (dueDate < now) return 'overdue'
  if (isSameDay) return 'today'
  return 'upcoming'
}

function getCompletionRank(completedCount) {
  return completionRanks.reduce((currentRank, rank) => {
    return completedCount >= rank.min ? rank : currentRank
  }, completionRanks[0])
}

function App() {
  const [tasks, setTasks] = useState(readStoredTasks)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [notificationStatus, setNotificationStatus] = useState(
    'Notification' in window ? Notification.permission : 'unsupported',
  )
  const [form, setForm] = useState({
    title: '',
    note: '',
    dueAt: getLocalDateTime(1),
    priority: 'medium',
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now()

      setTasks((currentTasks) =>
        currentTasks.map((task) => {
          if (task.done || task.reminded || !task.dueAt) return task
          const dueTime = new Date(task.dueAt).getTime()

          if (dueTime > now) return task

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('待办事项到期', {
              body: `${task.title} - ${formatDueTime(task.dueAt)}`,
            })
          }

          return { ...task, reminded: true }
        }),
      )
    }, 15000)

    return () => window.clearInterval(timer)
  }, [])

  const stats = useMemo(() => {
    return tasks.reduce(
      (result, task) => {
        const state = getTaskState(task)
        result.total += 1
        result[state] += 1
        return result
      },
      { total: 0, open: 0, today: 0, overdue: 0, upcoming: 0, done: 0 },
    )
  }, [tasks])

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const state = getTaskState(task)
        const keyword = query.trim().toLowerCase()
        const matchesFilter = filter === 'all' || state === filter
        const matchesQuery =
          !keyword ||
          task.title.toLowerCase().includes(keyword) ||
          task.note.toLowerCase().includes(keyword)

        return matchesFilter && matchesQuery
      })
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1
        return new Date(a.dueAt || '9999-12-31') - new Date(b.dueAt || '9999-12-31')
      })
  }, [filter, query, tasks])

  const completionRank = useMemo(() => getCompletionRank(stats.done), [stats.done])

  function handleSubmit(event) {
    event.preventDefault()

    if (!form.title.trim()) return

    setTasks((currentTasks) => [
      {
        id: crypto.randomUUID(),
        title: form.title.trim(),
        note: form.note.trim(),
        dueAt: form.dueAt,
        priority: form.priority,
        done: false,
        reminded: false,
        createdAt: new Date().toISOString(),
      },
      ...currentTasks,
    ])

    setForm({
      title: '',
      note: '',
      dueAt: getLocalDateTime(1),
      priority: 'medium',
    })
  }

  function toggleTask(id) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id ? { ...task, done: !task.done, reminded: task.done ? false : task.reminded } : task,
      ),
    )
  }

  function deleteTask(id) {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id))
  }

  async function requestNotifications() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationStatus(permission)
    }
  }

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="概览">
        <div>
          <p className="eyebrow">Todo Reminder</p>
          <h1>待办事项提醒工具</h1>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={requestNotifications}
          disabled={notificationStatus === 'granted' || notificationStatus === 'unsupported'}
        >
          <Bell size={18} />
          {notificationStatus === 'granted'
            ? '提醒已开启'
            : notificationStatus === 'unsupported'
              ? '浏览器不支持'
              : '开启通知'}
        </button>
      </section>

      <section className="summary-grid" aria-label="任务统计">
        <StatCard label="全部" value={stats.total} icon={<ClipboardList size={20} />} />
        <StatCard label="今天" value={stats.today} icon={<CalendarClock size={20} />} />
        <StatCard label="逾期" value={stats.overdue} icon={<AlarmClock size={20} />} tone="danger" />
        <StatCard label="完成" value={stats.done} icon={<Check size={20} />} tone="success" />
      </section>

      <CompletionRankCard completedCount={stats.done} rank={completionRank} />

      <div className="workspace">
        <section className="task-form-panel" aria-label="新增待办">
          <div className="section-heading">
            <h2>新增提醒</h2>
            <p>事项会保存在当前浏览器中。</p>
          </div>

          <form onSubmit={handleSubmit} className="task-form">
            <label>
              事项
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="例如：提交周报"
              />
            </label>

            <label>
              备注
              <textarea
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
                placeholder="补充地点、材料或上下文"
                rows="4"
              />
            </label>

            <label>
              提醒时间
              <input
                type="datetime-local"
                value={form.dueAt}
                onChange={(event) => setForm({ ...form, dueAt: event.target.value })}
              />
            </label>

            <fieldset>
              <legend>优先级</legend>
              <div className="priority-control">
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <label key={value} className={form.priority === value ? 'selected' : ''}>
                    <input
                      type="radio"
                      name="priority"
                      value={value}
                      checked={form.priority === value}
                      onChange={(event) => setForm({ ...form, priority: event.target.value })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <button type="submit" className="primary-button">
              <Plus size={18} />
              添加待办
            </button>
          </form>
        </section>

        <section className="task-list-panel" aria-label="待办列表">
          <div className="list-toolbar">
            <div className="search-box">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索待办或备注"
              />
            </div>

            <div className="filter-tabs" aria-label="筛选任务">
              {[
                ['all', '全部'],
                ['today', '今天'],
                ['overdue', '逾期'],
                ['upcoming', '未来'],
                ['done', '完成'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={filter === value ? 'active' : ''}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="task-list">
            {visibleTasks.length === 0 ? (
              <div className="empty-state">
                <ClipboardList size={36} />
                <p>没有符合条件的待办。</p>
              </div>
            ) : (
              visibleTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  state={getTaskState(task)}
                  onToggle={() => toggleTask(task.id)}
                  onDelete={() => deleteTask(task.id)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function StatCard({ label, value, icon, tone = 'default' }) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  )
}

function CompletionRankCard({ completedCount, rank }) {
  const nextTarget = rank.next
  const progress =
    nextTarget === null
      ? 100
      : Math.min(100, Math.round(((completedCount - rank.min) / (nextTarget - rank.min)) * 100))
  const remaining = nextTarget === null ? 0 : nextTarget - completedCount

  return (
    <section className={`rank-card ${rank.className}`} aria-label="任务完成等级">
      <div className="rank-emblem" aria-hidden="true">
        <img src={rankEmblem} alt="" />
      </div>

      <div className="rank-copy">
        <span>任务完成等级</span>
        <h2>{rank.name}</h2>
        <p>{rank.tier}</p>
      </div>

      <div className="rank-progress" aria-label="等级进度">
        <div className="rank-progress-label">
          <span>已完成 {completedCount} 个</span>
          <strong>{nextTarget === null ? '已登顶' : `还差 ${remaining} 个晋级`}</strong>
        </div>
        <div className="rank-progress-track">
          <div style={{ width: `${progress}%` }} />
        </div>
      </div>
    </section>
  )
}

function TaskItem({ task, state, onToggle, onDelete }) {
  return (
    <article className={`task-item ${state}`}>
      <button type="button" className="complete-button" onClick={onToggle} aria-label="切换完成状态">
        {task.done ? <Check size={18} /> : <Circle size={18} />}
      </button>

      <div className="task-content">
        <div className="task-title-row">
          <h3>{task.title}</h3>
          <span className={`priority ${task.priority}`}>{priorityLabels[task.priority]}</span>
        </div>

        {task.note ? <p>{task.note}</p> : null}

        <div className="task-meta">
          <span>
            <CalendarClock size={15} />
            {formatDueTime(task.dueAt)}
          </span>
          {state === 'overdue' ? <strong>已逾期</strong> : null}
          {state === 'today' ? <strong>今天到期</strong> : null}
        </div>
      </div>

      <button type="button" className="icon-button" onClick={onDelete} aria-label="删除待办">
        <Trash2 size={18} />
      </button>
    </article>
  )
}

export default App
