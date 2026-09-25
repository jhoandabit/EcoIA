-- EcoIA 3.0 Foundation
-- IE Ramón Martínez Benítez · Cartago, Valle del Cauca, Colombia
-- Supabase/PostgreSQL
-- Arquitectura: portátil/tablet como cerebro; ESP32 como controlador físico futuro.

create extension if not exists pgcrypto;

-- Este archivo documenta la migración aplicada en Supabase.
-- La migración ejecutada en el proyecto Supabase es la fuente operativa de verdad.

-- QR tokens are generated automatically for every new student.
alter table public.students alter column qr_token set default gen_random_uuid()::text;
