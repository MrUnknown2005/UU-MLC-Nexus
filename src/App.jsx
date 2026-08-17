import { useEffect, useState } from "react";
import logo from "./assets/club-logo.png";
import { supabase } from "./lib/supabaseClient";

const ROLE_NAMES = {
  guest: "Guest",
  member: "Member",
  executive: "Executive",
  administrator: "Administrator",
  head_admin: "Head Administrator",
};

/*
=========================================================
APP
=========================================================
*/

export default function App() {
  const [showLanding, setShowLanding] =
    useState(true);

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);

        if (!currentSession) {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadSession = async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (!currentSession) {
      setSession(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    setSession(currentSession);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentSession.user.id)
      .single();

    if (error) {
      console.error("Profile load error:", error);
      setProfile(null);
      setLoading(false);
      return;
    }

    if (data.is_active === false) {
      await supabase.auth.signOut();

      setSession(null);
      setProfile(null);
      setLoading(false);

      alert(
        "Your account has been deactivated. Please contact an administrator."
      );

      return;
    }

    setProfile(data);
    setLoading(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();

    setSession(null);
    setProfile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0d] flex items-center justify-center text-yellow-400">
        Loading...
      </div>
    );
  }

  if (!session) {
    if (showLanding) {
      return (
        <LandingPage
          onLogin={() => setShowLanding(false)}
          onJoin={() => setShowLanding(false)}
        />
      );
    }

    return (
      <AuthScreen
        onAuth={loadSession}
        onBack={() => setShowLanding(true)}
      />
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0b0b0d] flex items-center justify-center text-white px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            Profile not found
          </h1>

          <p className="text-gray-400 mt-2">
            Your account has not been assigned a profile yet.
          </p>

          <button
            onClick={logout}
            className="mt-5 px-5 py-2 bg-yellow-400 text-black rounded-xl"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (profile.role === "guest") {
    return (
      <GuestDashboard
        profile={profile}
        onLogout={logout}
      />
    );
  }

  return (
    <Dashboard
      profile={profile}
      onLogout={logout}
      reloadProfile={loadSession}
    />
  );
}

/*
=========================================================
LANDING PAGE
=========================================================
*/

function LandingPage({ onLogin, onJoin }) {
  return (
    <div className="min-h-screen bg-[#08090b] text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(234,179,8,0.08),transparent_35%)]" />
      <div className="relative max-w-6xl mx-auto px-6 py-10 md:py-16">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="UU MLC" className="w-12 h-12 object-contain" />
            <div>
              <p className="font-bold">UU MLC</p>
              <p className="text-xs text-gray-500">Nexus</p>
            </div>
          </div>
          <button onClick={onLogin} className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
            Member Login
          </button>
        </header>

        <main className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-center py-16 md:py-24">
          <section>
            <span className="inline-flex px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-sm">
              Interweek • UU MLC
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mt-6 leading-[0.95]">
              Learn. Build. <span className="text-yellow-400">Lead.</span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl mt-6 max-w-2xl leading-relaxed">
              UU MLC Nexus is the club workspace for members, projects, points, tasks, news, and collaboration — all in one place.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <button onClick={onJoin} className="px-6 py-3 rounded-2xl bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition">
                Join the Club
              </button>
              <button onClick={onLogin} className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 font-semibold hover:bg-white/10 transition">
                Member Login
              </button>
            </div>
          </section>

          <section className="bg-white/[0.05] border border-white/10 rounded-[2rem] p-7 shadow-2xl backdrop-blur-xl">
            <img src={logo} alt="UU MLC logo" className="w-32 h-32 object-contain mx-auto" />
            <div className="grid grid-cols-2 gap-3 mt-7">
              {[["🏆","Points"],["👥","Community"],["✓","Tasks"],["📰","News"]].map(([icon,label]) => (
                <div key={label} className="rounded-2xl bg-black/20 border border-white/5 p-5">
                  <div className="text-2xl">{icon}</div>
                  <p className="font-semibold mt-2">{label}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/*
=========================================================
AUTH SCREEN
=========================================================
*/

function AuthScreen({ onAuth, onBack }) {
  const [mode, setMode] = useState("login");

  const toggleMode = () => {
    setMode((current) =>
      current === "login" ? "signup" : "login"
    );
  };

  return mode === "login" ? (
    <Login
      onBack={onBack}
      onLogin={onAuth}
      onSwitch={toggleMode}
    />
  ) : (
    <SignUp
      onBack={onBack}
      onSignup={onAuth}
      onSwitch={toggleMode}
    />
  );
}

function AuthLayout({
  title,
  subtitle,
  children,
  onBack,
}) {
  return (
    <div className="min-h-screen bg-[#0b0b0d] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/[0.06] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <img
              src={logo}
              alt="UU MLC"
              className="w-24 h-24 object-contain"
            />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">
              {title}
            </h1>

            <p className="text-gray-400 text-sm mt-2">
              {subtitle}
            </p>

            <p className="text-gray-500 text-xs mt-1">
              UU MLC Nexus
            </p>
          </div>

          {onBack && (
            <button onClick={onBack} className="mb-4 text-sm text-gray-500 hover:text-white transition">← Back to home</button>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}

/*
=========================================================
LOGIN
=========================================================
*/

function Login({
  onBack,
  onLogin,
  onSwitch,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError(
        "Please enter your email and password."
      );
      return;
    }

    setLoading(true);

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      setError(loginError.message);
    } else {
      await onLogin();
    }

    setLoading(false);
  };

  return (
    <AuthLayout
      onBack={onBack}
      title="Welcome Back"
      subtitle="Sign in to UU MLC Nexus"
    >
      <form
        onSubmit={submit}
        className="space-y-5"
      >
        <div>
          <label className="block text-sm text-gray-300 mb-2">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-yellow-400"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-2">
            Password
          </label>

          <div className="relative">
            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter your password"
              className="w-full px-4 py-3 pr-20 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-yellow-400"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  !showPassword
                )
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400 text-xs"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-yellow-400 text-black font-semibold hover:bg-yellow-300 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="text-center mt-6">
        <p className="text-gray-500 text-sm">
          Don't have an account?
        </p>

        <button
          type="button"
          onClick={onSwitch}
          className="text-yellow-400 text-sm mt-1"
        >
          Create an account
        </button>
      </div>
    </AuthLayout>
  );
}

/*
=========================================================
SIGN UP
=========================================================
*/

function SignUp({
  onBack,
  onSignup,
  onSwitch,
}) {
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!fullName.trim()) {
      setError(
        "Please enter your full name."
      );
      return;
    }

    if (!email || !password) {
      setError(
        "Please fill in all required fields."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    setLoading(true);

    const {
      data,
      error: signupError,
    } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            nickname:
              nickname || null,
          },
        },
      });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      await onSignup();
    } else {
      setMessage(
        "Account created. Check your email to confirm your account."
      );
    }

    setLoading(false);
  };

  return (
    <AuthLayout
      onBack={onBack}
      title="Create Account"
      subtitle="Join Uttara University Machine Learning Club"
    >
      <form
        onSubmit={submit}
        className="space-y-4"
      >
        <input
          type="text"
          value={fullName}
          onChange={(e) =>
            setFullName(e.target.value)
          }
          placeholder="Full name"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
        />

        <input
          value={nickname}
          onChange={(e) =>
            setNickname(e.target.value)
          }
          placeholder="Nickname"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
        />

        <input
          type="email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          placeholder="Email"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
        />

        <input
          type={
            showPassword
              ? "text"
              : "password"
          }
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          placeholder="Password"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
        />

        <input
          type="password"
          value={confirmPassword}
          onChange={(e) =>
            setConfirmPassword(
              e.target.value
            )
          }
          placeholder="Confirm password"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
        />

        <button
          type="button"
          onClick={() =>
            setShowPassword(
              !showPassword
            )
          }
          className="text-yellow-400 text-xs"
        >
          {showPassword
            ? "Hide password"
            : "Show password"}
        </button>

        {error && (
          <p className="text-red-400 text-sm">
            {error}
          </p>
        )}

        {message && (
          <p className="text-yellow-400 text-sm">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-yellow-400 text-black font-semibold disabled:opacity-50"
        >
          {loading
            ? "Creating..."
            : "Create Account"}
        </button>
      </form>

      <div className="text-center mt-6">
        <button
          type="button"
          onClick={onSwitch}
          className="text-yellow-400 text-sm"
        >
          Back to Sign In
        </button>
      </div>
    </AuthLayout>
  );
}

/*
=========================================================
SAFE IMAGE
=========================================================
*/

function SafeImage({
  src,
  alt = "",
  className = "",
}) {
  return (
    <img
      src={src || logo}
      alt={alt}
      className={className}
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = logo;
      }}
    />
  );
}


/*
=========================================================
PUBLIC ATTACHMENT UPLOAD
=========================================================
*/

async function uploadAttachment(
  file,
  userId,
  folder
) {
  if (!file) {
    return {
      url: null,
      error: null,
    };
  }

  if (!file.type.startsWith("image/")) {
    return {
      url: null,
      error: new Error(
        "Please choose an image file."
      ),
    };
  }

  if (
    file.size >
    8 * 1024 * 1024
  ) {
    return {
      url: null,
      error: new Error(
        "Image must be smaller than 8 MB."
      ),
    };
  }

  const safeExtension =
    (
      file.name
        .split(".")
        .pop() ||
      "jpg"
    ).toLowerCase();

  const filePath =
    `${folder}/${userId}/${crypto.randomUUID()}.${safeExtension}`;

  const {
    error: uploadError,
  } =
    await supabase.storage
      .from("attachments")
      .upload(
        filePath,
        file,
        {
          upsert: false,
          contentType:
            file.type,
          cacheControl:
            "3600",
        }
      );

  if (uploadError) {
    return {
      url: null,
      error: uploadError,
    };
  }

  const {
    data: {
      publicUrl,
    },
  } =
    supabase.storage
      .from("attachments")
      .getPublicUrl(
        filePath
      );

  if (!publicUrl) {
    return {
      url: null,
      error: new Error(
        "Image uploaded, but its public URL could not be created."
      ),
    };
  }

  return {
    url: publicUrl,
    error: null,
  };
}

/*
=========================================================
HEADER
=========================================================
*/

