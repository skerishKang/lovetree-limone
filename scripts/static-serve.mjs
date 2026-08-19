import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = parseInt(process.env.PORT || "3099", 10);
const ROOT = process.env.ROOT || "dist/client";

const MIME = {
  ".html": "text/html",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".css": "text/css",
  ".js": "application/javascript",
  ".txt": "text/plain",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const fp = path.join(ROOT, url);

  if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Access-Control-Allow-Origin": "*",
    });
    fs.createReadStream(fp).pipe(res);
  } else {
    res.writeHead(404);
    res.end("Not found: " + url);
  }
});

server.listen(PORT, () => {
  console.log(`Static server on port ${PORT}, root=${ROOT}`);
});
