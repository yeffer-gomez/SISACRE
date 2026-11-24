# SISACRE
## Sistema de Acreditación — Programa de Psicología, Universidad de Nariño

SISACRE es una plataforma web para centralizar, organizar y gestionar documentos y evidencias de los procesos de autoevaluación y acreditación del programa de Psicología.

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 17 (Standalone Components, Signals) |
| Backend | Node.js 20 + Express 4 |
| Base de datos | PostgreSQL 15 |
| ORM / Queries | pg (node-postgres) |
| Contenedores | Docker + Docker Compose |
| Autenticación | JWT (jsonwebtoken + bcryptjs) |
| Archivos | Multer (local storage, hasta 50 MB) |

---

## 📦 Requisitos previos

- Docker Desktop ≥ 4.x
- Docker Compose ≥ 2.x

_(No se necesita Node.js ni Angular CLI instalados localmente)_

---

## 🚀 Arranque rápido

```bash
# 1. Clonar / descomprimir el proyecto
cd sisacre

# 2. Levantar todos los servicios
docker compose up --build

# 3. Esperar ~60 segundos mientras se construyen las imágenes
#    y la base de datos se inicializa con el esquema y datos semilla

# 4. Abrir en el navegador
http://localhost:4200
```

### Credenciales por defecto

| Campo | Valor |
|-------|-------|
| Correo | `admin@udenar.edu.co` |
| Contraseña | `Admin@2024` |

---

## 🌐 Puertos expuestos

| Servicio | Puerto |
|----------|--------|
| Frontend (Angular vía Nginx) | `4200` |
| Backend API (Express) | `3000` |
| PostgreSQL | `5432` |

---

## 📁 Estructura del proyecto

```
sisacre/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── uploads/               ← archivos subidos (volumen persistente)
│   └── src/
│       ├── server.js
│       ├── config/
│       │   ├── database.js
│       │   └── init.sql       ← esquema + datos semilla
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── documentos.controller.js
│       │   ├── factores.controller.js
│       │   └── usuarios.controller.js
│       ├── middleware/
│       │   ├── auth.js        ← JWT authenticate + authorize
│       │   └── upload.js      ← Multer config
│       └── routes/
│           └── index.js
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── angular.json
    ├── package.json
    └── src/
        ├── main.ts
        ├── styles.scss
        ├── index.html
        ├── environments/
        └── app/
            ├── app.config.ts
            ├── app.routes.ts
            ├── app.component.ts
            ├── core/
            │   ├── guards/
            │   │   ├── auth.guard.ts
            │   │   └── role.guard.ts
            │   ├── interceptors/
            │   │   └── auth.interceptor.ts
            │   └── services/
            │       ├── auth.service.ts
            │       ├── documento.service.ts
            │       └── factor.service.ts
            ├── modules/
            │   ├── auth/login/
            │   ├── dashboard/
            │   ├── documents/
            │   │   ├── document-list/
            │   │   ├── document-form/
            │   │   └── document-detail/
            │   ├── factors/factor-list/
            │   └── users/user-list/
            └── shared/
                └── layout/
```

---

## 🔌 API REST — Endpoints principales

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Inicio de sesión |
| POST | `/api/auth/register` | Registrar usuario (admin) |
| GET | `/api/auth/me` | Perfil del usuario actual |

### Factores
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/factores` | Listar factores |
| POST | `/api/factores` | Crear factor |
| PUT | `/api/factores/:id` | Actualizar factor |
| GET | `/api/factores/:id/caracteristicas` | Listar características |
| POST | `/api/factores/:id/caracteristicas` | Crear característica |

### Documentos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/documentos` | Listar con filtros y paginación |
| POST | `/api/documentos` | Crear documento + subir archivo |
| GET | `/api/documentos/:id` | Detalle + versiones |
| PUT | `/api/documentos/:id` | Actualizar metadatos |
| DELETE | `/api/documentos/:id` | Eliminación lógica |
| POST | `/api/documentos/:id/versiones` | Subir nueva versión |
| GET | `/api/documentos/:id/descargar` | Descargar archivo actual |
| GET | `/api/documentos/:id/visualizar` | Visualizar inline |
| GET | `/api/documentos/estadisticas` | Estadísticas por factor/año/tipo |

