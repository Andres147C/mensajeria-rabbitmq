# Mensajería con RabbitMQ (Gmail real)

Aplicación web de mensajería que **envía correos reales** por SMTP de Gmail y **recibe correos reales** leyendo la bandeja de Gmail por IMAP. Todo el flujo pasa por **RabbitMQ**: la API nunca envía ni lee correos directamente, solo publica mensajes en colas que procesan los *workers*.

| Parte | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| Backend | NestJS 12 en modo monorepo: `apps/api`, `apps/workers`, `libs/shared` |
| Mensajería | RabbitMQ + `@golevelup/nestjs-rabbitmq` |
| Correo | `nodemailer` (SMTP) + `imapflow` y `mailparser` (IMAP) |
| Base de datos | SQLite con TypeORM (`better-sqlite3`) |
| Validación | `class-validator` + `class-transformer` |

---

## 1. Diagrama del flujo

**Envío**

```
 Frontend ──POST /api/correos──▶ API ──guarda "en_cola"──▶ SQLite
                                  │
                                  └─publish (rk "salida")─▶ [exchange correos] ──▶ (cola correos.salida)
                                                                                       │ consume
                                                                                       ▼
                                                     SQLite ◀──"enviado"/"error"── Consumidor de envío ──SMTP──▶ Gmail ──▶ destinatario
                                                                                       │
                                                                       falla 4 veces → nack(requeue=false)
                                                                                       ▼
                                                                  [exchange correos.dlx] ──▶ (cola correos.fallidos)
```

**Recepción**

```
 Gmail (INBOX) ◀──IMAP cada 30 s── Lector IMAP ──publish (rk "entrada")──▶ [exchange correos] ──▶ (cola correos.entrada)
       ▲                                │                                                              │ consume
       └──── marca como leído ──────────┘                                                              ▼
                                                                      SQLite ◀──guarda sin duplicados── Consumidor de entrada

 Frontend ──GET /api/bandeja y /api/enviados (cada 5 s)──▶ API ──lee──▶ SQLite
```

**Paso a paso:**

1. **Envío.** El usuario redacta un correo en la web. La API valida el DTO, lo guarda en SQLite con estado `en_cola`, lo publica en el exchange `correos` con routing key `salida` y responde de inmediato (HTTP 202).
2. El **consumidor de envío** (workers) toma el mensaje de `correos.salida`, lo envía por SMTP de Gmail y actualiza el estado a `enviado`.
3. Si el envío falla, **lo reintenta hasta 3 veces** (con esperas de 2, 4 y 6 s). Si después de eso sigue fallando, marca el correo como `error` y hace `nack` sin reencolar. RabbitMQ lo manda entonces a la *dead letter queue* `correos.fallidos`.
4. **Recepción.** Cada 30 segundos el **lector IMAP** revisa la bandeja INBOX de Gmail, toma los correos no leídos **que llegaron después de iniciar los workers**, los publica en `correos.entrada` y los marca como leídos. Los no leídos que ya estaban en la bandeja no se tocan.
5. El **consumidor de entrada** guarda cada correo en SQLite. Si un `Message-ID` ya existe, no lo vuelve a guardar.
6. El frontend consulta `/api/bandeja` y `/api/enviados` cada 5 segundos.

### Topología de RabbitMQ

| Elemento | Tipo | Detalles |
|---|---|---|
| `correos` | exchange `direct`, durable | Exchange principal |
| `correos.salida` | cola durable | routing key `salida`; `x-dead-letter-exchange = correos.dlx` |
| `correos.entrada` | cola durable | routing key `entrada` |
| `correos.dlx` | exchange `direct`, durable | Dead letter exchange |
| `correos.fallidos` | cola durable | routing key `fallidos` (dead letter queue) |

Todos los mensajes se publican con `persistent: true` y se confirman manualmente. El consumidor hace `ack` al terminar bien y `nack` cuando hay que rechazar el mensaje; además se usa `prefetch = 1`.

---

## 2. Estructura del repositorio

```
/
├── docker-compose.yml          RabbitMQ con panel de administración
├── package.json                Atajos para ejecutar todo desde la raíz
├── backend/                    Monorepo NestJS
│   ├── .env.example            Plantilla de configuración (sin datos reales)
│   ├── libs/shared/src/        Entidades, DTOs, constantes y módulo de RabbitMQ, base de datos
│   ├── apps/api/src/           API REST: correos/ (POST correos, GET enviados), bandeja/
│   └── apps/workers/src/       envio/ (SMTP), imap/ (lector), entrada/ (guardado)
└── frontend/                   Next.js
    ├── .env.local.example      NEXT_PUBLIC_API_URL
    └── src/
        ├── app/                redactar/, bandeja/, enviados/
        ├── components/         Sidebar, EstadoBadge, Aviso, Encabezado
        ├── hooks/usePolling.ts Actualización automática cada 5 s
        └── lib/api.ts          Cliente de la API
```

