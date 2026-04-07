'use client'

import { Suspense, useState } from 'react'
import { useData } from '@/components/DataProvider'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/components/Dashboard'
import { Expenses } from '@/components/Expenses'
import { LoginScreen } from '@/components/LoginScreen'
import { MonthlyFoodMoney } from '@/components/MonthlyFoodMoney'
import { MenuPlanner } from '@/components/MenuPlanner'
import { UserManagement } from '@/components/UserManagement'

export default function Home() {
  const { currentUser } = useData()
  const [activeTab, setActiveTab] = useState('dashboard')

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'expenses':
        return <Expenses />
      case 'monthly':
        return <MonthlyFoodMoney />
      case 'menu':
        return <MenuPlanner />
      case 'users':
        return currentUser?.role === 'admin' ? <UserManagement /> : <Dashboard />
      default:
        return <Dashboard />
    }
  }

  if (!currentUser) {
    return (
      <Suspense fallback={<div className="px-6 py-8 text-sm">Loading login...</div>}>
        <LoginScreen onContinue={() => setActiveTab('dashboard')} />
      </Suspense>
    )
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  )
}