### Usuarios
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/usuarios` | Listar usuarios (admin) |
| PUT | `/api/usuarios/:id/roles` | Asignar roles |
| PUT | `/api/usuarios/:id/estado` | Activar/desactivar |
| GET | `/api/roles` | Listar roles disponibles |

### Docentes (Factor 3)
Rutas bajo `/api/docentes`. `administrador` y `coordinador` gestionan;
`evaluador` consulta; `docente` solo ve la ficha vinculada a su cuenta
(`docentes.usuario_id`).

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/api/docentes/opciones` | todos | Catálogos y esquemas de los 6 dominios |
| GET | `/api/docentes/esquemas` | todos | Definición de campos de cada dominio |
| GET | `/api/docentes/estadisticas` | admin, coord, eval | Agregados, con filtros `anio`, `periodo`, `tipo_vinculacion`, `area_enfoque` |
| POST | `/api/docentes/indicadores/sincronizar` | admin, coord | Reutiliza la tabla `indicadores` existente |
| GET | `/api/docentes` | todos | Listado; el rol `docente` solo ve su ficha |
| POST | `/api/docentes` | admin, coord | Crear docente; admite `vinculacion` inicial |
| GET | `/api/docentes/:id` | por ficha | Detalle con vinculación/escalafón vigentes y conteos |
| PUT | `/api/docentes/:id` | admin, coord | Actualización parcial: solo escribe los campos enviados |
| DELETE | `/api/docentes/:id` | admin, coord | Eliminación lógica |
| GET | `/api/docentes/:id/historico` | por ficha | Línea de tiempo de las 6 tablas; incluye `activo = FALSE` |
| GET | `/api/docentes/:id/documentos` | por ficha | Evidencias, por `documentos.docente_id` y por dominio |
| POST | `/api/docentes/:id/documentos` | admin, coord, docente* | Subir evidencia (`multipart`, campo `archivo`) |
| GET | `/api/docentes/:id/:dominio` | por ficha | Registros de un dominio |
| POST | `/api/docentes/:id/:dominio` | admin, coord | Crear registro |
| PUT | `/api/docentes/:id/:dominio/:registroId` | admin, coord | Actualizar registro |
| DELETE | `/api/docentes/:id/:dominio/:registroId` | admin, coord | Borrado lógico |

\* El rol `docente` solo puede subir a su propia ficha; el backend lo
comprueba contra `docentes.usuario_id`.

Dominios válidos: `vinculaciones`, `formaciones`, `escalafones`,
`evaluaciones`, `mejoramientos`, `redes`.

### Egresados (Factor 4)
Rutas bajo `/api/egresados`. `administrador` y `coordinador` gestionan; los
demás roles consultan. Modela la ficha del egresado con pestañas, más dos
catálogos globales que no dependen de un egresado concreto.

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/api/egresados/opciones` | todos | Catálogos (`SI_NO`, `ESTADOS_VINCULACION`, `SERVICIOS_BIENESTAR`, `ANIOS`, `TITULACIONES`) |
| GET | `/api/egresados/esquemas` | todos | Definición de campos de los 7 conjuntos (5 dominios + 2 catálogos) |
| GET | `/api/egresados/estadisticas` | todos | Indicadores agregados; filtros `anio`, `titulacion` |
| GET | `/api/egresados` | todos | Listado paginado; filtros `busqueda`, `anio`, `page`, `limit` |
| POST | `/api/egresados` | admin, coord | Crear egresado (nombre y cédula obligatorios) |
| GET | `/api/egresados/:id` | por ficha | Detalle con conteos por dominio |
| PUT | `/api/egresados/:id` | admin, coord | Actualización parcial: solo escribe los campos enviados |
| DELETE | `/api/egresados/:id` | admin, coord | Eliminación lógica |
| GET | `/api/egresados/:id/:dominio` | todos | Registros de un dominio del egresado |
| POST | `/api/egresados/:id/:dominio` | admin, coord | Crear registro del egresado |
| PUT | `/api/egresados/:id/:dominio/:registroId` | admin, coord | Actualizar registro |
| DELETE | `/api/egresados/:id/:dominio/:registroId` | admin, coord | Borrado lógico |
| GET | `/api/egresados/catalogo/:dominio` | todos | Catálogo global |
| POST | `/api/egresados/catalogo/:dominio` | admin, coord | Crear registro de catálogo |
| PUT | `/api/egresados/catalogo/:dominio/:registroId` | admin, coord | Actualizar registro de catálogo |
| DELETE | `/api/egresados/catalogo/:dominio/:registroId` | admin, coord | Borrado lógico de catálogo |

Dominios por egresado: `grupos`, `posgrados`, `bienestar`,
`seguimiento-grado`, `reconocimientos`. Catálogos globales: `politicas`,
`formacion-continua`.

> La cédula es única entre egresados activos (índice parcial
> `uq_egresados_cedula_activo`), por lo que no puede repetirse mientras la
> ficha siga vigente.

### Datos de demostración

`backend/src/config/seed-docentes-demo.sql` crea **10 docentes ficticios**
(`numero_docente` 9001–9010) con registros en los seis dominios, y 4 redes
académicas de las que depende el dominio de Redes. El script es idempotente:
se puede volver a aplicar sin duplicar nada.

```bash
docker cp backend/src/config/seed-docentes-demo.sql sisacre_db:/tmp/seed.sql
docker exec sisacre_db psql -v ON_ERROR_STOP=1 -U sisacre_user -d sisacre_db -f /tmp/seed.sql
```

Para retirarlos:

```sql
DELETE FROM docentes WHERE numero_docente BETWEEN '9001' AND '9010';
DELETE FROM redes_academicas WHERE nombre LIKE 'Red %' OR nombre LIKE 'Asociación %';
```

El rango 9001–9010 es el único marcador de estos datos: el script nunca toca
el resto de la base. No se crean usuarios para estos docentes
(`usuario_id` queda `NULL`), así que no aparecen como fichas de ningún rol.

> Tras sembrar conviene llamar `POST /api/docentes/indicadores/sincronizar`
> para que el tablero refleje los nuevos conteos.

`backend/src/config/seed-egresados-demo.sql` crea **10 egresados
ficticios** de Psicología (cédulas 91000001–91000010) con registros en sus
cinco pestañas y los dos catálogos globales del Factor 4 (3 políticas y 10
filas de formación continua). Igualmente idempotente:

```bash
docker cp backend/src/config/seed-egresados-demo.sql sisacre_db:/tmp/seed-egresados.sql
docker exec -e PGCLIENTENCODING=UTF8 sisacre_db psql -v ON_ERROR_STOP=1 -U sisacre_user -d sisacre_db -f /tmp/seed-egresados.sql
```

Para retirarlos:

```sql
DELETE FROM egresados WHERE cedula BETWEEN '91000001' AND '91000010';
DELETE FROM formacion_continua
 WHERE participante_identificacion BETWEEN '91000001' AND '91000010';
