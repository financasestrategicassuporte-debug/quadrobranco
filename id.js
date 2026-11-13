// GET    /api/mapas/:id  ->  { id, title, updatedAt, data: "<json do mapa>" }
// PUT    /api/mapas/:id  <-  { title, updatedAt, data: "<json do mapa>" }  (cria ou atualiza)
// DELETE /api/mapas/:id
// O :id é gerado no navegador, por isso é guardado em client_id.
'use strict';

const { handler, send, supa, readBody, HttpError, ID_RE } = require('../../lib/core');

const MAX_BYTES = 2 * 1024 * 1024;

function mapId(req) {
  const id = String((req.query && req.query.id) || '');
  if (!ID_RE.test(id)) throw new HttpError(400, 'invalid_id');
  return id;
}

function filtro(user, id) {
  return 'usuario_id=eq.' + user.id + '&client_id=eq.' + encodeURIComponent(id);
}

module.exports = handler({
  GET: async (req, res, user) => {
    const id = mapId(req);
    const rows = await supa('mapas?select=client_id,title,client_updated_at,data&limit=1&' + filtro(user, id));
    if (!rows.length) throw new HttpError(404, 'not_found');
    const r = rows[0];
    send(res, 200, { id: r.client_id, title: r.title, updatedAt: Number(r.client_updated_at), data: JSON.stringify(r.data) });
  },

  PUT: async (req, res, user) => {
    const id = mapId(req);
    const b = readBody(req);
    const raw = String(b.data || '');
    if (Buffer.byteLength(raw) > MAX_BYTES) throw new HttpError(413, 'too_large');

    let parsed = null;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.nodes)) throw new HttpError(422, 'invalid_map');

    const title = String(b.title || '').trim().slice(0, 200) || 'Sem título';
    const updatedAt = Number(b.updatedAt) > 0 ? Math.floor(Number(b.updatedAt)) : Date.now();

    await supa('mapas?on_conflict=usuario_id,client_id', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: { usuario_id: user.id, client_id: id, title, client_updated_at: updatedAt, data: parsed, updated_at: new Date().toISOString() }
    });
    send(res, 200, { id, title, updatedAt });
  },

  DELETE: async (req, res, user) => {
    const id = mapId(req);
    await supa('mapas?' + filtro(user, id), { method: 'DELETE', prefer: 'return=minimal' });
    send(res, 204, null);
  }
});
