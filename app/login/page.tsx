"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, Recycle } from "lucide-react";
import { createClient } from "../../lib/supabase/client";

const ADMIN_EMAIL = "jhdbermude@gmail.cm";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !data.user) {
      setError("Credenciales no válidas.");
      setLoading(false);
      return;
    }

    const normalizedEmail = data.user.email?.toLowerCase() ?? "";

    if (normalizedEmail === ADMIN_EMAIL) {
      window.location.href = "/setup";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role === "admin") {
      window.location.href = "/admin";
      return;
    }

    await supabase.auth.signOut();
    setError("Esta cuenta no tiene permisos administrativos.");
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-600 p-3 text-white"><Recycle size={24} /></div>
          <div><h1 className="text-2xl font-black">EcoIA 2.0</h1><p className="text-sm text-slate-500">Administración privada</p></div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold">Correo</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">Contraseña</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600" />
          </div>
          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white disabled:opacity-60">
            <LockKeyhole size={18} />{loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
        <a href="/" className="mt-6 block text-center text-sm text-slate-500 hover:text-emerald-700">← Volver al dashboard público</a>
      </div>
    </main>
  );
}