---

## 3. Requisitos

- **Node.js 20 o superior** (probado con Node 24) y npm.
- **Docker Desktop** para ejecutar RabbitMQ: <https://www.docker.com/products/docker-desktop/>.
- Una **cuenta de Gmail** con verificación en dos pasos activada. Puedes usar tu cuenta personal: el lector solo procesa (y marca como leídos) los correos que lleguen después de iniciar los workers.

---

## 4. Crear la contraseña de aplicación de Gmail (paso a paso)

Gmail no acepta tu contraseña normal desde aplicaciones externas. Necesitas una **contraseña de aplicación** de 16 caracteres:

1. Entra a <https://myaccount.google.com> con la cuenta que vas a usar.
2. En el menú izquierdo abre **Seguridad**.
3. En "Cómo inicias sesión en Google" activa la **Verificación en dos pasos** si aún no la tienes. Sin ella no aparece la opción de contraseñas de aplicación.
4. Ve a <https://myaccount.google.com/apppasswords> (o busca "Contraseñas de aplicaciones" en el buscador de la cuenta).
5. Escribe un nombre, por ejemplo `Mensajeria RabbitMQ`, y pulsa **Crear**.
6. Google te mostrará una contraseña como `abcd efgh ijkl mnop`. **Cópiala**, porque no se vuelve a mostrar. Puedes pegarla con o sin espacios.
7. **IMAP** viene activado en las cuentas de Gmail actuales. Si no conecta, revisa en Gmail → ⚙️ Configuración → *Ver toda la configuración* → **Reenvío y correo POP/IMAP** que el acceso IMAP esté habilitado.

---

## 5. Configuración

### Backend (`backend/.env`)

Copia la plantilla y completa tus datos:

```bash
cd backend
cp .env.example .env
```

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `GMAIL_USER` | Tu correo de Gmail | — |
| `GMAIL_APP_PASSWORD` | Contraseña de aplicación (paso 4) | — |
| `REMITENTE_NOMBRE` | Nombre que ve el destinatario | `Mensajería RabbitMQ` |
| `SMTP_HOST` / `SMTP_PORT` | Servidor SMTP | `smtp.gmail.com` / `465` |
| `IMAP_HOST` / `IMAP_PORT` | Servidor IMAP | `imap.gmail.com` / `993` |
| `IMAP_MAX_POR_CICLO` | Máximo de correos nuevos procesados cada 30 s | `20` |
| `RABBITMQ_URL` | Conexión AMQP | `amqp://guest:guest@localhost:5672` |
| `API_PORT` | Puerto de la API | `3001` |
| `FRONTEND_URL` | Origen permitido por CORS | `http://localhost:3000` |
| `DB_PATH` | Archivo SQLite compartido por la api y los workers | `./data/correos.sqlite` |

### Frontend (`frontend/.env.local`)

