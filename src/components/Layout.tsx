'use client'

import { useState } from 'react'
import { useTheme } from './ThemeProvider'
import { useData } from './DataProvider'
import { Moon, Sun, LogOut, LogIn } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { theme, toggleTheme } = useTheme()
  const { currentUser, login, logout, users, loading, error, createUser } = useData()
  const [showLogin, setShowLogin] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [newUserName, setNewUserName] = useState('')

  const handleLogin = () => {
    const user = users.find(u => u.id === selectedUser)
    if (user) {
      login(user)
      setShowLogin(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = await createUser(newUserName)
    if (user) {
      setNewUserName('')
      setShowLogin(false)
    }
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'monthly', label: 'Monthly Food Money' },
    { id: 'menu', label: 'Menu Planner' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Day by Day, House to House
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              {currentUser ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {currentUser.name}
                  </span>
                  <button
                    onClick={logout}
                    className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <LogIn size={20} />
                </button>
              )}
            </div>
          </div>
          <nav className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {loading && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Connecting to your workspace data...
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {!loading && users.length === 0 && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No users were found yet. Create the first user to start using the app.
          </div>
        )}
        {children}
      </main>

      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">
              {users.length === 0 ? 'Create First User' : 'Login'}
            </h2>
            {users.length > 0 ? (
              <>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full p-2 border rounded mb-4"
                >
                  <option value="">Select User</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
                <div className="flex space-x-2">
                  <button
                    onClick={handleLogin}
                    disabled={!selectedUser}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setShowLogin(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-4">
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Enter your name"
                  required
                />
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Create User
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogin(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
