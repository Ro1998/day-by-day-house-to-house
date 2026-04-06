'use client'

import { useData } from '@/components/DataProvider'
import { Pie, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

export function Dashboard() {
  const { expenses, balance, budget, activities } = useData()

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Balance</h3>
          <p className="text-2xl font-bold text-green-600">${balance.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Budget</h3>
          <p className="text-2xl font-bold text-blue-600">${budget.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Status</h3>
          <p className={`text-lg font-semibold ${lowBalance ? 'text-red-600' : 'text-green-600'}`}>
            {lowBalance ? 'Low Balance Warning!' : 'Good'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Expenses by Category</h3>
          <Pie data={pieData} />
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Cash Flow</h3>
          <Bar data={barData} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
        <div className="space-y-2">
          {activities.slice(-5).reverse().map(activity => (
            <div key={activity.id} className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{activity.user}</span> {activity.action} at {new Date(activity.timestamp).toLocaleString()}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}