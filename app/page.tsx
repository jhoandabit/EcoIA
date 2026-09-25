"use client";

import { useEffect, useState } from "react";
import { Activity, Camera, Leaf, Recycle, Server, Users, type LucideIcon } from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Station = {
  code: string;
  name: string;
  status: string;
  device_model: string;
  camera_model: string | null;
  last_seen_at: string | null;
};

type Summary = {
  students: number;
  events: number;
  points: number;
  stations: number;
  online_stations: number;
  station_list: Station[];
};

type MetricCard = {
  label: string;
  value: number;
  Icon: LucideIcon;
};

const emptySummary: Summary = {
  students: 0,
  events: 0,
  points: 0,
  stations: 0,
  online_stations: 0,
  station_list: [],
};

export default function Home() {
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("dashboard_summary");
      if (!error && data) setSummary(data as Summary);
      setLoading(false);
    }
    load();
  }, []);

  const metrics: MetricCard[] = [
    { label: "Estudiantes", value: summary.students, Icon: Users },
    { label: "Eventos", value: summary.events, Icon: Recycle },
    { label: "Puntos", value: summary.points, Icon: Leaf },
    { label: "Estaciones", value: summary.stations, Icon: Server },
  ];

  return (
    <main className="min-h-screen">
      <header className="border-b border-emerald-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-600 p-3 text-white"><Recycle size={24} /></div>
            <div>
              <div className="text-xl font-bold">EcoIA 3.0</div>
              <div className="text-xs text-slate-500">Reciclaje inteligente, IA y educación</div>
            </div>
          </div>
          <a href="/login" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Configuración</a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-900 to-emerald-600 p-8 text-white shadow-xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">EcoIA 3.0 · Dashboard público</p>
          <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl">EcoIA 3.0 transforma el reciclaje en aprendizaje.</h1>
          <p className="mt-5 max-w-2xl leading-7 text-emerald-50">Consulta pública de la actividad de las estaciones, reciclaje, puntos y estadísticas de la plataforma.</p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(({ label, value, Icon }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="text-emerald-600" size={22} />
              <div className="mt-5 text-sm text-slate-500">{label}</div>
              <div className="text-3xl font-black">{loading ? "…" : value.toLocaleString("es-CO")}</div>
            </div>
          ))}
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Estaciones EcoIA</h2>
              <p className="text-sm text-slate-500">{summary.online_stations} conectada(s) actualmente.</p>
            </div>
            <Camera className="text-emerald-600" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {summary.station_list.map((station) => (
              <article key={station.code} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{station.code}</div>
                    <div className="text-sm text-slate-500">{station.name}</div>
                  </div>
                  <span className={station.status === "online" ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"}>
                    {station.status}
                  </span>
                </div>
                <div className="mt-5 flex items-center gap-2 text-sm text-slate-600"><Activity size={16} />{station.device_model} + {station.camera_model ?? "sin cámara"}</div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
