"use client";

import { useEffect, useState } from "react";
import { LogOut, Settings, ShieldCheck, Wifi } from "lucide-react";
import { createClient } from "../../lib/supabase/client";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { window.location.href = "/login"; return; }
      const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", data.user.id).single();
      if (profile?.role !== "admin") {
        await supabase.auth.signOut();
        window.location.href = "/";
        return;
      }
      setEmail(data.user.email ?? profile.full_name ?? "");
      setAllowed(true);
    }
    load();
  }, []);

  async function logout() {
    await createClient().auth.signOut();
    window.location.href = "/";
  }

  if (allowed !== true) return <main className="flex min-h-screen items-center justify-center">Verificando acceso...</main>;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-600">EcoIA 3.0</p><h1 className="text-2xl font-black">Configuración</h1></div>
          <button onClick={logout} className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"><LogOut size={17} /> Salir</button>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 rounded-3xl bg-slate-950 p-8 text-white">
          <div className="flex items-center gap-3"><ShieldCheck className="text-emerald-400" /><div><h2 className="text-2xl font-bold">Administración privada</h2><p className="text-slate-400">{email}</p></div></div>
        </div>
        <div className="mb-5 grid gap-5 md:grid-cols-2">
          <a href="/admin/stations" className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><Wifi className="text-emerald-600" /><h3 className="mt-4 font-bold">Estaciones</h3><p className="mt-2 text-sm text-slate-500">Configurar ECOIA-001, ECOIA-002 y futuras estaciones.</p><span className="mt-4 inline-block text-sm font-bold text-emerald-700">Administrar estaciones →</span></a>
          <a href="/admin/students" className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><ShieldCheck className="text-emerald-600" /><h3 className="mt-4 font-bold">Estudiantes</h3><p className="mt-2 text-sm text-slate-500">Registro individual y carga masiva mediante archivo CSV.</p><span className="mt-4 inline-block text-sm font-bold text-emerald-700">Administrar estudiantes →</span></a>
          <div className="rounded-2xl bg-white p-6 shadow-sm"><Settings className="text-emerald-600" /><h3 className="mt-4 font-bold">Sistema</h3><p className="mt-2 text-sm text-slate-500">Parámetros, puntos, clasificación y configuración general.</p></div>
          <div className="rounded-2xl bg-white p-6 shadow-sm"><ShieldCheck className="text-emerald-600" /><h3 className="mt-4 font-bold">Seguridad</h3><p className="mt-2 text-sm text-slate-500">El dashboard público permanece separado de las operaciones administrativas.</p></div>
        </div>
      </section>
    </main>
  );
}
