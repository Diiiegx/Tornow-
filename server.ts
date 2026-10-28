import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  getOrCreateUser,
  getUsers,
  getTournamentsFromDb,
  upsertTournamentInDb,
  upsertClubInDb,
} from './src/db/users.ts';
import { detectMaliciousPayload } from './src/utils/securityShield.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory rate limit tracker per IP for /api/* routes
const apiRateTracker = new Map<string, { count: number; windowStart: number }>();

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  const httpServer = http.createServer(app);
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const HOST = '0.0.0.0';

  // 1. Security HTTP Headers & General Cookie / Cache Synchronization Layer
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Keep API responses fresh while allowing general cookies on root path
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    } else {
      const incomingCookie = req.headers.cookie || '';
      if (!incomingCookie.includes('tornow_general_cache_v1=')) {
        res.append(
          'Set-Cookie',
          `tornow_general_cache_v1=active_${Date.now()}; Path=/; Max-Age=604800; SameSite=Lax`
        );
      }
    }
    next();
  });

  app.use(express.json({ limit: '5mb' }));

  // 2. API Rate Limiting & WAF Payload Firewall against XSS / SQLi / Prototype Pollution
  app.use('/api', (req, res, next) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const now = Date.now();
    const record = apiRateTracker.get(ip);
    if (!record || now - record.windowStart > 60_000) {
      apiRateTracker.set(ip, { count: 1, windowStart: now });
    } else {
      record.count += 1;
      if (record.count > 120) {
        return res.status(429).json({
          error: 'Demasiadas solicitudes detectadas. Protección anti-DoS activada temporalmente.',
        });
      }
    }

    const bodyCheck = detectMaliciousPayload(req.body);
    if (bodyCheck.isMalicious) {
      return res.status(403).json({
        error: `Bloqueado por Escudo de Seguridad TorNow: ${bodyCheck.reason}`,
      });
    }
    const queryCheck = detectMaliciousPayload(req.query);
    if (queryCheck.isMalicious) {
      return res.status(403).json({
        error: `Bloqueado por Escudo de Seguridad TorNow: ${queryCheck.reason}`,
      });
    }
    next();
  });

  // Cloud Run and container liveness / readiness probes
  app.get(['/healthz', '/health', '/_health'], (_req, res) => {
    res.status(200).send('OK');
  });

  // Cloud SQL + Firebase Auth API Routes
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@tornow.app`;
      const name = req.user!.name || email.split('@')[0];
      const dbUser = await getOrCreateUser(uid, email, name);
      res.json({ user: dbUser });
    } catch (error: any) {
      console.error('Failed to synchronize user in /api/me:', error);
      res.status(500).json({ error: error.message || 'Failed to synchronize user' });
    }
  });

  app.get('/api/users', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const allUsers = await getUsers();
      res.json({ users: allUsers });
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch users' });
    }
  });

  app.get('/api/tournaments', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const rows = await getTournamentsFromDb();
      res.json({ tournaments: rows });
    } catch (error: any) {
      console.error('Failed to fetch tournaments:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch tournaments' });
    }
  });

  app.post('/api/tournaments', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@tornow.app`;
      await getOrCreateUser(uid, email, req.user!.name);

      const body = req.body || {};
      const saved = await upsertTournamentInDb({
        tournamentCode: String(body.id || `tour-${Date.now()}`),
        ownerUid: uid,
        name: String(body.name || 'Torneo Oficial'),
        sport: String(body.sport || 'volleyball'),
        format: String(body.format || 'round_robin'),
        organizerName: String(body.organizerName || 'Organizador'),
        organizerRut: String(body.organizerContact?.rut || '00.000.000-0'),
        organizerEmail: String(body.organizerContact?.email || email),
        organizerPhone: String(body.organizerContact?.phone || ''),
        venue: String(body.venue || 'Sede Oficial'),
        comuna: String(body.organizerContact?.commune || ''),
        address: String(body.organizerContact?.address || ''),
        categoriesJson: body.categories || [],
        configJson: body,
      });

      res.json({ tournament: saved });
    } catch (error: any) {
      console.error('Failed to save tournament in Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Failed to save tournament' });
    }
  });

  app.post('/api/clubs', requireAuth, async (req: AuthRequest, res) => {
    try {
      const body = req.body || {};
      const saved = await upsertClubInDb({
        clubCode: String(body.id || `club-${Date.now()}`),
        tournamentCode: String(body.tournamentId || 'default'),
        name: String(body.name || 'Club'),
        shortName: String(body.shortName || 'CLB'),
        category: String(body.category || 'GENERAL'),
        rosterJson: body.roster || [],
        staffJson: body.staff || {},
      });
      res.json({ club: saved });
    } catch (error: any) {
      console.error('Failed to save club in Cloud SQL:', error);
      res.status(500).json({ error: error.message || 'Failed to save club' });
    }
  });

  // Gemini AI: Interpret Venue Entrance Sheet Template
  app.post('/api/gemini/interpret-venue-template', async (req, res) => {
    try {
      const { templateText, templateImageBase64, mimeType = 'image/jpeg', venueNameHint } = req.body || {};

      const defaultTemplate = {
        venueName: venueNameHint || 'Recinto Polideportivo Oficial',
        entranceGate: 'Acceso Peatonal Principal',
        requiredFields: ['rut', 'name', 'role', 'dorsal', 'licensePlate'],
        maxAttendeesPerClub: 18,
        securityRequirements: 'Cédula de Identidad física obligatoria en portería. Solo personas autorizadas en nómina sellada.',
        idCheckRequired: true,
        notes: 'Nómina oficial cerrada 12 horas antes del partido para registro en guardia de seguridad.',
      };

      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          success: true,
          template: defaultTemplate,
          source: 'preset_fallback',
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const contents: any[] = [];

      if (templateImageBase64) {
        contents.push({
          inlineData: {
            mimeType,
            data: templateImageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, ''),
          },
        });
      }

      const promptText = `
Eres un analista de seguridad y control de acceso a recintos deportivos en Chile para la plataforma TorNow.
Tu tarea es interpretar la plantilla o especificaciones de ingreso al recinto entregadas por el organizador.

${templateText ? `Texto/Reglamento del recinto:\n"${templateText}"\n` : ''}
${venueNameHint ? `Pista del nombre del recinto: "${venueNameHint}"\n` : ''}

Extrae un JSON con la estructura exacta:
- venueName: Nombre formal del recinto deportivo (ej: Estadio Italiano, Polideportivo Las Condes, Centro de Entrenamiento Olímpico CEO, etc.).
- entranceGate: Puerta, acceso o portería indicada (ej: "Acceso Peatonal Av. Apoquindo", "Portería Norte", etc.).
- requiredFields: Arreglo de strings con los campos necesarios de cada asistente (debe incluir: "rut", "name", "role", "dorsal", y opcionalmente "licensePlate" si se menciona estacionamiento).
- maxAttendeesPerClub: Número máximo permitido de integrantes por delegación (ej: 18 o 20).
- securityRequirements: Instrucciones de seguridad de portería (ej: "Presentar Cédula de Identidad física vigente. Prohibido ingreso sin acreditación").
- idCheckRequired: Booleano (true si se exige control de identidad).
- notes: Recomendaciones operativas (mencionar el bloqueo de 12 horas previas a la fecha).
`;

      contents.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts: contents },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              venueName: { type: Type.STRING },
              entranceGate: { type: Type.STRING },
              requiredFields: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              maxAttendeesPerClub: { type: Type.INTEGER },
              securityRequirements: { type: Type.STRING },
              idCheckRequired: { type: Type.BOOLEAN },
              notes: { type: Type.STRING },
            },
            required: ['venueName', 'requiredFields', 'maxAttendeesPerClub', 'idCheckRequired'],
          },
        },
      });

      const rawJson = response.text?.trim() || '{}';
      const parsed = JSON.parse(rawJson);

      return res.json({
        success: true,
        template: {
          venueName: parsed.venueName || defaultTemplate.venueName,
          entranceGate: parsed.entranceGate || defaultTemplate.entranceGate,
          requiredFields:
            Array.isArray(parsed.requiredFields) && parsed.requiredFields.length > 0
              ? parsed.requiredFields
              : defaultTemplate.requiredFields,
          maxAttendeesPerClub: parsed.maxAttendeesPerClub || defaultTemplate.maxAttendeesPerClub,
          securityRequirements: parsed.securityRequirements || defaultTemplate.securityRequirements,
          idCheckRequired: parsed.idCheckRequired ?? true,
          notes: parsed.notes || defaultTemplate.notes,
        },
        source: 'gemini_ai',
      });
    } catch (error: any) {
      console.error('Error in /api/gemini/interpret-venue-template:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al interpretar plantilla con Gemini AI',
      });
    }
  });

  // Gemini AI: Fill Venue Entrance Sheet from Club Roster
  app.post('/api/gemini/fill-venue-sheet', async (req, res) => {
    try {
      const {
        venueTemplate,
        clubName = 'Club Deportivo',
        roster = [],
        staff = {},
        matchInfo = {},
      } = req.body || {};

      // Filter out suspended players
      const activePlayers = roster.filter((p: any) => !p.isSuspended);

      if (!process.env.GEMINI_API_KEY) {
        // Fallback: build attendees directly
        const attendees: any[] = [];
        let counter = 1;

        if (staff.headCoach) {
          attendees.push({
            id: `att-dt-${Date.now()}`,
            name: String(staff.headCoach).trim(),
            rut: staff.headCoachRut || '15.432.189-4',
            role: 'Director Técnico',
            status: 'habilitado',
          });
        }
        if (staff.assistantCoach) {
          attendees.push({
            id: `att-ac-${Date.now()}`,
            name: String(staff.assistantCoach).trim(),
            rut: staff.assistantCoachRut || '17.892.451-6',
            role: 'Asistente Técnico',
            status: 'habilitado',
          });
        }
        activePlayers.forEach((p: any) => {
          attendees.push({
            id: `att-${p.id || counter++}`,
            name: String(p.name).trim(),
            rut: p.rut || '18.245.789-2',
            role: p.isCaptain ? 'Capitán' : p.isLibero ? 'Líbero' : 'Jugador',
            dorsal: p.number,
            status: 'habilitado',
          });
        });

        return res.json({
          success: true,
          attendees,
          source: 'deterministic_fallback',
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const promptText = `
Eres un asistente de inteligencia artificial para la plataforma deportiva TorNow en Chile.
Tu tarea es tomar los datos de la nómina oficial del club "${clubName}" y rellenar automáticamente la planilla de ingreso al recinto deportivo "${venueTemplate?.venueName || matchInfo?.venue || 'Recinto Oficial'}" para el encuentro del ${matchInfo?.date || 'Próxima Fecha'}.

REGLAS OBLIGATORIAS:
1. Revisa cada integrante del club: cuerpo técnico (Director Técnico, Asistente) y jugadores.
2. Si algún jugador figura como sancionado/suspendido, EXCLÚYELO inmediatamente de la planilla de acceso.
3. Asegura que los nombres propios estén completos y formateados con mayúsculas iniciales.
4. Normaliza el formato de RUT chileno con puntos y guion (ejemplo: 12.345.678-9).
5. Asigna el rol correspondiente con exactitud: "Director Técnico", "Asistente Técnico", "Capitán", "Líbero" o "Jugador".
6. Asigna el número de camiseta/dorsal para los jugadores.
7. Si el recinto tiene un límite máximo de ${venueTemplate?.maxAttendeesPerClub || 18} personas, prioriza a los titulares y cuerpo técnico.

Datos del club a procesar:
- Club: ${clubName}
- DT: ${staff.headCoach || 'No especificado'}
- Asistente Técnico: ${staff.assistantCoach || 'No especificado'}
- Jugadores (${activePlayers.length}):
${JSON.stringify(activePlayers.map((p: any) => ({ name: p.name, rut: p.rut, number: p.number, isCaptain: p.isCaptain, isLibero: p.isLibero, isSuspended: p.isSuspended })))}

Devuelve ÚNICAMENTE un JSON con el arreglo "attendees":
{
  "attendees": [
    {
      "name": "Nombre Apellido",
      "rut": "XX.XXX.XXX-X",
      "role": "Jugador" | "Capitán" | "Líbero" | "Director Técnico" | "Asistente Técnico",
      "dorsal": number | null,
      "status": "habilitado" | "sancionado",
      "licensePlate": string | null
    }
  ]
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              attendees: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    rut: { type: Type.STRING },
                    role: { type: Type.STRING },
                    dorsal: { type: Type.INTEGER, nullable: true },
                    status: { type: Type.STRING },
                    licensePlate: { type: Type.STRING, nullable: true },
                  },
                  required: ['name', 'rut', 'role', 'status'],
                },
              },
            },
            required: ['attendees'],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      const attendees = (parsed.attendees || []).map((att: any, idx: number) => ({
        id: `att-ai-${Date.now()}-${idx}`,
        name: att.name,
        rut: att.rut,
        role: att.role,
        dorsal: att.dorsal ?? undefined,
        status: att.status || 'habilitado',
        licensePlate: att.licensePlate || undefined,
      }));

      return res.json({
        success: true,
        attendees,
        source: 'gemini_ai',
      });
    } catch (error: any) {
      console.error('Error in /api/gemini/fill-venue-sheet:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al rellenar planilla con Gemini AI',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      plugins: [
        {
          name: 'tornow-safe-vite-client',
          enforce: 'post',
          transform(code, id) {
            if (id.includes('vite/dist/client/client.mjs')) {
              return code
                .replace(
                  'transport.connect(createHMRHandler(handleMessage));',
                  'Promise.resolve();'
                )
                .replace(
                  'setupForwardConsoleHandler(transport, forwardConsole);',
                  ''
                )
                .replace(
                  'reject(/* @__PURE__ */ new Error("WebSocket closed without opened."));',
                  'resolve();'
                );
            }
          },
        },
      ],
      server: {
        middlewareMode: true,
        ws: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(
        express.static(distPath, {
          maxAge: '1h',
          etag: true,
        })
      );
    }

    app.get('*', (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).type('html').send('<!doctype html><html><body>Cargando TORNOW...</body></html>');
      }
    });
  }

  const server = httpServer.listen(PORT, HOST, () => {
    console.log(`[TORNOW Server] Listening on http://${HOST}:${PORT}`);
  });

  server.on('error', (err) => {
    console.error('[Server Error]', err);
  });

  process.on('SIGTERM', () => {
    server.close(() => {
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    server.close(() => {
      process.exit(0);
    });
  });
}

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

startServer();

