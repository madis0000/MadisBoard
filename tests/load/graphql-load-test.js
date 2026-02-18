/**
 * K6 Load Test: GraphQL API Throughput
 *
 * Run: k6 run tests/load/graphql-load-test.js
 *
 * Environment variables:
 *   BASE_URL - Server base URL (default: http://localhost:3010)
 *   AUTH_TOKEN - Authentication token for API requests
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3010';

// Custom metrics
const errorRate = new Rate('errors');
const graphqlDuration = new Trend('graphql_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Hold at 100 users
    { duration: '1m', target: 50 },    // Ramp down to 50
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests < 2s
    http_req_failed: ['rate<0.05'],     // Error rate < 5%
    errors: ['rate<0.1'],               // Custom error rate < 10%
    graphql_duration: ['p(99)<5000'],   // 99% of GraphQL < 5s
  },
};

const headers = {
  'Content-Type': 'application/json',
};

if (__ENV.AUTH_TOKEN) {
  headers['Authorization'] = `Bearer ${__ENV.AUTH_TOKEN}`;
}

// GraphQL query: Server info
function queryServerInfo() {
  const query = JSON.stringify({
    query: `query { serverConfig { version name } }`,
  });

  const start = Date.now();
  const res = http.post(`${BASE_URL}/graphql`, query, { headers });
  graphqlDuration.add(Date.now() - start);

  const success = check(res, {
    'serverConfig status 200': (r) => r.status === 200,
    'serverConfig has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);
  return res;
}

// GraphQL query: Current user
function queryCurrentUser() {
  const query = JSON.stringify({
    query: `query { currentUser { id name email } }`,
  });

  const start = Date.now();
  const res = http.post(`${BASE_URL}/graphql`, query, { headers });
  graphqlDuration.add(Date.now() - start);

  const success = check(res, {
    'currentUser status 200': (r) => r.status === 200,
  });

  errorRate.add(!success);
  return res;
}

// Health check endpoint
function checkHealth() {
  const res = http.get(`${BASE_URL}/health/ready`);

  check(res, {
    'health check status 200': (r) => r.status === 200,
    'health check is healthy': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'healthy';
      } catch {
        return false;
      }
    },
  });

  return res;
}

export default function () {
  // Mix of different query types
  const scenario = Math.random();

  if (scenario < 0.4) {
    queryServerInfo();
  } else if (scenario < 0.8) {
    queryCurrentUser();
  } else {
    checkHealth();
  }

  sleep(Math.random() * 2 + 0.5); // 0.5-2.5s between requests
}

export function handleSummary(data) {
  return {
    'tests/load/results/graphql-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  // K6 built-in will format this
  return JSON.stringify(
    {
      metrics: {
        http_req_duration: data.metrics.http_req_duration,
        http_req_failed: data.metrics.http_req_failed,
        errors: data.metrics.errors,
        graphql_duration: data.metrics.graphql_duration,
      },
    },
    null,
    2
  );
}
