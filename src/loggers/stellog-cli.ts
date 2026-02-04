#!/usr/bin/env node
/**
 * stellog CLI - Pretty-print JSON log output with custom level colors
 *
 * Usage: node app.js | stellog
 *
 * Pipes stdin through pino-pretty with custom level colors for
 * ops, userError, and progress levels.
 *
 * @module
 */

import pretty from "pino-pretty";

const stream = pretty({
    colorize: true,
    // Custom level names and their numeric values
    customLevels: "ops:45,userError:32,progress:25",
    // Custom colors for each level
    customColors: "ops:magenta,userError:yellow,progress:cyan",
    // Include timestamp in human-readable format
    translateTime: "SYS:standard",
    // Show level label
    levelFirst: true,
});

process.stdin.pipe(stream).pipe(process.stdout);

// Handle stdin ending
process.stdin.on("end", () => {
    process.exit(0);
});

// Handle errors gracefully
process.stdin.on("error", (err) => {
    if ((err as NodeJS.ErrnoException).code === "EPIPE") {
        process.exit(0);
    }
    console.error("stellog:", err.message);
    process.exit(1);
});

stream.on("error", (err) => {
    console.error("stellog:", err.message);
    process.exit(1);
});
