'use client'

import { useData } from '@/components/DataProvider'
import { Pie, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { formatCurrency } from '@/lib/format'
import { format, startOfWeek } from 'date-fns'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

export function Dashboard() {
  const { expenses, balance, budget, activities, currentUser, monthlyPayments, menus } = useData()

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
  const currentWeek = format(startOfWeek(new Date(), { weekStartsOn: 2 }), 'yyyy-MM-dd')
  const monthExpenses = expenses.filter((expense) => expense.date.startsWith(currentMonth))
  const monthIncome = monthExpenses.filter((expense) => expense.type === 'in').reduce((sum, expense) => sum + expense.amount, 0)
  const monthSpend = monthExpenses.filter((expense) => expense.type === 'out').reduce((sum, expense) => sum + expense.amount, 0)
  const generalActivities = activities.filter((activity) => !/income|cash in/i.test(activity.action)).slice(0, 5)
  const eatingPeople = [...new Set(
    monthlyPayments
      .filter((payment) => payment.month === currentMonth && payment.paid)
      .map((payment) => payment.memberName),
  )].sort((a, b) => a.localeCompare(b))
  const currentWeekMenu = menus.find((menu) => menu.week === currentWeek)
  const cookingPeople = [...new Set(
    currentWeekMenu?.items.flatMap((item) => [...item.lunchCooks, ...item.dinnerCooks]) ?? [],
  )].sort((a, b) => a.localeCompare(b))

  if (currentUser?.role === 'user') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
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
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-2 text-lg font-semibold">Cooking This Week</h3>
            <p className="text-2xl font-bold text-[var(--accent-strong)]">{cookingPeople.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-4 text-lg font-semibold">Eating This Month</h3>
            <p className="app-muted mb-3 text-sm">{eatingPeople.length} people marked as paid</p>
            <div className="flex flex-wrap gap-2">
              {eatingPeople.map((name) => (
                <span key={name} className="rounded-full bg-[var(--accent)]/15 px-3 py-2 text-sm text-[var(--accent-strong)]">
                  {name}
                </span>
              ))}
              {eatingPeople.length === 0 && <span className="app-muted text-sm">No paid members yet this month.</span>}
            </div>
          </div>
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-4 text-lg font-semibold">Cooking Team This Week</h3>
            <p className="app-muted mb-3 text-sm">{cookingPeople.length} people participating</p>
            <div className="flex flex-wrap gap-2">
              {cookingPeople.map((name) => (
                <span key={name} className="rounded-full bg-[var(--primary)]/15 px-3 py-2 text-sm text-[var(--primary-strong)]">
                  {name}
                </span>
              ))}
              {cookingPeople.length === 0 && <span className="app-muted text-sm">No cooking team names added for this week yet.</span>}
            </div>
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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
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
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-2">Eating This Month</h3>
          <p className="text-2xl font-bold text-[var(--accent-strong)]">{eatingPeople.length}</p>
        </div>
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-2">Cooking This Week</h3>
          <p className="text-2xl font-bold text-[var(--primary)]">{cookingPeople.length}</p>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="app-panel rounded-3xl p-6">
          <h3 className="mb-4 text-lg font-semibold">People Eating This Month</h3>
          <div className="flex flex-wrap gap-2">
            {eatingPeople.map((name) => (
              <span key={name} className="rounded-full bg-[var(--accent)]/15 px-3 py-2 text-sm text-[var(--accent-strong)]">
                {name}
              </span>
            ))}
            {eatingPeople.length === 0 && (
              <p className="app-muted text-sm">No one has been marked paid for {currentMonth} yet.</p>
            )}
          </div>
        </div>
        <div className="app-panel rounded-3xl p-6">
          <h3 className="mb-4 text-lg font-semibold">People Cooking This Week</h3>
          <div className="flex flex-wrap gap-2">
            {cookingPeople.map((name) => (
              <span key={name} className="rounded-full bg-[var(--primary)]/15 px-3 py-2 text-sm text-[var(--primary-strong)]">
                {name}
              </span>
            ))}
            {cookingPeople.length === 0 && (
              <p className="app-muted text-sm">No cooking names added for the week of {currentWeek} yet.</p>
            )}
          </div>
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
