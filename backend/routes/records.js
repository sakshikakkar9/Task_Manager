import express from 'express'
import Task from '../models/Task.js'
import { decryptTask } from '../utils/crypto.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const { filter } = req.query
    const now = new Date()

    // Build date range filter
    let dateFilter = null
    if (filter === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 7)
      const from = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      dateFilter = { $gte: from }
    } else if (filter === 'month') {
      const d = new Date(now); d.setDate(d.getDate() - 30)
      const from = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      dateFilter = { $gte: from }
    }

    // Step 1: Get ALL tasks (completed AND incomplete) for date range
    // We need both to calculate correct totals per day
    const allTaskQuery = dateFilter ? { date: dateFilter } : {}
    const allTasks = await Task.find(allTaskQuery).lean()

    // Step 2: Decrypt each task safely
    const decryptedAll = allTasks.map(t => {
      try { return decryptTask(t) }
      catch(e) { return { ...t, _id: t._id.toString(), title: '[error]' } }
    })

    // Step 3: Find distinct dates that have at least 1 COMPLETED task
    // (we only show a date in Records if something was completed that day)
    const datesWithCompletions = [...new Set(
      decryptedAll.filter(t => t.completed).map(t => t.date)
    )]

    // Step 4: For each date that has completions, build the record group
    const result = datesWithCompletions
      .sort((a, b) => new Date(b+'T00:00:00') - new Date(a+'T00:00:00'))  // newest first
      .map(date => {
        const allForDay = decryptedAll.filter(t => t.date === date)
        const completedForDay = allForDay.filter(t => t.completed)

        // Sort completed tasks by completedAt descending (most recently completed first)
        completedForDay.sort((a,b) => new Date(b.completedAt||0) - new Date(a.completedAt||0))

        return {
          date,
          displayDate: (() => {
            try {
              return new Date(date+'T00:00:00').toLocaleDateString('en-IN', {
                weekday:'long', year:'numeric', month:'long', day:'numeric'
              })
            } catch(e) { return date }
          })(),
          tasks: completedForDay,           // only completed tasks shown in list
          totalTasks: allForDay.length,     // ALL tasks created that day (completed + pending + overdue)
          completedCount: completedForDay.length  // only completed ones
        }
      })

    res.json({ success: true, data: result, totalDays: result.length })

  } catch (err) {
    console.error('[Records] Error:', err.message, err.stack)
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
