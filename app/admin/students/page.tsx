"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  Edit3,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "../../../lib/supabase/client";

type Student = {
  id: string;
  full_name: string;
  grade: string | null;
  institution: string | null;
  created_at: string;
  qr_token: string;
};

type FormState = {
  full_name: string;
  grade: string;
  institution: string;
};

const emptyForm: FormState = {
  full_name: "",
  grade: "",
  institution: "",
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<Student | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [qrStudent, setQrStudent] = useState<Student | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function loadStudents() {
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
      .from("students")
      .select("id, full_name, grade, institution, created_at, qr_token")
      .order("full_name");

    if (queryError) setError(queryError.message);
    else setStudents((data ?? []) as Student[]);
    setLoading(false);
  }

  useEffect(() => {
    loadStudents();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.full_name, s.grade, s.institution].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      ),
    );
  }, [students, search]);

  function newStudent() {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowForm(true);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editStudent(student: Student) {
    setEditing(student);
    setForm({
      full_name: student.full_name,
      grade: student.grade ?? "",
      institution: student.institution ?? "",
    });
    setShowForm(true);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm({ ...emptyForm });
  }

  async function saveStudent() {
    if (!form.full_name.trim()) {
      setError("El nombre completo es obligatorio.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    const payload = {
      full_name: form.full_name.trim(),
      grade: form.grade.trim() || null,
      institution: form.institution.trim() || null,
    };

    const result = editing
      ? await supabase.from("students").update(payload).eq("id", editing.id)
      : await supabase.from("students").insert(payload);

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setMessage(
      editing
        ? "Estudiante actualizado correctamente."
        : "Estudiante registrado correctamente.",
    );
    setSaving(false);
    closeForm();
    await loadStudents();
  }

  async function deleteStudent(student: Student) {
    if (!window.confirm(`¿Eliminar a ${student.full_name}? Esta acción no elimina sus eventos históricos.`)) return;

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("students")
      .delete()
      .eq("id", student.id);

    if (deleteError) setError(deleteError.message);
    else {
      setMessage("Estudiante eliminado correctamente.");
      await loadStudents();
    }
  }

  function downloadTemplate() {
    const rows = [
      ["Nombre completo", "Grado", "Institución"],
      ["Juan Pérez", "6-1", "Institución Educativa"],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Estudiantes");
    XLSX.writeFile(workbook, "plantilla_estudiantes_EcoIA_2_0.xlsx");
  }

  async function importExcel(file: File) {
    setImporting(true);
    setError("");
    setMessage("");

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setError("El archivo Excel no contiene hojas.");
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: "",
      });

      if (!rows.length) {
        setError("El archivo Excel no contiene registros.");
        return;
      }

      const firstRow = rows[0];
      const headers = Object.keys(firstRow);
      const nameHeader = headers.find((h) => normalizeHeader(h).includes("nombre"));
      const gradeHeader = headers.find((h) => normalizeHeader(h).includes("grado"));
      const institutionHeader = headers.find((h) => normalizeHeader(h).includes("instit"));

      if (!nameHeader) {
        setError("La columna 'Nombre completo' es obligatoria.");
        return;
      }

      const records = rows
        .map((row) => ({
          full_name: String(row[nameHeader] ?? "").trim(),
          grade: gradeHeader ? String(row[gradeHeader] ?? "").trim() || null : null,
          institution: institutionHeader
            ? String(row[institutionHeader] ?? "").trim() || null
            : null,
        }))
        .filter((row) => row.full_name);

      if (!records.length) {
        setError("No se encontraron estudiantes válidos.");
        return;
      }

      const supabase = createClient();
      const { error: importError } = await supabase
        .from("students")
        .insert(records);

      if (importError) {
        setError(importError.message);
        return;
      }

      setMessage(`Se cargaron ${records.length} estudiantes correctamente.`);
      await loadStudents();
    } catch (importError) {
      setError(
        importError instanceof Error
          ? `No fue posible leer el archivo Excel: ${importError.message}`
          : "No fue posible leer el archivo Excel.",
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (!allowed && loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
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
            <h1 className="text-2xl font-black">Estudiantes</h1>
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
          <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        <div className="mb-6 flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Registro de estudiantes</h2>
            <p className="text-sm text-slate-500">
              Registro individual o carga masiva mediante Excel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold"
            >
              <Download size={17} /> Plantilla Excel
            </button>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold">
              <Upload size={17} /> {importing ? "Cargando..." : "Carga masiva Excel"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={importing}
                onChange={(e) =>
                  e.target.files?.[0] && importExcel(e.target.files[0])
                }
              />
            </label>
            <button
              onClick={newStudent}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
            >
              <Plus size={17} /> Nuevo estudiante
            </button>
          </div>
        </div>

        {showForm && (
          <div className="mb-7 rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  {editing ? "Editar estudiante" : "Nuevo estudiante"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Complete los datos del estudiante.
                </p>
              </div>
              <button
                onClick={closeForm}
                aria-label="Cerrar formulario"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {(
                [
                  ["full_name", "Nombre completo", "Nombre y apellidos"],
                  ["grade", "Grado", "Ej. 6-1"],
                  ["institution", "Institución", "Institución educativa"],
                ] as const
              ).map(([key, label, placeholder]) => (
                <label key={key} className="text-sm font-semibold">
                  {label}
                  <input
                    autoFocus={key === "full_name"}
                    value={form[key]}
                    placeholder={placeholder}
                    onChange={(e) =>
                      setForm((v) => ({ ...v, [key]: e.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-600"
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeForm}
                className="rounded-xl border px-5 py-3 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={saveStudent}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-60"
              >
                <Save size={17} /> {saving ? "Guardando..." : "Guardar estudiante"}
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center gap-3">
          <FileSpreadsheet className="text-emerald-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar estudiante..."
            className="w-full max-w-md rounded-xl border bg-white px-4 py-3 outline-none focus:border-emerald-600"
          />
          <button
            onClick={loadStudents}
            className="rounded-xl border bg-white p-3"
            aria-label="Actualizar estudiantes"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Nombre</th>
                  <th className="px-5 py-4">Grado</th>
                  <th className="px-5 py-4">Institución</th>
                  <th className="px-5 py-4">QR</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-bold">{student.full_name}</td>
                    <td className="px-5 py-4">{student.grade ?? "—"}</td>
                    <td className="px-5 py-4">{student.institution ?? "—"}</td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setQrStudent(student)}
                        className="rounded-lg border px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                      >
                        Ver QR
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => editStudent(student)}
                          className="rounded-lg border p-2"
                          aria-label={`Editar ${student.full_name}`}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => deleteStudent(student)}
                          className="rounded-lg border p-2 text-red-600"
                          aria-label={`Eliminar ${student.full_name}`}
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
          {!filtered.length && (
            <div className="p-10 text-center text-slate-500">
              No hay estudiantes para mostrar.
            </div>
          )}
        </div>
      {qrStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl">
            <div className="flex justify-end">
              <button type="button" onClick={() => setQrStudent(null)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Cerrar QR">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Identificación EcoIA</p>
            <h3 className="mt-2 text-2xl font-black">{qrStudent.full_name}</h3>
            <p className="mt-1 text-sm text-slate-500">Grado {qrStudent.grade ?? "—"}</p>
            <div className="mx-auto mt-6 flex w-fit rounded-2xl border bg-white p-4">
              <QRCodeSVG value={qrStudent.qr_token} size={260} level="M" includeMargin />
            </div>
            <p className="mt-4 break-all font-mono text-xs text-slate-400">{qrStudent.qr_token}</p>
            <p className="mt-4 text-sm text-slate-500">Este código contiene únicamente el identificador QR del estudiante.</p>
            <button type="button" onClick={() => setQrStudent(null)} className="mt-6 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white">Cerrar</button>
          </div>
        </div>
      )}

      </section>
    </main>
  );
}
