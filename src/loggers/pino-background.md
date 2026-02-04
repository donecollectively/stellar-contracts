# Pino Logger - Background Research

*Reference material for json-logger implementation*

## Overview

Pino is a high-performance Node.js JSON logger—"super fast, all natural." It's 5x faster than Winston, outputs NDJSON by default, and is the default logger for Fastify.

## Core API Patterns

```javascript
import pino from 'pino';

// Basic instantiation
const logger = pino({
  level: process.env.PINO_LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Child loggers bind context
const child = logger.child({ userId: 123, requestId: 'abc' });
child.info('processing request');  // includes userId, requestId in output
```

## Log Levels (ascending severity)

| Level | Value | Method |
|-------|-------|--------|
| trace | 10 | `logger.trace()` |
| debug | 20 | `logger.debug()` |
| info | 30 | `logger.info()` |
| warn | 40 | `logger.warn()` |
| error | 50 | `logger.error()` |
| fatal | 60 | `logger.fatal()` |

Custom levels supported via `customLevels` option.

## Key Features

- **Formatters**: Customize output structure (level labels, bindings)
- **Redaction**: Mask sensitive paths (`redact: { paths: ['user.password'] }`)
- **Serializers**: Transform objects before logging
- **Transports**: Worker-thread-based log processing (file, pretty, remote)

## Transport Architecture

```javascript
const transport = pino.transport({
  targets: [
    { target: 'pino/file', options: { destination: './app.log' } },
    { target: 'pino-pretty' },  // dev only
  ],
});
const logger = pino({ level: 'info' }, transport);
```

Transports run in worker threads to avoid blocking the event loop.

## TypeScript/ESM Status

- Built-in TypeScript types
- ESM support with some caveats in Node < 22.6
- Native TS transport support in Node 22.6+ (type stripping)
- Some known issues with `moduleResolution: "node16"`

## Development vs Production

- `pino-pretty` for human-readable dev output
- Raw JSON for production (machine-parseable, lower overhead)

## Sources

- [Pino GitHub](https://github.com/pinojs/pino)
- [Pino Official Site](https://getpino.io/)
- [Better Stack Guide](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/)
- [SigNoz Guide](https://signoz.io/guides/pino-logger/)
