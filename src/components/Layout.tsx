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

type LayoutProps = { basePath?: string };

/**
 * Main app layout with bottom navigation for mobile
 */
export function Layout({ basePath = '' }: LayoutProps) {
  return (
    <div
      className="fixed inset-0 bg-dark-bg flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Main content area - flex-1 fills space between status bar and nav */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </main>

      {/* Bottom navigation - in document flow so height is naturally accounted for */}
      <nav className="bottom-nav">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={basePath + item.path}
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
