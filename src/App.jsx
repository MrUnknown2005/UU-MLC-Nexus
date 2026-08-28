import { useEffect, useState } from "react";
import { getCurrentProfile, getCurrentSession, signOut, subscribeToAuthState } from "./services/authSessionService";
import "./components/dashboard/DashboardRefined.css";
import "./styles/NexusPremium.css";
import LandingPage from "./components/landing/LandingPage";
import AuthScreen from "./components/auth/AuthScreen";
import GuestDashboard from "./components/guest/GuestDashboard";
import Dashboard from "./components/dashboard/Dashboard";
import NexusAtmosphere from "./components/common/NexusAtmosphere";

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
    const { data: { subscription } } = subscribeToAuthState((_event, currentSession) => {
      setSession(currentSession);
      if (!currentSession) { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadSession() {
    const { data: { session: currentSession } } = await getCurrentSession();
    if (!currentSession) { setSession(null); setProfile(null); setLoading(false); return; }
    setSession(currentSession);
    const { data, error } = await getCurrentProfile(currentSession.user.id);
    if (error) { console.error("Profile load error:", error); setProfile(null); setLoading(false); return; }
    if (data.is_active === false) {
      await signOut(); setSession(null); setProfile(null); setLoading(false);
      alert("Your account has been deactivated. Please contact an administrator."); return;
    }
    setProfile(data); setLoading(false);
  }

  const logout = async () => { await signOut(); setSession(null); setProfile(null); };

  if (loading) return <div className="min-h-screen bg-[#060606] flex items-center justify-center text-yellow-300"><NexusAtmosphere /><div className="relative z-10 font-semibold tracking-[.3em] uppercase text-xs">Initializing Nexus</div></div>;

  if (!session) {
    if (showLanding) return <><NexusAtmosphere /><LandingPage onLogin={() => { setAuthMode("login"); setShowLanding(false); }} onJoin={() => { setAuthMode("signup"); setShowLanding(false); }} /></>;
    return <><NexusAtmosphere /><AuthScreen initialMode={authMode} onAuth={loadSession} onBack={() => setShowLanding(true)} /></>;
  }

  if (!profile) return <div className="min-h-screen bg-[#060606] flex items-center justify-center text-white px-4"><NexusAtmosphere /><div className="relative z-10 text-center"><h1 className="text-2xl font-bold">Profile not found</h1><p className="text-gray-400 mt-2">Your account has not been assigned a profile yet.</p><button onClick={logout} className="mt-5 px-5 py-2 bg-yellow-400 text-black rounded-xl">Sign Out</button></div></div>;
  if (profile.role === "guest") return <><NexusAtmosphere /><GuestDashboard profile={profile} onLogout={logout} /></>;
  return <><NexusAtmosphere /><Dashboard profile={profile} onLogout={logout} reloadProfile={loadSession} /></>;
}
