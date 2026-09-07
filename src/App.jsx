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
        if (error.code === "PGRST116") {
          // No profile row yet: sign-in worked but the account has not been
          // provisioned. A known state, not a failure — show the "no profile"
          // screen, and don't stash a misleading message for the error screen.
          setProfile(null);
          setLoadError("");
          setStatus("ready");
          return;
        }

        console.error("Profile load error:", error);
        setProfile(null);
        setLoadError(error.message ?? "");
        setStatus("error");
        return;
      }

      if (data.is_active === false) {
        // Deactivated members are signed out immediately rather than shown a
        // half-working dashboard. The old build used alert() for this, which
        // could be dismissed before it was read.
        await signOut();

        if (loadToken.current !== token) return;

        setSession(null);
        setProfile(null);
        setStatus("deactivated");
        return;
      }

      setProfile(data);
      setStatus("ready");
    } catch (err) {
      // A thrown error (network drop, unexpected rejection) must not leave the
      // app stuck on the boot screen forever. Surface it like any other load
      // failure so the user still gets a Try again / Sign out choice.
      if (loadToken.current !== token) return;
      console.error("Session load failed:", err);
      setProfile(null);
      setLoadError(err?.message ?? "");
      setStatus("error");
    }
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

      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        // A refreshed token or an updated user record is the natural moment to
        // re-validate: re-run the full load so a member who was deactivated (or
        // had their role changed) mid-session is caught here instead of
        // lingering on a stale dashboard until they manually reload.
        setSession(currentSession);
        loadSession();
        return;
      }

      setSession(currentSession);
    });

    // Subscribed first, then the initial read — an auth event that arrives
    // while the first request is in flight would otherwise be missed. Deferred
    // to a microtask so this effect body itself never sets state synchronously.
    Promise.resolve().then(loadSession);

    return () => subscription.unsubscribe();
  }, [loadSession]);

  const logout = useCallback(async () => {
    // Invalidate any in-flight session load first, so a load that resolves
    // after this point cannot repopulate the profile we are clearing.
    loadToken.current += 1;

    try {
      await signOut();
    } catch (err) {
      // Even if the network sign-out fails, the local session is being torn
      // down — clear the UI regardless rather than trapping the user in a
      // half-logged-in state they can't escape.
      console.error("Sign out error:", err);
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
