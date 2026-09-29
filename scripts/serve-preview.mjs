/** 极简静态服务器（仅开发期预览用，无依赖） */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const PORT = Number(process.argv[2] ?? 8123)
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0])
    let file = path.join(ROOT, url)
    if (!file.startsWith(ROOT)) {
      res.writeHead(403)
      return res.end('forbidden')
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404)
        return res.end('not found')
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' })
      res.end(buf)
    })
  })
  .listen(PORT, '127.0.0.1', () => console.log(`serving ${ROOT} on http://127.0.0.1:${PORT}`))
