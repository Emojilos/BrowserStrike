import http from 'http';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './rooms/GameRoom.js';

const port = Number(process.env.PORT) || 2567;

const httpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
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