DELETE FROM politicas_egresados
 WHERE nombre IN ('Política de Vinculación de Egresados al Programa',
                  'Política de Seguimiento a Egresados',
                  'Política de Formación Continua para Egresados');
```

---

## 👥 Roles del sistema

| Rol | Descripción |
|-----|-------------|
| `administrador` | Acceso total. Gestiona usuarios, factores y documentos |
| `coordinador` | Gestiona factores, características y documentos |
| `evaluador` | Consulta y descarga documentos |
| `docente` | Carga documentos de su responsabilidad |

---

## 📋 Requisitos funcionales implementados

| RF | Descripción | Estado |
|----|-------------|--------|
| RF-01 | Registro de usuarios | ✅ |
| RF-02 | Inicio de sesión con correo y contraseña | ✅ |
| RF-03 | Asignación de roles | ✅ |
| RF-04 | Control de permisos por rol | ✅ |
| RF-05 | Administrar factores de acreditación | ✅ |
| RF-06 | Cargar documentos y evidencias | ✅ |
| RF-07 | Soporte múltiples formatos (PDF, Word, Excel, imágenes, ZIP) | ✅ |
| RF-08 | Clasificar por factor, característica, año, semestre, tipo | ✅ |
| RF-09 | Búsqueda con filtros combinados | ✅ |
| RF-10 | Visualización inline de PDF e imágenes | ✅ |
| RF-11 | Descarga de documentos | ✅ |
| RF-19 | Estadísticas por factor, año y tipo | ✅ |
| RF-20 | Gráficas y estadísticas en dashboard | ✅ |
| RF-24 | Versionamiento de documentos | ✅ |

---

## 🔧 Comandos útiles

```bash
# Ver logs del backend
docker compose logs -f backend

# Reiniciar solo el backend (al modificar código)
docker compose restart backend

# Acceder a PostgreSQL
docker exec -it sisacre_db psql -U sisacre_user -d sisacre_db

# Detener todo y eliminar volúmenes (reset completo)
docker compose down -v
```

---

## 🗄️ Esquema de base de datos

Las tablas principales son:

- **usuarios** — Cuenta de acceso al sistema
- **roles** — administrador, coordinador, evaluador, docente
- **usuario_roles** — Relación N:M usuarios-roles
- **factores** — 12 factores CNA con código y descripción
- **caracteristicas** — Características por factor
- **tipos_evidencia** — Clasificación de evidencias (Acta, Informe, Resolución...)
- **documentos** — Registro principal de cada documento
- **versiones_documento** — Historial de versiones con archivo físico
- **indicadores** — Indicadores numéricos por factor y año

---

## 📝 Notas de desarrollo

- Los archivos físicos se almacenan en `backend/uploads/` con UUID como nombre
- El nombre original del archivo se preserva en `versiones_documento.nombre_original`
- La eliminación de documentos es **lógica** (campo `activo = FALSE`)
- El token JWT expira en **8 horas**
- La API valida el token en cada petición protegida via middleware `authenticate`
- Los permisos de escritura se verifican en backend con `authorize(...roles)`

### Rate limiting

El límite es **por IP** y hay dos presupuestos distintos:

| Ámbito | Por defecto | Variable de entorno |
|--------|-------------|----------------------|
| API (`/api`) | 5000 por 15 min | `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` |
| Login (`/api/auth/login`) | 20 por 15 min | `LOGIN_RATE_LIMIT_MAX`, `LOGIN_RATE_LIMIT_WINDOW_MS` |

El general es amplio a propósito: cargar la aplicación dispara varias
peticiones a la vez (factores, documentos, proyectos, docentes…) y navegar
entre módulos las suma muy rápido, así que un tope corto devolvía `429` en
pantalla casi de inmediato. El del login es estricto y **solo cuenta los
intentos fallidos** (`skipSuccessfulRequests`), de modo que un usuario que
entra bien no gasta cupo y un ataque de fuerza bruta se agota rápido.

El contador vive en memoria, así que reiniciar el backend lo pone a cero.
Si se publica la aplicación detrás de un proxy inverso, hay que definir
`TRUST_PROXY=true` para que `req.ip` sea la IP real del cliente y no la del
proxy.
