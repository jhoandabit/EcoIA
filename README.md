# 🌱 EcoIA 3.0

Plataforma educativa de reciclaje inteligente para la **Institución Educativa Ramón Martínez Benítez, Cartago, Valle del Cauca, Colombia**.

## Arquitectura base

EcoIA 3.0 se construye por capas:

- **Portátil o tablet:** cerebro inicial de la estación.
- **Cámara:** lectura de QR del estudiante y captura del residuo.
- **IA:** clasificación del residuo inicialmente en el portátil/tablet.
- **Supabase:** autenticación, base de datos, reglas y servicios backend.
- **ESP32:** controlador físico futuro para servos y sensores.
- **Vercel:** despliegue de la aplicación web.
- **GitHub:** código fuente y control de versiones.

## Flujo objetivo del MVP

```
Estudiante
   ↓
QR personal
   ↓
Cámara del portátil/tablet
   ↓
Identificación en Supabase
   ↓
Residuo frente a la cámara
   ↓
IA
   ↓
Material + confianza
   ↓
Registro de reciclaje
   ↓
Puntos
   ↓
Dashboard / gamificación
```

## Fases de construcción

1. Fundación GitHub + Supabase.
2. Usuarios, estudiantes, estaciones y materiales.
3. QR e identificación mediante cámara.
4. Registro de reciclajes y puntos.
5. Dashboard.
6. IA de clasificación en portátil/tablet.
7. ESP32 como controlador físico.
8. Sensores, servos y estación física.
9. Modo offline.
10. Pruebas, despliegue y uso pedagógico.

## Principio de seguridad

Las tablas expuestas por la API de Supabase usan RLS. Las operaciones administrativas requieren el rol `admin`. La resolución del QR expone únicamente los datos mínimos necesarios para identificar al estudiante.

## Estado actual

La **Foundation de EcoIA 3.0** está creada en el proyecto Supabase y versionada en GitHub. El siguiente módulo de construcción es **QR + identificación del estudiante**.

## Desarrollo educativo

EcoIA está pensado como proyecto STEAM para estudiantes de grados 9.º a 11.º, con participación en desarrollo web, bases de datos, IA, electrónica, análisis de datos, diseño y sostenibilidad.
