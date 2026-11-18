import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Button from "../common/Button";
import {
  Compass,
  LayoutDashboard,
  LogOut,
  Mail,
  MessagesSquare,
  Network,
  Sparkles,
  ListChecks,
  Users,
} from "lucide-react";

const Sidebar = ({ open = true, onClose }) => {
  const { profileType, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLinkClassName = ({ isActive }) =>
    `nav-link${isActive ? " nav-link-active" : ""}`;

  const link = (to, label, Icon, end = false) => (
    <NavLink to={to} className={navLinkClassName} end={end} onClick={onClose}>
      <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <aside className={`app-sidebar${open ? " app-sidebar-open" : ""}`}>
      <div className="brand-mark">
        <span className="brand-symbol"><Sparkles size={16} aria-hidden="true" /></span>
        <span className="brand">idiaMate</span>
      </div>
      <nav className="nav-menu">
        {profileType === "founder" ? (
          <>
            {link("/app", "Dashboard", LayoutDashboard, true)}
            {link("/app/ideas", "My Ideas", Sparkles)}
            {link("/app/talent", "Discover Talent", Compass)}
            {link("/app/founder-team", "My Team", Users)}
            {link("/app/tasks", "Tasks", ListChecks)}
            {link("/app/invitations", "Invitations", Mail)}
          </>
        ) : (
          <>
            {link("/app", "Dashboard", LayoutDashboard, true)}
            {link("/app/explore", "Explore Startups", Compass)}
            {link("/app/matches", "Matches", Network)}
            {link("/app/team", "My Team", Users)}
            {link("/app/tasks", "Tasks", ListChecks)}
            {link("/app/invitations", "Invitations", Mail)}
          </>
        )}
      </nav>
      <div className="sidebar-section-label">Workspace</div>
      {link(profileType === "founder" ? "/app/founder-team" : "/app/team", "Messages", MessagesSquare)}
      <div className="sidebar-footer">
        <Button variant="ghost" onClick={handleLogout} className="sidebar-signout">
          <LogOut size={16} aria-hidden="true" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
