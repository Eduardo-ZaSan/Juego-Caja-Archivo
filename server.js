const http = require("http");
const fs = require("fs");
const path = require("path");

const port = 3000;
const rootDir = __dirname;
const scoresPath = path.join(rootDir, "data", "arcadeScores.json");

function ensureScoresFile() {
  const dataDir = path.dirname(scoresPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(scoresPath)) {
    fs.writeFileSync(scoresPath, "[]\n", "utf8");
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".ts": "application/typescript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".svg": "image/svg+xml"
    };

    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function isInsideRoot(targetPath) {
  const normalizedRoot = path.resolve(rootDir);
  const normalizedTarget = path.resolve(targetPath);
  return normalizedTarget.startsWith(normalizedRoot);
}

ensureScoresFile();

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }

  if (req.method === "OPTIONS" && req.url === "/api/arcade-scores") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.url === "/api/arcade-scores") {
    if (req.method === "GET") {
      fs.readFile(scoresPath, "utf8", (err, data) => {
        if (err) {
          sendJson(res, 500, { error: "No se pudo leer arcadeScores.json" });
          return;
        }

        try {
          const parsed = JSON.parse(data || "[]");
          sendJson(res, 200, parsed);
        } catch {
          sendJson(res, 500, { error: "JSON invalido en arcadeScores.json" });
        }
      });
      return;
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body || "[]");
          if (!Array.isArray(parsed)) {
            sendJson(res, 400, { error: "El cuerpo debe ser un arreglo" });
            return;
          }

          fs.writeFile(scoresPath, JSON.stringify(parsed, null, 2) + "\n", "utf8", (err) => {
            if (err) {
              sendJson(res, 500, { error: "No se pudo guardar arcadeScores.json" });
              return;
            }

            sendJson(res, 200, { ok: true });
          });
        } catch {
          sendJson(res, 400, { error: "JSON invalido en request" });
        }
      });
      return;
    }

    sendJson(res, 405, { error: "Metodo no permitido" });
    return;
  }

  const requestedPath = req.url === "/" ? "/index.html" : req.url;
  const safePath = path.normalize(requestedPath).replace(/^\\+|^\/+/g, "");
  const absolutePath = path.join(rootDir, safePath);

  if (!isInsideRoot(absolutePath)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  sendFile(res, absolutePath);
});

server.listen(port, () => {
  console.log(`Servidor iniciado en http://localhost:${port}`);
});
