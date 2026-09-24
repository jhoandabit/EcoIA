import {
  Activity,
  Camera,
  Leaf,
  Recycle,
  Server,
  Users,
} from "lucide-react";

const stations = [
  {
    code: "ECOIA-001",
    name: "Estación principal",
    status: "offline",
    device: "ESP32-S3 + OV3660",
  },
  {
    code: "ECOIA-002",
    name: "Estación secundaria",
    status: "offline",
    device: "ESP32-S3 + OV3660",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-emerald-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-600 p-3 text-white">
              <Recycle size={24} />
            </div>
            <div>
              <div className="text-xl font-bold">EcoIA 2.0</div>
              <div className="text-xs text-slate-500">
                Inteligencia para reciclar, aprender y transformar
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <Activity size={16} />
            Plataforma operativa
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-600 p-8 text-white shadow-xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">
            EcoIA 2.0
          </p>
          <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
            Centro de control inteligente para el reciclaje educativo.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-emerald-50">
            Base inicial preparada para conectar estaciones ESP32-S3, cámaras,
            estudiantes, eventos de reciclaje y puntos sobre una arquitectura
            escalable.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Estudiantes", "—", Users],
            ["Eventos", "—", Recycle],
            ["Puntos", "—", Leaf],
            ["Estaciones", "2", Server],
          ].map(([label, value, Icon]) => (
            <div
              key={label as string}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <Icon className="text-emerald-600" size={22} />
              <div className="mt-5 text-sm text-slate-500">{label as string}</div>
              <div className="text-3xl font-black">{value as string}</div>
            </div>
          ))}
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Estaciones EcoIA</h2>
              <p className="text-sm text-slate-500">
                Dispositivos registrados en la plataforma
              </p>
            </div>
            <Camera className="text-emerald-600" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {stations.map((station) => (
              <article
                key={station.code}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{station.code}</div>
                    <div className="text-sm text-slate-500">
                      {station.name}
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {station.status}
                  </span>
                </div>
                <div className="mt-5 text-sm text-slate-600">
                  {station.device}
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
