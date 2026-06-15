import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Code2, Plus } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useAuth } from '@/auth/useAuth';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'rounded-md px-3 py-1.5 text-sm transition-colors hover:text-lc-text',
          isActive ? 'font-medium text-lc-text' : 'text-lc-muted',
        )
      }
    >
      {label}
    </NavLink>
  );
}

export function Navbar() {
  const { user, logout } = useAuthStore();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-lc-border bg-lc-panel">
      <div className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4">
        <Link to="/problems" className="flex items-center gap-2">
          <Code2 className="h-6 w-6 text-lc-orange" />
          <span className="text-base font-semibold tracking-tight">
            Leet<span className="text-lc-orange">Clone</span>
          </span>
        </Link>

        <nav className="ml-4 flex items-center gap-1">
          <NavItem to="/problems" label="Problems" />
          <NavItem to="/contests" label="Contests" />
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden items-center gap-1 sm:flex">
                <Link to="/admin/problems/new">
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4" /> Problem
                  </Button>
                </Link>
                <Link to="/admin/contests/new">
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4" /> Contest
                  </Button>
                </Link>
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="rounded-full ring-lc-orange transition-shadow hover:ring-2"
                  aria-label="User menu"
                >
                  <Avatar name={user.username} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-md border border-lc-border bg-lc-panel py-1 shadow-xl">
                    <div className="border-b border-lc-border px-4 py-2">
                      <div className="truncate text-sm font-medium">{user.username}</div>
                      <div className="truncate text-xs text-lc-muted">{user.email}</div>
                    </div>
                    <Link
                      to={`/profile/${user.id}`}
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-lc-text hover:bg-lc-panel-hover"
                    >
                      My Profile
                    </Link>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-lc-red hover:bg-lc-panel-hover"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => login()}>
                Sign In
              </Button>
              <Button size="sm" onClick={() => login()}>
                Sign Up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
