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
    return <AuthScreen onAuth={loadSession} />;
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
AUTH SCREEN
=========================================================
*/

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");

  const toggleMode = () => {
    setMode((current) =>
      current === "login" ? "signup" : "login"
    );
  };

  return mode === "login" ? (
    <Login
      onLogin={onAuth}
      onSwitch={toggleMode}
    />
  ) : (
    <SignUp
      onSignup={onAuth}
      onSwitch={toggleMode}
    />
  );
}

function AuthLayout({
  title,
  subtitle,
  children,
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
  const [tab, setTab] =
    useState("overview");

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

  return (
    <div className="min-h-screen bg-[#0b0b0d] text-white">
      <Header
        profile={profile}
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Tab
            active={
              tab ===
              "overview"
            }
            onClick={() =>
              setTab(
                "overview"
              )
            }
          >
            Overview
          </Tab>

          <Tab
            active={
              tab ===
              "profile"
            }
            onClick={() =>
              setTab(
                "profile"
              )
            }
          >
            Profile
          </Tab>

          <Tab
            active={
              tab ===
              "directory"
            }
            onClick={() =>
              setTab(
                "directory"
              )
            }
          >
            Directory
          </Tab>

          <Tab
            active={
              tab ===
              "todo"
            }
            onClick={() =>
              setTab(
                "todo"
              )
            }
          >
            To-Do
          </Tab>

          {isAdmin && (
            <Tab
              active={
                tab ===
                "members"
              }
              onClick={() =>
                setTab(
                  "members"
                )
              }
            >
              Members
            </Tab>
          )}

          {canAwardPoints && (
            <Tab
              active={
                tab ===
                "points"
              }
              onClick={() =>
                setTab(
                  "points"
                )
              }
            >
              Points
            </Tab>
          )}

          {isAdmin && (
            <Tab
              active={
                tab ===
                "activity"
              }
              onClick={() =>
                setTab(
                  "activity"
                )
              }
            >
              Admin Activity
            </Tab>
          )}

          {isAdmin && (
            <Tab
              active={
                tab ===
                "news"
              }
              onClick={() =>
                setTab(
                  "news"
                )
              }
            >
              News
            </Tab>
          )}
        </div>

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

        {/* Admin activity */}
        {tab ===
          "activity" &&
          isAdmin && (
            <AdminActivity
              activityLog={
                activityLog
              }
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
      </div>
    </div>
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
  const topFive =
    rankedMembers.slice(
      0,
      5
    );

  const monthLabel =
    previousMonth?.month_start
      ? new Date(
          `${previousMonth.month_start}T00:00:00`
        ).toLocaleDateString(
          undefined,
          {
            month: "long",
            year: "numeric",
          }
        )
      : null;

  return (
    <div className="space-y-7">
      <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-7">
        <p className="text-gray-500 text-base">
          Welcome back
        </p>

        <h2 className="text-5xl font-bold mt-1">
          {profile.nickname ||
            profile.full_name}
        </h2>

        <p className="text-yellow-400 mt-2">
          {
            ROLE_NAMES[
              profile.role
            ]
          }
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Stat
          title="Total Members"
          value={
            rankedMembers.length
          }
        />

        <Stat
          title="Your Points"
          value={
            profile.points
          }
        />

        <Stat
          title="Your Rank"
          value={
            currentRank >
            0
              ? `#${currentRank}`
              : "—"
          }
        />

        <Stat
          title="Your Role"
          value={
            ROLE_NAMES[
              profile.role
            ]
          }
        />
      </div>

      {/* Leaderboard + Latest News */}
      <div className="grid xl:grid-cols-2 gap-7 items-start">
        {/* Current leaderboard */}
        <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-7">
          <p className="text-yellow-400 text-sm">
            Current Month
          </p>

          <h3 className="text-3xl font-bold mt-1 mb-6">
            Top 5 Leaderboard
          </h3>

          {topFive.length === 0 ? (
            <p className="text-gray-500">
              No members yet.
            </p>
          ) : (
            <div className="space-y-4">
              {topFive.map((member, index) => (
                <div
                  key={member.id}
                  className={`flex items-center justify-between rounded-2xl px-6 py-5 ${
                    member.id === profile.id
                      ? "bg-yellow-400/10 border border-yellow-400/20"
                      : "bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-yellow-400 text-lg font-bold">
                      #{index + 1}
                    </span>

                    <SafeImage
                      src={member.avatar_url || logo}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />

                    <div>
                      <p className="font-semibold text-base">
                        {member.nickname || member.full_name}
                      </p>

                      <p className="text-gray-500 text-sm">
                        {ROLE_NAMES[member.role]}
                      </p>
                    </div>
                  </div>

                  <span className="text-xl font-bold">
                    {member.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Latest News */}
        <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-7">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-yellow-400 text-sm">
                Club Updates
              </p>

              <h3 className="text-3xl font-bold mt-1">
                Latest News
              </h3>
            </div>

            <span className="text-sm text-gray-500">
              {Math.min(news.length, 5)} of {news.length}
            </span>
          </div>

          {news.length === 0 ? (
            <p className="text-gray-500">
              No news published yet.
            </p>
          ) : (
            <div className="space-y-4">
              {news.slice(0, 5).map((item) => (
                <article
                  key={item.id}
                  className="bg-white/[0.03] border border-white/5 rounded-2xl p-5"
                >
                  <h4 className="font-semibold text-lg">
                    {item.title}
                  </h4>

                  <p className="text-gray-400 text-sm mt-2 whitespace-pre-wrap">
                    {item.content}
                  </p>

                  {item.created_at && (
                    <p className="text-gray-600 text-xs mt-3">
                      {new Date(
                        item.created_at
                      ).toLocaleDateString()}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}

          {news.length > 5 && (
            <p className="text-gray-600 text-xs mt-4 text-center">
              Showing the 5 most recent posts. Visit News to see all posts.
            </p>
          )}
        </section>
      </div>

      {/* Personal history */}
      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
        <h3 className="text-xl font-semibold mb-5">
          My Point History
        </h3>

        {pointHistory.length ===
        0 ? (
          <p className="text-gray-500">
            No point records yet.
          </p>
        ) : (
          <PersonalPointHistory
            history={
              pointHistory
            }
          />
        )}
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
    useState(
      profile.full_name || ""
    );

  const [nickname, setNickname] =
    useState(
      profile.nickname || ""
    );

  const [bio, setBio] =
    useState(
      profile.bio || ""
    );

  const [avatarUrl, setAvatarUrl] =
    useState(
      profile.avatar_url || ""
    );

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  /*
  =========================================================
  AVATAR UPLOAD + OLD AVATAR CLEANUP
  =========================================================
  */

  const uploadAvatar =
    async (e) => {
      const file =
        e.target.files?.[0];

      if (!file) {
        return;
      }

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        setMessage(
          "Please choose an image file."
        );

        return;
      }

      if (
        file.size >
        5 *
          1024 *
          1024
      ) {
        setMessage(
          "Image must be smaller than 5 MB."
        );

        return;
      }

      setSaving(true);
      setMessage("");

      try {
        /*
          Use ONE fixed filename for the user.

          Example:
          USER_ID/avatar
        */
        const filePath =
          `${profile.id}/avatar`;

        /*
          Upload the new image first.
          If upload fails, old image remains.
        */
        const {
          error:
            uploadError,
        } =
          await supabase.storage
            .from(
              "avatars"
            )
            .upload(
              filePath,
              file,
              {
                upsert:
                  true,
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

        /*
          Get public URL.
        */
        const {
          data: {
            publicUrl,
          },
        } =
          supabase.storage
            .from(
              "avatars"
            )
            .getPublicUrl(
              filePath
            );

        if (!publicUrl) {
          setMessage(
            "The image uploaded, but no public URL was returned."
          );

          return;
        }

        /*
          Cache-busting.
        */
        const finalUrl =
          `${publicUrl}?v=${Date.now()}`;

        /*
          Save the URL.
        */
        const {
          error:
            profileError,
        } =
          await supabase
            .from(
              "profiles"
            )
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

        /*
          Update UI immediately.
        */
        setAvatarUrl(
          finalUrl
        );

        /*
          ---------------------------------------------------
          CLEAN UP OLD AVATAR FILES
          ---------------------------------------------------

          Keep ONLY:
            USER_ID/avatar

          Delete:
            avatar.jpg
            avatar.png
            old timestamp files
            old filenames
            etc.
        */
        const {
          data: oldFiles,
          error:
            listError,
        } =
          await supabase.storage
            .from(
              "avatars"
            )
            .list(
              profile.id
            );

        if (listError) {
          /*
            Do not fail the successful upload
            because cleanup failed.
          */
          console.error(
            "Avatar cleanup list error:",
            listError
          );
        } else if (
          oldFiles &&
          oldFiles.length >
            0
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
                .from(
                  "avatars"
                )
                .remove(
                  filesToDelete
                );

            if (deleteError) {
              /*
                Upload/profile update already succeeded.
                Cleanup failure is only logged.
              */
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
            action: "PROFILE_PICTURE_UPDATED",
            targetUserId: profile.id,
            details: "Updated profile picture.",
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

        /*
          Allows selecting the same file again.
        */
        e.target.value = "";
      }
    };

  /*
  =========================================================
  SAVE PROFILE
  =========================================================
  */

  const saveProfile =
    async (e) => {
      e.preventDefault();

      setSaving(true);
      setMessage("");

      const {
        error,
      } =
        await supabase
          .from(
            "profiles"
          )
          .update({
            full_name:
              fullName,
            nickname,
            bio,
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
          action: "PROFILE_UPDATED",
          targetUserId: profile.id,
          details: "Updated profile name, nickname, bio, or avatar settings.",
        });
      }

      await reloadProfile();

      setSaving(false);
    };

  return (
    <section className="max-w-3xl bg-white/[0.04] border border-white/10 rounded-3xl p-6">
      <div className="flex items-center gap-5 mb-8">
        <SafeImage
          src={
            avatarUrl ||
            logo
          }
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover border-2 border-yellow-400/40"
        />

        <div>
          <h2 className="text-3xl font-bold">
            Your Profile
          </h2>

          <p className="text-yellow-400">
            {
              ROLE_NAMES[
                profile.role
              ]
            }
          </p>
        </div>
      </div>

      <form
        onSubmit={
          saveProfile
        }
        className="space-y-4"
      >
        <input
          value={
            fullName
          }
          onChange={(e) =>
            setFullName(
              e.target
                .value
            )
          }
          placeholder="Full name"
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white"
        />

        <input
          value={
            nickname
          }
          onChange={(e) =>
            setNickname(
              e.target
                .value
            )
          }
          placeholder="Nickname"
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white"
        />

        <textarea
          value={
            bio
          }
          onChange={(e) =>
            setBio(
              e.target
                .value
            )
          }
          placeholder="Bio"
          rows="5"
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white resize-none"
        />

        <div>
          <label className="block text-sm text-gray-300 mb-2">
            Profile Picture
          </label>

          <input
            type="file"
            accept="image/*"
            onChange={
              uploadAvatar
            }
            disabled={
              saving
            }
            className="block w-full text-sm text-gray-300"
          />

          <p className="text-gray-600 text-xs mt-2">
            Maximum 5 MB.
          </p>
        </div>

        {message && (
          <p className="text-yellow-400 text-sm">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={
            saving
          }
          className="px-6 py-3 bg-yellow-400 text-black rounded-xl font-semibold disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Save Profile"}
        </button>
      </form>
    </section>
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

  return (
    <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
      <h2 className="text-2xl font-bold">
        Member Management
      </h2>

      <div className="space-y-3 mt-6">
        {members.map(
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
              <div
                key={
                  member.id
                }
                className="bg-white/[0.03] rounded-2xl p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <SafeImage
                      src={
                        member.avatar_url ||
                        logo
                      }
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />

                    <div>
                      <p className="font-semibold">
                        {
                          member.nickname ||
                            member.full_name
                        }
                      </p>

                      <p className="text-gray-500 text-sm">
                        {
                          member.points
                        }{" "}
                        points
                      </p>

                      <p className="text-yellow-400 text-xs">
                        {
                          ROLE_NAMES[
                            member.role
                          ]
                        }
                      </p>

                      {!member.is_active && (
                        <p className="text-red-400 text-xs">
                          Inactive
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
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
                          className="px-4 py-2 bg-yellow-400 text-black rounded-xl"
                        >
                          Promote
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
                            e
                          ) =>
                            onRoleChange(
                              member.id,
                              e.target
                                .value
                            )
                          }
                          className="bg-[#18181b] border border-white/10 rounded-xl px-4 py-2"
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
                        className={`px-4 py-2 rounded-xl ${
                          member.is_active
                            ? "bg-red-500/10 text-red-400"
                            : "bg-green-500/10 text-green-400"
                        }`}
                      >
                        {member.is_active
                          ? "Deactivate"
                          : "Reactivate"}
                      </button>
                    )}

                    {isCurrentUser && (
                      <span className="text-yellow-400 text-sm">
                        Your account
                      </span>
                    )}

                    {!canModify &&
                      !isCurrentUser &&
                      member.role ===
                        "head_admin" &&
                      currentUserRole ===
                        "administrator" && (
                        <span className="text-gray-600 text-sm">
                          Protected
                        </span>
                      )}
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>
    </section>
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
  isHeadAdmin,
  onWipe,
}) {
  const [filter, setFilter] =
    useState("all");

  const actionTypes = [
    ...new Set(
      activityLog.map(
        (item) =>
          item.action
      )
    ),
  ];

  const filtered =
    filter ===
    "all"
      ? activityLog
      : activityLog.filter(
          (item) =>
            item.action ===
            filter
        );

  return (
    <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Admin Activity History
          </h2>

          <p className="text-gray-500 text-sm mt-1">
            Administrative changes made in the system.
          </p>
        </div>

        {isHeadAdmin && (
          <button
            onClick={
              onWipe
            }
            className="px-5 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-500"
          >
            Wipe Activity History
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-6 mb-6">
        <button
          onClick={() =>
            setFilter("all")
          }
          className={`px-4 py-2 rounded-xl text-sm ${
            filter ===
            "all"
              ? "bg-yellow-400 text-black"
              : "bg-white/5 text-gray-300"
          }`}
        >
          All
        </button>

        {actionTypes.map(
          (action) => (
            <button
              key={
                action
              }
              onClick={() =>
                setFilter(
                  action
                )
              }
              className={`px-4 py-2 rounded-xl text-sm ${
                filter ===
                action
                  ? "bg-yellow-400 text-black"
                  : "bg-white/5 text-gray-300"
              }`}
            >
              {action.replaceAll(
                "_",
                " "
              )}
            </button>
          )
        )}
      </div>

      {filtered.length ===
      0 ? (
        <p className="text-gray-500 text-center py-12">
          No administrative activity recorded.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map(
            (item) => (
              <div
                key={
                  item.id
                }
                className="bg-white/[0.03] border border-white/5 rounded-2xl p-5"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-yellow-400 font-semibold uppercase text-sm">
                      {item.action.replaceAll(
                        "_",
                        " "
                      )}
                    </p>

                    <p className="text-gray-300 text-sm mt-2">
                      {
                        item.details
                      }
                    </p>
                  </div>

                  <span className="text-gray-500 text-xs">
                    {new Date(
                      item.created_at
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            )
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

  const [deletingId, setDeletingId] =
    useState(null);

  const [publishing, setPublishing] =
    useState(false);

  const handleImageChange =
    (event) => {
      const file =
        event.target.files?.[0] ||
        null;

      setImageFile(
        file
      );

      if (file) {
        setImagePreview(
          URL.createObjectURL(
            file
          )
        );
      } else {
        setImagePreview("");
      }
    };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");
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

          imageUrl =
            url;
        }

        const {
          error,
        } =
          await supabase
            .from(
              "news"
            )
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

        if (error) {
          alert(
            error.message
          );

          return;
        }

        await onLogAction({
          action:
            "NEWS_PUBLISHED",
          details:
            `Published news: ${title.trim()}${
              imageUrl
                ? " with an attached image."
                : "."
            }`,
        });

        setTitle("");
        setContent("");
        clearImage();

        await reload();
      } finally {
        setPublishing(
          false
        );
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

      setDeletingId(
        item.id
      );

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

        setDeletingId(
          null
        );

        return;
      }

      await onLogAction({
        action:
          "NEWS_DELETED",
        details:
          `Deleted news: ${item.title}`,
      });

      await reload();

      setDeletingId(
        null
      );
    };

  return (
    <div className="grid lg:grid-cols-2 gap-7 items-start">
      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-7">
        <h2 className="text-3xl font-bold mb-7">
          Publish News
        </h2>

        <form
          onSubmit={
            publish
          }
          className="space-y-5"
        >
          <input
            value={
              title
            }
            onChange={(e) =>
              setTitle(
                e.target
                  .value
              )
            }
            placeholder="News title"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white"
          />

          <textarea
            value={
              content
            }
            onChange={(e) =>
              setContent(
                e.target
                  .value
              )
            }
            placeholder="Write announcement..."
            rows="8"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white resize-none"
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
                  src={
                    imagePreview
                  }
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
            disabled={
              publishing
            }
            className="w-full bg-yellow-400 text-black font-semibold py-4 rounded-xl hover:bg-yellow-300 disabled:opacity-50"
          >
            {publishing
              ? "Publishing..."
              : "Publish"}
          </button>
        </form>
      </section>

      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-7">
        <div className="flex items-center justify-between gap-4 mb-7">
          <h2 className="text-3xl font-bold">
            Published News
          </h2>

          <span className="text-sm text-gray-500">
            {news.length}{" "}
            {news.length === 1
              ? "post"
              : "posts"}
          </span>
        </div>

        {news.length === 0 ? (
          <p className="text-gray-500">
            No news published yet.
          </p>
        ) : (
          <div className="space-y-4">
            {news.map(
              (item) => (
                <article
                  key={
                    item.id
                  }
                  className="bg-white/[0.03] border border-white/5 rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-xl">
                        {
                          item.title
                        }
                      </h3>

                      <p className="text-gray-400 text-sm mt-3 whitespace-pre-wrap">
                        {
                          item.content
                        }
                      </p>

                      {item.image_url && (
                        <img
                          src={
                            item.image_url
                          }
                          alt=""
                          className="mt-4 w-full max-h-72 object-cover rounded-xl border border-white/10"
                        />
                      )}

                      {item.created_at && (
                        <p className="text-gray-600 text-xs mt-4">
                          {new Date(
                            item.created_at
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>

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
                      className="flex-shrink-0 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {deletingId ===
                      item.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>
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

  const [saving, setSaving] =
    useState(false);

  const loadTodos = async () => {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "todos"
        )
        .select("*")
        .order(
          "completed",
          {
            ascending:
              true,
          }
        )
        .order(
          "deadline",
          {
            ascending:
              true,
            nullsFirst:
              false,
          }
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );

    if (error) {
      console.error(
        "Todo load error:",
        error
      );

      setTodos([]);
    } else {
      setTodos(
        data ||
          []
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    loadTodos();

    const channel =
      supabase
        .channel(
          "todos-live"
        )
        .on(
          "postgres_changes",
          {
            event:
              "*",
            schema:
              "public",
            table:
              "todos",
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
    setEditingTodo(
      null
    );
    setShowForm(
      false
    );
  };

  const handleImageChange =
    (event) => {
      const file =
        event.target.files?.[0] ||
        null;

      setImageFile(
        file
      );

      if (file) {
        setImagePreview(
          URL.createObjectURL(
            file
          )
        );
      } else {
        setImagePreview("");
      }
    };

  const saveTodo =
    async (event) => {
      event.preventDefault();

      if (
        !title.trim()
      ) {
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

        /*
          If a new picture is selected,
          upload the replacement.
        */
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

          imageUrl =
            url;
        }

        if (
          editingTodo
        ) {
          const {
            error,
          } =
            await supabase
              .from(
                "todos"
              )
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
            alert(
              error.message
            );

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
              .from(
                "todos"
              )
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
            alert(
              error.message
            );

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
        setSaving(
          false
        );
      }
    };

  const beginEdit =
    (todo) => {
      setEditingTodo(
        todo
      );

      setTitle(
        todo.title ||
          ""
      );

      setDescription(
        todo.description ||
          ""
      );

      setDeadline(
        todo.deadline ||
          ""
      );

      setImageFile(
        null
      );

      setImagePreview(
        todo.image_url ||
          ""
      );

      setShowForm(
        true
      );
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
          .from(
            "todos"
          )
          .delete()
          .eq(
            "id",
            todo.id
          );

      if (error) {
        alert(
          error.message
        );

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
    async (
      todo
    ) => {
      const completed =
        !todo.completed;

      const {
        error,
      } =
        await supabase
          .from(
            "todos"
          )
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
        alert(
          error.message
        );

        return;
      }

      if (onLogAction) {
        await onLogAction({
          action: completed
            ? "TODO_COMPLETED"
            : "TODO_REOPENED",
          targetUserId: profile.id,
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
          day:
            "numeric",
          month:
            "short",
          year:
            "numeric",
        }
      );
    };

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

      return (
        due < today
      );
    };

  const TodoCard =
    ({ todo }) => (
      <div
        className={`group bg-white/[0.04] border rounded-2xl p-4 transition ${
          todo.completed
            ? "border-white/5 opacity-70"
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
            <h4
              className={`font-semibold text-lg ${
                todo.completed
                  ? "line-through text-gray-500"
                  : "text-white"
              }`}
            >
              {
                todo.title
              }
            </h4>

            {todo.description && (
              <p
                className={`text-sm mt-2 ${
                  todo.completed
                    ? "text-gray-600"
                    : "text-gray-400"
                }`}
              >
                {
                  todo.description
                }
              </p>
            )}

            {todo.image_url && (
              <img
                src={
                  todo.image_url
                }
                alt=""
                className="mt-4 w-full max-h-72 object-cover rounded-xl border border-white/10"
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
                  {!todo.completed &&
                  isOverdue(
                    todo.deadline
                  )
                    ? "Overdue · "
                    : "Due · "}
                  {
                    formatDeadline(
                      todo.deadline
                    )
                  }
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
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-yellow-400 text-sm">
            Club Tasks
          </p>

          <h2 className="text-3xl font-bold mt-1">
            To-Do List
          </h2>

          <p className="text-gray-500 mt-1">
            {
              activeTodos.length
            }{" "}
            active{" "}
            {
              activeTodos.length ===
              1
                ? "task"
                : "tasks"
            }
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(
                true
              );
            }}
            className="px-5 py-3 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300"
          >
            + Add Task
          </button>
        )}
      </div>

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
                onClick={
                  resetForm
                }
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={
                saveTodo
              }
              className="space-y-4"
            >
              <input
                type="text"
                value={
                  title
                }
                onChange={(
                  event
                ) =>
                  setTitle(
                    event.target
                      .value
                  )
                }
                placeholder="Task title"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-400"
              />

              <textarea
                value={
                  description
                }
                onChange={(
                  event
                ) =>
                  setDescription(
                    event.target
                      .value
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
                  value={
                    deadline
                  }
                  onChange={(
                    event
                  ) =>
                    setDeadline(
                      event.target
                        .value
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
                      src={
                        imagePreview
                      }
                      alt="Task preview"
                      className="w-full max-h-64 object-cover rounded-xl border border-white/10"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(
                          null
                        );
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
                  disabled={
                    saving
                  }
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
                  onClick={
                    resetForm
                  }
                  className="px-6 py-3 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            Active
          </h3>

          <span className="text-sm text-gray-600">
            {
              activeTodos.length
            }
          </span>
        </div>

        {activeTodos.length ===
        0 ? (
          <div className="bg-white/[0.03] border border-dashed border-white/10 rounded-2xl p-8 text-center">
            <div className="text-3xl">
              ✓
            </div>

            <p className="text-gray-500 mt-2">
              No active tasks.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTodos.map(
              (todo) => (
                <TodoCard
                  key={
                    todo.id
                  }
                  todo={
                    todo
                  }
                />
              )
            )}
          </div>
        )}
      </section>

      <section className="border-t border-white/10 pt-6">
        <button
          type="button"
          onClick={() =>
            setShowCompleted(
              (
                current
              ) =>
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
              {
                completedTodos.length
              }
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
                    key={
                      todo.id
                    }
                    todo={
                      todo
                    }
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
