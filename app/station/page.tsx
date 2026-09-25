"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, RotateCcw, ShieldCheck, UserRound, Wifi, XCircle } from "lucide-react";
import { createClient } from "../../lib/supabase/client";

const STATION_CODE = "ECOIA-001";
const HEARTBEAT_INTERVAL_MS = 30_000;

type Student = {
  id: string;
  full_name: string;
  grade: string | null;
  institution: string | null;
};

export default function StationPage() {
  const scannerRef = useRef<any>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [status, setStatus] = useState("Preparando cámara...");
  const [error, setError] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [stationOnline, setStationOnline] = useState(false);

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

  async function resolveQr(token: string) {
    const clean = token.trim();
    if (!clean || busy) return;

    setBusy(true);
    setError("");
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
      setStatus("Estudiante identificado correctamente.");
      await stopScanner();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible validar el QR.");
      setStatus("No fue posible validar el QR.");
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
    setManualToken("");
    setError("");
    setBusy(false);
    await sendHeartbeat();
    await startScanner();
  }

  useEffect(() => {
    void sendHeartbeat();
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
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
              EcoIA 3.0 · Estación {STATION_CODE}
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">Identificación del estudiante</h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Esta estación utiliza un portátil o tablet como cerebro y la cámara integrada para leer los QR.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold">
              <span className={stationOnline ? "h-2.5 w-2.5 rounded-full bg-emerald-400" : "h-2.5 w-2.5 rounded-full bg-slate-500"} />
              {stationOnline ? "Estación en línea" : "Conexión de estación no confirmada"}
            </div>
          </div>
          <Camera className="hidden text-emerald-400 md:block" size={42} />
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
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
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Prueba manual</p>
              <div className="flex gap-2">
                <input
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Pega aquí el token QR"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
                />
                <button onClick={() => resolveQr(manualToken)} disabled={busy} className="rounded-xl bg-slate-950 px-4 py-3 font-bold text-white disabled:opacity-50">
                  Probar
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            {student ? (
              <>
                <div className="flex items-center gap-3 text-emerald-400">
                  <CheckCircle2 size={24} />
                  <span className="font-bold">Estudiante identificado</span>
                </div>
                <div className="mt-8 rounded-2xl bg-slate-950 p-6">
                  <UserRound className="text-emerald-400" size={30} />
                  <h2 className="mt-5 text-3xl font-black">{student.full_name}</h2>
                  <p className="mt-2 text-slate-400">Grado: {student.grade ?? "No registrado"}</p>
                  <p className="text-slate-400">{student.institution ?? "IE Ramón Martínez Benítez"}</p>
                </div>
                <div className="mt-5 rounded-2xl border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-200">
                  Primer circuito funcional: <strong>QR → estudiante → Supabase</strong>.
                </div>
                <button onClick={resetStation} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-400">
                  <RotateCcw size={18} /> Escanear otro estudiante
                </button>
              </>
            ) : (
              <div className="flex min-h-[480px] flex-col items-center justify-center text-center">
                <div className="rounded-full bg-emerald-500/10 p-5 text-emerald-400">
                  <Camera size={44} />
                </div>
                <h2 className="mt-6 text-2xl font-black">Esperando identificación</h2>
                <p className="mt-3 max-w-sm text-slate-400">Acerca el QR del estudiante a la cámara. Cuando sea válido, EcoIA mostrará su identificación.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
