import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  ShieldAlert,
  FileText,
  Mail,
  LayoutDashboard,
  BarChart3,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/triage", label: "Triage", icon: ShieldAlert },
  { to: "/notes", label: "Notes", icon: FileText },
  { to: "/explain", label: "Explain", icon: Mail },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

const TopNav = () => {
  const { pathname } = useLocation();

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-12 items-center gap-1 overflow-x-auto">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
