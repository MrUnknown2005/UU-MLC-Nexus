import { useState } from "react";
import AuthLayout from "./AuthLayout.jsx";
import { Button } from "../ui/Button.jsx";
import { Icon } from "../ui/Icon.jsx";
import { TextInput, PasswordInput } from "../ui/TextInput.jsx";
import { useToast } from "../ui/toast-context.js";
import {
  requestPasswordReset,
  signInWithPassword,
  signUp,
} from "../../services/authService";

/**
 * Sign in / sign up / forgot password.
 *
 * All three are one component tree so switching between them keeps the email
 * a member has already typed — the old build threw it away on every switch.
 */
export default function AuthScreen({ initialMode = "login", onAuth, onBack }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");

  const shared = { email, setEmail, onBack, setMode };

  if (mode === "signup") return <SignUp {...shared} onSignup={onAuth} />;
  if (mode === "forgot") return <ForgotPassword {...shared} />;
  return <SignIn {...shared} onSignIn={onAuth} />;
}

function Notice({ tone = "danger", children }) {
  if (!children) return null;

  const isError = tone === "danger";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={
        isError
          ? "flex items-start gap-2 rounded-control border border-danger-line bg-danger-soft px-3 py-2.5 text-[0.8125rem] text-danger"
          : "flex items-start gap-2 rounded-control border border-success-line bg-success-soft px-3 py-2.5 text-[0.8125rem] text-success"
      }
    >
      <Icon
        name={isError ? "alert-triangle" : "check-circle"}
        size={15}
        className="mt-px shrink-0"
      />
      <span>{children}</span>
    </div>
  );
}

function SignIn({ email, setEmail, setMode, onBack, onSignIn }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setBusy(true);

    const { error: signInError } = await signInWithPassword(
      email.trim(),
      password
    );

    if (signInError) {
      // Supabase returns this for both a wrong password and an unknown email,
      // and it stays vague on purpose — telling an attacker which one it was
      // confirms whether an address has an account here.
      setError(
        signInError.message === "Invalid login credentials"
          ? "That email and password don't match an account."
          : signInError.message
      );
      setBusy(false);
      return;
    }

    await onSignIn();
    setBusy(false);
  };

  return (
    <AuthLayout
      onBack={onBack}
      title="Welcome back"
      subtitle="Sign in to pick up where the club left off."
      footer={
        <p className="text-center text-[0.8125rem] text-ink-muted">
          New to the club?{" "}
          <button
            type="button"
            onClick={() => setMode("signup")}
            className="font-semibold text-brand-text underline decoration-brand-line underline-offset-2 hover:decoration-brand"
          >
            Create an account
          </button>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextInput
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          icon="mail"
          required
        />

        <PasswordInput
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Your password"
          required
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className="text-[0.8125rem] text-ink-muted underline decoration-line-strong underline-offset-2 hover:text-ink"
          >
            Forgot your password?
          </button>
        </div>

        <Notice>{error}</Notice>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={busy}
          iconRight="arrow-right"
        >
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}

function SignUp({ email, setEmail, setMode, onBack, onSignup }) {
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Enter your full name so members can find you in the directory.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Email and password are both required.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }

    setBusy(true);

    const { data, error: signUpError } = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      nickname: nickname.trim(),
    });

    if (signUpError) {
      setError(signUpError.message);
      setBusy(false);
      return;
    }

    if (data.session) {
      toast.success("Account created", {
        description: "An administrator will approve your membership shortly.",
      });
      await onSignup();
    } else {
      setSent(true);
    }

    setBusy(false);
  };

  if (sent) {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle={`We sent a confirmation link to ${email.trim()}.`}
        footer={
          <p className="text-center text-[0.8125rem] text-ink-muted">
            Wrong address?{" "}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="font-semibold text-brand-text underline decoration-brand-line underline-offset-2 hover:decoration-brand"
            >
              Go back and fix it
            </button>
          </p>
        }
      >
        <div className="nx-well px-4 py-5">
          <ol className="space-y-3 text-[0.8125rem] text-ink-muted">
            <Step n={1}>Open the email and click the confirmation link.</Step>
            <Step n={2}>Come back here and sign in.</Step>
            <Step n={3}>
              An administrator approves your membership — until then you'll see a
              limited guest view.
            </Step>
          </ol>
        </div>

        <Button
          className="mt-5"
          variant="secondary"
          fullWidth
          onClick={() => setMode("login")}
        >
          Go to sign in
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      onBack={onBack}
      title="Create your account"
      subtitle="Join the United University Machine Learning Club."
      footer={
        <p className="text-center text-[0.8125rem] text-ink-muted">
          Already a member?{" "}
          <button
            type="button"
            onClick={() => setMode("login")}
            className="font-semibold text-brand-text underline decoration-brand-line underline-offset-2 hover:decoration-brand"
          >
            Sign in instead
          </button>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextInput
          label="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Your name as it should appear"
          autoComplete="name"
          icon="user"
          required
        />

        <TextInput
          label="Nickname"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="What people actually call you"
          autoComplete="nickname"
          optional
          hint="Shown instead of your full name across the app."
        />

        <TextInput
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          icon="mail"
          required
        />

        <PasswordInput
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />

        <PasswordInput
          label="Confirm password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Type it once more"
          autoComplete="new-password"
          error={
            confirm && confirm !== password ? "Doesn't match." : undefined
          }
          required
        />

        <Notice>{error}</Notice>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={busy}
          iconRight="arrow-right"
        >
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}

function ForgotPassword({ email, setEmail, setMode }) {
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Enter the email you signed up with.");
      return;
    }

    setBusy(true);

    const { error: resetError } = await requestPasswordReset(email.trim());

    if (resetError) {
      setError(resetError.message);
      setBusy(false);
      return;
    }

    setSent(true);
    setBusy(false);
  };

  return (
    <AuthLayout
      onBack={() => setMode("login")}
      title="Reset your password"
      subtitle="We'll email you a link that signs you in once so you can set a new one."
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextInput
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          icon="mail"
          disabled={sent}
          required
        />

        <Notice>{error}</Notice>

        {sent ? (
          <Notice tone="success">
            If an account exists for that address, the link is on its way. It
            expires in one hour.
          </Notice>
        ) : (
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={busy}
            icon="send"
          >
            Send reset link
          </Button>
        )}

        <Button variant="ghost" fullWidth onClick={() => setMode("login")}>
          Back to sign in
        </Button>
      </form>
    </AuthLayout>
  );
}

function Step({ n, children }) {
  return (
    <li className="flex gap-2.5">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-[0.625rem] font-bold text-brand-text">
        {n}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}
