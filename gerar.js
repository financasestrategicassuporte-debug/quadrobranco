// POST /api/mapas/gerar  <-  { text, focus: "processo" | "reuniao" | "ideias" }
//                        ->  { title, nodes: [{ label, note, children }] }
'use strict';

const { handler, send, supa, readBody, HttpError } = require('../../lib/core');
const { gerarMapa } = require('../../lib/gerador');

const LIMITE_POR_MINUTO = 10;

async function checarLimite(user) {
  const desde = new Date(Date.now() - 60 * 1000).toISOString();
  const rows = await supa('geracoes?select=id&usuario_id=eq.' + user.id +
    '&created_at=gte.' + encodeURIComponent(desde) + '&limit=' + (LIMITE_POR_MINUTO + 1));
  if (rows.length >= LIMITE_POR_MINUTO) throw new HttpError(429, 'rate_limited');
  await supa('geracoes', { method: 'POST', prefer: 'return=minimal', body: { usuario_id: user.id } });
}

module.exports = handler({
  POST: async (req, res, user) => {
    const b = readBody(req);
    if (!String(b.text || '').trim()) throw new HttpError(422, 'empty_text');
    await checarLimite(user);
    send(res, 200, await gerarMapa({ text: b.text, focus: String(b.focus || '') }));
  }
});
