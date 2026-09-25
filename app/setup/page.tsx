"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

const ADMIN_EMAIL = "jhdbermude@gmail.cm";

export default function SetupPage() {
  const supabase = createClient();
  const [message, setMessage] = useState("Verificando cuenta...");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        window.location.href = "/login";
        return;
      }

      if (data.user.email?.toLowerCase() !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        window.location.href = "/";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.role === "admin") {
        window.location.href = "/admin";
        return;
      }

      setMessage("Tu cuenta está lista para reclamar la administración inicial.");
    }

    checkUser();
  }, [supabase]);

  async function claimAdmin() {
    setLoading(true);
    setMessage("");

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage("Debes iniciar sesión primero.");
      setLoading(false);
      return;
    }

    if (userData.user.email?.toLowerCase() !== ADMIN_EMAIL) {
      await supabase.auth.signOut();
      window.location.href = "/";
      return;
    }

    const { data, error } = await supabase.rpc("claim_first_admin");

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data === true) {
      window.location.href = "/admin";
      return;
    }

    setMessage("La administración inicial ya fue reclamada.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
          EcoIA 3.0
        </p>
        <h1 className="mt-3 text-3xl font-bold">Configuración inicial</h1>
        <p className="mt-3 text-slate-300">
          Esta operación solo puede realizarse una vez y está reservada para la cuenta administrativa de EcoIA 3.0.
        </p>

        <div className="mt-8 rounded-xl border border-slate-700 bg-slate-950 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Cuenta administrativa</div>
          <div className="mt-1 font-semibold">{ADMIN_EMAIL}</div>
        </div>

        <button
          onClick={claimAdmin}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Configurando..." : "Reclamar administración"}
        </button>

        {message && (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
