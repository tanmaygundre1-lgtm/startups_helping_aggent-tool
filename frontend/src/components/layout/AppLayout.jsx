import { useState } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";
import { useAuth } from "../../hooks/useAuth";
import Button from "../common/Button";

const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile } = useAuth();

  return (
    <div className={`app-layout${sidebarOpen ? " sidebar-is-open" : ""}`}>
      <button
        className="mobile-sidebar-toggle"
        type="button"
        aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen((current) => !current)}
      >
        {sidebarOpen ? <X size={19} /> : <Menu size={19} />}
      </button>
      <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="app-content">
        <header className="app-topbar">
          <div className="topbar-context">
            <span className="topbar-eyebrow">Workspace</span>
            <strong>{profile?.profileType === "candidate" ? "Your opportunities" : "Your startup workspace"}</strong>
          </div>
          <div className="topbar-actions">
            <Button variant="ghost" size="sm" className="topbar-help" aria-label="Open help">
              Help
            </Button>
            <div className="user-avatar" title={profile?.name || "Your profile"}>
              {profile?.profileImage ? (
                <img src={profile.profileImage} alt="" />
              ) : (
                (profile?.name || "U").slice(0, 1).toUpperCase()
              )}
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
