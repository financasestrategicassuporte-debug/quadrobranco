// GET /api/mapas  ->  [{ id, title, updatedAt }]
'use strict';

const { handler, send, supa } = require('../../lib/core');

module.exports = handler({
  GET: async (req, res, user) => {
    const rows = await supa('mapas?select=client_id,title,client_updated_at' +
      '&usuario_id=eq.' + user.id + '&order=client_updated_at.desc');
    send(res, 200, rows.map(r => ({ id: r.client_id, title: r.title, updatedAt: Number(r.client_updated_at) })));
  }
});
