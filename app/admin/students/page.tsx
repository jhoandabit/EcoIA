"use client";

import { useEffect, useMemo, useState } from "react";
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
import { createClient } from "../../../lib/supabase/client";

type Student = {
  id: string;
  full_name: string | null;
  grade: string | null;
  institution: string | null;
  created_at: string;
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

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<Student | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
      .from("profiles")
      .select("id, full_name, grade, institution, created_at")
      .eq("role", "student")
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
    setForm(emptyForm);
    setError("");
    setMessage("");
  }

  function editStudent(student: Student) {
    setEditing(student);
    setForm({
      full_name: student.full_name ?? "",
      grade: student.grade ?? "",
      institution: student.institution ?? "",
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setEditing(null);
    setForm(emptyForm);
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
      ? await supabase.from("profiles").update(payload).eq("id", editing.id)
      : await supabase.from("profiles").insert({ ...payload, role: "student" });

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setMessage(editing ? "Estudiante actualizado correctamente." : "Estudiante registrado correctamente.");
    setSaving(false);
    closeForm();
    await loadStudents();
  }

  async function deleteStudent(student: Student) {
    if (!window.confirm(`¿Eliminar a ${student.full_name ?? "este estudiante"}?`)) return;

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", student.id);

    if (deleteError) setError(deleteError.message);
    else {
      setMessage("Estudiante eliminado correctamente.");
      await loadStudents();
    }
  }

  function downloadTemplate() {
    const csv = "Nombre completo;Grado;Institución\nJuan Pérez;6-1;Institución Educativa\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_estudiantes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv(file: File) {
    setImporting(true);
    setError("");
    setMessage("");

    const text = await file.text();
    const rows = text.split(/\r?\n/).filter(Boolean);
    if (rows.length < 2) {
      setError("El archivo no contiene registros.");
      setImporting(false);
      return;
    }

    const separator = rows[0].includes(";") ? ";" : ",";
    const headers = rows[0].split(separator).map((h) => h.trim().toLowerCase());
    const nameIndex = headers.findIndex((h) => h.includes("nombre"));
    const gradeIndex = headers.findIndex((h) => h.includes("grado"));
    const institutionIndex = headers.findIndex((h) => h.includes("instit"));
    if (nameIndex < 0) {
      setError("La columna Nombre completo es obligatoria.");
      setImporting(false);
      return;
    }

    const records = rows.slice(1).map((row) => {
      const cells = row.split(separator).map((v) => v.trim());
      return {
        full_name: cells[nameIndex] ?? "",
        grade: gradeIndex >= 0 ? cells[gradeIndex] || null : null,
        institution: institutionIndex >= 0 ? cells[institutionIndex] || null : null,
        role: "student",
      };
    }).filter((r) => r.full_name);

    if (!records.length) {
      setError("No se encontraron estudiantes válidos.");
      setImporting(false);
      return;
    }

    const supabase = createClient();
    const { error: importError } = await supabase
      .from("profiles")
      .insert(records);

    if (importError) setError(importError.message);
    else setMessage(`Se cargaron ${records.length} estudiantes correctamente.`);

    setImporting(false);
    await loadStudents();
  }

  if (!allowed && loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50">Verificando acceso...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">EcoIA 2.0 · Administración</p>
            <h1 className="text-2xl font-black">Estudiantes</h1>
          </div>
          <a href="/admin" className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold">
            <ArrowLeft size={17} /> Volver
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {error && <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && <div className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

        <div className="mb-6 flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Registro de estudiantes</h2>
            <p className="text-sm text-slate-500">Registro individual o carga masiva.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadTemplate} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold">
              <Download size={17} /> Plantilla CSV
            </button>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold">
              <Upload size={17} /> {importing ? "Cargando..." : "Carga masiva"}
              <input type="file" accept=".csv,text/csv" className="hidden" disabled={importing} onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
            </label>
            <button onClick={newStudent} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
              <Plus size={17} /> Nuevo estudiante
            </button>
          </div>
        </div>

        {(editing || form.full_name) && (
          <div className="mb-7 rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex justify-between">
              <h3 className="text-lg font-bold">{editing ? "Editar estudiante" : "Nuevo estudiante"}</h3>
              <button onClick={closeForm}><X size={18} /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["full_name", "Nombre completo", "Nombre y apellidos"],
                ["grade", "Grado", "Ej. 6-1"],
                ["institution", "Institución", "Institución educativa"],
              ].map(([key, label, placeholder]) => (
                <label key={key} className="text-sm font-semibold">
                  {label}
                  <input value={form[key as keyof FormState]} placeholder={placeholder} onChange={(e) => setForm((v) => ({ ...v, [key]: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-600" />
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={closeForm} className="rounded-xl border px-5 py-3 font-semibold">Cancelar</button>
              <button onClick={saveStudent} disabled={saving} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-60">
                <Save size={17} /> {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center gap-3">
          <FileSpreadsheet className="text-emerald-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar estudiante..." className="w-full max-w-md rounded-xl border bg-white px-4 py-3 outline-none focus:border-emerald-600" />
          <button onClick={loadStudents} className="rounded-xl border bg-white p-3"><RefreshCw size={17} /></button>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr><th className="px-5 py-4">Nombre</th><th className="px-5 py-4">Grado</th><th className="px-5 py-4">Institución</th><th className="px-5 py-4 text-right">Acciones</th></tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-bold">{student.full_name ?? "Sin nombre"}</td>
                    <td className="px-5 py-4">{student.grade ?? "—"}</td>
                    <td className="px-5 py-4">{student.institution ?? "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => editStudent(student)} className="rounded-lg border p-2"><Edit3 size={16} /></button>
                        <button onClick={() => deleteStudent(student)} className="rounded-lg border p-2 text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && <div className="p-10 text-center text-slate-500">No hay estudiantes para mostrar.</div>}
        </div>
      </section>
    </main>
  );
}
