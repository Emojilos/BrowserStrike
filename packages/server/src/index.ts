import http from 'http';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './rooms/GameRoom.js';

const port = Number(process.env.PORT) || 2567;
const corsOrigin = process.env.CORS_ORIGIN || '*';

function getAllowedOrigin(reqOrigin: string | undefined): string {
  if (corsOrigin === '*') return '*';
  const allowed = corsOrigin.split(',').map(o => o.trim());
  if (reqOrigin && allowed.includes(reqOrigin)) return reqOrigin;
  return allowed[0];
}

const httpServer = http.createServer((req, res) => {
  const origin = getAllowedOrigin(req.headers.origin);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  res.writeHead(200);
  res.end(JSON.stringify({ status: 'ok', name: 'BrowserStrike', port }));
});

const server = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

server.define('game_room', GameRoom);
console.log('GameRoom registered');

server.listen(port).then(() => {
  console.log(`BrowserStrike server listening on port ${port}`);
});
