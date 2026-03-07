# Test Logging Approaches for Vitest

## Problem

Vitest captures `console.*` output, making it hard to:
1. See logs in real-time during test runs
2. Separate logs per test for debugging

## Key Insight

Pino writes to file descriptors directly via `pino.destination()` / sonicBoom, which **partially** bypasses vitest's console interception. However, vitest still buffers stdout in some modes.

---

## Approach 1: Bypass Vitest Entirely (External Process)

Write logs to a separate process that's not under vitest's control.

### Option A: Named Pipe / Unix Socket

```typescript
import pino from 'pino';
import { createWriteStream } from 'fs';

// In test setup
const PIPE_PATH = '/tmp/stellog.pipe';
const dest = pino.destination(PIPE_PATH);
const log = pino({ name: 'test' }, dest);

// In a separate terminal:
// mkfifo /tmp/stellog.pipe
// cat /tmp/stellog.pipe | pnpm stellog
```

### Option B: File + Tail

```typescript
const dest = pino.destination('./test-output.log');
const log = pino({ name: 'test' }, dest);

// In separate terminal:
// tail -f test-output.log | pnpm stellog
```

### Option C: Network Socket

```typescript
import { createConnection } from 'net';

// Start receiver: nc -lk 9999 | pnpm stellog
const socket = createConnection({ port: 9999 });
const log = pino({ name: 'test' }, socket);
```

### Implementation for stellog

Add a `stellog.testDestination()` helper:

```typescript
export function testDestination(target?: string): pino.DestinationStream {
    const dest = target || process.env.STELLOG_TEST_DEST || '/tmp/stellog.pipe';

    if (dest.startsWith('tcp://')) {
        const [host, port] = dest.slice(6).split(':');
        return createConnection({ host, port: parseInt(port) });
    }

    // File or named pipe
    return pino.destination(dest);
}
```

---

## Approach 2: Per-Test Log Capture

Capture logs for each test separately for later inspection.

### Option A: Buffer Per Test

```typescript
import { beforeEach, afterEach } from 'vitest';

interface TestLogBuffer {
    testName: string;
    logs: object[];
}

let currentBuffer: TestLogBuffer | null = null;
const allBuffers: TestLogBuffer[] = [];

// Custom pino destination that buffers
function createTestBuffer(): pino.DestinationStream {
    return {
        write(chunk: string) {
            if (currentBuffer) {
                currentBuffer.logs.push(JSON.parse(chunk));
            }
            return true;
        }
    };
}

beforeEach((context) => {
    currentBuffer = { testName: context.task.name, logs: [] };
});

afterEach(() => {
    if (currentBuffer) {
        allBuffers.push(currentBuffer);
        currentBuffer = null;
    }
});

// Export for inspection
export function getTestLogs(testName: string): object[] {
    return allBuffers.find(b => b.testName === testName)?.logs || [];
}

export function dumpTestLogs(testName: string): void {
    const logs = getTestLogs(testName);
    for (const log of logs) {
        console.dir(log, { depth: null });
    }
}
```

### Option B: File Per Test

```typescript
import { beforeEach, afterEach } from 'vitest';
import pino from 'pino';
import { mkdirSync } from 'fs';

const LOG_DIR = './test-logs';
mkdirSync(LOG_DIR, { recursive: true });

let testLogger: pino.Logger | null = null;

beforeEach((context) => {
    const safeName = context.task.name.replace(/[^a-zA-Z0-9]/g, '_');
    const dest = pino.destination(`${LOG_DIR}/${safeName}.ndjson`);
    testLogger = pino({ name: context.task.name }, dest);
});

afterEach(() => {
    testLogger = null;  // Destination auto-flushes
});

export function getTestLogger(): pino.Logger {
    if (!testLogger) throw new Error('No test logger - are you in a test?');
    return testLogger;
}
```

### Option C: Multistream with Dynamic Routing

```typescript
import pino from 'pino';
import { multistream } from 'pino-multi-stream';

const streams: pino.DestinationStream[] = [];

// Always write to main stream
const mainStream = pino.destination(1); // stdout

// Add per-test stream dynamically
export function addTestStream(dest: pino.DestinationStream): void {
    streams.push(dest);
}

export function removeTestStream(dest: pino.DestinationStream): void {
    const idx = streams.indexOf(dest);
    if (idx >= 0) streams.splice(idx, 1);
}

const log = pino({}, multistream([
    { stream: mainStream },
    { stream: { write: (chunk) => streams.forEach(s => s.write(chunk)) } }
]));
```

---

## Recommended Approach

### For Real-Time Debugging (Approach 1B)

Simple, works everywhere:

```bash
# Terminal 1: Run tests
STELLOG_TEST_DEST=./test.log pnpm test

# Terminal 2: Watch logs
tail -f test.log | pnpm stellog
```

### For Per-Test Capture (Approach 2A + 2B hybrid)

```typescript
// src/loggers/testLogger.ts
import pino from 'pino';
import { mkdirSync, writeFileSync } from 'fs';

const LOG_DIR = './test-logs';

interface LogEntry {
    level: number;
    time: number;
    msg: string;
    [key: string]: unknown;
}

interface TestLogContext {
    testName: string;
    logs: LogEntry[];
    dest: pino.DestinationStream;
}

let current: TestLogContext | null = null;

function createCapturingDest(): pino.DestinationStream {
    return {
        write(chunk: string): boolean {
            if (current) {
                try {
                    current.logs.push(JSON.parse(chunk));
                } catch {}
            }
            // Also write to stdout for real-time visibility
            process.stdout.write(chunk);
            return true;
        }
    } as pino.DestinationStream;
}

export function setupTestLogger(testName: string): pino.Logger {
    current = {
        testName,
        logs: [],
        dest: createCapturingDest()
    };
    return pino({ name: testName }, current.dest);
}

export function teardownTestLogger(): void {
    if (current && current.logs.length > 0) {
        mkdirSync(LOG_DIR, { recursive: true });
        const safeName = current.testName.replace(/[^a-zA-Z0-9]/g, '_');
        writeFileSync(
            `${LOG_DIR}/${safeName}.ndjson`,
            current.logs.map(l => JSON.stringify(l)).join('\n')
        );
    }
    current = null;
}

export function getTestLogs(): LogEntry[] {
    return current?.logs || [];
}
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `STELLOG_TEST_DEST` | File/pipe path for bypass mode |
| `STELLOG_CAPTURE` | `1` to enable per-test capture |
| `STELLOG_LOG_DIR` | Directory for per-test log files |

---

## Questions to Resolve

1. Should per-test capture write to files always, or only on failure?
2. Should we integrate with vitest's `onTestFailed` hook?
3. Do we need browser support for per-test capture?
