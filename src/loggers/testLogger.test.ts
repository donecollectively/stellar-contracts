import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync, rmSync } from "fs";
import {
    setupTestLogger,
    getTestLogger,
    teardownTestLogger,
    withTestLogger,
} from "./testLogger";

const LOG_DIR = "./test-logs";

describe("testLogger", () => {
    describe("file mode", () => {
        beforeEach((ctx) => {
            setupTestLogger(ctx.task.name, { mode: "file", logDir: LOG_DIR });
        });

        afterEach(() => {
            teardownTestLogger();
        });

        it("writes JSON to file", async () => {
            const log = getTestLogger();
            log.info("Test message 1");
            log.warn("Test warning");
            log.debug("Debug info");

            // Wait for flush
            await new Promise((r) => setTimeout(r, 50));

            const logFile = `${LOG_DIR}/writes_JSON_to_file.ndjson`;
            expect(existsSync(logFile)).toBe(true);

            const content = readFileSync(logFile, "utf8");
            const lines = content.trim().split("\n").map((l) => JSON.parse(l));

            expect(lines.length).toBeGreaterThanOrEqual(2); // info + warn (debug may be filtered)
            expect(lines[0].msg).toBe("Test message 1");
        });
    });

    describe("both mode (stderr + file)", () => {
        beforeEach((ctx) => {
            setupTestLogger(ctx.task.name, { mode: "both", logDir: LOG_DIR });
        });

        afterEach(() => {
            teardownTestLogger();
        });

        it("writes to file and stderr", () => {
            const log = getTestLogger();
            log.info("Visible in stderr AND saved to file");
            log.progress("Progress update");
        });
    });

    describe("withTestLogger helper", () => {
        withTestLogger(beforeEach, afterEach, { mode: "file", logDir: LOG_DIR });

        it("auto-setup writes to file", () => {
            const log = getTestLogger();
            log.info("Auto-setup works!");
        });
    });
});
