/**
 * K6 Load Test: WebSocket Concurrent Connections
 *
 * Run: k6 run tests/load/websocket-load-test.js
 *
 * Environment variables:
 *   WS_URL - WebSocket server URL (default: ws://localhost:3010)
 *   AUTH_TOKEN - Authentication cookie/token
 */
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

const WS_URL = __ENV.WS_URL || 'ws://localhost:3010';

// Custom metrics
const wsErrors = new Rate('ws_errors');
const wsConnections = new Counter('ws_connections');
const wsConnectionTime = new Trend('ws_connection_time', true);
const wsMessageLatency = new Trend('ws_message_latency', true);

export const options = {
  stages: [
    { duration: '30s', target: 100 },    // Ramp up to 100 connections
    { duration: '2m', target: 500 },     // Ramp up to 500 connections
    { duration: '3m', target: 1000 },    // Hold at 1000 connections
    { duration: '1m', target: 500 },     // Ramp down
    { duration: '30s', target: 0 },      // Ramp down to 0
  ],
  thresholds: {
    ws_errors: ['rate<0.05'],            // WebSocket error rate < 5%
    ws_connection_time: ['p(95)<3000'],  // 95% connection time < 3s
    ws_message_latency: ['p(95)<1000'],  // 95% message latency < 1s
  },
};

export default function () {
  const connectStart = Date.now();

  const res = ws.connect(`${WS_URL}/socket.io/?EIO=4&transport=websocket`, {}, function (socket) {
    wsConnections.add(1);
    wsConnectionTime.add(Date.now() - connectStart);

    socket.on('open', () => {
      // Socket.IO handshake
      socket.send('40');
    });

    socket.on('message', (data) => {
      // Handle Socket.IO protocol messages
      if (data.startsWith('0')) {
        // Engine.IO open packet
        return;
      }
      if (data === '40') {
        // Socket.IO connect ack
        return;
      }
      if (data === '2') {
        // Engine.IO ping - respond with pong
        socket.send('3');
        return;
      }
    });

    socket.on('error', (e) => {
      wsErrors.add(true);
    });

    socket.on('close', () => {
      // Connection closed
    });

    // Hold connection open for the duration, responding to pings
    sleep(30 + Math.random() * 30); // 30-60 seconds per connection

    socket.close();
  });

  const success = check(res, {
    'WebSocket connected': (r) => r && r.status === 101,
  });

  if (!success) {
    wsErrors.add(true);
  }

  sleep(1);
}
