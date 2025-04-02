import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, Video, Code, Briefcase, BarChart3, LogOut, User } from 'lucide-react';
import { signOut } from '../lib/auth';
import type { UserRole } from '../lib/auth';

interface LayoutProps {
  children: React.ReactNode;
  userRole: UserRole;
}

export function Layout({ children, userRole }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">AI Interview</h1>
        </div>
        <nav className="p-4 space-y-2">
          {userRole === 'interviewer' ? (
            // Interviewer Navigation
            <>
              <Link
                to="/"
                className={`flex items-center space-x-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 ${
                  location.pathname === '/' ? 'bg-gray-100' : ''
                }`}
              >
                <Users size={20} />
                <span>Candidates</span>
              </Link>
              <Link
                to="/interview/video"
                className={`flex items-center space-x-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 ${
                  location.pathname.startsWith('/interview/video') ? 'bg-gray-100' : ''
                }`}
              >
                <Video size={20} />
                <span>Video Interviews</span>
              </Link>
              <Link
                to="/interview/technical"
                className={`flex items-center space-x-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 ${
                  location.pathname.startsWith('/interview/technical') ? 'bg-gray-100' : ''
                }`}
              >
                <Code size={20} />
                <span>Technical Tests</span>
              </Link>
              <Link
                to="/interview/managerial"
                className={`flex items-center space-x-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 ${
                  location.pathname.startsWith('/interview/managerial') ? 'bg-gray-100' : ''
                }`}
              >
                <Briefcase size={20} />
                <span>Managerial Rounds</span>
              </Link>
              <Link
                to="/analytics"
                className={`flex items-center space-x-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 ${
                  location.pathname === '/analytics' ? 'bg-gray-100' : ''
                }`}
              >
                <BarChart3 size={20} />
                <span>Analytics</span>
              </Link>
            </>
          ) : (
            // Candidate Navigation
            <Link
              to="/"
              className={`flex items-center space-x-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 ${
                location.pathname === '/' ? 'bg-gray-100' : ''
              }`}
            >
              <User size={20} />
              <span>My Dashboard</span>
            </Link>
          )}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h2 className="text-lg font-medium text-gray-800">
            {location.pathname === '/' ? (userRole === 'interviewer' ? 'Dashboard' : 'My Dashboard') :
             location.pathname.startsWith('/interview/video') ? 'Video Interview' :
             location.pathname.startsWith('/interview/technical') ? 'Technical Assessment' :
             location.pathname.startsWith('/interview/managerial') ? 'Managerial Round' :
             location.pathname === '/analytics' ? 'Analytics' : 'Dashboard'}
          </h2>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
            >
              <User size={20} />
              <span className="text-sm font-medium">Account</span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut size={16} className="mr-2" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}