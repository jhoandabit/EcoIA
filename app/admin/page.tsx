"use client";

import { useEffect, useState } from "react";
import { Download, LogOut, QrCode, Settings, ShieldCheck, UserRound, Wifi, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "../../lib/supabase/client";

type Student = {
  id: string;
  full_name: string;
  grade: string | null;
  institution: string | null;
  qr_token: string;
};

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", data.user.id)
        .single();

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

  async function openQrGenerator() {
    setQrOpen(true);
    setQrError("");

    if (students.length) return;

    setQrLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, grade, institution, qr_token")
      .order("full_name");

    if (error) {
      setQrError(`No fue posible cargar los estudiantes: ${error.message}`);
      setQrLoading(false);
      return;
    }

    const loadedStudents = (data ?? []) as Student[];
    setStudents(loadedStudents);

    if (loadedStudents.length) {
      setSelectedStudentId(loadedStudents[0].id);
    }

    setQrLoading(false);
  }

  function closeQrGenerator() {
    setQrOpen(false);
    setQrError("");
  }

  const selectedStudent = students.find((student) => student.id === selectedStudentId);

  function downloadSelectedQr() {
    if (!selectedStudent) return;

    const svg = document.getElementById("ecoia-config-qr");

    if (!(svg instanceof SVGElement)) {
      setQrError("No fue posible preparar el QR para descargar.");
      return;
    }

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob(
      [`<?xml version="1.0" encoding="UTF-8"?>${source}`],
      { type: "image/svg+xml;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `EcoIA_QR_${selectedStudent.full_name.replace(/[^a-z0-9]+/gi, "_")}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function logout() {
    await createClient().auth.signOut();
    window.location.href = "/";
  }

  if (allowed !== true) {
    return (
      <main className="flex min-h-screen items-center justify-center">
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
              EcoIA 3.0
            </p>
            <h1 className="text-2xl font-black">Configuración</h1>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
          >
            <LogOut size={17} /> Salir
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 rounded-3xl bg-slate-950 p-8 text-white">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-emerald-400" />
            <div>
              <h2 className="text-2xl font-bold">Administración privada</h2>
              <p className="text-slate-400">{email}</p>
            </div>
          </div>
        </div>

        <div className="mb-5 grid gap-5 md:grid-cols-2">
          <a
            href="/admin/stations"
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <Wifi className="text-emerald-600" />
            <h3 className="mt-4 font-bold">Estaciones</h3>
            <p className="mt-2 text-sm text-slate-500">
              Configurar ECOIA-001, ECOIA-002 y futuras estaciones.
            </p>
            <span className="mt-4 inline-block text-sm font-bold text-emerald-700">
              Administrar estaciones →
            </span>
          </a>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <UserRound className="text-emerald-600" />
            <h3 className="mt-4 font-bold">Estudiantes</h3>
            <p className="mt-2 text-sm text-slate-500">
              Administrar estudiantes y generar sus códigos QR de identificación para las estaciones EcoIA.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="/admin/students"
                className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Administrar estudiantes →
              </a>
              <button
                type="button"
                onClick={openQrGenerator}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                <QrCode size={17} />
                Generador de QR
              </button>
            </div>

            {qrOpen && (
              <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                      Identificación EcoIA
                    </p>
                    <h4 className="mt-1 text-lg font-black">Generador de QR</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Selecciona un estudiante para mostrar y descargar su código.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeQrGenerator}
                    className="rounded-lg p-2 hover:bg-white"
                    aria-label="Cerrar generador de QR"
                  >
                    <X size={18} />
                  </button>
                </div>

                {qrLoading ? (
                  <div className="py-8 text-center text-sm text-slate-500">
                    Cargando estudiantes...
                  </div>
                ) : qrError ? (
                  <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    {qrError}
                  </div>
                ) : !students.length ? (
                  <div className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-600">
                    No hay estudiantes registrados. Registra primero un estudiante.
                  </div>
                ) : (
                  <div className="mt-5 grid gap-5 md:grid-cols-[1fr_auto]">
                    <div>
                      <label className="text-sm font-bold text-slate-700">
                        Estudiante
                        <select
                          value={selectedStudentId}
                          onChange={(event) => setSelectedStudentId(event.target.value)}
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600"
                        >
                          {students.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.full_name}
                              {student.grade ? ` · ${student.grade}` : ""}
                            </option>
                          ))}
                        </select>
                      </label>

                      {selectedStudent && (
                        <div className="mt-4 rounded-xl bg-white p-4 text-sm">
                          <p className="font-bold">{selectedStudent.full_name}</p>
                          <p className="mt-1 text-slate-500">
                            Grado: {selectedStudent.grade ?? "—"}
                          </p>
                          <p className="text-slate-500">
                            Institución: {selectedStudent.institution ?? "—"}
                          </p>
                          <p className="mt-3 break-all font-mono text-xs text-slate-400">
                            {selectedStudent.qr_token}
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedStudent && (
                      <div className="flex flex-col items-center">
                        <div className="rounded-2xl border bg-white p-3 shadow-sm">
                          <QRCodeSVG
                            id="ecoia-config-qr"
                            value={selectedStudent.qr_token}
                            size={190}
                            level="M"
                            includeMargin
                          />
                        </div>
                        <button
                          type="button"
                          onClick={downloadSelectedQr}
                          className="mt-3 flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                        >
                          <Download size={16} />
                          Descargar QR
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <Settings className="text-emerald-600" />
            <h3 className="mt-4 font-bold">Sistema</h3>
            <p className="mt-2 text-sm text-slate-500">
              Parámetros, puntos, clasificación y configuración general.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <ShieldCheck className="text-emerald-600" />
            <h3 className="mt-4 font-bold">Seguridad</h3>
            <p className="mt-2 text-sm text-slate-500">
              El dashboard público permanece separado de las operaciones administrativas.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
