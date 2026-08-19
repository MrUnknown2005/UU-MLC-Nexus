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
    <div className="min-h-screen bg-[#0b0b0d] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/[0.06] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <img src={logo} alt="UU MLC" className="w-24 h-24 object-contain" />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">{title}</h1>

            <p className="text-gray-400 text-sm mt-2">{subtitle}</p>

            <p className="text-gray-500 text-xs mt-1">UU MLC Nexus</p>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 text-sm text-gray-500 hover:text-white transition"
            >
              ← Back to home
            </button>
          )}

          {children}
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
          <label className="block text-sm text-gray-300 mb-2">Email</label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-yellow-400"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-2">Password</label>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 pr-20 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-yellow-400"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400 text-xs"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-yellow-400 text-black font-semibold hover:bg-yellow-300 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="text-center mt-6">
        <p className="text-gray-500 text-sm">Don't have an account?</p>

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
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
        />

        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Nickname"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
        />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
        />

        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
        />

        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-yellow-400 text-xs"
        >
          {showPassword ? "Hide password" : "Show password"}
        </button>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {message && <p className="text-yellow-400 text-sm">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-yellow-400 text-black font-semibold disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Account"}
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


export default AuthScreen;
