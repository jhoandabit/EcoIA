"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "jhdbermude@gmail.cm";

export default function SetupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setMessage("Primero crea tu usuario en Supabase Auth y luego inicia sesión con él.");
      }
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

    if (userData.user.email?.toLowerCase() !== email.toLowerCase()) {
      setMessage("Esta configuración inicial está reservada para la cuenta administrativa definida para EcoIA 2.0.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("claim_first_admin");

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data === true) {
      router.push("/admin");
      router.refresh();
    } else {
      setMessage("La administración inicial ya fue reclamada. Inicia sesión con la cuenta administradora.");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
          EcoIA 2.0
        </p>
        <h1 className="mt-3 text-3xl font-bold">Configuración inicial</h1>
        <p className="mt-3 text-slate-300">
          Esta pantalla permite reclamar una sola vez la administración inicial de la plataforma.
        </p>

        <label className="mt-8 block text-sm font-medium text-slate-300">
          Correo administrativo
        </label>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
          type="email"
          autoComplete="email"
        />

        <button
          onClick={claimAdmin}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Configurando..." : "Reclamar administración"}
        </button>

        <button
          onClick={() => router.push("/login")}
          className="mt-3 w-full rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200 hover:bg-slate-800"
        >
          Ir al inicio de sesión
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
