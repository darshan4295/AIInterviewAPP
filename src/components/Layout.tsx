import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, Video, Code, Briefcase, BarChart3 } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">AI Interview</h1>
        </div>
        <nav className="p-4 space-y-2">
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
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
          <h2 className="text-lg font-medium text-gray-800">
            {location.pathname === '/' ? 'Dashboard' :
             location.pathname.startsWith('/interview/video') ? 'Video Interview' :
             location.pathname.startsWith('/interview/technical') ? 'Technical Assessment' :
             location.pathname.startsWith('/interview/managerial') ? 'Managerial Round' :
             location.pathname === '/analytics' ? 'Analytics' : 'Dashboard'}
          </h2>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}