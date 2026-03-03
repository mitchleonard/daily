import { NavLink, Outlet } from 'react-router-dom';
import { triggerSelection } from '../lib/haptics';

/**
 * Navigation item configuration
 */
const navItems = [
  { path: '/', label: 'Grid', icon: '◻️' },
  { path: '/habits', label: 'Habits', icon: '📝' },
  { path: '/analytics', label: 'Analytics', icon: '📊' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

/**
 * Main app layout with bottom navigation for mobile
 */
export function Layout() {
  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      {/* Main content area */}
      <main className="flex-1 pb-16">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => triggerSelection()}
              className={({ isActive }) =>
                `bottom-nav-item flex-1 ${isActive ? 'active' : ''}`
              }
            >
              <span className="text-lg mb-0.5">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
