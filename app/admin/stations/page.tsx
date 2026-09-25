"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Edit3,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Wifi,
  WifiOff,
  Wrench,
  X,
} from "lucide-react";
import { createClient } from "../../../lib/supabase/client";

type Station = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  device_model: string | null;
  camera_model: string | null;
  status: "online" | "offline" | "maintenance";
  last_seen_at: string | null;
  firmware_version: string | null;
};

type FormState = {
  code: string;
  name: string;
  location: string;
  device_model: string;
  camera_model: string;
  status: Station["status"];
  firmware_version: string;
};

const emptyForm: FormState = {
  code: "",
  name: "",
  location: "",
  device_model: "TABLET/LAPTOP",
  camera_model: "Cámara integrada",
  status: "offline",
  firmware_version: "",
};

function statusLabel(status: Station["status"]) {
  if (status === "online") return "En línea";
  if (status === "maintenance") return "Mantenimiento";
  return "Fuera de línea";
}

function statusClass(status: Station["status"]) {
  if (status === "online") return "bg-emerald-100 text-emerald-700";
  if (status === "maintenance") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

export default function AdminStationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadStations() {
    setError("");
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      window.location.href = "/";
      return;
    }

    setAllowed(true);

    const { data, error: queryError } = await supabase
      .from("stations")
      .select("id, code, name, location, device_model, camera_model, status, last_seen_at, firmware_version")
      .order("code");

    if (queryError) {
      setError(queryError.message);
      setStations([]);
    } else {
      setStations((data ?? []) as Station[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadStations();
  }, []);

  function startCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowForm(true);
    setMessage("");
    setError("");
    requestAnimationFrame(() => {
      document.getElementById("nueva-estacion-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function startEdit(station: Station) {
    setEditing(station);
    setShowForm(true);
    setForm({
      code: station.code,
      name: station.name,
      location: station.location ?? "",
      device_model: station.device_model ?? "",
      camera_model: station.camera_model ?? "",
      status: station.status,
      firmware_version: station.firmware_version ?? "",
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowForm(false);
  }

  async function saveStation() {
    if (!form.code.trim() || !form.name.trim()) {
      setError("El código y el nombre son obligatorios.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      location: form.location.trim() || null,
      device_model: form.device_model.trim() || null,
      camera_model: form.camera_model.trim() || null,
      status: form.status,
      firmware_version: form.firmware_version.trim() || null,
    };

    const result = editing
      ? await supabase.from("stations").update(payload).eq("id", editing.id)
      : await supabase.from("stations").insert(payload);

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setMessage(editing ? "Estación actualizada correctamente." : "Estación creada correctamente.");
    setSaving(false);
    closeForm();
    await loadStations();
  }

  async function deleteStation(station: Station) {
    const confirmed = window.confirm(
      `¿Eliminar definitivamente la estación ${station.code}? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("stations")
      .delete()
      .eq("id", station.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Estación eliminada correctamente.");
    await loadStations();
  }

  if (!allowed && loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Verificando acceso...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
              EcoIA 3.0 · Administración
            </p>
            <h1 className="text-2xl font-black">Estaciones</h1>
          </div>
          <a
            href="/admin"
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
          >
            <ArrowLeft size={17} /> Volver
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Estaciones EcoIA</h2>
            <p className="text-sm text-slate-500">
              Administra las estaciones de trabajo y su estado operativo.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadStations}
              className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold"
            >
              <RefreshCw size={17} /> Actualizar
            </button>
            <button
              id="nueva-estacion-button"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                startCreate();
              }}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 active:scale-[0.98]"
              aria-label="Crear nueva estación"
            >
              <Plus size={17} /> Nueva estación
            </button>
          </div>
        </div>

        {showForm && (
          <div id="nueva-estacion-form" className="mb-7 rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editing ? "Editar estación" : "Nueva estación"}
              </h3>
              <button type="button" onClick={closeForm} className="rounded-lg p-2 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                ["code", "Código", "ECOIA-003"],
                ["name", "Nombre", "Estación principal"],
                ["location", "Ubicación", "Bloque A"],
                ["device_model", "Modelo del dispositivo", "ESP32-S3"],
                ["camera_model", "Cámara", "OV3660"],
                ["firmware_version", "Firmware", "1.0.0"],
              ].map(([key, label, placeholder]) => (
                <label key={key} className="text-sm font-semibold text-slate-700">
                  {label}
                  <input
                    value={form[key as keyof FormState] as string}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        [key]: e.target.value,
                      }))
                    }
                    placeholder={placeholder}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-600"
                  />
                </label>
              ))}

              <label className="text-sm font-semibold text-slate-700">
                Estado
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      status: e.target.value as Station["status"],
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-emerald-600"
                >
                  <option value="online">En línea</option>
                  <option value="offline">Fuera de línea</option>
                  <option value="maintenance">Mantenimiento</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeForm} className="rounded-xl border px-5 py-3 font-semibold">
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveStation}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-60"
              >
                <Save size={17} /> {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500">
            Cargando estaciones...
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Estación</th>
                    <th className="px-5 py-4">Equipo</th>
                    <th className="px-5 py-4">Cámara</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4">Último contacto</th>
                    <th className="px-5 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stations.map((station) => (
                    <tr key={station.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="font-bold">{station.code}</div>
                        <div className="text-xs text-slate-500">{station.name}</div>
                        {station.location && (
                          <div className="mt-1 text-xs text-slate-400">{station.location}</div>
                        )}
                      </td>
                      <td className="px-5 py-4">{station.device_model ?? "—"}</td>
                      <td className="px-5 py-4">{station.camera_model ?? "—"}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${statusClass(station.status)}`}>
                          {station.status === "online" && <Wifi size={13} />}
                          {station.status === "offline" && <WifiOff size={13} />}
                          {station.status === "maintenance" && <Wrench size={13} />}
                          {statusLabel(station.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {station.last_seen_at
                          ? new Date(station.last_seen_at).toLocaleString("es-CO")
                          : "Nunca"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(station)}
                            className="rounded-lg border p-2 text-slate-600 hover:bg-slate-50"
                            title="Editar"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteStation(station)}
                            className="rounded-lg border p-2 text-red-600 hover:bg-red-50"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {stations.length === 0 && (
              <div className="p-10 text-center text-slate-500">No hay estaciones registradas.</div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
