import { describe, expect, it, beforeEach, vi } from "vitest";
import { stellog, _resetConfigCache, _parseLoggingConfig } from "./stellog";

describe("stellog", () => {
    beforeEach(() => {
        _resetConfigCache();
        delete process.env.LOGGING;
    });

    describe("custom levels", () => {
        it("creates logger with custom level methods", () => {
            const log = stellog("test");
            expect(typeof log.progress).toBe("function");
            expect(typeof log.userError).toBe("function");
            expect(typeof log.ops).toBe("function");
        });

        it("progress level is 25", () => {
            const log = stellog("test");
            // Access the level value through pino's levels object
            expect(log.levels.values["progress"]).toBe(25);
        });
    });

    describe("LOGGING config parsing", () => {
        it("parses empty config", () => {
            const config = _parseLoggingConfig("");
            expect(config.facilities.size).toBe(0);
            expect(config.defaultLevel).toBe("warn");
        });

        it("parses simple facility:level", () => {
            const config = _parseLoggingConfig("myFacility:debug");
            expect(config.facilities.get("myFacility")).toBe("debug");
        });

        it("parses multiple facilities", () => {
            const config = _parseLoggingConfig("a:debug,b:info,c:warn");
            expect(config.facilities.get("a")).toBe("debug");
            expect(config.facilities.get("b")).toBe("info");
            expect(config.facilities.get("c")).toBe("warn");
        });

        it("supports default key", () => {
            const config = _parseLoggingConfig("default:info");
            expect(config.defaultLevel).toBe("info");
        });

        it("supports colons in facility names", () => {
            const config = _parseLoggingConfig("my:nested:facility:debug");
            expect(config.facilities.get("my:nested:facility")).toBe("debug");
        });

        it("treats standalone valid level as default", () => {
            const config = _parseLoggingConfig("debug");
            expect(config.defaultLevel).toBe("debug");
        });

        it("treats standalone invalid token as facility with info level", () => {
            const config = _parseLoggingConfig("myFacility");
            expect(config.facilities.get("myFacility")).toBe("info");
        });

        it("throws if level more restrictive than warn", () => {
            expect(() => _parseLoggingConfig("myFacility:error")).toThrow(
                /Cannot suppress below warn level/
            );
            expect(() => _parseLoggingConfig("myFacility:fatal")).toThrow(
                /Cannot suppress below warn level/
            );
        });

        it("allows warn level", () => {
            expect(() => _parseLoggingConfig("myFacility:warn")).not.toThrow();
        });

        it("supports custom levels in config", () => {
            const config = _parseLoggingConfig("myFacility:progress");
            expect(config.facilities.get("myFacility")).toBe("progress");
        });
    });

    describe("facility-based level lookup", () => {
        it("uses LOGGING env to set logger level", () => {
            process.env.LOGGING = "test:debug";
            _resetConfigCache();
            const log = stellog("test");
            expect(log.level).toBe("debug");
        });

        it("falls back to default level", () => {
            process.env.LOGGING = "default:info";
            _resetConfigCache();
            const log = stellog("unknown");
            expect(log.level).toBe("info");
        });

        it("falls back to warn when no config", () => {
            const log = stellog("test");
            expect(log.level).toBe("warn");
        });
    });

    describe("child loggers", () => {
        beforeEach(() => {
            process.env.LOGGING = "parent:warn,childFacility:debug";
            _resetConfigCache();
        });

        it("child(name) does LOGGING lookup", () => {
            const log = stellog("parent");
            const child = log.child("childFacility");
            expect(child.level).toBe("debug");
        });

        it("child(name, props) does LOGGING lookup and adds bindings", () => {
            const log = stellog("parent");
            const child = log.child("childFacility", { reqId: 123 });
            expect(child.level).toBe("debug");
            // The bindings are internal to pino
        });

        it("child({name}) does LOGGING lookup", () => {
            const log = stellog("parent");
            const child = log.child({ name: "childFacility" });
            expect(child.level).toBe("debug");
        });

        it("child({}) without name inherits parent level", () => {
            const log = stellog("parent");
            const child = log.child({ reqId: 456 });
            expect(child.level).toBe("warn"); // parent's level
        });

        it("child returns StellarLogger with custom levels", () => {
            const log = stellog("parent");
            const child = log.child("childFacility");
            expect(typeof child.progress).toBe("function");
            expect(typeof child.userError).toBe("function");
            expect(typeof child.ops).toBe("function");
        });
    });
});