```bash
cd frontend
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 6. Levantar RabbitMQ

Desde la raíz del proyecto, con Docker Desktop abierto:

```bash
docker compose up -d
```

Para comprobar que está corriendo:

```bash
docker compose ps
```

Para detenerlo, ejecuta `docker compose down`. Si además quieres borrar las colas guardadas, usa `docker compose down -v`.

---

## 7. Ejecutar backend y frontend

Instala las dependencias la primera vez:

```bash
npm run instalar
```

Después abre **tres terminales**, una para cada proceso:

```bash
# Terminal 1: API REST (http://localhost:3001/api)
cd backend
npm run dev:api
```

```bash
# Terminal 2: workers (consumidores y lector IMAP)
cd backend
npm run dev:workers
```

```bash
# Terminal 3: frontend (http://localhost:3000)
cd frontend
npm run dev
```

Desde la raíz también puedes usar los atajos `npm run api`, `npm run workers` y `npm run frontend`.

**Modo compilado (producción):**

```bash
cd backend
npm run build
npm run prod:api      # en una terminal
npm run prod:workers  # en otra terminal
```

```bash
cd frontend
npm run build
npm start
```

---

## 8. Probar el flujo

### Envío

1. Abre <http://localhost:3000/redactar>.
2. Escribe un destinatario real (por ejemplo tu correo personal), un asunto y un mensaje. Pulsa **Enviar**.
3. En la terminal de la **API** verás:
   ```
   [CorreosService] [PUBLICADO] Correo #1 para alguien@x.com → exchange "correos", routing key "salida"
   ```
4. En la terminal de los **workers**:
   ```
   [ConsumidorEnvio] [CONSUMIDO] Correo #1 (intento 1 de 4) desde "correos.salida" para alguien@x.com
   [ConsumidorEnvio] [ENVIADO] Correo #1 (intento 1 de 4) entregado a Gmail SMTP (Message-ID <...>)
   ```
5. En <http://localhost:3000/enviados> el estado cambia de **En cola** (amarillo) a **Enviado** (verde).

**Para probar los reintentos y la dead letter queue:** cambia `GMAIL_APP_PASSWORD` por un valor incorrecto en `.env`, reinicia los workers y envía un correo. Verás `[FALLO]` y `[REINTENTO]` tres veces y luego `[ERROR] ... → enviado a "correos.fallidos"`. El correo aparecerá en rojo en *Enviados* y el mensaje quedará en la cola `correos.fallidos`.

### Recepción

1. Desde cualquier otra cuenta envía un correo a la dirección configurada en `GMAIL_USER`.
2. En menos de 30 segundos los workers mostrarán:
   ```
   [LectorIMAP] [IMAP] 1 correo(s) nuevo(s) sin leer; procesando 1
   [LectorIMAP] [PUBLICADO] Correo de Juan <juan@x.com> "Hola" → routing key "entrada"
   [LectorIMAP] [IMAP] 1 correo(s) marcado(s) como leído(s) en Gmail
   [ConsumidorEntrada] [CONSUMIDO] "Hola" de Juan <juan@x.com> desde "correos.entrada"
   [ConsumidorEntrada] [GUARDADO] Correo recibido #1 "Hola"
   ```
3. Abre <http://localhost:3000/bandeja>. El correo aparece solo, sin recargar la página. Haz clic para ver el detalle.

> El lector solo procesa correos que lleguen **después** de iniciar los workers. Los que llegaron antes, o mientras los workers estaban detenidos, se ignoran aunque estén sin leer.

### API con curl

```bash
curl -X POST http://localhost:3001/api/correos -H "Content-Type: application/json" -d "{\"para\":\"alguien@ejemplo.com\",\"asunto\":\"Prueba\",\"mensaje\":\"Hola desde curl\"}"
```

```bash
curl http://localhost:3001/api/enviados
```

```bash
curl http://localhost:3001/api/bandeja
```

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/correos` | Valida, guarda con estado `en_cola` y publica en RabbitMQ. Responde 202, o 503 si RabbitMQ no está conectado. |
| `GET` | `/api/bandeja` | Correos recibidos, los más recientes primero |
| `GET` | `/api/bandeja/:id` | Detalle de un correo recibido (404 si no existe) |
| `GET` | `/api/enviados` | Correos enviados con su estado |

---

## 9. Ver las colas en el panel de RabbitMQ

1. Abre <http://localhost:15672>.
2. Inicia sesión con el usuario **`guest`** y la contraseña **`guest`**.
3. En la pestaña **Exchanges** verás `correos` y `correos.dlx`. Al abrir `correos` aparecen los *bindings* hacia `correos.salida` (`salida`) y `correos.entrada` (`entrada`).
4. En la pestaña **Queues and Streams** están las tres colas. En `correos.salida` verás la etiqueta **DLX** y el argumento `x-dead-letter-exchange`.
5. Si quieres ver los mensajes acumulados durante la presentación, **detén los workers** y envía algunos correos desde la web. La columna *Ready* de `correos.salida` subirá. Cuando vuelvas a iniciar los workers, se vaciará y los correos pasarán a *Enviado*.
6. Para ver un mensaje fallido, entra en `correos.fallidos` → **Get messages** → *Get Message(s)*.

---

## 10. Problemas comunes

| Síntoma | Causa y solución |
|---|---|
| `Invalid login: 535-5.7.8 Username and Password not accepted` | No estás usando una contraseña de aplicación o tiene un error. Repite el paso 4. |
| La web muestra "RabbitMQ no está disponible" | El contenedor no está levantado: ejecuta `docker compose up -d`. |
| `Connection Failed: Unable to establish a connection to the broker` en consola | Mismo caso: RabbitMQ está apagado. La api y los workers se reconectan solos cuando vuelve. |
| `PRECONDITION_FAILED - inequivalent arg 'x-dead-letter-exchange'` | La cola ya existía con otros argumentos. Bórrala desde el panel o ejecuta `docker compose down -v`. |
| La web muestra "No se pudo conectar con la API" | La API no está corriendo o `NEXT_PUBLIC_API_URL` está mal. Reinicia `npm run dev` después de cambiar `.env.local`. |
| No llegan correos a la bandeja | Revisa que los workers estén corriendo y que IMAP esté habilitado en Gmail. El lector solo toma correos **no leídos** de INBOX que llegaron **después** de iniciar los workers. |
