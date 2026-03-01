import { useState } from "react";

interface LoginProps {
  onSuccess?: (email: string) => void;
  onRegister?: () => void;
}

export default function Login({ onSuccess, onRegister }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("email", data.email);
      onSuccess?.(data.email);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="card bg-base-100 border border-base-300 shadow-sm w-full max-w-sm p-8 flex flex-col gap-5"
      >
        <h2 className="text-2xl font-bold text-center">Log In</h2>

        <div className="form-control gap-1">
          <label className="label text-sm font-medium" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            className="input input-bordered w-full"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-control gap-1">
          <label className="label text-sm font-medium" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            className="input input-bordered w-full"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full mt-1"
          disabled={submitting}
        >
          {submitting ? <span className="loading loading-spinner" /> : "Log In"}
        </button>

        <p className="text-center text-sm text-base-content/50">
          Don't have an account?{" "}
          <button
            type="button"
            className="link link-primary"
            onClick={onRegister}
          >
            Make one here
          </button>
        </p>
      </form>
    </div>
  );
}
