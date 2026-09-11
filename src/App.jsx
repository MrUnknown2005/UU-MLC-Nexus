import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCurrentProfile,
  getCurrentSession,
  signOut,
  subscribeToAuthState,
} from "./services/authSessionService";
import LandingPage from "./components/landing/LandingPage";
import AuthScreen from "./components/auth/AuthScreen";
import ResetPasswordScreen from "./components/auth/ResetPasswordScreen";
import GuestDashboard from "./components/guest/GuestDashboard";
import Dashboard from "./components/dashboard/Dashboard";
import BootScreen from "./components/common/BootScreen";
import MessageScreen from "./components/common/MessageScreen";

/**
 * Root router.
 *
 * There is no routing library here on purpose — the app has exactly six
 * top-level states and they are decided by session and profile, not by URL.
 * This component's whole job is to pick one of them and never render a blank
 * screen while deciding.
 */
export default function App() {
  const [view, setView] = useState("landing"); // landing | auth
  const [authMode, setAuthMode] = useState("login");
  const [recovering, setRecovering] = useState(false);

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | deactivated | error
  const [loadError, setLoadError] = useState("");

  // Guards a stale in-flight profile fetch from overwriting a newer one — a
  // fast sign-out followed by sign-in used to be able to resurrect the old
  // member's profile.
  const loadToken = useRef(0);

  const loadSession = useCallback(async () => {
    const token = loadToken.current + 1;
    loadToken.current = token;

    try {
      const {
        data: { session: currentSession },
      } = await getCurrentSession();

      if (loadToken.current !== token) return;

      if (!currentSession) {
        setSession(null);
        setProfile(null);
        setStatus("ready");
        return;
      }

      setSession(currentSession);

      const { data, error } = await getCurrentProfile(currentSession.user.id);

      if (loadToken.current !== token) return;

      if (error) {
        console.error("Profile load error:", error);
        setProfile(null);
        setLoadError(error.message ?? "");
        setStatus(error.code === "PGRST116" ? "ready" : "error");
        return;
      }

      if (data.is_active === false) {
        // Deactivated members are signed out immediately rather than shown a
        // half-working dashboard. The old build used alert() for this, which
        // could be dismissed before it was read.
        await signOut();

        setSession(null);
        setProfile(null);
        setStatus("deactivated");
        return;
      }

      setProfile(data);
      setStatus("ready");
    } catch (err) {
      // A thrown session or profile read — a network-layer failure or an
      // unexpected response shape — must never leave the app stuck on the boot
      // screen forever. Fall through to the recoverable error state, which
      // offers Try again and Sign out.
      if (loadToken.current !== token) return;
      console.error("Session load error:", err);
      setLoadError(err?.message ?? "");
      setStatus("error");
    }
  }, []);

  // Re-checks the signed-in profile without touching the boot/loading state, so
  // a deactivation or role change made by an admin takes hold within the open
  // session instead of lingering until the next manual reload. Fail-safe by
  // design: a transient read error leaves the working session exactly as it is;
  // only a definitive is_active=false signs the user out.
  const revalidate = useCallback(async (currentSession) => {
    const token = loadToken.current;

    const { data, error } = await getCurrentProfile(currentSession.user.id);

    // A newer load (a fresh login or an explicit logout) bumped the token while
    // this was in flight — let that one win rather than clobber it.
    if (loadToken.current !== token) return;

    if (error) {
      console.error("Profile revalidation error:", error);
      return;
    }

    if (data.is_active === false) {
      await signOut();
      setSession(null);
      setProfile(null);
      setStatus("deactivated");
      return;
    }

    setProfile(data);
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = subscribeToAuthState((event, currentSession) => {
      if (event === "PASSWORD_RECOVERY") {
        // Supabase has signed this tab in with a short-lived recovery session.
        // Show the "choose a new password" screen instead of the dashboard.
        setRecovering(true);
        setSession(currentSession);
        setStatus("ready");
        return;
      }

      if (event === "SIGNED_OUT" || !currentSession) {
        setSession(null);
        setProfile(null);
        setStatus((current) =>
          current === "deactivated" ? current : "ready"
        );
        return;
      }

      setSession(currentSession);

      if (event === "TOKEN_REFRESHED") {
        // The token just rotated (≈hourly, and on tab refocus) — a natural,
        // cheap checkpoint to re-validate access without a visible reload.
        revalidate(currentSession);
      }
    });

    // Subscribed first, then the initial read — an auth event that arrives
    // while the first request is in flight would otherwise be missed. Deferred
    // to a microtask so this effect body itself never sets state synchronously.
    Promise.resolve().then(loadSession);

    return () => subscription.unsubscribe();
  }, [loadSession, revalidate]);

  const logout = useCallback(async () => {
    // Invalidate any in-flight load first, then clear local state no matter
    // what: the user asked to leave, so a rejected signOut() (a network blip)
    // must not strand them on a logged-in screen. The local session is dropped
    // either way; a failed server sign-out self-heals on the next token refresh.
    loadToken.current += 1;

    try {
      await signOut();
    } catch (err) {
      console.error("Sign-out error:", err);
    } finally {
      setSession(null);
      setProfile(null);
      setRecovering(false);
      setStatus("ready");
      setView("landing");
    }
  }, []);

  if (status === "loading") {
    return <BootScreen />;
  }

  if (recovering) {
    return (
      <ResetPasswordScreen
        onDone={async () => {
          setRecovering(false);
          setStatus("loading");
          await loadSession();
        }}
        onCancel={logout}
      />
    );
  }

  if (status === "deactivated") {
    return (
      <MessageScreen
        icon="ban"
        tone="danger"
        title="This account has been deactivated"
        description="An administrator has switched off access for this account. If you think that is a mistake, contact a club administrator — your points, tasks and history are untouched."
        actionLabel="Back to sign in"
        onAction={() => {
          setStatus("ready");
          setView("auth");
          setAuthMode("login");
        }}
      />
    );
  }

  if (status === "error") {
    return (
      <MessageScreen
        icon="alert-triangle"
        tone="danger"
        title="Could not load your profile"
        description={
          loadError
            ? `The server said: ${loadError}`
            : "Something went wrong between here and the database. Your data is fine — this is a loading problem."
        }
        actionLabel="Try again"
        onAction={() => {
          setStatus("loading");
          setLoadError("");
          loadSession();
        }}
        secondaryLabel="Sign out"
        onSecondary={logout}
      />
    );
  }

  if (!session) {
    if (view === "landing") {
      return (
        <LandingPage
          onLogin={() => {
            setAuthMode("login");
            setView("auth");
          }}
          onJoin={() => {
            setAuthMode("signup");
            setView("auth");
          }}
        />
      );
    }

    return (
      <AuthScreen
        initialMode={authMode}
        onAuth={loadSession}
        onBack={() => setView("landing")}
      />
    );
  }

  if (!profile) {
    return (
      <MessageScreen
        icon="user-x"
        tone="warn"
        title="No profile yet"
        description="Your sign-in worked, but no club profile is attached to it yet. An administrator needs to approve your account before the workspace opens up."
        actionLabel="Check again"
        onAction={() => {
          setStatus("loading");
          loadSession();
        }}
        secondaryLabel="Sign out"
        onSecondary={logout}
      />
    );
  }

  if (profile.role === "guest") {
    return <GuestDashboard profile={profile} onLogout={logout} />;
  }

  return (
    <Dashboard profile={profile} onLogout={logout} reloadProfile={loadSession} />
  );
}
