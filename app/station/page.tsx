"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  CircleDollarSign,
  Leaf,
  Loader2,
  RotateCcw,
  ScanSearch,
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

type AiDetection = {
  className: string;
  score: number;
  materialCode: string | null;
  materialName: string | null;
};

type CocoModel = {
  detect: (
    video: HTMLVideoElement,
  ) => Promise<Array<{ class: string; score: number }>>;
};

const AI_CLASS_TO_MATERIAL: Record<
  string,
  { code: string; name: string }
> = {
  bottle: { code: "PLASTIC", name: "Plástico" },
  cup: { code: "PLASTIC", name: "Plástico" },
  "wine glass": { code: "GLASS", name: "Vidrio" },
};

function normalizeAiClass(value: string) {
  return value.trim().toLowerCase();
}

export default function StationPage() {
  const scannerRef = useRef<any>(null);
  const aiModelRef = useRef<CocoModel | null>(null);
  const aiStreamRef = useRef<MediaStream | null>(null);
  const aiVideoRef = useRef<HTMLVideoElement | null>(null);

  const [student, setStudent] = useState<Student | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [detection, setDetection] = useState<AiDetection | null>(null);
  const [status, setStatus] = useState("Preparando cámara...");
  const [error, setError] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [stationOnline, setStationOnline] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [aiCameraReady, setAiCameraReady] = useState(false);

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

  async function loadAiModel() {
    if (aiModelRef.current) {
      setAiReady(true);
      return true;
    }

    setLoadingAi(true);
    setError("");
    setStatus("Cargando modelo de inteligencia artificial...");

    try {
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();

      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });

      aiModelRef.current = model as CocoModel;
      setAiReady(true);
      return true;
    } catch (err) {
      setAiReady(false);
      setError(
        err instanceof Error
          ? `No se pudo cargar el modelo IA: ${err.message}`
          : "No se pudo cargar el modelo IA.",
      );
      setStatus("Modelo IA no disponible.");
      return false;
    } finally {
      setLoadingAi(false);
    }
  }

  async function waitForAiVideo() {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (aiVideoRef.current) return aiVideoRef.current;
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    }
    return null;
  }

  async function startAiCamera() {
    setError("");
    setAiCameraReady(false);
    setStatus("Preparando cámara para reconocer el residuo...");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia no está disponible en este navegador.");
      }

      const video = await waitForAiVideo();
      if (!video) {
        throw new Error("La interfaz de cámara IA todavía no está disponible. Vuelve a intentarlo.");
      }

      // El lector QR acaba de liberar su cámara. Esperamos un instante
      // para evitar que el navegador considere el dispositivo todavía ocupado.
      await new Promise((resolve) => window.setTimeout(resolve, 700));

      stopAiCamera();

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (firstError) {
        // Algunos portátiles no aceptan constraints de cámara orientadas a
        // dispositivos móviles. Reintentamos con la configuración mínima.
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        if (!stream) throw firstError;
      }

      aiStreamRef.current = stream;

      video.srcObject = stream;
      await new Promise<void>((resolve) => {
        if (video.readyState >= 2) {
          resolve();
          return;
        }
        const onLoaded = () => {
          video.removeEventListener("loadedmetadata", onLoaded);
          resolve();
        };
        video.addEventListener("loadedmetadata", onLoaded);
      });
      await video.play();

      setAiCameraReady(true);
      setStatus("Coloca el residuo frente a la cámara y pulsa Analizar residuo.");
    } catch (err) {
      const cameraError = err as DOMException;
      let message = "No se pudo iniciar la cámara para IA.";

      if (cameraError?.name === "NotAllowedError" || cameraError?.name === "PermissionDeniedError") {
        message = "El navegador bloqueó la cámara. En la barra de direcciones, permite la cámara para eco-ia-pi.vercel.app y vuelve a intentarlo.";
      } else if (cameraError?.name === "NotReadableError" || cameraError?.name === "TrackStartError") {
        message = "La cámara está siendo utilizada por otra aplicación o el lector QR aún no la ha liberado. Cierra otras aplicaciones que usen la cámara y vuelve a intentarlo.";
      } else if (cameraError?.name === "NotFoundError" || cameraError?.name === "DevicesNotFoundError") {
        message = "No se encontró una cámara disponible en este dispositivo.";
      } else if (cameraError?.name === "SecurityError") {
        message = "El navegador no permite acceso a la cámara en este contexto.";
      } else if (err instanceof Error) {
        message = `No se pudo iniciar la cámara para IA: ${err.message}`;
      }

      setError(message);
      setStatus("Cámara IA no disponible.");
    }
  }

  function stopAiCamera() {
    const stream = aiStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    aiStreamRef.current = null;

    const video = aiVideoRef.current;
    if (video) video.srcObject = null;

    setAiCameraReady(false);
  }

  async function analyzeWaste() {
    if (!student || !aiModelRef.current || !aiVideoRef.current || busy) return;

    if (aiVideoRef.current.readyState < 2) {
      setError("La cámara todavía no está lista.");
      return;
    }

    setBusy(true);
    setError("");
    setDetection(null);
    setSelectedMaterial(null);
    setStatus("La IA está analizando el objeto...");

    try {
      const predictions = await aiModelRef.current.detect(aiVideoRef.current);

      const best = [...predictions]
        .filter((prediction) => prediction.score >= 0.55)
        .sort((a, b) => b.score - a.score)[0];

      if (!best) {
        setStatus("No se detectó un objeto con suficiente confianza.");
        setError("Acerca el residuo a la cámara, mejora la iluminación y vuelve a analizar.");
        return;
      }

      const normalized = normalizeAiClass(best.class);
      const mapped = AI_CLASS_TO_MATERIAL[normalized] ?? null;

      const aiDetection: AiDetection = {
        className: best.class,
        score: best.score,
        materialCode: mapped?.code ?? null,
        materialName: mapped?.name ?? null,
      };

      setDetection(aiDetection);

      if (!mapped) {
        setStatus(`La IA detectó "${best.class}", pero todavía no tiene una categoría de reciclaje configurada.`);
        return;
      }

      const material = materials.find((item) => item.code === mapped.code);
      if (!material) {
        setStatus(`La IA detectó ${mapped.name}, pero ese material no está disponible en Supabase.`);
        return;
      }

      setSelectedMaterial(material);
      setStatus(
        `IA: ${best.class} · ${Math.round(best.score * 100)}% · ${material.name}`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "La IA no pudo analizar el objeto.",
      );
      setStatus("No fue posible analizar el residuo.");
    } finally {
      setBusy(false);
    }
  }

  async function resolveQr(token: string) {
    const clean = token.trim();
    if (!clean || busy) return;

    setBusy(true);
    setError("");
    setResult(null);
    setSelectedMaterial(null);
    setDetection(null);
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
      await stopScanner();

      const modelReady = await loadAiModel();
      if (modelReady) {
        await startAiCamera();
      }
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
        p_confidence: detection?.score ?? null,
        p_image_path: null,
      });

      if (rpcError) throw rpcError;

      const registered = Array.isArray(data) ? data[0] : data;
      if (!registered) throw new Error("Supabase no devolvió el evento registrado.");

      setResult(registered as RegistrationResult);
      stopAiCamera();
      setStatus("Reciclaje registrado correctamente.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No fue posible registrar el reciclaje.",
      );
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
    stopAiCamera();
    setStudent(null);
    setSelectedMaterial(null);
    setDetection(null);
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
    void startScanner();

    const heartbeatTimer = window.setInterval(() => {
      void sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(heartbeatTimer);
      void stopScanner();
      stopAiCamera();
    };
  }, []);

  const selectedMaterialIsAi = Boolean(detection?.materialCode === selectedMaterial?.code);

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
              EcoIA 3.0 · Estación {STATION_CODE}
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              Estación inteligente de reciclaje
            </h1>
            <p className="mt-2 max-w-3xl text-slate-400">
              QR para identificar al estudiante y un modelo de visión artificial
              para reconocer el objeto antes de asignar los puntos.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold">
              <span
                className={
                  stationOnline
                    ? "h-2.5 w-2.5 rounded-full bg-emerald-400"
                    : "h-2.5 w-2.5 rounded-full bg-slate-500"
                }
              />
              {stationOnline ? "Estación en línea" : "Conexión de estación no confirmada"}
            </div>
          </div>
          <Camera className="hidden text-emerald-400 md:block" size={42} />
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl bg-white p-5 text-slate-950 shadow-2xl">
            {!student ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold">1 · Identificar estudiante</h2>
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
              </>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold">2 · Reconocer residuo con IA</h2>
                    <p className="text-sm text-slate-500">
                      {loadingAi
                        ? "Descargando el modelo..."
                        : aiReady
                          ? status
                          : "Modelo IA no disponible"}
                    </p>
                  </div>
                  <ScanSearch className="text-emerald-600" />
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-slate-950">
                  <video
                    ref={aiVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="aspect-video w-full object-cover"
                  />
                  {!aiCameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
                      <div className="text-center text-slate-300">
                        {loadingAi ? (
                          <Loader2 className="mx-auto animate-spin" size={34} />
                        ) : (
                          <Camera className="mx-auto" size={34} />
                        )}
                        <p className="mt-3 text-sm">
                          {loadingAi ? "Cargando modelo IA..." : "Cámara no disponible"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mt-4 flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                    <XCircle className="shrink-0" size={18} />
                    <span>{error}</span>
                  </div>
                )}

                {detection && (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                          Resultado del modelo IA
                        </p>
                        <p className="mt-1 text-xl font-black text-slate-950">
                          {detection.className}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-emerald-700">
                          {Math.round(detection.score * 100)}%
                        </p>
                        <p className="text-xs text-slate-500">confianza</p>
                      </div>
                    </div>
                    {detection.materialName ? (
                      <p className="mt-3 text-sm text-emerald-800">
                        Categoría EcoIA: <strong>{detection.materialName}</strong>
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-amber-800">
                        Esta clase todavía no tiene una categoría de reciclaje configurada.
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={analyzeWaste}
                  disabled={!aiReady || !aiCameraReady || busy}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Analizando...
                    </>
                  ) : (
                    <>
                      <ScanSearch size={18} /> Analizar residuo con IA
                    </>
                  )}
                </button>
              </>
            )}
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
                  <p className="mt-4 text-sm text-slate-400">Objeto reconocido</p>
                  <p className="mt-1 text-xl font-bold">
                    {detection?.className ?? result.material_name}
                  </p>
                  {detection && (
                    <p className="mt-1 text-sm text-emerald-400">
                      IA: {Math.round(detection.score * 100)}% de confianza
                    </p>
                  )}
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

                <div className="mt-5 rounded-2xl bg-slate-950 p-5">
                  <UserRound className="text-emerald-400" size={28} />
                  <h2 className="mt-4 text-2xl font-black">{student.full_name}</h2>
                  <p className="mt-2 text-slate-400">
                    Grado: {student.grade ?? "No registrado"}
                  </p>
                  <p className="text-slate-400">
                    {student.institution ?? "IE Ramón Martínez Benítez"}
                  </p>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Clasificación automática
                  </p>
                  {selectedMaterialIsAi && detection ? (
                    <>
                      <p className="mt-2 text-lg font-black text-emerald-400">
                        {detection.materialName}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Detectado como <strong className="text-slate-200">{detection.className}</strong>{" "}
                        con {Math.round(detection.score * 100)}% de confianza.
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-300">
                      La clasificación aparecerá aquí después de analizar el residuo.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={registerRecycling}
                  disabled={!selectedMaterial || !detection?.materialCode || busy || !stationOnline}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Registrando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} /> Confirmar y registrar reciclaje
                    </>
                  )}
                </button>

                <p className="mt-3 text-center text-xs text-slate-500">
                  Los puntos se calculan en Supabase según la categoría detectada.
                </p>

                <button
                  type="button"
                  onClick={resetStation}
                  disabled={busy}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
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
                  Acerca el QR del estudiante a la cámara. Después, EcoIA usará
                  visión artificial para reconocer el residuo.
                </p>
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-900/50 bg-amber-950/30 p-4 text-sm text-amber-200">
          <strong>Fase IA actual:</strong> EcoIA usa un detector de objetos
          ejecutado directamente en el navegador. En esta primera versión se
          conectan clases como botella, vaso y copa a categorías de reciclaje.
          El siguiente entrenamiento será un modelo propio de EcoIA con imágenes
          reales de los residuos de la institución.
        </div>
      </div>
    </main>
  );
}
