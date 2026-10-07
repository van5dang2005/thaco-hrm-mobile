// Tiny HTTP toolkit for the mock back-ends (no dependencies).
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const VN_OFFSET = 7 * 3600 * 1000;
const DAY = 24 * 3600 * 1000;

const uuid = () => crypto.randomUUID();

/** Instant for a Vietnam wall-clock time, relative to today. */
function vnAt(dayOffset, hour = 0, minute = 0) {
  const now = new Date(Date.now() + VN_OFFSET);
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, hour, minute);
  return new Date(base - VN_OFFSET);
}

const iso = (date) => (date ? new Date(date).toISOString() : null);

class HttpError extends Error {
  constructor(status, errorCode, message) {
    super(message || errorCode);
    this.status = status;
    this.errorCode = errorCode;
  }
}

const bad = (errorCode, message) => new HttpError(400, errorCode, message);
const conflict = (errorCode, message) => new HttpError(409, errorCode, message);
const notFound = (errorCode = 'DATA_NOT_FOUND') => new HttpError(404, errorCode, 'Data not found.');

function paginate(items, query) {
  const pageNumber = Math.max(1, Number(query.get('pageNumber') || 1));
  const pageSize = Math.max(1, Number(query.get('pageSize') || 50));
  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  return {
    items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    totalCount,
    pageNumber,
    pageSize,
    totalPages,
    hasNextPage: pageNumber < totalPages,
    hasPreviousPage: pageNumber > 1,
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Minimal multipart/form-data parser: returns { fields: {name: string[]}, files: {name: File[]} }. */
function parseMultipart(buffer, contentType, uploadDir) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  const fields = {};
  const files = {};
  if (!match) return { fields, files };
  const boundary = Buffer.from(`--${match[1] || match[2]}`);
  let start = buffer.indexOf(boundary);
  while (start !== -1) {
    const next = buffer.indexOf(boundary, start + boundary.length);
    if (next === -1) break;
    const part = buffer.subarray(start + boundary.length + 2, next - 2);
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd !== -1) {
      const headers = part.subarray(0, headerEnd).toString('utf8');
      const body = part.subarray(headerEnd + 4);
      const name = /name="([^"]*)"/i.exec(headers)?.[1];
      const filename = /filename="([^"]*)"/i.exec(headers)?.[1];
      if (name) {
        // ASP.NET also accepts "items[0]" style keys; normalise to the bare name.
        const key = name.replace(/\[\d*\]$/, '').toLowerCase();
        if (filename !== undefined) {
          const id = uuid();
          const safe = `${id}-${filename.replace(/[^\w.\-]/g, '_')}`;
          fs.mkdirSync(uploadDir, { recursive: true });
          fs.writeFileSync(path.join(uploadDir, safe), body);
          (files[key] ||= []).push({ id, filename, size: body.length, storedAs: safe });
        } else {
          (fields[key] ||= []).push(body.toString('utf8'));
        }
      }
    }
    start = next;
  }
  return { fields, files };
}

function send(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(payload === undefined ? '' : JSON.stringify(payload));
}

/**
 * Creates a server from a route table: [method, '/api/x/:id', handler(ctx)].
 * Errors are returned in the back-end's ErrorResponse shape { statusCode, message, errorCode }.
 */
function createServer({ name, port, routes, authenticate, uploadDir, latencyMs = 250 }) {
  const compiled = routes.map(([method, pattern, handler, options = {}]) => {
    const keys = [];
    const regex = new RegExp(
      `^${pattern.replace(/\/:([a-zA-Z]+)/g, (_, key) => {
        keys.push(key);
        return '/([^/]+)';
      })}$`,
    );
    return { method, regex, keys, handler, options };
  });

  const server = require('node:http').createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const started = Date.now();
    try {
      if (req.method === 'OPTIONS') return send(res, 204);
      if (url.pathname.startsWith('/uploads/')) {
        const file = path.join(uploadDir, path.basename(url.pathname));
        if (!fs.existsSync(file)) return send(res, 404, { message: 'not found' });
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        return fs.createReadStream(file).pipe(res);
      }
      const route = compiled.find((r) => r.method === req.method && r.regex.test(url.pathname));
      if (!route) throw new HttpError(404, 'NOT_FOUND', `No route ${req.method} ${url.pathname}`);
      const params = {};
      const m = route.regex.exec(url.pathname);
      route.keys.forEach((key, i) => (params[key] = decodeURIComponent(m[i + 1])));

      const raw = await readBody(req);
      const contentType = req.headers['content-type'] || '';
      let body = null;
      let form = null;
      if (contentType.includes('multipart/form-data')) form = parseMultipart(raw, contentType, uploadDir);
      else if (raw.length) body = JSON.parse(raw.toString('utf8'));

      const user = route.options.public ? null : authenticate(req.headers.authorization);
      if (!route.options.public && !user) throw new HttpError(401, 'UNAUTHORIZED', 'Unauthorized');

      await new Promise((r) => setTimeout(r, latencyMs));
      const result = await route.handler({ params, query: url.searchParams, body, form, user, req });
      if (result === undefined) send(res, 204);
      else send(res, result && result.__status ? result.__status : 200, result && result.__status ? result.body : result);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (!(error instanceof HttpError)) console.error(error);
      send(res, status, {
        statusCode: status,
        message: error.message,
        errorCode: error instanceof HttpError ? error.errorCode : 'INTERNAL_ERROR',
        details: {},
        timestamp: new Date().toISOString(),
      });
    } finally {
      console.log(`[${name}] ${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - started}ms)`);
    }
  });
  server.listen(port, '0.0.0.0', () => console.log(`[${name}] listening on http://localhost:${port}`));
  return server;
}

// ASP.NET form binding is case-insensitive; keys are stored lower-cased.
const fieldOf = (form, key) => form?.fields?.[key.toLowerCase()]?.[0];
const fieldsOf = (form, key) => form?.fields?.[key.toLowerCase()] ?? [];
const filesOf = (form, key) => form?.files?.[key.toLowerCase()] ?? [];

/** Reads `items[0].field` style list-of-object fields into [{ field: value }]. */
function indexedObjects(form, prefix) {
  const rows = [];
  const re = new RegExp(`^${prefix.toLowerCase()}\\[(\\d+)\\]\\.(\\w+)$`);
  Object.entries(form?.fields ?? {}).forEach(([key, values]) => {
    const m = re.exec(key);
    if (!m) return;
    (rows[Number(m[1])] ||= {})[m[2]] = values[0];
  });
  return rows.filter(Boolean);
}

module.exports = { uuid, vnAt, iso, DAY, VN_OFFSET, HttpError, bad, conflict, notFound, paginate, createServer, fieldOf, fieldsOf, filesOf, indexedObjects };
