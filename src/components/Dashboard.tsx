'use client'

import { useData } from '@/components/DataProvider'
import { Pie, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { formatCurrency } from '@/lib/format'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

export function Dashboard() {
  const { expenses, balance, budget, activities, currentUser } = useData()

  const cashIn = expenses.filter(e => e.type === 'in').reduce((sum, e) => sum + e.amount, 0)
  const cashOut = expenses.filter(e => e.type === 'out').reduce((sum, e) => sum + e.amount, 0)

  const categoryData = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount
    return acc
  }, {} as Record<string, number>)

  const pieData = {
    labels: Object.keys(categoryData),
    datasets: [{
      data: Object.values(categoryData),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
    }],
  }

  const barData = {
    labels: ['Cash In', 'Cash Out', 'Balance'],
    datasets: [{
      label: 'Amount',
      data: [cashIn, cashOut, balance],
      backgroundColor: ['#4CAF50', '#F44336', '#2196F3'],
    }],
  }

  const lowBalance = balance < budget * 0.2
  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthExpenses = expenses.filter((expense) => expense.date.startsWith(currentMonth))
  const monthIncome = monthExpenses.filter((expense) => expense.type === 'in').reduce((sum, expense) => sum + expense.amount, 0)
  const monthSpend = monthExpenses.filter((expense) => expense.type === 'out').reduce((sum, expense) => sum + expense.amount, 0)
  const generalActivities = activities.filter((activity) => !/income|cash in/i.test(activity.action)).slice(0, 5)

  if (currentUser?.role === 'user') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-2 text-lg font-semibold">This Month&apos;s Expenses</h3>
            <p className="text-2xl font-bold text-[var(--primary-strong)]">{formatCurrency(monthSpend)}</p>
          </div>
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-2 text-lg font-semibold">This Month&apos;s Income</h3>
            <p className="text-2xl font-bold text-[var(--accent-strong)]">{formatCurrency(monthIncome)}</p>
          </div>
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-2 text-lg font-semibold">Visible Entries</h3>
            <p className="text-2xl font-bold text-[var(--primary)]">
              {monthExpenses.filter((expense) => expense.type === 'out').length}
            </p>
          </div>
        </div>

        <div className="app-panel rounded-3xl p-6">
          <h3 className="mb-4 text-lg font-semibold">Recent Activities</h3>
          <div className="space-y-2">
            {generalActivities.map((activity) => (
              <div key={activity.id} className="app-muted text-sm">
                <span className="font-medium">{activity.user}</span> {activity.action}
              </div>
            ))}
            {generalActivities.length === 0 && (
              <div className="app-muted text-sm">No recent visible activities.</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-2">Balance</h3>
          <p className="text-2xl font-bold text-[var(--primary-strong)]">{formatCurrency(balance)}</p>
        </div>
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-2">Budget</h3>
          <p className="text-2xl font-bold text-[var(--primary)]">{formatCurrency(budget)}</p>
        </div>
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-2">Status</h3>
          <p className={`text-lg font-semibold ${lowBalance ? 'text-amber-600' : 'text-[var(--accent-strong)]'}`}>
            {lowBalance ? 'Low Balance Warning!' : 'Good'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-4">Expenses by Category</h3>
          <Pie data={pieData} />
        </div>
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-4">Cash Flow</h3>
          <Bar data={barData} />
        </div>
      </div>

      <div className="app-panel rounded-3xl p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
        <div className="space-y-2">
          {activities.slice(-5).reverse().map(activity => (
            <div key={activity.id} className="app-muted text-sm">
              <span className="font-medium">{activity.user}</span> {activity.action} at {new Date(activity.timestamp).toLocaleString()}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