function Header({
  profile,
  onLogout,
}) {
  return (
    <header className="border-b border-white/10 bg-white/[0.03]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="UU MLC Logo"
            className="w-12 h-12 rounded-full object-cover border border-yellow-400/20"
          />

          <div>
            <h1 className="font-bold">
              UU MLC Nexus
            </h1>

            <p className="text-gray-500 text-xs">
              Uttara University Machine Learning Club
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2 rounded-xl border border-white/10"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}

/*
=========================================================
GUEST DASHBOARD
=========================================================
*/

function GuestDashboard({
  profile,
  onLogout,
}) {
  const [news, setNews] =
    useState([]);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    const { data } =
      await supabase
        .from("news")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    setNews(data || []);
  };

  return (
    <div className="min-h-screen bg-[#0b0b0d] text-white">
      <Header
        profile={profile}
        onLogout={onLogout}
      />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <section className="bg-white/[0.04] border border-yellow-400/20 rounded-3xl p-8 mb-8">
          <p className="text-gray-400">
            Welcome,{" "}
            {profile.nickname ||
              profile.full_name}
          </p>

          <h2 className="text-3xl font-bold mt-2">
            Your account is pending
          </h2>

          <p className="text-gray-400 mt-4">
            An administrator needs to promote your
            account before you become a club member.
          </p>

          <div className="inline-flex mt-5 px-4 py-2 rounded-full bg-yellow-400/10 text-yellow-400 text-sm">
            Guest
          </div>
        </section>

        <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
          <h3 className="text-2xl font-bold mb-5">
            Club News
          </h3>

          {news.length === 0 ? (
            <p className="text-gray-500">
              No news published yet.
            </p>
          ) : (
            <div className="space-y-4">
              {news.map(
                (item) => (
                  <div
                    key={item.id}
                    className="bg-white/[0.03] rounded-2xl p-4"
                  >
                    <h4 className="font-semibold">
                      {item.title}
                    </h4>

                    <p className="text-gray-400 mt-2">
                      {item.content}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/*
=========================================================
DASHBOARD
=========================================================
*/

function Dashboard({
  profile,
  onLogout,
  reloadProfile,
}) {
  const [tab, setTab] = useState(() => localStorage.getItem("uu-mlc-active-tab") || "overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [todosForBadge, setTodosForBadge] = useState([]);

  const [members, setMembers] =
    useState([]);

  const [news, setNews] =
    useState([]);

  const [pointHistory, setPointHistory] =
    useState([]);

  const [allPointHistory, setAllPointHistory] =
    useState([]);

  const [previousMonth, setPreviousMonth] =
    useState(null);

  const [activityLog, setActivityLog] =
    useState([]);

  const isAdmin = [
    "administrator",
    "head_admin",
  ].includes(
    profile.role
  );

  const isHeadAdmin =
    profile.role ===
    "head_admin";

  const canAwardPoints = [
    "executive",
    "administrator",
    "head_admin",
  ].includes(
    profile.role
  );

  /*
  =========================================================
  AUDIT LOGGING
  =========================================================
  */

  const logAdminAction =
    async ({
      action,
      targetUserId = null,
      details = "",
    }) => {
      const { error } =
        await supabase
          .from(
            "admin_activity_log"
          )
          .insert({
            admin_id:
              profile.id,
            action,
            target_user_id:
              targetUserId,
            details,
          });

      if (error) {
        console.error(
          "Admin activity log error:",
          error
        );
      }

      return !error;
    };

  /*
  =========================================================
  LOAD DATA
  =========================================================
  */

  const loadData = async () => {
    let memberData = [];

    if (isAdmin) {
      const {
        data,
        error,
      } =
        await supabase
          .from("profiles")
          .select("*")
          .order("points", {
            ascending:
              false,
          });

      if (!error) {
        memberData =
          data || [];
      } else {
        console.error(
          "Members error:",
          error
        );
      }
    } else {
      const {
        data,
        error,
      } =
        await supabase
          .from("profiles")
          .select("*")
          .neq(
            "role",
            "guest"
          )
          .eq(
            "is_active",
            true
          )
          .order(
            "points",
            {
              ascending:
                false,
            }
          );

      if (!error) {
        memberData =
          data || [];
      }
    }

    setMembers(
      memberData
    );

    /*
      Personal history.
    */
    const {
      data: myHistory,
      error: myHistoryError,
    } =
      await supabase
        .from(
          "point_history"
        )
        .select("*")
        .eq(
          "member_id",
          profile.id
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );

    if (myHistoryError) {
      console.error(
        "Personal history error:",
        myHistoryError
      );

      setPointHistory(
        []
      );
    } else {
      setPointHistory(
        myHistory ||
          []
      );
    }

    /*
      Full history for Admins.
    */
    if (isAdmin) {
      const {
        data: fullHistory,
        error: fullHistoryError,
      } =
        await supabase
          .from(
            "point_history"
          )
          .select("*")
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

      if (fullHistoryError) {
        console.error(
          "Full point history error:",
          fullHistoryError
        );

        setAllPointHistory(
          []
        );
      } else {
        setAllPointHistory(
          fullHistory ||
            []
        );
      }
    } else {
      setAllPointHistory(
        []
      );
    }

    /*
      Previous month.
    */
    const {
      data: monthData,
      error: monthError,
    } =
      await supabase
        .from(
          "monthly_leaderboard"
        )
        .select("*")
        .order(
          "month_start",
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle();

    if (monthError) {
      console.error(
        "Monthly leaderboard error:",
        monthError
      );

      setPreviousMonth(
        null
      );
    } else {
      setPreviousMonth(
        monthData ||
          null
      );
    }

    /*
      News.
    */
    const {
      data: newsData,
      error: newsError,
    } =
      await supabase
        .from("news")
        .select("*")
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );

    if (newsError) {
      setNews([]);
    } else {
      setNews(
        newsData ||
          []
      );
    }

    /*
      Admin Activity.
    */
    if (isAdmin) {
      const {
        data: activityData,
        error: activityError,
      } =
        await supabase
          .from(
            "admin_activity_log"
          )
          .select("*")
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(500);

      if (activityError) {
        console.error(
          "Activity log error:",
          activityError
        );

        setActivityLog(
          []
        );
      } else {
        setActivityLog(
          activityData ||
            []
        );
      }
    } else {
      setActivityLog([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile.role]);

  useEffect(() => {
    localStorage.setItem("uu-mlc-active-tab", tab);
    setSidebarOpen(false);
  }, [tab]);

  useEffect(() => {
    const loadTodoBadges = async () => {
      const { data, error } = await supabase
        .from("todos")
        .select("id, completed, deadline")
        .eq("completed", false);
      if (!error) setTodosForBadge(data || []);
    };
    loadTodoBadges();
    const channel = supabase
      .channel(`todo-badges-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "todos" }, loadTodoBadges)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [profile.id]);

  /*
  =========================================================
  REAL-TIME PROFILE UPDATES
  =========================================================
  */

  useEffect(() => {
    const channel =
      supabase
        .channel(
          `profiles-${profile.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
          },
          () => {
            loadData();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    profile.id,
    profile.role,
  ]);

  /*
  =========================================================
  REAL-TIME ACTIVITY LOG
  =========================================================
  */

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const channel =
      supabase
        .channel(
          `activity-${profile.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "admin_activity_log",
          },
          () => {
            loadData();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    profile.id,
    profile.role,
    isAdmin,
  ]);

  /*
  =========================================================
  PERMISSIONS
  =========================================================
  */

  const canModifyTarget =
    (target) => {
      if (isHeadAdmin) {
        return true;
      }

      if (
        profile.role ===
          "administrator" &&
        target.role ===
          "head_admin"
      ) {
        return false;
      }

      return (
        profile.role ===
        "administrator"
      );
    };

  /*
  =========================================================
  POINT ADJUSTMENT
  =========================================================
  */

  const adjustPoints =
    async (
      memberId,
      points,
      reason
    ) => {
      const target =
        members.find(
          (member) =>
            member.id ===
            memberId
        );

      const {
        error,
      } =
        await supabase.rpc(
          "award_points",
          {
            p_member_id:
              memberId,
            p_points:
              Number(points),
            p_reason:
              reason,
          }
        );

      if (error) {
        alert(
          error.message
        );

        return false;
      }

      await logAdminAction({
        action:
          "POINT_ADJUSTMENT",
        targetUserId:
          memberId,
        details:
          `${points >= 0 ? "Added" : "Removed"} ${Math.abs(
            Number(points)
          )} points${
            target
              ? ` for ${
                  target.nickname ||
                  target.full_name
                }`
              : ""
          }. Reason: ${reason}`,
      });

      await loadData();
      await reloadProfile();

      return true;
    };

  /*
  =========================================================
  CHANGE ROLE
  =========================================================
  */

  const changeRole =
    async (
      memberId,
      newRole
    ) => {
      const target =
        members.find(
          (member) =>
            member.id ===
            memberId
        );

      if (!target) {
        alert(
          "Member not found."
        );

        return false;
      }

      if (
        !canModifyTarget(
          target
        )
      ) {
        alert(
          "You cannot modify a Head Admin account."
        );

        return false;
      }

      if (
        profile.role ===
          "administrator" &&
        newRole ===
          "head_admin"
      ) {
        alert(
          "Only the Head Admin can assign the Head Admin role."
        );

        return false;
      }

      const oldRole =
        target.role;

      const {
        error,
      } =
        await supabase
          .from("profiles")
          .update({
            role:
              newRole,
          })
          .eq(
            "id",
            memberId
          );

      if (error) {
        alert(
          error.message
        );

        return false;
      }

      await logAdminAction({
        action:
          oldRole ===
            "guest" &&
          newRole ===
            "member"
            ? "PROMOTE_MEMBER"
            : "ROLE_CHANGE",
        targetUserId:
          memberId,
        details:
          `Role changed from ${
            ROLE_NAMES[
              oldRole
            ]
          } to ${
            ROLE_NAMES[
              newRole
            ]
          }.`,
      });

      await loadData();

      return true;
    };

  /*
  =========================================================
  ACTIVATE / DEACTIVATE
  =========================================================
  */

  const toggleMemberActive =
    async (
      memberId,
      isActive
    ) => {
      const target =
        members.find(
          (member) =>
            member.id ===
            memberId
        );

      if (!target) {
        alert(
          "Member not found."
        );

        return false;
      }

      if (
        !canModifyTarget(
          target
        )
      ) {
        alert(
          "You cannot change the status of a Head Admin account."
        );

        return false;
      }

      const {
        error,
      } =
        await supabase
          .from(
            "profiles"
          )
          .update({
            is_active:
              isActive,
          })
          .eq(
            "id",
            memberId
          );

      if (error) {
        alert(
          error.message
        );

        return false;
      }

      await logAdminAction({
        action: isActive
          ? "ACCOUNT_REACTIVATED"
          : "ACCOUNT_DEACTIVATED",
        targetUserId:
          memberId,
        details: isActive
          ? "Account reactivated."
          : "Account deactivated.",
      });

      await loadData();

      return true;
    };

  /*
  =========================================================
  RESET ALL POINTS
  =========================================================
  */

  const resetAllPoints =
    async () => {
      if (!isAdmin) {
        alert(
          "You do not have permission to reset points."
        );

        return false;
      }

      const {
        error,
      } =
        await supabase.rpc(
          "reset_all_points"
        );

      if (error) {
        alert(
          error.message
        );

        return false;
      }

      await logAdminAction({
        action:
          "MONTHLY_POINT_RESET",
        details:
          "All current points were reset. Previous month Top Performer and Runner Up were saved.",
      });

      await loadData();
      await reloadProfile();

      return true;
    };

  /*
  =========================================================
  RESET ONE MEMBER
  =========================================================
  */

  const resetMemberPoints =
    async (
      memberId
    ) => {
      if (!isAdmin) {
        alert(
          "You do not have permission to reset points."
        );

        return false;
      }

      const target =
        members.find(
          (member) =>
            member.id ===
            memberId
        );

      const {
        error,
      } =
        await supabase.rpc(
          "reset_member_points",
          {
            p_member_id:
              memberId,
          }
        );

      if (error) {
        alert(
          error.message
        );

        return false;
      }

      await logAdminAction({
        action:
          "MEMBER_POINT_RESET",
        targetUserId:
          memberId,
        details:
          `Reset current points for ${
            target?.nickname ||
            target?.full_name ||
            "member"
          }.`,
      });

      await loadData();
      await reloadProfile();

      return true;
    };

  /*
  =========================================================
  WIPE ALL POINT DATA
  =========================================================
  */

  const deleteAllPointData =
    async () => {
      if (!isHeadAdmin) {
        alert(
          "Only the Head Admin can wipe all point data."
        );

        return false;
      }

      if (
        !window.confirm(
          "WARNING: This permanently deletes ALL point history and sets all current member points to 0. Previous-month performance records remain."
        )
      ) {
        return false;
      }

      if (
        !window.confirm(
          "FINAL WARNING: Wipe all point data?"
        )
      ) {
        return false;
      }

      const {
        error,
      } =
        await supabase.rpc(
          "delete_all_point_data"
        );

      if (error) {
        alert(
          error.message
        );

        return false;
      }

      await logAdminAction({
        action:
          "WIPE_ALL_POINT_DATA",
        details:
          "Deleted all point history and reset current member points to zero.",
      });

      await loadData();
      await reloadProfile();

      return true;
    };

  /*
  =========================================================
  WIPE PREVIOUS MONTH
  =========================================================
  */

  const deleteMonthlyLeaderboard =
    async () => {
      if (!isHeadAdmin) {
        alert(
          "Only the Head Admin can wipe previous-month performance records."
        );

        return false;
      }

      if (
        !window.confirm(
          "WARNING: This deletes all saved Previous Month Top Performer and Runner Up records. Current points and point history stay unchanged."
        )
      ) {
        return false;
      }

      if (
        !window.confirm(
          "FINAL WARNING: Delete all previous-month records?"
        )
      ) {
        return false;
      }

      const {
        error,
      } =
        await supabase.rpc(
          "delete_monthly_leaderboard"
        );

      if (error) {
        alert(
          error.message
        );

        return false;
      }

      await logAdminAction({
        action:
          "WIPE_PREVIOUS_MONTH",
        details:
          "Deleted all saved previous-month Top Performer and Runner Up records.",
      });

      await loadData();

      return true;
    };

  /*
  =========================================================
  WIPE ADMIN ACTIVITY LOG
  =========================================================
  */

  const deleteAdminActivityLog =
    async () => {
      if (!isHeadAdmin) {
        alert(
          "Only the Head Admin can wipe admin activity history."
        );

        return false;
      }

      if (
        !window.confirm(
          "WARNING: This permanently deletes the entire Admin Activity History."
        )
      ) {
        return false;
      }

      if (
        !window.confirm(
          "FINAL WARNING: Delete all admin activity history?"
        )
      ) {
        return false;
      }

      const {
        error,
      } =
        await supabase.rpc(
          "delete_all_admin_activity_log"
        );

      if (error) {
        alert(
          error.message
        );

        return false;
      }

      // Do not log a wipe of the log itself.
      await loadData();

      return true;
    };

  /*
  =========================================================
  ACTIVE MEMBERS
  =========================================================
  */

  const rankedMembers =
    members.filter(
      (member) =>
        member.role !==
          "guest" &&
        member.is_active !==
          false
    );

  const currentRank =
    rankedMembers.findIndex(
      (member) =>
        member.id ===
        profile.id
    ) + 1;

  const pendingMemberCount =
    members.filter(
      (member) =>
        member.role === "guest" &&
        member.is_active !== false
    ).length;

  const overdueTodoCount =
    todosForBadge.filter(
      (todo) =>
        todo.deadline &&
        new Date(
          `${todo.deadline}T00:00:00`
        ) <
          new Date(
            new Date().setHours(
              0,
              0,
              0,
              0
            )
          )
    ).length;

  const recentNewsCount =
    news.filter(
      (item) =>
        item.created_at &&
        Date.now() -
          new Date(
            item.created_at
          ).getTime() <
          7 *
            24 *
            60 *
            60 *
            1000
    ).length;

  const notificationCount =
    pendingMemberCount +
    overdueTodoCount +
    recentNewsCount;

  return (
    <div className="min-h-screen bg-[#0b0b0d] text-white">
      <Header
        profile={profile}
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-gray-500 text-sm">Workspace</p>
            <h1 className="text-2xl md:text-3xl font-black mt-1">
              UU MLC Nexus
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <button
                type="button"
                className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center"
                aria-label="Notifications"
              >
                <span className="text-lg">
                  🔔
                </span>

                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {notificationCount > 99
                      ? "99+"
                      : notificationCount}
                  </span>
                )}
              </button>

              {notificationCount > 0 && (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl bg-[#151519] border border-white/10 shadow-2xl p-4 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
                  <p className="font-semibold">
                    Notifications
                  </p>

                  <div className="space-y-2 mt-3">
                    {pendingMemberCount > 0 && (
                      <button
                        onClick={() =>
                          setTab("members")
                        }
                        className="w-full text-left rounded-xl bg-yellow-400/10 border border-yellow-400/20 p-3 hover:bg-yellow-400/15 transition"
                      >
                        <p className="text-yellow-300 text-sm font-semibold">
                          Pending members
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {pendingMemberCount}{" "}
                          {pendingMemberCount === 1
                            ? "join request"
                            : "join requests"}{" "}
                          need review.
                        </p>
                      </button>
                    )}

                    {overdueTodoCount > 0 && (
                      <button
                        onClick={() =>
                          setTab("todo")
                        }
                        className="w-full text-left rounded-xl bg-red-500/10 border border-red-400/20 p-3 hover:bg-red-500/15 transition"
                      >
                        <p className="text-red-300 text-sm font-semibold">
                          Overdue tasks
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {overdueTodoCount}{" "}
                          {overdueTodoCount === 1
                            ? "task is"
                            : "tasks are"}{" "}
                          overdue.
                        </p>
                      </button>
                    )}

                    {recentNewsCount > 0 && (
                      <button
                        onClick={() =>
                          setTab("news")
                        }
                        className="w-full text-left rounded-xl bg-blue-500/10 border border-blue-400/20 p-3 hover:bg-blue-500/15 transition"
                      >
                        <p className="text-blue-300 text-sm font-semibold">
                          Recent news
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {recentNewsCount}{" "}
                          recent{" "}
                          {recentNewsCount === 1
                            ? "announcement"
                            : "announcements"}{" "}
                          this week.
                        </p>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() =>
                setSidebarOpen(
                  (value) => !value
                )
              }
              className="lg:hidden px-4 py-3 rounded-xl bg-white/5 border border-white/10"
            >
              ☰ Menu
            </button>
          </div>
        </div>

        {notificationCount > 0 && (
          <section className="mb-6 rounded-3xl border border-yellow-400/20 bg-yellow-400/[0.04] p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-yellow-400 text-sm font-semibold">
                  {notificationCount}{" "}
                  {notificationCount === 1
                    ? "item needs"
                    : "items need"}{" "}
                  your attention
                </p>

                <div className="flex flex-wrap gap-2 mt-3">
                  {pendingMemberCount > 0 && (
                    <button
                      onClick={() =>
                        setTab("members")
                      }
                      className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition"
                    >
                      👥 {pendingMemberCount} pending
                    </button>
                  )}

                  {overdueTodoCount > 0 && (
                    <button
                      onClick={() =>
                        setTab("todo")
                      }
                      className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-400/20 text-xs text-red-300 hover:bg-red-500/20 transition"
                    >
                      ✓ {overdueTodoCount} overdue
                    </button>
                  )}

                  {recentNewsCount > 0 && (
                    <button
                      onClick={() =>
                        setTab("news")
                      }
                      className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-400/20 text-xs text-blue-300 hover:bg-blue-500/20 transition"
                    >
                      📰 {recentNewsCount} recent
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="flex gap-6 items-start">
          <aside className={`${sidebarOpen ? "block" : "hidden"} lg:block w-full lg:w-64 flex-shrink-0`}>
            <div className="sticky top-6 bg-white/[0.04] border border-white/10 rounded-3xl p-3 backdrop-blur-xl">
              <NavItem active={tab === "overview"} onClick={() => setTab("overview")} icon="⌂">Overview</NavItem>
              <NavItem active={tab === "profile"} onClick={() => setTab("profile")} icon="◉">Profile</NavItem>
              <NavItem active={tab === "directory"} onClick={() => setTab("directory")} icon="👥">Directory</NavItem>
              <NavItem active={tab === "todo"} onClick={() => setTab("todo")} icon="✓" badge={overdueTodoCount}>To-Do</NavItem>
              {isAdmin && <NavItem active={tab === "members"} onClick={() => setTab("members")} icon="♟" badge={pendingMemberCount}>Members</NavItem>}
              {canAwardPoints && <NavItem active={tab === "points"} onClick={() => setTab("points")} icon="🏆">Points</NavItem>}
              {isAdmin && <NavItem active={tab === "analytics"} onClick={() => setTab("analytics")} icon="◫">Analytics</NavItem>}
              {isAdmin && <NavItem active={tab === "activity"} onClick={() => setTab("activity")} icon="▤">History</NavItem>}
              {isAdmin && <NavItem active={tab === "news"} onClick={() => setTab("news")} icon="📰" badge={recentNewsCount}>News</NavItem>}
              <button onClick={onLogout} className="w-full mt-3 px-4 py-3 rounded-2xl text-left text-red-300 hover:bg-red-500/10 transition">↪ Sign out</button>
            </div>
          </aside>

          <main className="min-w-0 flex-1">
        {/* Overview */}
        {tab ===
          "overview" && (
          <Overview
            profile={
              profile
            }
            rankedMembers={
              rankedMembers
            }
            news={
              news
            }
            currentRank={
              currentRank
            }
            pointHistory={
              pointHistory
            }
            previousMonth={
              previousMonth
            }
          />
        )}

        {/* Profile */}
        {tab ===
          "profile" && (
          <Profile
            profile={
              profile
            }
            reloadProfile={
              reloadProfile
            }
            onLogAction={
              logAdminAction
            }
          />
        )}

        {/* Directory */}
        {tab ===
          "directory" && (
          <Directory
            members={
              rankedMembers
            }
          />
        )}

        {/* To-Do */}
        {tab ===
          "todo" && (
          <Todo
            profile={
              profile
            }
            isAdmin={
              isAdmin
            }
            onLogAction={
              logAdminAction
            }
          />
        )}

        {/* Members */}
        {tab ===
          "members" &&
          isAdmin && (
            <Members
              members={
                members
              }
              currentUserId={
                profile.id
              }
              currentUserRole={
                profile.role
              }
              canEdit={
                isAdmin
              }
              onRoleChange={
                changeRole
              }
              onToggleActive={
                toggleMemberActive
              }
            />
          )}

        {/* Points */}
        {tab ===
          "points" &&
          canAwardPoints && (
            <>
              <Points
                members={
                  rankedMembers
                }
                history={
                  pointHistory
                }
                allHistory={
                  allPointHistory
                }
                onAdjust={
                  adjustPoints
                }
                canSeeAllPointHistory={
                  isAdmin
                }
                isHeadAdmin={
                  isHeadAdmin
                }
                onDeleteAllPointData={
                  deleteAllPointData
                }
                onDeleteMonthlyLeaderboard={
                  deleteMonthlyLeaderboard
                }
              />

              {isAdmin && (
                <div className="mt-8">
                  <PointReset
                    members={
                      rankedMembers
                    }
                    onResetAll={
                      resetAllPoints
                    }
                    onResetMember={
                      resetMemberPoints
                    }
                  />
                </div>
              )}
            </>
          )}

        {/* Analytics */}
        {tab ===
          "analytics" &&
          isAdmin && (
            <Analytics
              members={members}
              pointHistory={
                allPointHistory
              }
              news={news}
              profile={profile}
            />
          )}

        {/* Admin activity */}
        {tab ===
          "activity" &&
          isAdmin && (
            <AdminActivity
              activityLog={
                activityLog
              }
              members={members}
              isHeadAdmin={
                isHeadAdmin
              }
              onWipe={
                deleteAdminActivityLog
              }
            />
          )}

        {/* News */}
        {tab ===
          "news" &&
          isAdmin && (
            <News
              news={
                news
              }
              profile={
                profile
              }
              reload={
                loadData
              }
              onLogAction={
                logAdminAction
              }
            />
          )}
          </main>
        </div>
      </div>
    </div>
  );
}


/*
=========================================================
ANALYTICS
=========================================================
*/

function Analytics({
  members,
  pointHistory,
  news,
  profile,
}) {
  const [todos, setTodos] =
    useState([]);

  const [range, setRange] =
    useState("30");

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadAnalyticsTodos =
      async () => {
        const {
          data,
          error,
        } =
          await supabase
            .from("todos")
            .select(
              "id, completed, created_at, completed_at, deadline"
            );

        if (error) {
          console.error(
            "Analytics todo error:",
            error
          );
          setTodos([]);
        } else {
          setTodos(data || []);
        }

        setLoading(false);
      };

    loadAnalyticsTodos();
  }, []);

  const activeMembers =
    members.filter(
      (member) =>
        member.is_active !== false &&
        member.role !== "guest"
    );

  const pendingMembers =
    members.filter(
      (member) =>
        member.role === "guest" &&
        member.is_active !== false
    );

  const totalPoints =
    activeMembers.reduce(
      (sum, member) =>
        sum + Number(member.points || 0),
      0
    );

  const averagePoints =
    activeMembers.length
      ? Math.round(
          totalPoints /
            activeMembers.length
        )
      : 0;

  const completedTasks =
    todos.filter(
      (todo) =>
        todo.completed
    );

  const overdueTasks =
    todos.filter(
      (todo) =>
        !todo.completed &&
        todo.deadline &&
        new Date(
          `${todo.deadline}T23:59:59`
        ) < new Date()
    );

  const cutoff =
    Date.now() -
    Number(range) *
      24 *
      60 *
      60 *
      1000;

  const filteredHistory =
    pointHistory.filter(
      (item) =>
        !item.created_at ||
        new Date(
          item.created_at
        ).getTime() >= cutoff
    );

  const filteredNews =
    news.filter(
      (item) =>
        !item.created_at ||
        new Date(
          item.created_at
        ).getTime() >= cutoff
    );

  const pointsAdded =
    filteredHistory.reduce(
      (sum, item) =>
        sum +
        Math.max(
          0,
          Number(
            item.points || 0
          )
        ),
      0
    );

  const pointsRemoved =
    filteredHistory.reduce(
      (sum, item) =>
        sum +
        Math.max(
          0,
          -Number(
            item.points || 0
          )
        ),
      0
    );

  const topPerformers =
    [...activeMembers]
      .sort(
        (a, b) =>
          Number(b.points || 0) -
          Number(a.points || 0)
      )
      .slice(0, 5);

  const roleCounts =
    activeMembers.reduce(
      (acc, member) => {
        const role =
          ROLE_NAMES[
            member.role
          ] ||
          member.role ||
          "Unknown";

        acc[role] =
          (acc[role] || 0) +
          1;

        return acc;
      },
      {}
    );

  const recentActivity =
    [...filteredHistory]
      .sort(
        (a, b) =>
          new Date(
            b.created_at || 0
          ) -
          new Date(
            a.created_at || 0
          )
      )
      .slice(0, 6);

  const statCards = [
    {
      label: "Active Members",
      value:
        activeMembers.length,
      note:
        `${pendingMembers.length} pending`,
      icon: "👥",
    },
    {
      label: "Total Points",
      value: totalPoints,
      note:
        `Avg ${averagePoints} per member`,
      icon: "🏆",
    },
    {
      label: "Tasks Completed",
      value:
        completedTasks.length,
      note:
        `${overdueTasks.length} overdue`,
      icon: "✓",
    },
    {
      label: "News in Range",
      value:
        filteredNews.length,
      note:
        `Last ${range} days`,
      icon: "📰",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6 md:p-7">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <p className="text-yellow-400 text-sm font-semibold">
              Admin Insights
            </p>

            <h2 className="text-3xl font-black mt-1">
              Club Analytics
            </h2>

            <p className="text-gray-500 mt-2">
              Membership, performance, tasks,
              and club activity at a glance.
            </p>
          </div>

          <select
            value={range}
            onChange={(event) =>
              setRange(
                event.target.value
              )
            }
            className="bg-[#17171b] border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
          >
            <option value="7">
              Last 7 days
            </option>
            <option value="30">
              Last 30 days
            </option>
            <option value="90">
              Last 90 days
            </option>
            <option value="365">
              Last year
            </option>
          </select>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(
          (card) => (
            <div
              key={card.label}
              className="bg-white/[0.04] border border-white/10 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">
                    {card.label}
                  </p>

                  <p className="text-3xl font-black mt-2">
                    {card.value}
                  </p>

                  <p className="text-gray-600 text-xs mt-1">
                    {card.note}
                  </p>
                </div>

                <div className="text-2xl">
                  {card.icon}
                </div>
              </div>
            </div>
          )
        )}
      </section>

      <section className="grid xl:grid-cols-2 gap-5">
        <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
          <p className="text-yellow-400 text-sm font-semibold">
            Points Activity
          </p>

          <h3 className="text-2xl font-black mt-1">
            Point Flow
          </h3>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="rounded-2xl bg-green-500/10 border border-green-400/20 p-5">
              <p className="text-green-300 text-xs uppercase tracking-wider">
                Added
              </p>

              <p className="text-3xl font-black mt-2">
                +{pointsAdded}
              </p>
            </div>

            <div className="rounded-2xl bg-red-500/10 border border-red-400/20 p-5">
              <p className="text-red-300 text-xs uppercase tracking-wider">
                Removed
              </p>

              <p className="text-3xl font-black mt-2">
                -{pointsRemoved}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-gray-500 text-sm">
              Recent point activity
            </p>

            <div className="space-y-2 mt-3">
              {recentActivity.length ===
              0 ? (
                <p className="text-gray-600 text-sm py-4">
                  No point activity in this range.
                </p>
              ) : (
                recentActivity.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 bg-white/[0.025] rounded-xl px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {item.reason ||
                            "Point adjustment"}
                        </p>

                        <p className="text-gray-600 text-xs mt-1">
                          {item.created_at
                            ? new Date(
                                item.created_at
                              ).toLocaleDateString()
                            : ""}
                        </p>
                      </div>

                      <span
                        className={
                          Number(
                            item.points || 0
                          ) >= 0
                            ? "text-green-400 font-bold"
                            : "text-red-400 font-bold"
                        }
                      >
                        {Number(
                          item.points || 0
                        ) >= 0
                          ? "+"
                          : ""}
                        {item.points}
                      </span>
                    </div>
                  )
                )
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
          <p className="text-yellow-400 text-sm font-semibold">
            Membership
          </p>

          <h3 className="text-2xl font-black mt-1">
            Member Breakdown
          </h3>

          <div className="space-y-3 mt-6">
            {Object.entries(
              roleCounts
            ).map(
              ([role, count]) => {
                const percentage =
                  activeMembers.length
                    ? Math.round(
                        (count /
                          activeMembers.length) *
                          100
                      )
                    : 0;

                return (
                  <div key={role}>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-gray-300">
                        {role}
                      </span>

                      <span className="text-gray-500">
                        {count} · {percentage}%
                      </span>
                    </div>

                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-yellow-400 rounded-full"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}

            {pendingMembers.length >
              0 && (
              <div className="rounded-xl bg-yellow-400/10 border border-yellow-400/20 p-4 mt-4">
                <p className="text-yellow-300 text-sm font-semibold">
                  Pending join requests
                </p>

                <p className="text-2xl font-black mt-1">
                  {pendingMembers.length}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1.15fr_0.85fr] gap-5">
        <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
          <p className="text-yellow-400 text-sm font-semibold">
            Performance
          </p>

          <h3 className="text-2xl font-black mt-1">
            Top 5 Members
          </h3>

          <div className="space-y-3 mt-5">
            {topPerformers.length ===
            0 ? (
              <p className="text-gray-600 py-5">
                No active members yet.
              </p>
            ) : (
              topPerformers.map(
                (member, index) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.025] border border-white/5 p-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 text-center font-black text-yellow-400">
                        #{index + 1}
                      </span>

                      <SafeImage
                        src={
                          member.avatar_url ||
                          logo
                        }
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />

                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {member.nickname ||
                            member.full_name}
                        </p>

                        <p className="text-gray-600 text-xs mt-1">
                          {ROLE_NAMES[
                            member.role
                          ]}
                        </p>
                      </div>
                    </div>

                    <span className="font-black">
                      {member.points ??
                        0}
                    </span>
                  </div>
                )
              )
            )}
          </div>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
          <p className="text-yellow-400 text-sm font-semibold">
            Task Health
          </p>

          <h3 className="text-2xl font-black mt-1">
            To-Do Overview
          </h3>

          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between rounded-2xl bg-white/[0.025] border border-white/5 p-4">
              <div>
                <p className="text-gray-400 text-sm">
                  Completed
                </p>
                <p className="text-2xl font-black mt-1">
                  {completedTasks.length}
                </p>
              </div>
              <span className="text-green-400 text-2xl">
                ✓
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-red-500/[0.04] border border-red-400/10 p-4">
              <div>
                <p className="text-gray-400 text-sm">
                  Overdue
                </p>
                <p className="text-2xl font-black mt-1">
                  {overdueTasks.length}
                </p>
              </div>
              <span className="text-red-400 text-2xl">
                !
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-blue-500/[0.04] border border-blue-400/10 p-4">
              <div>
                <p className="text-gray-400 text-sm">
                  Total tasks
                </p>
                <p className="text-2xl font-black mt-1">
                  {todos.length}
                </p>
              </div>
              <span className="text-blue-300 text-2xl">
                ✓
              </span>
            </div>
          </div>

          {loading && (
            <p className="text-gray-600 text-xs mt-4">
              Updating task metrics...
            </p>
          )}
        </div>
      </section>

      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
        <p className="text-yellow-400 text-sm font-semibold">
          Highlights
        </p>

        <h3 className="text-2xl font-black mt-1">
          Club Snapshot
        </h3>

        <div className="grid md:grid-cols-3 gap-4 mt-5">
          <div className="rounded-2xl bg-white/[0.025] border border-white/5 p-5">
            <p className="text-gray-600 text-xs uppercase tracking-wider">
              Top performer
            </p>
            <p className="font-bold mt-2">
              {topPerformers[0]
                ? topPerformers[0].nickname ||
                  topPerformers[0].full_name
                : "—"}
            </p>
            <p className="text-yellow-400 text-sm mt-1">
              {topPerformers[0]?.points ??
                0}{" "}
              points
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.025] border border-white/5 p-5">
            <p className="text-gray-600 text-xs uppercase tracking-wider">
              Recent news
            </p>
            <p className="font-bold mt-2">
              {filteredNews[0]?.title ||
                "No recent news"}
            </p>
            <p className="text-gray-600 text-xs mt-1">
              {filteredNews.length} in selected range
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.025] border border-white/5 p-5">
            <p className="text-gray-600 text-xs uppercase tracking-wider">
              Signed-in admin
            </p>
            <p className="font-bold mt-2">
              {profile.nickname ||
                profile.full_name}
            </p>
            <p className="text-gray-600 text-xs mt-1">
              {ROLE_NAMES[
                profile.role
              ]}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function NavItem({ active, onClick, icon, children, badge = 0 }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left transition ${active ? "bg-yellow-400 text-black" : "text-gray-300 hover:bg-white/10"}`}
    >
      <span className="flex items-center gap-3"><span className="w-6 text-center">{icon}</span>{children}</span>
      {badge > 0 && <span className={`min-w-6 h-6 px-2 rounded-full text-xs flex items-center justify-center font-bold ${active ? "bg-black text-yellow-300" : "bg-red-500 text-white"}`}>{badge > 99 ? "99+" : badge}</span>}
    </button>
  );
}

/*
=========================================================
TAB
=========================================================
*/

function Tab({
  active,
  onClick,
  children,
}) {
  return (
    <button
      onClick={
        onClick
      }
      className={`px-4 py-2 rounded-xl text-sm transition ${
        active
          ? "bg-yellow-400 text-black"
          : "bg-white/[0.05] text-gray-300 border border-white/10 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

/*
=========================================================
OVERVIEW
=========================================================
*/

function Overview({
  profile,
  rankedMembers,
  news,
  currentRank,
  pointHistory,
  previousMonth,
}) {
  const topFive = rankedMembers.slice(0, 5);

  const monthLabel =
    previousMonth?.month_start
      ? new Date(
          `${previousMonth.month_start}T00:00:00`
        ).toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        })
      : null;

  const latestNews = news.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <section className="relative overflow-hidden bg-white/[0.04] border border-white/10 rounded-3xl p-6 md:p-8">
        <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-yellow-400/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-yellow-400 text-sm font-semibold">
              Welcome back
            </p>

            <h2 className="text-3xl md:text-4xl font-black mt-1">
              {profile.nickname || profile.full_name}
            </h2>

            <p className="text-gray-500 mt-2">
              {ROLE_NAMES[profile.role]}
            </p>
          </div>

          <SafeImage
            src={profile.avatar_url || logo}
            alt=""
            className="w-16 h-16 rounded-2xl object-cover border border-white/10"
          />
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Stat
          title="Total Members"
          value={rankedMembers.length}
        />

        <Stat
          title="Your Points"
          value={profile.points ?? 0}
        />

        <Stat
          title="Your Rank"
          value={
            currentRank > 0
              ? `#${currentRank}`
              : "—"
          }
        />

        <Stat
          title="Your Role"
          value={
            ROLE_NAMES[profile.role]
          }
        />
      </section>

      {/* Main dashboard */}
      <section className="grid xl:grid-cols-[1.15fr_0.85fr] gap-5 items-start">
        {/* Leaderboard */}
        <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 md:p-6">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-yellow-400 text-sm font-semibold">
                Current Month
              </p>

              <h3 className="text-2xl md:text-3xl font-black mt-1">
                Top 5 Leaderboard
              </h3>
            </div>

            <span className="text-xs text-gray-600">
              {topFive.length} ranked
            </span>
          </div>

          {topFive.length === 0 ? (
            <p className="text-gray-500 py-8">
              No members yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {topFive.map(
                (member, index) => (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 border transition ${
                      member.id === profile.id
                        ? "bg-yellow-400/10 border-yellow-400/20"
                        : "bg-white/[0.025] border-white/5 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 text-center text-yellow-400 font-black">
                        #{index + 1}
                      </span>

                      <SafeImage
                        src={
                          member.avatar_url ||
                          logo
                        }
                        alt=""
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />

                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {member.nickname ||
                            member.full_name}
                        </p>

                        <p className="text-gray-500 text-xs truncate">
                          {ROLE_NAMES[
                            member.role
                          ] || member.role}
                        </p>
                      </div>
                    </div>

                    <span className="font-black shrink-0">
                      {member.points ?? 0}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Latest news */}
        <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 md:p-6">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-yellow-400 text-sm font-semibold">
                Club Updates
              </p>

              <h3 className="text-2xl md:text-3xl font-black mt-1">
                Latest News
              </h3>
            </div>

            <span className="text-xs text-gray-600">
              {news.length} total
            </span>
          </div>

          {latestNews.length === 0 ? (
            <p className="text-gray-500 py-8">
              No news published yet.
            </p>
          ) : (
            <div className="space-y-3">
              {latestNews.map(
                (item) => (
                  <article
                    key={item.id}
                    className="overflow-hidden bg-white/[0.025] border border-white/5 rounded-2xl"
                  >
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={
                          item.title ||
                          "News attachment"
                        }
                        className="w-full h-32 object-cover"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display =
                            "none";
                        }}
                      />
                    )}

                    <div className="p-4">
                      <h4 className="font-bold">
                        {item.title}
                      </h4>

                      <p className="text-gray-400 text-sm mt-1.5 line-clamp-3 whitespace-pre-wrap">
                        {item.content}
                      </p>

                      {item.created_at && (
                        <p className="text-gray-600 text-xs mt-3">
                          {new Date(
                            item.created_at
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </div>
      </section>

      {/* Previous month standouts */}
      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 md:p-6">
        <div className="mb-5">
          <p className="text-yellow-400 text-sm font-semibold">
            {monthLabel || "Previous Month"}
          </p>

          <h3 className="text-2xl md:text-3xl font-black mt-1">
            Monthly Standouts
          </h3>
        </div>

        {!previousMonth ? (
          <div className="rounded-2xl bg-white/[0.025] border border-white/5 p-6">
            <p className="text-gray-500">
              No previous month has been completed yet.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-yellow-400/10 border border-yellow-400/20 p-5">
              <div className="flex items-center gap-4">
                <div className="text-4xl">
                  🏆
                </div>

                <div className="min-w-0">
                  <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider">
                    Top Performer
                  </p>

                  <h4 className="text-xl font-black mt-1 truncate">
                    {previousMonth.first_place_name ||
                      "Unknown"}
                  </h4>

                  <p className="text-gray-400 text-sm mt-1">
                    {previousMonth.first_place_points ??
                      0}{" "}
                    points
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/[0.025] border border-white/10 p-5">
              <div className="flex items-center gap-4">
                <div className="text-4xl">
                  🥈
                </div>

                <div className="min-w-0">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">
                    Runner Up
                  </p>

                  <h4 className="text-xl font-black mt-1 truncate">
                    {previousMonth.second_place_name ||
                      "Unknown"}
                  </h4>

                  <p className="text-gray-400 text-sm mt-1">
                    {previousMonth.second_place_points ??
                      0}{" "}
                    points
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Personal history */}
      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-gray-500 text-sm">
              Your activity
            </p>

            <h3 className="text-xl font-bold mt-1">
              My Point History
            </h3>
          </div>

          <span className="text-xs text-gray-600">
            {pointHistory.length} records
          </span>
        </div>

        <div className="mt-4">
          {pointHistory.length === 0 ? (
            <p className="text-gray-500">
              No point records yet.
            </p>
          ) : (
            <PersonalPointHistory
              history={pointHistory}
            />
          )}
        </div>
      </section>
    </div>
  );
}


/*
=========================================================
STAT
=========================================================
*/

function Stat({
  title,
  value,
}) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
      <p className="text-gray-500 text-sm">
        {title}
      </p>

      <p className="text-3xl font-bold mt-2">
        {value}
      </p>
    </div>
  );
}

/*
=========================================================
PERSONAL POINT HISTORY
=========================================================
*/

function PersonalPointHistory({
  history,
}) {
  return (
    <div className="space-y-3">
      {history.map(
        (item) => (
          <div
            key={
              item.id
            }
            className="flex items-center justify-between bg-white/[0.03] rounded-2xl p-4"
          >
            <div>
              <p
                className={
                  item.points >=
                  0
                    ? "text-yellow-400 font-semibold"
                    : "text-red-400 font-semibold"
                }
              >
                {item.points >=
                0
                  ? `+${item.points}`
                  : item.points}{" "}
                points
              </p>

              <p className="text-gray-400 text-sm mt-1">
                {
                  item.reason
                }
              </p>
            </div>

            <span className="text-gray-500 text-xs">
              {new Date(
                item.created_at
              ).toLocaleDateString()}
            </span>
          </div>
        )
      )}
    </div>
  );
}

/*
=========================================================
ADMIN POINT HISTORY
=========================================================
*/

function AdminPointHistory({
  history,
  rankedMembers,
}) {
  const memberMap =
    Object.fromEntries(
      rankedMembers.map(
        (member) => [
          member.id,
          member.nickname ||
            member.full_name ||
            "Unknown",
        ]
      )
    );

  return (
    <div className="space-y-3">
      {history.map(
        (item) => (
          <div
            key={
              item.id
            }
            className="bg-white/[0.03] rounded-2xl p-5"
          >
            <p className="font-semibold">
              {
                memberMap[
                  item.member_id
                ]
              }
            </p>

            <p
              className={
                item.points >=
                0
                  ? "text-yellow-400 font-bold"
                  : "text-red-400 font-bold"
              }
            >
              {item.points >=
              0
                ? `+${item.points}`
                : item.points}{" "}
              points
            </p>

            <p className="text-gray-300 text-sm mt-2">
              {
                item.reason
              }
            </p>

            <p className="text-gray-600 text-xs mt-2">
              {new Date(
                item.created_at
              ).toLocaleString()}
            </p>
          </div>
        )
      )}
    </div>
  );
}

/*
=========================================================
PROFILE
=========================================================
*/

function Profile({
  profile,
  reloadProfile,
  onLogAction,
}) {
  const [fullName, setFullName] =
    useState(profile.full_name || "");

  const [nickname, setNickname] =
    useState(profile.nickname || "");

  const [bio, setBio] =
    useState(profile.bio || "");

  const [avatarUrl, setAvatarUrl] =
    useState(profile.avatar_url || "");

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [editMode, setEditMode] =
    useState(false);

  const uploadAvatar =
    async (event) => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        setMessage(
          "Please choose an image file."
        );
        return;
      }

      if (
        file.size >
        5 * 1024 * 1024
      ) {
        setMessage(
          "Image must be smaller than 5 MB."
        );
        return;
      }

      setSaving(true);
      setMessage("");

      try {
        const filePath =
          `${profile.id}/avatar`;

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from("avatars")
            .upload(
              filePath,
              file,
              {
                upsert: true,
                contentType:
                  file.type,
                cacheControl:
                  "3600",
              }
            );

        if (uploadError) {
          console.error(
            "Avatar upload error:",
            uploadError
          );

          setMessage(
            `Upload failed: ${uploadError.message}`
          );
          return;
        }

        const {
          data: {
            publicUrl,
          },
        } =
          supabase.storage
            .from("avatars")
            .getPublicUrl(
              filePath
            );

        if (!publicUrl) {
          setMessage(
            "The image uploaded, but no public URL was returned."
          );
          return;
        }

        const finalUrl =
          `${publicUrl}?v=${Date.now()}`;

        const {
          error:
            profileError,
        } =
          await supabase
            .from("profiles")
            .update({
              avatar_url:
                finalUrl,
            })
            .eq(
              "id",
              profile.id
            );

        if (profileError) {
          console.error(
            "Avatar profile update error:",
            profileError
          );

          setMessage(
            `Image uploaded, but profile update failed: ${profileError.message}`
          );
          return;
        }

        setAvatarUrl(
          finalUrl
        );

        const {
          data: oldFiles,
          error: listError,
        } =
          await supabase.storage
            .from("avatars")
            .list(
              profile.id
            );

        if (listError) {
          console.error(
            "Avatar cleanup list error:",
            listError
          );
        } else if (
          oldFiles &&
          oldFiles.length > 0
        ) {
          const filesToDelete =
            oldFiles
              .filter(
                (item) =>
                  item.name !==
                  "avatar"
              )
              .map(
                (item) =>
                  `${profile.id}/${item.name}`
              );

          if (
            filesToDelete.length >
            0
          ) {
            const {
              error:
                deleteError,
            } =
              await supabase.storage
                .from("avatars")
                .remove(
                  filesToDelete
                );

            if (deleteError) {
              console.error(
                "Old avatar cleanup error:",
                deleteError
              );
            }
          }
        }

        setMessage(
          "Profile picture updated successfully."
        );

        if (onLogAction) {
          await onLogAction({
            action:
              "PROFILE_PICTURE_UPDATED",
            targetUserId:
              profile.id,
            details:
              "Updated profile picture.",
          });
        }

        await reloadProfile();
      } catch (error) {
        console.error(
          "Unexpected avatar error:",
          error
        );

        setMessage(
          "Something went wrong while changing the profile picture."
        );
      } finally {
        setSaving(false);
        event.target.value = "";
      }
    };

  const resetEdits = () => {
    setFullName(
      profile.full_name || ""
    );
    setNickname(
      profile.nickname || ""
    );
    setBio(
      profile.bio || ""
    );
    setAvatarUrl(
      profile.avatar_url || ""
    );
    setMessage("");
    setEditMode(false);
  };

  const saveProfile =
    async (event) => {
      event.preventDefault();

      setSaving(true);
      setMessage("");

      const {
        error,
      } =
        await supabase
          .from("profiles")
          .update({
            full_name:
              fullName.trim(),
            nickname:
              nickname.trim(),
            bio:
              bio.trim(),
            avatar_url:
              avatarUrl ||
              null,
          })
          .eq(
            "id",
            profile.id
          );

      if (error) {
        setMessage(
          error.message
        );
        setSaving(false);
        return;
      }

      setMessage(
        "Profile saved successfully."
      );

      if (onLogAction) {
        await onLogAction({
          action:
            "PROFILE_UPDATED",
          targetUserId:
            profile.id,
          details:
            "Updated profile name, nickname, bio, or avatar settings.",
        });
      }

      await reloadProfile();

      setEditMode(false);
      setSaving(false);
    };

  const displayName =
    profile.nickname ||
    profile.full_name ||
    "UU MLC Member";

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (word) =>
          word[0]?.toUpperCase()
      )
      .join("") ||
    "M";

  return (
    <div className="space-y-6">
      {/* Profile hero */}
      <section className="relative overflow-hidden bg-white/[0.04] border border-white/10 rounded-3xl p-6 md:p-8">
        <div className="absolute -right-24 -top-32 w-96 h-96 rounded-full bg-yellow-400/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="relative shrink-0">
            <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-yellow-400/30 bg-white/[0.03]">
              {avatarUrl ? (
                <SafeImage
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-black text-yellow-400">
                  {initials}
                </div>
              )}
            </div>

            {editMode && (
              <label className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-yellow-400 text-black flex items-center justify-center cursor-pointer shadow-lg hover:bg-yellow-300 transition">
                ✎
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={saving}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-yellow-400 text-sm font-semibold">
              Member Profile
            </p>

            <h2 className="text-3xl md:text-4xl font-black mt-1 truncate">
              {displayName}
            </h2>

            {profile.nickname &&
              profile.full_name &&
              profile.nickname !==
                profile.full_name && (
                <p className="text-gray-500 mt-1">
                  {profile.full_name}
                </p>
              )}

            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-3 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-xs font-semibold">
                {ROLE_NAMES[
                  profile.role
                ]}
              </span>

              <span className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-gray-300 text-xs font-semibold">
                {profile.points ?? 0} points
              </span>
            </div>
          </div>

          {!editMode && (
            <button
              type="button"
              onClick={() => {
                setMessage("");
                setEditMode(true);
              }}
              className="px-5 py-3 rounded-xl bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition shrink-0"
            >
              Edit Profile
            </button>
          )}
        </div>
      </section>

      {/* Member summary */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
          <p className="text-gray-600 text-xs uppercase tracking-wider">
            Points
          </p>

          <p className="text-3xl font-black mt-2">
            {profile.points ?? 0}
          </p>

          <p className="text-gray-500 text-xs mt-1">
            Current club points
          </p>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
          <p className="text-gray-600 text-xs uppercase tracking-wider">
            Role
          </p>

          <p className="text-xl font-black mt-2">
            {ROLE_NAMES[
              profile.role
            ]}
          </p>

          <p className="text-gray-500 text-xs mt-1">
            Account access level
          </p>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 sm:col-span-2 lg:col-span-1">
          <p className="text-gray-600 text-xs uppercase tracking-wider">
            Status
          </p>

          <p className="text-xl font-black text-green-400 mt-2">
            Active
          </p>

          <p className="text-gray-500 text-xs mt-1">
            UU MLC Nexus account
          </p>
        </div>
      </section>

      {/* Profile editor / bio */}
      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6 md:p-7">
        {!editMode ? (
          <div className="grid md:grid-cols-[1fr_auto] gap-6">
            <div>
              <p className="text-yellow-400 text-sm font-semibold">
                About
              </p>

              <h3 className="text-xl font-bold mt-1">
                Bio
              </h3>

              <p className="text-gray-400 leading-relaxed mt-4 whitespace-pre-wrap">
                {profile.bio ||
                  "Add a short introduction about yourself, your interests, or what you work on in the club."}
              </p>
            </div>

            <div className="rounded-2xl bg-black/10 border border-white/5 p-5 md:w-64">
              <p className="text-gray-600 text-xs uppercase tracking-wider">
                Profile picture
              </p>

              <p className="text-gray-400 text-sm mt-2">
                Click Edit Profile to upload a new picture.
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={saveProfile}
            className="space-y-5"
          >
            <div>
              <p className="text-yellow-400 text-sm font-semibold">
                Edit Profile
              </p>

              <h3 className="text-2xl font-black mt-1">
                Your Information
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Full Name
                </label>

                <input
                  value={fullName}
                  onChange={(event) =>
                    setFullName(
                      event.target.value
                    )
                  }
                  placeholder="Full name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Nickname
                </label>

                <input
                  value={nickname}
                  onChange={(event) =>
                    setNickname(
                      event.target.value
                    )
                  }
                  placeholder="Nickname"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Bio
              </label>

              <textarea
                value={bio}
                onChange={(event) =>
                  setBio(
                    event.target.value
                  )
                }
                placeholder="Tell the club a little about yourself..."
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white resize-none outline-none focus:border-yellow-400"
              />
            </div>

            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/20">
                  <SafeImage
                    src={
                      avatarUrl || logo
                    }
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    Profile Picture
                  </p>

                  <p className="text-gray-600 text-xs mt-1">
                    Maximum 5 MB. Use the edit button on the profile photo to replace it.
                  </p>
                </div>
              </div>
            </div>

            {message && (
              <p className="text-yellow-400 text-sm">
                {message}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-yellow-400 text-black rounded-xl font-semibold disabled:opacity-50 hover:bg-yellow-300 transition"
              >
                {saving
                  ? "Saving..."
                  : "Save Profile"}
              </button>

              <button
                type="button"
                onClick={resetEdits}
                disabled={saving}
                className="px-6 py-3 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
/*
=========================================================
DIRECTORY
=========================================================
*/

function Directory({
  members,
}) {
  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  /*
    Guests and inactive accounts stay private.
  */
  const publicMembers =
    members.filter(
      (member) =>
        member.role !==
          "guest" &&
        member.is_active !==
          false
    );

  const filtered =
    publicMembers.filter(
      (member) => {
        const name =
          `${member.full_name || ""} ${
            member.nickname || ""
          }`.toLowerCase();

        return (
          name.includes(
            search.toLowerCase()
          ) &&
          (
            filter ===
              "all" ||
            member.role ===
              filter
          )
        );
      }
    );

  return (
    <section>
      <h2 className="text-3xl font-bold">
        Member Directory
      </h2>

      <p className="text-gray-500 mt-1">
        Browse active club members.
      </p>

      <input
        value={search}
        onChange={(e) =>
          setSearch(
            e.target.value
          )
        }
        placeholder="Search members..."
        className="w-full md:w-96 mt-6 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
      />

      <div className="flex flex-wrap gap-2 mt-4 mb-6">
        {[
          ["all", "All"],
          [
            "member",
            "Members",
          ],
          [
            "executive",
            "Executives",
          ],
          [
            "administrator",
            "Administrators",
          ],
          [
            "head_admin",
            "Head Admins",
          ],
        ].map(
          ([value, label]) => (
            <button
              key={
                value
              }
              onClick={() =>
                setFilter(
                  value
                )
              }
              className={`px-4 py-2 rounded-xl ${
                filter ===
                value
                  ? "bg-yellow-400 text-black"
                  : "bg-white/5 text-gray-300"
              }`}
            >
              {
                label
              }
            </button>
          )
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(
          (member) => (
            <div
              key={
                member.id
              }
              className="bg-white/[0.04] border border-white/10 rounded-3xl p-6"
            >
              <div className="flex justify-center">
                <SafeImage
                  src={
                    member.avatar_url ||
                    logo
                  }
                  alt={
                    member.nickname ||
                    member.full_name
                  }
                  className="w-24 h-24 rounded-full object-cover"
                />
              </div>

              <div className="text-center mt-4">
                <h3 className="text-xl font-semibold">
                  {
                    member.nickname ||
                      member.full_name
                  }
                </h3>

                <p className="text-yellow-400 text-sm mt-2">
                  {
                    ROLE_NAMES[
                      member.role
                    ]
                  }
                </p>

                <p className="text-2xl font-bold mt-4">
                  {
                    member.points
                  }
                </p>

                <p className="text-gray-500 text-sm">
                  points
                </p>

                <p className="text-gray-400 text-sm mt-4">
                  {
                    member.bio ||
                      "No bio yet."
                  }
                </p>
              </div>
            </div>
          )
        )}
      </div>

      {filtered.length ===
        0 && (
        <div className="text-center py-16">
          <p className="text-gray-500">
            No members found.
          </p>

          <button
            onClick={() => {
              setSearch("");
              setFilter("all");
            }}
            className="mt-4 px-4 py-2 bg-yellow-400 text-black rounded-xl"
          >
            Clear Filters
          </button>
        </div>
      )}
    </section>
  );
}

/*
=========================================================
MEMBER DATE FORMATTER
=========================================================
*/

function formatMemberJoinDate(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

/*
=========================================================
MEMBERS
=========================================================
*/

function Members({
  members,
  currentUserId,
  currentUserRole,
  canEdit,
  onRoleChange,
  onToggleActive,
}) {
  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const availableRoles =
    currentUserRole ===
    "head_admin"
      ? [
          "guest",
          "member",
          "executive",
          "administrator",
          "head_admin",
        ]
      : [
          "guest",
          "member",
          "executive",
        ];

  const canModifyTarget =
    (member) => {
      if (
        currentUserRole ===
        "head_admin"
      ) {
        return true;
      }

      if (
        currentUserRole ===
          "administrator" &&
        member.role ===
          "head_admin"
      ) {
        return false;
      }

      return (
        currentUserRole ===
        "administrator"
      );
    };

  const pendingMembers =
    members.filter(
      (member) =>
        member.role ===
          "guest" &&
        member.is_active !==
          false
    );

  const filteredMembers =
    members.filter(
      (member) => {
        const searchable = [
          member.full_name,
          member.nickname,
          member.email,
          ROLE_NAMES[
            member.role
          ],
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !search.trim() ||
          searchable.includes(
            search
              .trim()
              .toLowerCase()
          );

        const matchesStatus =
          statusFilter ===
            "all" ||
          (statusFilter ===
            "pending" &&
            member.role ===
              "guest" &&
            member.is_active !==
              false) ||
          (statusFilter ===
            "active" &&
            member.is_active !==
              false &&
            member.role !==
              "guest") ||
          (statusFilter ===
            "inactive" &&
            member.is_active ===
              false);

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <p className="text-yellow-400 text-sm font-semibold">
              Administration
            </p>

            <h2 className="text-3xl font-black mt-1">
              Member Management
            </h2>

            <p className="text-gray-500 mt-2">
              Review join requests and manage
              member roles and account status.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-yellow-400/10 border border-yellow-400/20 px-4 py-3 min-w-28">
              <p className="text-yellow-400 text-xs">
                Pending
              </p>
              <p className="text-2xl font-black mt-1">
                {pendingMembers.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white/[0.03] border border-white/10 px-4 py-3 min-w-28">
              <p className="text-gray-500 text-xs">
                Total
              </p>
              <p className="text-2xl font-black mt-1">
                {members.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pending requests */}
      {pendingMembers.length > 0 && (
        <section className="bg-yellow-400/[0.045] border border-yellow-400/20 rounded-3xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-yellow-400 text-sm font-semibold">
                Needs Review
              </p>

              <h3 className="text-2xl font-black mt-1">
                Pending Join Requests
              </h3>

              <p className="text-gray-500 text-sm mt-1">
                Approve a request to turn the
                account into a regular member.
              </p>
            </div>

            <span className="px-3 py-1.5 rounded-full bg-yellow-400 text-black text-xs font-black">
              {pendingMembers.length}
            </span>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-5">
            {pendingMembers.map(
              (member) => {
                const canModify =
                  canEdit &&
                  member.id !==
                    currentUserId &&
                  canModifyTarget(
                    member
                  );

                return (
                  <div
                    key={member.id}
                    className="rounded-2xl bg-black/10 border border-yellow-400/10 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <SafeImage
                        src={
                          member.avatar_url ||
                          logo
                        }
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />

                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {member.nickname ||
                            member.full_name}
                        </p>

                        {member.email && (
                          <p className="text-gray-500 text-xs truncate">
                            {member.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      disabled={!canModify}
                      onClick={() =>
                        onRoleChange(
                          member.id,
                          "member"
                        )
                      }
                      className="w-full mt-4 px-4 py-2.5 rounded-xl bg-yellow-400 text-black font-bold hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Approve & Make Member
                    </button>
                  </div>
                );
              }
            )}
          </div>
        </section>
      )}

      {/* Search and filters */}
      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-5">
        <div className="grid md:grid-cols-[1fr_auto] gap-3">
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search name, email, or role..."
            className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 outline-none focus:border-yellow-400/40"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="rounded-xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
          >
            <option value="all">
              All accounts
            </option>
            <option value="pending">
              Pending requests
            </option>
            <option value="active">
              Active members
            </option>
            <option value="inactive">
              Inactive accounts
            </option>
          </select>
        </div>

        <p className="text-xs text-gray-600 mt-3">
          Showing {filteredMembers.length} of{" "}
          {members.length} accounts
        </p>
      </section>

      {/* Members */}
      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredMembers.map(
          (member) => {
            const isCurrentUser =
              member.id ===
              currentUserId;

            const canModify =
              canEdit &&
              !isCurrentUser &&
              canModifyTarget(
                member
              );

            return (
              <article
                key={member.id}
                className={`bg-white/[0.04] border rounded-3xl p-5 ${
                  member.role ===
                    "guest" &&
                  member.is_active !==
                    false
                    ? "border-yellow-400/20"
                    : "border-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <SafeImage
                      src={
                        member.avatar_url ||
                        logo
                      }
                      alt=""
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />

                    <div className="min-w-0">
                      <h3 className="font-bold truncate">
                        {member.nickname ||
                          member.full_name}
                      </h3>

                      <p className="text-yellow-400 text-xs mt-1">
                        {ROLE_NAMES[
                          member.role
                        ] || member.role}
                      </p>

                      <p
                        className={`text-[11px] mt-1 ${
                          member.is_active ===
                          false
                            ? "text-red-400"
                            : member.role ===
                              "guest"
                            ? "text-yellow-300"
                            : "text-green-400"
                        }`}
                      >
                        {member.is_active ===
                        false
                          ? "Account inactive"
                          : member.role ===
                            "guest"
                          ? "Awaiting approval"
                          : "Active account"}
                      </p>
                    </div>
                  </div>

                  {member.role ===
                    "guest" &&
                    member.is_active !==
                      false && (
                      <span className="px-2 py-1 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-[10px] font-bold">
                        PENDING
                      </span>
                    )}
                </div>

                <div className="mt-5 grid sm:grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <p className="text-gray-600 text-[10px] uppercase">
                      Points
                    </p>
                    <p className="font-bold mt-1">
                      {member.points ??
                        0}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <p className="text-gray-600 text-[10px] uppercase">
                      Status
                    </p>
                    <p
                      className={`font-bold mt-1 ${
                        member.is_active ===
                        false
                          ? "text-red-400"
                          : "text-green-400"
                      }`}
                    >
                      {member.is_active ===
                      false
                        ? "Inactive"
                        : "Active"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <p className="text-gray-600 text-[10px] uppercase">
                      Joined
                    </p>
                    <p className="font-bold mt-1 text-sm">
                      {formatMemberJoinDate(
                        member.created_at
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {canModify &&
                    member.role ===
                      "guest" &&
                    member.is_active && (
                      <button
                        onClick={() =>
                          onRoleChange(
                            member.id,
                            "member"
                          )
                        }
                        className="flex-1 min-w-40 px-3 py-2.5 bg-yellow-400 text-black rounded-xl font-bold hover:bg-yellow-300 transition"
                      >
                        Approve
                      </button>
                    )}

                  {canModify &&
                    member.role !==
                      "guest" &&
                    member.is_active && (
                      <select
                        value={
                          member.role
                        }
                        onChange={(
                          event
                        ) =>
                          onRoleChange(
                            member.id,
                            event.target
                              .value
                          )
                        }
                        className="flex-1 min-w-40 bg-[#18181b] border border-white/10 rounded-xl px-3 py-2.5"
                      >
                        {availableRoles.map(
                          (
                            role
                          ) => (
                            <option
                              key={
                                role
                              }
                              value={
                                role
                              }
                            >
                              {
                                ROLE_NAMES[
                                  role
                                ]
                              }
                            </option>
                          )
                        )}
                      </select>
                    )}

                  {canModify && (
                    <button
                      onClick={() =>
                        onToggleActive(
                          member.id,
                          !member.is_active
                        )
                      }
                      className={`px-3 py-2.5 rounded-xl ${
                        member.is_active
                          ? "bg-red-500/10 text-red-400 border border-red-400/10"
                          : "bg-green-500/10 text-green-400 border border-green-400/10"
                      }`}
                    >
                      {member.is_active
                        ? "Deactivate"
                        : "Reactivate"}
                    </button>
                  )}

                  {isCurrentUser && (
                    <span className="w-full text-center text-yellow-400 text-xs py-2">
                      This is your account
                    </span>
                  )}

                  {!canModify &&
                    !isCurrentUser &&
                    member.role ===
                      "head_admin" &&
                    currentUserRole ===
                      "administrator" && (
                      <span className="w-full text-center text-gray-600 text-xs py-2">
                        Protected Head Admin account
                      </span>
                    )}
                </div>
              </article>
            );
          }
        )}
      </section>

      {filteredMembers.length ===
        0 && (
        <div className="text-center py-14 bg-white/[0.03] border border-white/10 rounded-3xl">
          <p className="text-gray-500">
            No accounts match your filters.
          </p>

          <button
            onClick={() => {
              setSearch("");
              setStatusFilter(
                "all"
              );
            }}
            className="mt-4 px-4 py-2 bg-yellow-400 text-black rounded-xl font-semibold"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}


/*
=========================================================
POINTS
=========================================================
*/

function Points({
  members,
  history,
  allHistory,
  onAdjust,
  canSeeAllPointHistory,
  isHeadAdmin,
  onDeleteAllPointData,
  onDeleteMonthlyLeaderboard,
}) {
  const [memberId, setMemberId] =
    useState("");

  const [points, setPoints] =
    useState("");

  const [reason, setReason] =
    useState("");

  const [showAllHistory, setShowAllHistory] =
    useState(false);

  const submit = async (e) => {
    e.preventDefault();

    if (
      !memberId ||
      !points ||
      !reason.trim()
    ) {
      alert(
        "Fill in all fields."
      );
      return;
    }

    const numericPoints =
      Number(points);

    if (
      !Number.isInteger(
        numericPoints
      ) ||
      numericPoints ===
        0
    ) {
      alert(
        "Enter a whole number other than zero."
      );
      return;
    }

    const success =
      await onAdjust(
        memberId,
        numericPoints,
        reason
      );

    if (success) {
      setMemberId("");
      setPoints("");
      setReason("");
    }
  };

  return (
    <div className="space-y-8">
      {/* Point adjustment */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
          <h2 className="text-2xl font-bold">
            Adjust Points
          </h2>

          <p className="text-gray-500 text-sm mt-2 mb-6">
            Positive numbers award. Negative
            numbers deduct.
          </p>

          <form
            onSubmit={submit}
            className="space-y-4"
          >
            <select
              value={
                memberId
              }
              onChange={(e) =>
                setMemberId(
                  e.target
                    .value
                )
              }
              className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3"
            >
              <option value="">
                Select member
              </option>

              {members.map(
                (member) => (
                  <option
                    key={
                      member.id
                    }
                    value={
                      member.id
                    }
                  >
                    {
                      member.nickname ||
                        member.full_name
                    }
                  </option>
                )
              )}
            </select>

            <input
              type="number"
              value={
                points
              }
              onChange={(e) =>
                setPoints(
                  e.target
                    .value
                )
              }
              placeholder="Example: 10 or -5"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
            />

            <textarea
              value={
                reason
              }
              onChange={(e) =>
                setReason(
                  e.target
                    .value
                )
              }
              placeholder="Reason"
              rows="4"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
            />

            <button
              type="submit"
              className="w-full bg-yellow-400 text-black font-semibold py-3 rounded-xl"
            >
              Save Point Adjustment
            </button>
          </form>
        </section>

        {/* Personal history */}
        <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
          <h2 className="text-2xl font-bold mb-5">
            My Point History
          </h2>

          <PersonalPointHistory
            history={
              history
            }
          />
        </section>
      </div>

      {/* Admin history */}
      {canSeeAllPointHistory && (
        <section className="bg-white/[0.04] border border-yellow-400/20 rounded-3xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                Point Audit History
              </h2>

              <p className="text-gray-500 text-sm">
                Complete point transaction history.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  setShowAllHistory(
                    (
                      current
                    ) =>
                      !current
                  )
                }
                className="px-5 py-3 bg-yellow-400 text-black rounded-xl font-semibold"
              >
                {showAllHistory
                  ? "Hide All History"
                  : "View All History"}
              </button>

              {isHeadAdmin && (
                <>
                  <button
                    onClick={async () => {
                      const success =
                        await onDeleteAllPointData();

                      if (
                        success
                      ) {
                        alert(
                          "All points and point history were wiped."
                        );
                      }
                    }}
                    className="px-5 py-3 bg-red-600 text-white rounded-xl font-semibold"
                  >
                    Wipe All Point Data
                  </button>

                  <button
                    onClick={async () => {
                      const success =
                        await onDeleteMonthlyLeaderboard();

                      if (
                        success
                      ) {
                        alert(
                          "Previous-month performance records were wiped."
                        );
                      }
                    }}
                    className="px-5 py-3 bg-red-700 text-white rounded-xl font-semibold"
                  >
                    Wipe Previous Month
                  </button>
                </>
              )}
            </div>
          </div>

          {showAllHistory && (
            <div className="mt-6">
              {allHistory.length ===
              0 ? (
                <p className="text-gray-500">
                  No point history exists.
                </p>
              ) : (
                <AdminPointHistory
                  history={
                    allHistory
                  }
                  rankedMembers={
                    members
                  }
                />
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/*
=========================================================
POINT RESET
=========================================================
*/

function PointReset({
  members,
  onResetAll,
  onResetMember,
}) {
  const [selectedMemberId, setSelectedMemberId] =
    useState("");

  const [resettingAll, setResettingAll] =
    useState(false);

  const [resettingMember, setResettingMember] =
    useState(false);

  const resetAll =
    async () => {
      if (
        !window.confirm(
          "Reset all current points? The current Top 2 will be saved."
        )
      ) {
        return;
      }

      setResettingAll(
        true
      );

      await onResetAll();

      setResettingAll(
        false
      );
    };

  const resetOne =
    async () => {
      if (!selectedMemberId) {
        alert(
          "Select a member."
        );

        return;
      }

      const member =
        members.find(
          (item) =>
            item.id ===
            selectedMemberId
        );

      if (
        !member ||
        !window.confirm(
          `Reset ${
            member.nickname ||
            member.full_name
          }'s points to 0?`
        )
      ) {
        return;
      }

      setResettingMember(
        true
      );

      await onResetMember(
        selectedMemberId
      );

      setSelectedMemberId(
        ""
      );

      setResettingMember(
        false
      );
    };

  return (
    <section className="bg-red-500/[0.05] border border-red-500/20 rounded-3xl p-6">
      <h3 className="text-xl font-semibold text-red-300">
        Point Reset
      </h3>

      <div className="mt-5 bg-white/[0.03] rounded-2xl p-5">
        <h4 className="font-semibold">
          Reset One Member
        </h4>

        <div className="flex flex-col md:flex-row gap-3 mt-4">
          <select
            value={
              selectedMemberId
            }
            onChange={(e) =>
              setSelectedMemberId(
                e.target
                  .value
              )
            }
            className="flex-1 bg-[#18181b] border border-white/10 rounded-xl px-4 py-3"
          >
            <option value="">
              Select member
            </option>

            {members.map(
              (member) => (
                <option
                  key={
                    member.id
                  }
                  value={
                    member.id
                  }
                >
                  {
                    member.nickname ||
                      member.full_name
                  }{" "}
                  —{" "}
                  {
                    member.points
                  }
                </option>
              )
            )}
          </select>

          <button
            onClick={
              resetOne
            }
            disabled={
              resettingMember
            }
            className="px-5 py-3 bg-red-500 text-white rounded-xl"
          >
            {resettingMember
              ? "Resetting..."
              : "Reset Member"}
          </button>
        </div>
      </div>

      <div className="mt-4 bg-white/[0.03] rounded-2xl p-5">
        <h4 className="font-semibold">
          Monthly Reset
        </h4>

        <button
          onClick={
            resetAll
          }
          disabled={
            resettingAll
          }
          className="mt-4 px-5 py-3 bg-red-500 text-white rounded-xl"
        >
          {resettingAll
            ? "Resetting..."
            : "Reset All Points"}
        </button>
      </div>
    </section>
  );
}

/*
=========================================================
ADMIN ACTIVITY
=========================================================
*/

function AdminActivity({
  activityLog,
  members = [],
  isHeadAdmin,
  onWipe,
}) {
  const [search, setSearch] =
    useState("");

  const [actionFilter, setActionFilter] =
    useState("all");

  const [actorFilter, setActorFilter] =
    useState("all");

  const getMember = (id) =>
    members.find(
      (member) => member.id === id
    );

  const actionTypes = [
    ...new Set(
      activityLog
        .map(
          (item) => item.action
        )
        .filter(Boolean)
    ),
  ];

  const actorIds = [
    ...new Set(
      activityLog
        .map(
          (item) => item.admin_id
        )
        .filter(Boolean)
    ),
  ];

  const actionLabel = (action) =>
    String(action || "UNKNOWN")
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );

  const actionTone = (action) => {
    const value =
      String(action || "");

    if (
      value.includes("WIPE") ||
      value.includes("DELETE") ||
      value.includes("DEACTIVATED")
    ) {
      return "bg-red-500/10 text-red-300 border-red-400/20";
    }

    if (
      value.includes("POINT") ||
      value.includes("PROMOT") ||
      value.includes("ROLE")
    ) {
      return "bg-yellow-400/10 text-yellow-300 border-yellow-400/20";
    }

    if (
      value.includes("TODO") ||
      value.includes("NEWS")
    ) {
      return "bg-blue-500/10 text-blue-300 border-blue-400/20";
    }

    return "bg-white/[0.04] text-gray-300 border-white/10";
  };

  const filtered =
    activityLog.filter(
      (item) => {
        const actor =
          getMember(item.admin_id);

        const target =
          getMember(
            item.target_user_id
          );

        const actorName =
          actor?.nickname ||
          actor?.full_name ||
          "Unknown admin";

        const targetName =
          target?.nickname ||
          target?.full_name ||
          "Unknown member";

        const searchable = [
          actorName,
          targetName,
          item.action,
          item.details,
          item.created_at,
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !search.trim() ||
          searchable.includes(
            search
              .trim()
              .toLowerCase()
          );

        const matchesAction =
          actionFilter ===
            "all" ||
          item.action ===
            actionFilter;

        const matchesActor =
          actorFilter ===
            "all" ||
          item.admin_id ===
            actorFilter;

        return (
          matchesSearch &&
          matchesAction &&
          matchesActor
        );
      }
    );

  return (
    <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <p className="text-yellow-400 text-sm">
            Accountability
          </p>

          <h2 className="text-2xl font-bold mt-1">
            Admin Activity History
          </h2>

          <p className="text-gray-500 text-sm mt-1">
            See who did what, who it affected,
            and exactly when it happened.
          </p>
        </div>

        {isHeadAdmin && (
          <button
            onClick={onWipe}
            className="px-5 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-500 transition"
          >
            Wipe Activity History
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr_1fr] gap-3 mt-6">
        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search actor, target, action, or details..."
          className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-yellow-400/40"
        />

        <select
          value={actionFilter}
          onChange={(event) =>
            setActionFilter(
              event.target.value
            )
          }
          className="rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-sm text-white outline-none"
        >
          <option value="all">
            All actions
          </option>

          {actionTypes.map(
            (action) => (
              <option
                key={action}
                value={action}
              >
                {actionLabel(action)}
              </option>
            )
          )}
        </select>

        <select
          value={actorFilter}
          onChange={(event) =>
            setActorFilter(
              event.target.value
            )
          }
          className="rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-sm text-white outline-none"
        >
          <option value="all">
            All actors
          </option>

          {actorIds.map(
            (id) => {
              const actor =
                getMember(id);

              return (
                <option
                  key={id}
                  value={id}
                >
                  {actor?.nickname ||
                    actor?.full_name ||
                    "Unknown admin"}
                </option>
              );
            }
          )}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs text-gray-500">
        <span>
          Showing{" "}
          {filtered.length} of{" "}
          {activityLog.length} activities
        </span>

        {(search ||
          actionFilter !==
            "all" ||
          actorFilter !==
            "all") && (
          <button
            onClick={() => {
              setSearch("");
              setActionFilter(
                "all"
              );
              setActorFilter(
                "all"
              );
            }}
            className="text-yellow-400 hover:text-yellow-300"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length ===
      0 ? (
        <div className="text-gray-500 text-center py-12">
          No matching administrative
          activity found.
        </div>
      ) : (
        <div className="space-y-3 mt-5">
          {filtered.map(
            (item) => {
              const actor =
                getMember(
                  item.admin_id
                );

              const target =
                getMember(
                  item.target_user_id
                );

              const actorName =
                actor?.nickname ||
                actor?.full_name ||
                "Unknown admin";

              const targetName =
                target?.nickname ||
                target?.full_name ||
                null;

              return (
                <div
                  key={item.id}
                  className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:bg-white/[0.045] transition"
                >
                  <div className="flex items-start gap-3">
                    <SafeImage
                      src={
                        actor?.avatar_url ||
                        logo
                      }
                      alt=""
                      className="w-11 h-11 rounded-full object-cover shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">
                          {actorName}
                        </span>

                        <span className="text-gray-600">
                          →
                        </span>

                        <span
                          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${actionTone(
                            item.action
                          )}`}
                        >
                          {actionLabel(
                            item.action
                          )}
                        </span>

                        {actor?.role && (
                          <span className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-gray-500 text-xs">
                            {ROLE_NAMES[
                              actor.role
                            ] ||
                              actor.role}
                          </span>
                        )}
                      </div>

                      {targetName && (
                        <p className="text-sm text-gray-300 mt-2">
                          Target:{" "}
                          <span className="font-semibold text-white">
                            {targetName}
                          </span>
                        </p>
                      )}

                      {item.details && (
                        <p className="text-sm text-gray-400 mt-1 whitespace-pre-wrap">
                          {item.details}
                        </p>
                      )}

                      <p className="text-xs text-gray-600 mt-3">
                        {item.created_at
                          ? new Date(
                              item.created_at
                            ).toLocaleString(
                              undefined,
                              {
                                dateStyle:
                                  "medium",
                                timeStyle:
                                  "short",
                              }
                            )
                          : "Unknown time"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}


/*
=========================================================
NEWS
=========================================================
*/

function News({
  news,
  profile,
  reload,
  onLogAction,
}) {
  const [title, setTitle] =
    useState("");

  const [content, setContent] =
    useState("");

  const [imageFile, setImageFile] =
    useState(null);

  const [imagePreview, setImagePreview] =
    useState("");

  const [editingNews, setEditingNews] =
    useState(null);

  const [deletingId, setDeletingId] =
    useState(null);

  const [publishing, setPublishing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [sortOrder, setSortOrder] =
    useState("newest");

  const handleImageChange =
    (event) => {
      const file =
        event.target.files?.[0] ||
        null;

      setImageFile(file);

      if (file) {
        setImagePreview(
          URL.createObjectURL(file)
        );
      } else {
        setImagePreview("");
      }
    };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");

    const fileInputs =
      document.querySelectorAll(
        'input[type="file"]'
      );

    fileInputs.forEach(
      (input) => {
        input.value = "";
      }
    );
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setImageFile(null);
    setImagePreview("");
    setEditingNews(null);
  };

  const beginEdit =
    (item) => {
      setEditingNews(item);
      setTitle(item.title || "");
      setContent(item.content || "");
      setImageFile(null);
      setImagePreview(
        item.image_url || ""
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

  const publish =
    async (e) => {
      e.preventDefault();

      if (
        !title.trim() ||
        !content.trim()
      ) {
        alert(
          "Enter a title and content."
        );

        return;
      }

      setPublishing(true);

      try {
        let imageUrl =
          editingNews?.image_url ||
          null;

        if (imageFile) {
          const {
            url,
            error: uploadError,
          } =
            await uploadAttachment(
              imageFile,
              profile.id,
              "news"
            );

          if (uploadError) {
            alert(
              uploadError.message
            );

            return;
          }

          imageUrl = url;
        }

        let error = null;

        if (editingNews) {
          const result =
            await supabase
              .from("news")
              .update({
                title:
                  title.trim(),
                content:
                  content.trim(),
                image_url:
                  imageUrl,
              })
              .eq(
                "id",
                editingNews.id
              );

          error = result.error;
        } else {
          const result =
            await supabase
              .from("news")
              .insert({
                title:
                  title.trim(),
                content:
                  content.trim(),
                published_by:
                  profile.id,
                image_url:
                  imageUrl,
              });

          error = result.error;
        }

        if (error) {
          alert(
            error.message
          );

          return;
        }

        if (onLogAction) {
          await onLogAction({
            action: editingNews
              ? "NEWS_EDITED"
              : "NEWS_PUBLISHED",
            details:
              editingNews
                ? `Edited news: ${title.trim()}${
                    imageFile
                      ? " and replaced the image."
                      : "."
                  }`
                : `Published news: ${title.trim()}${
                    imageUrl
                      ? " with an attached image."
                      : "."
                  }`,
          });
        }

        resetForm();
        await reload();
      } finally {
        setPublishing(false);
      }
    };

  const deleteNews =
    async (item) => {
      if (
        !window.confirm(
          `Delete "${item.title}"?`
        )
      ) {
        return;
      }

      setDeletingId(item.id);

      const {
        error,
      } =
        await supabase
          .from("news")
          .delete()
          .eq(
            "id",
            item.id
          );

      if (error) {
        alert(
          error.message
        );

        setDeletingId(null);
        return;
      }

      if (onLogAction) {
        await onLogAction({
          action:
            "NEWS_DELETED",
          details:
            `Deleted news: ${item.title}`,
        });
      }

      if (
        editingNews?.id ===
        item.id
      ) {
        resetForm();
      }

      await reload();

      setDeletingId(null);
    };

  const filteredNews =
    [...news]
      .filter((item) => {
        const searchable = [
          item.title,
          item.content,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          !search.trim() ||
          searchable.includes(
            search
              .trim()
              .toLowerCase()
          )
        );
      })
      .sort((a, b) => {
        const aDate =
          new Date(
            a.created_at || 0
          ).getTime();

        const bDate =
          new Date(
            b.created_at || 0
          ).getTime();

        return sortOrder === "newest"
          ? bDate - aDate
          : aDate - bDate;
      });

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <p className="text-yellow-400 text-sm font-semibold">
              Club Updates
            </p>

            <h2 className="text-3xl font-black mt-1">
              News & Announcements
            </h2>

            <p className="text-gray-500 mt-2">
              Publish updates and keep members
              informed.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 px-4 py-3">
              <p className="text-gray-600 text-xs">
                Total
              </p>

              <p className="text-2xl font-black mt-1">
                {news.length}
              </p>
            </div>

            <div className="rounded-2xl bg-blue-500/10 border border-blue-400/20 px-4 py-3">
              <p className="text-blue-300 text-xs">
                Showing
              </p>

              <p className="text-2xl font-black mt-1">
                {filteredNews.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid xl:grid-cols-[0.85fr_1.15fr] gap-7 items-start">
        {/* Publish / Edit */}
        <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-yellow-400 text-sm font-semibold">
                {editingNews
                  ? "Edit Announcement"
                  : "New Announcement"}
              </p>

              <h3 className="text-2xl font-black mt-1">
                {editingNews
                  ? "Update News"
                  : "Publish News"}
              </h3>
            </div>

            {editingNews && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-gray-500 hover:text-white"
              >
                Cancel edit
              </button>
            )}
          </div>

          <form
            onSubmit={publish}
            className="space-y-4"
          >
            <input
              value={title}
              onChange={(e) =>
                setTitle(
                  e.target.value
                )
              }
              placeholder="News title"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none focus:border-yellow-400"
            />

            <textarea
              value={content}
              onChange={(e) =>
                setContent(
                  e.target.value
                )
              }
              placeholder="Write announcement..."
              rows="8"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white resize-none outline-none focus:border-yellow-400"
            />

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
              <label className="block text-sm text-gray-300 mb-2">
                Attach Picture{" "}
                <span className="text-gray-600">
                  (optional)
                </span>
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={
                  handleImageChange
                }
                className="block w-full text-sm text-gray-300"
              />

              {imagePreview && (
                <div className="mt-4">
                  <img
                    src={imagePreview}
                    alt="News preview"
                    className="w-full max-h-64 object-cover rounded-xl border border-white/10"
                  />

                  <button
                    type="button"
                    onClick={
                      clearImage
                    }
                    className="mt-2 text-sm text-red-400"
                  >
                    Remove picture
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={publishing}
              className="w-full bg-yellow-400 text-black font-semibold py-3.5 rounded-xl hover:bg-yellow-300 disabled:opacity-50 transition"
            >
              {publishing
                ? editingNews
                  ? "Saving..."
                  : "Publishing..."
                : editingNews
                  ? "Save Changes"
                  : "Publish"}
            </button>
          </form>
        </section>

        {/* Published news */}
        <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <div>
              <p className="text-gray-500 text-sm">
                Published
              </p>

              <h3 className="text-2xl font-black mt-1">
                News Archive
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search news..."
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
              />

              <select
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(
                    e.target.value
                  )
                }
                className="bg-[#17171b] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
              >
                <option value="newest">
                  Newest first
                </option>
                <option value="oldest">
                  Oldest first
                </option>
              </select>
            </div>
          </div>

          {filteredNews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
              <div className="text-3xl">
                📰
              </div>

              <p className="text-gray-500 mt-3">
                {news.length === 0
                  ? "No news published yet."
                  : "No news matches your search."}
              </p>

              {search && (
                <button
                  onClick={() =>
                    setSearch("")
                  }
                  className="mt-4 text-yellow-400 text-sm"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNews.map(
                (item) => (
                  <article
                    key={item.id}
                    className={`overflow-hidden bg-white/[0.03] border rounded-2xl ${
                      editingNews?.id === item.id
                        ? "border-yellow-400/30"
                        : "border-white/5"
                    }`}
                  >
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={
                          item.title ||
                          "News attachment"
                        }
                        className="w-full max-h-80 object-cover"
                        loading="lazy"
                        onError={(
                          event
                        ) => {
                          event.currentTarget.style.display =
                            "none";
                        }}
                      />
                    )}

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h4 className="font-bold text-xl">
                            {item.title}
                          </h4>

                          {item.created_at && (
                            <p className="text-gray-600 text-xs mt-1.5">
                              {new Date(
                                item.created_at
                              ).toLocaleString()}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              beginEdit(
                                item
                              )
                            }
                            className="px-3 py-2 rounded-lg bg-white/5 text-gray-300 text-xs hover:bg-white/10 transition"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteNews(
                                item
                              )
                            }
                            disabled={
                              deletingId ===
                              item.id
                            }
                            className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 disabled:opacity-50 transition"
                          >
                            {deletingId ===
                            item.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>

                      <p className="text-gray-400 text-sm mt-4 whitespace-pre-wrap leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


/*
=========================================================
TO-DO
=========================================================
*/

function Todo({
  profile,
  isAdmin,
  onLogAction,
}) {
  const [todos, setTodos] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [showCompleted, setShowCompleted] =
    useState(false);

  const [showForm, setShowForm] =
    useState(false);

  const [editingTodo, setEditingTodo] =
    useState(null);

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [deadline, setDeadline] =
    useState("");

  const [imageFile, setImageFile] =
    useState(null);

  const [imagePreview, setImagePreview] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [deadlineFilter, setDeadlineFilter] =
    useState("all");

  const [sortBy, setSortBy] =
    useState("deadline");

  const [saving, setSaving] =
    useState(false);

  const loadTodos = async () => {
    const {
      data,
      error,
    } =
      await supabase
        .from("todos")
        .select("*")
        .order("completed", {
          ascending: true,
        })
        .order("deadline", {
          ascending: true,
          nullsFirst: false,
        })
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.error(
        "Todo load error:",
        error
      );

      setTodos([]);
    } else {
      setTodos(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadTodos();

    const channel =
      supabase
        .channel("todos-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "todos",
          },
          () => {
            loadTodos();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDeadline("");
    setImageFile(null);
    setImagePreview("");
    setEditingTodo(null);
    setShowForm(false);
  };

  const handleImageChange =
    (event) => {
      const file =
        event.target.files?.[0] ||
        null;

      setImageFile(file);

      if (file) {
        setImagePreview(
          URL.createObjectURL(file)
        );
      } else {
        setImagePreview("");
      }
    };

  const saveTodo =
    async (event) => {
      event.preventDefault();

      if (!title.trim()) {
        alert(
          "Please enter a task title."
        );
        return;
      }

      setSaving(true);

      try {
        let imageUrl =
          editingTodo?.image_url ||
          null;

        if (imageFile) {
          const {
            url,
            error:
              uploadError,
          } =
            await uploadAttachment(
              imageFile,
              profile.id,
              "todos"
            );

          if (uploadError) {
            alert(
              uploadError.message
            );
            return;
          }

          imageUrl = url;
        }

        if (editingTodo) {
          const {
            error,
          } =
            await supabase
              .from("todos")
              .update({
                title:
                  title.trim(),
                description:
                  description.trim(),
                deadline:
                  deadline ||
                  null,
                image_url:
                  imageUrl,
                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                "id",
                editingTodo.id
              );

          if (error) {
            alert(error.message);
            return;
          }

          if (onLogAction) {
            await onLogAction({
              action:
                "TODO_EDITED",
              details:
                `Edited task: ${title.trim()}${
                  imageFile
                    ? " and attached a new image."
                    : "."
                }`,
            });
          }
        } else {
          const {
            error,
          } =
            await supabase
              .from("todos")
              .insert({
                title:
                  title.trim(),
                description:
                  description.trim(),
                deadline:
                  deadline ||
                  null,
                image_url:
                  imageUrl,
                created_by:
                  profile.id,
              });

          if (error) {
            alert(error.message);
            return;
          }

          if (onLogAction) {
            await onLogAction({
              action:
                "TODO_CREATED",
              details:
                `Created task: ${title.trim()}${
                  imageFile
                    ? " with an attached image."
                    : "."
                }`,
            });
          }
        }

        resetForm();
        await loadTodos();
      } finally {
        setSaving(false);
      }
    };

  const beginEdit =
    (todo) => {
      setEditingTodo(todo);
      setTitle(todo.title || "");
      setDescription(
        todo.description || ""
      );
      setDeadline(
        todo.deadline || ""
      );
      setImageFile(null);
      setImagePreview(
        todo.image_url || ""
      );
      setShowForm(true);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

  const deleteTodo =
    async (todo) => {
      if (
        !window.confirm(
          `Delete "${todo.title}"?`
        )
      ) {
        return;
      }

      const {
        error,
      } =
        await supabase
          .from("todos")
          .delete()
          .eq(
            "id",
            todo.id
          );

      if (error) {
        alert(error.message);
        return;
      }

      if (onLogAction) {
        await onLogAction({
          action:
            "TODO_DELETED",
          details:
            `Deleted task: ${todo.title}`,
        });
      }

      await loadTodos();
    };

  const toggleComplete =
    async (todo) => {
      const completed =
        !todo.completed;

      const {
        error,
      } =
        await supabase
          .from("todos")
          .update({
            completed,
            completed_at:
              completed
                ? new Date().toISOString()
                : null,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            todo.id
          );

      if (error) {
        alert(error.message);
        return;
      }

      if (onLogAction) {
        await onLogAction({
          action: completed
            ? "TODO_COMPLETED"
            : "TODO_REOPENED",
          targetUserId:
            profile.id,
          details: completed
            ? `Completed task: ${todo.title}`
            : `Reopened task: ${todo.title}`,
        });
      }

      await loadTodos();
    };

  const activeTodos =
    todos.filter(
      (todo) =>
        !todo.completed
    );

  const completedTodos =
    todos.filter(
      (todo) =>
        todo.completed
    );

  const isOverdue =
    (value) => {
      if (!value) {
        return false;
      }

      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const due =
        new Date(
          `${value}T00:00:00`
        );

      return due < today;
    };

  const todayString =
    new Date()
      .toISOString()
      .slice(0, 10);

  const dueTodayCount =
    activeTodos.filter(
      (todo) =>
        todo.deadline ===
        todayString
    ).length;

  const overdueCount =
    activeTodos.filter(
      (todo) =>
        isOverdue(
          todo.deadline
        )
    ).length;

  const completionPercent =
    todos.length === 0
      ? 0
      : Math.round(
          (completedTodos.length /
            todos.length) *
            100
        );

  const filteredActiveTodos =
    activeTodos
      .filter((todo) => {
        const searchable =
          [
            todo.title,
            todo.description,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesSearch =
          !search.trim() ||
          searchable.includes(
            search
              .trim()
              .toLowerCase()
          );

        const matchesDeadline =
          deadlineFilter ===
            "all" ||
          (deadlineFilter ===
            "overdue" &&
            isOverdue(
              todo.deadline
            )) ||
          (deadlineFilter ===
            "today" &&
            todo.deadline ===
              todayString) ||
          (deadlineFilter ===
            "upcoming" &&
            todo.deadline &&
            !isOverdue(
              todo.deadline
            ) &&
            todo.deadline !==
              todayString) ||
          (deadlineFilter ===
            "no-date" &&
            !todo.deadline);

        return (
          matchesSearch &&
          matchesDeadline
        );
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return (
            new Date(
              b.created_at || 0
            ) -
            new Date(
              a.created_at || 0
            )
          );
        }

        if (sortBy === "oldest") {
          return (
            new Date(
              a.created_at || 0
            ) -
            new Date(
              b.created_at || 0
            )
          );
        }

        if (sortBy === "overdue") {
          return (
            Number(
              isOverdue(
                b.deadline
              )
            ) -
            Number(
              isOverdue(
                a.deadline
              )
            )
          );
        }

        if (!a.deadline) {
          return 1;
        }

        if (!b.deadline) {
          return -1;
        }

        return (
          new Date(
            `${a.deadline}T00:00:00`
          ) -
          new Date(
            `${b.deadline}T00:00:00`
          )
        );
      });

  const formatDeadline =
    (value) => {
      if (!value) {
        return null;
      }

      return new Date(
        `${value}T00:00:00`
      ).toLocaleDateString(
        undefined,
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
    };

  const TodoCard =
    ({ todo }) => (
      <div
        className={`group bg-white/[0.04] border rounded-2xl p-4 transition ${
          todo.completed
            ? "border-white/5 opacity-70"
            : isOverdue(
                todo.deadline
              )
              ? "border-red-400/20 bg-red-500/[0.03]"
              : "border-white/10 hover:border-yellow-400/30"
        }`}
      >
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() =>
              toggleComplete(
                todo
              )
            }
            aria-label={
              todo.completed
                ? "Mark task incomplete"
                : "Mark task complete"
            }
            className={`mt-1 w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition ${
              todo.completed
                ? "bg-yellow-400 border-yellow-400 text-black"
                : "border-gray-600 hover:border-yellow-400"
            }`}
          >
            {todo.completed
              ? "✓"
              : ""}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4
                className={`font-semibold text-lg ${
                  todo.completed
                    ? "line-through text-gray-500"
                    : "text-white"
                }`}
              >
                {todo.title}
              </h4>

              {todo.deadline &&
                !todo.completed &&
                isOverdue(
                  todo.deadline
                ) && (
                  <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold uppercase">
                    Overdue
                  </span>
                )}

              {todo.deadline ===
                todayString &&
                !todo.completed && (
                  <span className="px-2 py-1 rounded-full bg-yellow-400/10 text-yellow-300 text-[10px] font-bold uppercase">
                    Due today
                  </span>
                )}
            </div>

            {todo.description && (
              <p
                className={`text-sm mt-2 whitespace-pre-wrap ${
                  todo.completed
                    ? "text-gray-600"
                    : "text-gray-400"
                }`}
              >
                {todo.description}
              </p>
            )}

            {todo.image_url && (
              <img
                src={todo.image_url}
                alt=""
                className="mt-4 w-full max-h-72 object-cover rounded-xl border border-white/10"
                loading="lazy"
                onError={(
                  event
                ) => {
                  event.currentTarget.style.display =
                    "none";
                }}
              />
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              {todo.deadline && (
                <span
                  className={`text-xs px-3 py-1 rounded-full ${
                    !todo.completed &&
                    isOverdue(
                      todo.deadline
                    )
                      ? "bg-red-500/10 text-red-400"
                      : "bg-white/5 text-gray-400"
                  }`}
                >
                  {isOverdue(
                    todo.deadline
                  ) &&
                  !todo.completed
                    ? "Overdue · "
                    : "Due · "}
                  {formatDeadline(
                    todo.deadline
                  )}
                </span>
              )}

              {todo.completed && (
                <span className="text-xs px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-400">
                  Completed
                </span>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
              <button
                type="button"
                onClick={() =>
                  beginEdit(
                    todo
                  )
                }
                className="px-3 py-2 bg-white/5 rounded-lg text-gray-300 hover:bg-white/10"
              >
                Edit
              </button>

              <button
                type="button"
                onClick={() =>
                  deleteTodo(
                    todo
                  )
                }
                className="px-3 py-2 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500/20"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    );

  if (loading) {
    return (
      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-8">
        <p className="text-gray-500">
          Loading tasks...
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and progress */}
      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-yellow-400 text-sm">
              Club Tasks
            </p>

            <h2 className="text-3xl font-bold mt-1">
              To-Do List
            </h2>

            <p className="text-gray-500 mt-1">
              {activeTodos.length} active ·{" "}
              {completedTodos.length} completed
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3">
              <p className="text-gray-600 text-[10px] uppercase">
                Progress
              </p>
              <p className="font-black text-lg mt-1">
                {completionPercent}%
              </p>
            </div>

            <div className="rounded-xl bg-yellow-400/10 border border-yellow-400/20 px-4 py-3">
              <p className="text-yellow-300 text-[10px] uppercase">
                Today
              </p>
              <p className="font-black text-lg mt-1">
                {dueTodayCount}
              </p>
            </div>

            <div className="rounded-xl bg-red-500/10 border border-red-400/20 px-4 py-3">
              <p className="text-red-300 text-[10px] uppercase">
                Overdue
              </p>
              <p className="font-black text-lg mt-1">
                {overdueCount}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>
              Overall completion
            </span>
            <span>
              {completedTodos.length}/
              {todos.length}
            </span>
          </div>

          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-yellow-400 rounded-full transition-all"
              style={{
                width: `${completionPercent}%`,
              }}
            />
          </div>
        </div>
      </section>

      {isAdmin && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-5 py-3 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300"
          >
            + Add Task
          </button>
        </div>
      )}

      {/* Admin editor */}
      {isAdmin &&
        showForm && (
          <section className="bg-white/[0.04] border border-yellow-400/20 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">
                {editingTodo
                  ? "Edit Task"
                  : "Add Task"}
              </h3>

              <button
                type="button"
                onClick={resetForm}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={saveTodo}
              className="space-y-4"
            >
              <input
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="Task title"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-400"
              />

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="Task description"
                rows="4"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-400"
              />

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Deadline
                </label>

                <input
                  type="date"
                  value={deadline}
                  onChange={(event) =>
                    setDeadline(
                      event.target.value
                    )
                  }
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                />
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                <label className="block text-sm text-gray-300 mb-2">
                  Attach Picture{" "}
                  <span className="text-gray-600">
                    (optional)
                  </span>
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    handleImageChange
                  }
                  className="block w-full text-sm text-gray-300"
                />

                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      alt="Task preview"
                      className="w-full max-h-64 object-cover rounded-xl border border-white/10"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(
                          editingTodo?.image_url ||
                            ""
                        );
                      }}
                      className="mt-2 text-sm text-red-400"
                    >
                      Remove new picture
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingTodo
                      ? "Save Changes"
                      : "Create Task"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

      {/* Filters */}
      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-5">
        <div className="grid lg:grid-cols-[1fr_auto_auto] gap-3">
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search tasks..."
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-400"
          />

          <select
            value={deadlineFilter}
            onChange={(event) =>
              setDeadlineFilter(
                event.target.value
              )
            }
            className="bg-[#17171b] border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
          >
            <option value="all">
              All deadlines
            </option>
            <option value="overdue">
              Overdue
            </option>
            <option value="today">
              Due today
            </option>
            <option value="upcoming">
              Upcoming
            </option>
            <option value="no-date">
              No deadline
            </option>
          </select>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value
              )
            }
            className="bg-[#17171b] border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
          >
            <option value="deadline">
              Sort: Deadline
            </option>
            <option value="overdue">
              Sort: Overdue first
            </option>
            <option value="newest">
              Sort: Newest
            </option>
            <option value="oldest">
              Sort: Oldest
            </option>
          </select>
        </div>
      </section>

      {/* Active */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-yellow-400 text-sm">
              In progress
            </p>
            <h3 className="text-xl font-semibold mt-1">
              Active
            </h3>
          </div>

          <span className="text-sm text-gray-600">
            {filteredActiveTodos.length} shown
          </span>
        </div>

        {filteredActiveTodos.length ===
        0 ? (
          <div className="bg-white/[0.03] border border-dashed border-white/10 rounded-2xl p-8 text-center">
            <div className="text-3xl">
              ✓
            </div>

            <p className="text-gray-500 mt-2">
              No active tasks match your filters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActiveTodos.map(
              (todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                />
              )
            )}
          </div>
        )}
      </section>

      {/* Completed */}
      <section className="border-t border-white/10 pt-6">
        <button
          type="button"
          onClick={() =>
            setShowCompleted(
              (current) =>
                !current
            )
          }
          className="w-full flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.05] rounded-2xl px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <span
              className={`transition-transform ${
                showCompleted
                  ? "rotate-90"
                  : ""
              }`}
            >
              ▶
            </span>

            <span className="font-semibold text-gray-400">
              Completed
            </span>

            <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-500">
              {completedTodos.length}
            </span>
          </div>

          <span className="text-gray-600 text-sm">
            {showCompleted
              ? "Hide"
              : "Show"}
          </span>
        </button>

        {showCompleted &&
          completedTodos.length >
            0 && (
            <div className="space-y-3 mt-3">
              {completedTodos.map(
                (todo) => (
                  <TodoCard
                    key={todo.id}
                    todo={todo}
                  />
                )
              )}
            </div>
          )}

        {showCompleted &&
          completedTodos.length ===
            0 && (
            <p className="text-gray-600 text-sm text-center py-5">
              No completed tasks yet.
            </p>
          )}
      </section>
    </div>
  );
}