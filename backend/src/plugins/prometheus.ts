import { FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { Counter, Gauge, Histogram, register } from 'prom-client';

export default fp(async (fastify) => {
  const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5]
  });

  const httpRequestTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  });

  const httpRequestInProgress = new Gauge({
    name: 'http_requests_in_progress',
    help: 'Number of HTTP requests currently in progress',
    labelNames: ['method', 'route']
  });

  fastify.addHook('onRequest', (request, reply, done) => {
    const start = Date.now();
    const method = request.method;
    const route = request.routeOptions?.url || request.url;

    httpRequestInProgress.inc({ method, route });

    const originalSend = reply.send.bind(reply);

    reply.send = function patchedSend(
      this: FastifyReply,
      payload?: Parameters<FastifyReply['send']>[0]
    ) {
      const duration = (Date.now() - start) / 1000;
      const statusCode = reply.statusCode;

      httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
      httpRequestTotal.inc({ method, route, status_code: statusCode });
      httpRequestInProgress.dec({ method, route });

      return originalSend(payload);
    };

    done();
  });

  fastify.get('/metrics', async (_request, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  fastify.log.info('Prometheus metrics enabled on /metrics');
});
