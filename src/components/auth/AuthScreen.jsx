import { useState } from "react";
import logo from "../../assets/club-logo.png";
import { supabase } from "../../lib/supabaseClient";

function AuthScreen({ initialMode = "login", onAuth, onBack }) {
  const [mode, setMode] = useState(initialMode);

  const toggleMode = () => {
    setMode((current) => (current === "login" ? "signup" : "login"));
  };

  return mode === "login" ? (
    <Login onBack={onBack} onLogin={onAuth} onSwitch={toggleMode} />
  ) : (
    <SignUp onBack={onBack} onSignup={onAuth} onSwitch={toggleMode} />
  );
}

function AuthLayout({ title, subtitle, children, onBack }) {
  return (
    <div className="nexus-app-bg min-h-screen flex items-center justify-center px-4 py-10 relative">
      {/* Glow blobs */}
      <div className="nexus-glow-yellow w-[26rem] h-[26rem] -top-20 -left-20" />
      <div className="nexus-glow-purple w-[28rem] h-[28rem] bottom-0 -right-20" />
      <div className="nexus-glow-cyan w-[20rem] h-[20rem] top-1/3 right-10" />

      <div className="relative w-full max-w-md z-10">
        <div className="nexus-modal p-8 relative overflow-hidden">
          <div className="absolute inset-0 nexus-glass-overlay-aurora pointer-events-none" />

          <div className="relative flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-aurora blur-2xl opacity-50" />
              <img
                src={logo}
                alt="UU MLC"
                className="relative w-24 h-24 object-contain drop-shadow-[0_0_24px_rgba(139,92,246,0.5)]"
              />
            </div>
          </div>

          <div className="relative text-center mb-8">
            <h1 className="text-3xl font-black nexus-text-aurora">{title}</h1>

            <p className="text-gray-400 text-sm mt-2">{subtitle}</p>

            <p className="text-[10px] uppercase tracking-[0.3em] text-yellow-300/80 mt-3">
              UU MLC Nexus
            </p>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="relative mb-4 text-sm text-gray-500 hover:text-yellow-300 transition"
            >
              ← Back to home
            </button>
          )}

          <div className="relative">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Login({ onBack, onLogin, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
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
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="nexus-input"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
            Password
          </label>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="nexus-input pr-20"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-300 text-xs font-semibold hover:text-yellow-200 transition"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && (
          <div className="nexus-badge-red nexus-glass-danger rounded-xl px-3 py-2 text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="nexus-morphic-button w-full py-3.5 text-base"
        >
          {loading ? "Signing in..." : "Sign In →"}
        </button>
      </form>

      <div className="text-center mt-6">
        <p className="text-gray-500 text-sm">Don't have an account?</p>

        <button
          type="button"
          onClick={onSwitch}
          className="nexus-text-aurora font-bold text-sm mt-1 hover:brightness-110 transition"
        >
          Create an account
        </button>
      </div>
    </AuthLayout>
  );
}

function SignUp({ onBack, onSignup, onSwitch }) {
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          nickname: nickname || null,
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
      setMessage("Account created. Check your email to confirm your account.");
    }

    setLoading(false);
  };

  return (
    <AuthLayout
      onBack={onBack}
      title="Create Account"
      subtitle="Join Uttara University Machine Learning Club"
    >
      <form onSubmit={submit} className="space-y-4">
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          className="nexus-input"
        />

        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Nickname"
          className="nexus-input"
        />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="nexus-input"
        />

        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="nexus-input"
        />

        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          className="nexus-input"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-yellow-300 text-xs font-semibold hover:text-yellow-200 transition"
        >
          {showPassword ? "Hide password" : "Show password"}
        </button>

        {error && (
          <div className="nexus-badge-red nexus-glass-danger rounded-xl px-3 py-2">{error}</div>
        )}

        {message && (
          <div className="nexus-badge-yellow nexus-glass-yellow rounded-xl px-3 py-2">{message}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="nexus-morphic-button w-full py-3.5 text-base"
        >
          {loading ? "Creating..." : "Create Account →"}
        </button>
      </form>

      <div className="text-center mt-6">
        <button
          type="button"
          onClick={onSwitch}
          className="nexus-text-aurora font-bold text-sm hover:brightness-110 transition"
        >
          Back to Sign In
        </button>
      </div>
    </AuthLayout>
  );
}

export default AuthScreen;
