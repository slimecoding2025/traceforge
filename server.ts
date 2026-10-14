import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn } from 'child_process';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;
const PYTHON_PORT = 8000;
const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY ||
  '';

async function startServer() {
  const app = express();

  // 1. Spawn FastAPI Python backend
  console.log('[TraceForge] Launching Python FastAPI backend on port 8000...');
  const pyProcess = spawn('python3', [
    '-m', 'uvicorn',
    'backend.app.main:app',
    '--host', '127.0.0.1',
    '--port', String(PYTHON_PORT),
  ], {
    stdio: 'inherit',
    env: { ...process.env, PYTHONPATH: '.' }
  });

  pyProcess.on('error', (err) => {
    console.error('[TraceForge] Failed to spawn Python backend:', err.message);
  });

  process.on('exit', () => {
    pyProcess.kill();
  });
  process.on('SIGINT', () => {
    pyProcess.kill();
    process.exit();
  });
  process.on('SIGTERM', () => {
    pyProcess.kill();
    process.exit();
  });

  // 2. OpenRouter AI Proxy Endpoint (for secure server-side triage & intel)
  app.post('/api/ai/openrouter', express.json(), async (req, res) => {
    try {
      const { model, systemPrompt, userPrompt } = req.body;
      const key = OPENROUTER_API_KEY;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'TraceForge Security Investigation Workbench',
        },
        body: JSON.stringify({
          model: model || 'liquid/lfm-2.5-2.6b:free',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          error: errorData?.error?.message || `OpenRouter error HTTP ${response.status}`,
        });
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';
      res.json({ content, model: data?.model });
    } catch (err: any) {
      console.error('[TraceForge OpenRouter Proxy Error]:', err.message);
      res.status(500).json({ error: err.message || 'Internal error connecting to OpenRouter' });
    }
  });

  // 3. Proxy remaining /api requests to FastAPI backend
  app.use('/api', (req, res) => {
    const options = {
      hostname: '127.0.0.1',
      port: PYTHON_PORT,
      path: req.originalUrl,
      method: req.method,
      headers: {
        ...req.headers,
        host: `127.0.0.1:${PYTHON_PORT}`,
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      console.warn('[TraceForge Proxy] Backend warming up or error:', err.message);
      res.status(503).json({
        error: 'Backend engine starting up or busy',
        detail: err.message,
      });
    });

    req.pipe(proxyReq, { end: true });
  });

  // 4. Mount Vite middlewares for React frontend
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TraceForge] Server running at http://localhost:${PORT}`);
    console.log('[TraceForge] Built by Mouhamed Salim Bousmina');
  });
}

startServer().catch((err) => {
  console.error('[TraceForge] Fatal startup error:', err);
});
