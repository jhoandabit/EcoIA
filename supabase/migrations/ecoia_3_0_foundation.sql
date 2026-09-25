-- EcoIA 3.0 Foundation
-- IE Ramón Martínez Benítez · Cartago, Valle del Cauca, Colombia
-- Supabase/PostgreSQL
-- Arquitectura: portátil/tablet como cerebro; ESP32 como controlador físico futuro.

create extension if not exists pgcrypto;

-- Este archivo documenta la migración aplicada en Supabase.
-- La migración ejecutada en el proyecto Supabase es la fuente operativa de verdad.

-- QR tokens are generated automatically for every new student.
alter table public.students alter column qr_token set default gen_random_uuid()::text;

-- Estaciones web:
-- El equipo principal de una estación es un portátil o tablet con cámara.
-- El ESP32 queda reservado como controlador físico futuro.
--
-- En la base actual, ECOIA-001 se configuró como:
-- device_model = 'TABLET/LAPTOP'
-- camera_model = 'Cámara integrada'
-- firmware_version = null
--
-- Heartbeat de estación:
-- La ruta /station llama a station_heartbeat('ECOIA-001') cada 30 segundos.
-- Una estación se considera conectada si last_seen_at tiene menos de 90 segundos.
-- La función actualiza únicamente presencia/estado operativo y no expone datos de estudiantes.


-- Catálogo de materiales y puntos:
-- PLASTIC = 30
-- CARDBOARD = 20
-- GLASS = 50
-- METAL = 40
-- NON_RECYCLABLE = 0
--
-- El registro operativo se realiza mediante public.register_recycling_event().
-- La función valida:
--   1. estudiante existente;
--   2. estación conectada en los últimos 90 segundos;
--   3. estación fuera de mantenimiento;
--   4. material activo;
--   5. confidence entre 0 y 1 cuando se proporciona.
-- Después inserta recycling_events y points_ledger dentro de la misma operación.
--
-- La selección actual de material en la estación es manual/asistida.
-- La siguiente fase sustituirá o complementará esta selección con clasificación IA.
