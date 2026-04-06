'use client'

import { useState } from 'react'
import { useData } from '@/components/DataProvider'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/components/Dashboard'
import { Expenses } from '@/components/Expenses'
import { LoginScreen } from '@/components/LoginScreen'
import { MonthlyFoodMoney } from '@/components/MonthlyFoodMoney'
import { MenuPlanner } from '@/components/MenuPlanner'

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
      default:
        return <Dashboard />
    }
  }

  if (!currentUser) {
    return <LoginScreen onContinue={() => setActiveTab('dashboard')} />
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  )
}
