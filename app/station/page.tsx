"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  CircleDollarSign,
  Leaf,
  Loader2,
  RotateCcw,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { createClient } from "../../lib/supabase/client";

const STATION_CODE = "ECOIA-001";
const HEARTBEAT_INTERVAL_MS = 30_000;

type Student = {
  id: string;
  full_name: string;
  grade: string | null;
  institution: string | null;
};

type Material = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  points: number;
};

type RegistrationResult = {
  event_id: string;
  material_code: string;
  material_name: string;
  points_awarded: number;
};

export default function StationPage() {
  const scannerRef = useRef<any>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [status, setStatus] = useState("Preparando cámara...");
  const [error, setError] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [stationOnline, setStationOnline] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  async function sendHeartbeat() {
    const supabase = createClient();
    const { data, error: heartbeatError } = await supabase.rpc("station_heartbeat", {
      p_station_code: STATION_CODE,
    });

    if (heartbeatError || data !== true) {
      setStationOnline(false);
      return false;
    }

    setStationOnline(true);
    return true;
  }

  async function loadMaterials() {
    setLoadingMaterials(true);
    const supabase = createClient();
    const { data, error: materialsError } = await supabase
      .from("materials")
      .select("id, code, name, description, points")
      .order("points", { ascending: false });

    if (materialsError) {
      setError(materialsError.message);
      setMaterials([]);
    } else {
      setMaterials((data ?? []) as Material[]);
    }

    setLoadingMaterials(false);
  }

  async function resolveQr(token: string) {
    const clean = token.trim();
    if (!clean || busy) return;

    setBusy(true);
    setError("");
    setResult(null);
    setSelectedMaterial(null);
    setStatus("Validando QR...");

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("resolve_student_qr", {
        p_qr_token: clean,
      });

      if (rpcError) throw rpcError;

      const resolved = Array.isArray(data) ? data[0] : data;
      if (!resolved) {
        setStudent(null);
        setError("QR no registrado o estudiante inactivo.");
        setStatus("Esperando un QR válido...");
        return;
      }

      setStudent(resolved as Student);
      setStatus("Estudiante identificado. Selecciona el material reciclado.");
      await stopScanner();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible validar el QR.");
      setStatus("No fue posible validar el QR.");
    } finally {
      setBusy(false);
    }
  }

  async function registerRecycling() {
    if (!student || !selectedMaterial || busy) return;

    setBusy(true);
    setError("");
    setResult(null);
    setStatus("Registrando reciclaje...");

    try {
      const supabase = createClient();

      const { data, error: rpcError } = await supabase.rpc("register_recycling_event", {
        p_student_id: student.id,
        p_station_code: STATION_CODE,
        p_material_code: selectedMaterial.code,
        p_confidence: null,
        p_image_path: null,
      });

      if (rpcError) throw rpcError;

      const registered = Array.isArray(data) ? data[0] : data;
      if (!registered) throw new Error("Supabase no devolvió el evento registrado.");

      setResult(registered as RegistrationResult);
      setStatus("Reciclaje registrado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar el reciclaje.");
      setStatus("No fue posible registrar el reciclaje.");
    } finally {
      setBusy(false);
    }
  }

  async function startScanner() {
    setError("");
    setStatus("Solicitando acceso a la cámara...");

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("ecoia-qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1 },
        (decodedText: string) => resolveQr(decodedText),
        () => {},
      );

      setStatus("Apunta la cámara al QR del estudiante.");
    } catch (err) {
      setError(
        err instanceof Error
          ? "No se pudo iniciar la cámara. Verifica los permisos del navegador."
          : "No se pudo iniciar la cámara.",
      );
      setStatus("Cámara no disponible.");
    }
  }

  async function stopScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      const state = scanner.getState?.();
      if (state === 2 || state === 3) await scanner.stop();
      scanner.clear();
    } catch {
      // El scanner puede ya estar detenido.
    } finally {
      scannerRef.current = null;
    }
  }

  async function resetStation() {
    await stopScanner();
    setStudent(null);
    setSelectedMaterial(null);
    setResult(null);
    setManualToken("");
    setError("");
    setBusy(false);
    await sendHeartbeat();
    await startScanner();
  }

  useEffect(() => {
    void sendHeartbeat();
    void loadMaterials();

    const heartbeatTimer = window.setInterval(() => {
      void sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    void startScanner();

    return () => {
      window.clearInterval(heartbeatTimer);
      void stopScanner();
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
              EcoIA 3.0 · Estación {STATION_CODE}
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              Estación de reciclaje
            </h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              El portátil o tablet identifica al estudiante, registra el material
              reciclado y asigna los puntos desde Supabase.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold">
              <span
                className={
                  stationOnline
                    ? "h-2.5 w-2.5 rounded-full bg-emerald-400"
                    : "h-2.5 w-2.5 rounded-full bg-slate-500"
                }
              />
              {stationOnline
                ? "Estación en línea"
                : "Conexión de estación no confirmada"}
            </div>
          </div>
          <Camera className="hidden text-emerald-400 md:block" size={42} />
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl bg-white p-5 text-slate-950 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Lector QR</h2>
                <p className="text-sm text-slate-500">{status}</p>
              </div>
              <ShieldCheck className="text-emerald-600" />
            </div>

            <div className="overflow-hidden rounded-2xl bg-slate-100">
              <div id="ecoia-qr-reader" className="min-h-[320px] w-full" />
            </div>

            {error && (
              <div className="mt-4 flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                <XCircle className="shrink-0" size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-5 border-t pt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Prueba manual
              </p>
              <div className="flex gap-2">
                <input
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Pega aquí el token QR"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
                />
                <button
                  onClick={() => resolveQr(manualToken)}
                  disabled={busy}
                  className="rounded-xl bg-slate-950 px-4 py-3 font-bold text-white disabled:opacity-50"
                >
                  Probar
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            {result ? (
              <div className="flex min-h-[520px] flex-col justify-center">
                <div className="mx-auto rounded-full bg-emerald-500/10 p-5 text-emerald-400">
                  <CheckCircle2 size={48} />
                </div>
                <p className="mt-6 text-center text-sm font-bold uppercase tracking-widest text-emerald-400">
                  Reciclaje registrado
                </p>
                <h2 className="mt-3 text-center text-3xl font-black">
                  +{result.points_awarded} puntos
                </h2>
                <div className="mt-6 rounded-2xl bg-slate-950 p-5">
                  <p className="text-sm text-slate-400">Estudiante</p>
                  <p className="mt-1 text-xl font-bold">{student?.full_name}</p>
                  <p className="mt-4 text-sm text-slate-400">Material</p>
                  <p className="mt-1 text-xl font-bold">{result.material_name}</p>
                </div>
                <button
                  onClick={resetStation}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-400"
                >
                  <RotateCcw size={18} /> Registrar otro reciclaje
                </button>
              </div>
            ) : student ? (
              <div>
                <div className="flex items-center gap-3 text-emerald-400">
                  <CheckCircle2 size={24} />
                  <span className="font-bold">Estudiante identificado</span>
                </div>

                <div className="mt-6 rounded-2xl bg-slate-950 p-5">
                  <UserRound className="text-emerald-400" size={28} />
                  <h2 className="mt-4 text-2xl font-black">{student.full_name}</h2>
                  <p className="mt-2 text-slate-400">
                    Grado: {student.grade ?? "No registrado"}
                  </p>
                  <p className="text-slate-400">
                    {student.institution ?? "IE Ramón Martínez Benítez"}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-2">
                  <Leaf className="text-emerald-400" size={20} />
                  <h3 className="font-bold">¿Qué material recicló?</h3>
                </div>

                {loadingMaterials ? (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-800 p-4 text-slate-300">
                    <Loader2 className="animate-spin" size={18} /> Cargando materiales...
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {materials.map((material) => {
                      const selected = selectedMaterial?.code === material.code;
                      return (
                        <button
                          key={material.id}
                          type="button"
                          onClick={() => setSelectedMaterial(material)}
                          className={
                            selected
                              ? "rounded-2xl border-2 border-emerald-400 bg-emerald-950 p-4 text-left"
                              : "rounded-2xl border border-slate-700 bg-slate-800 p-4 text-left hover:border-emerald-500"
                          }
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-bold">{material.name}</div>
                              <div className="mt-1 text-xs text-slate-400">
                                {material.description ?? "Material reciclable"}
                              </div>
                            </div>
                            <CircleDollarSign
                              className={selected ? "text-emerald-400" : "text-slate-500"}
                              size={20}
                            />
                          </div>
                          <div className="mt-3 text-sm font-black text-emerald-400">
                            +{material.points} puntos
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={registerRecycling}
                  disabled={!selectedMaterial || busy || !stationOnline}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Registrando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} /> Registrar reciclaje
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetStation}
                  disabled={busy}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  <RotateCcw size={18} /> Cambiar estudiante
                </button>
              </div>
            ) : (
              <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                <div className="rounded-full bg-emerald-500/10 p-5 text-emerald-400">
                  <Camera size={44} />
                </div>
                <h2 className="mt-6 text-2xl font-black">
                  Esperando identificación
                </h2>
                <p className="mt-3 max-w-sm text-slate-400">
                  Acerca el QR del estudiante a la cámara. Cuando sea válido,
                  EcoIA mostrará su identificación y permitirá registrar el material.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
