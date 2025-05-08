import { describe, expect, it } from "vitest";
import {debugMath, realDiv} from "../src/utils.js"

const fit = it.only;
describe("realDiv", () => {
    it("throws error when dividing by 0", () => {
        expect(() => realDiv(1, 0)).toThrow();
    });

    it("divides 0 by anything to get 0", () => {
        expect(realDiv(0, 1)).toBe(0);
        expect(realDiv(0, 42)).toBe(0);
    });

    it("divides anything by one to get itself", () => {
        expect(realDiv(1, 1)).toBe(1);
        expect(realDiv(42, 1)).toBe(42);
        expect(realDiv(123.123123, 1)).toBe(123.123123);
    });

    it("divides anything by itself to get 1", () => {
        expect(realDiv(1, 1)).toBe(1);
        expect(realDiv(42, 42)).toBe(1);
        expect(realDiv(123.123123, 123.123123)).toBe(1);
    });

    it("divides 2.5 by 2.0 to get 1.25", () => {
        expect(realDiv(2.5, 2.0)).toBe(1.25);
    });

    it("divides 1.00001 by 10 to get 0.100001", () => {
        expect(realDiv(1.00001, 10)).toBe(0.100001);
    });
    
    it("loses precision when dividing small fractions by larger numbers", () => {
        expect(debugMath( () => realDiv(0.00001, 100) ), "zero-point-small / 100 should be 0").toBe(0.000000)        
        expect(debugMath( () => realDiv(1.00001, 100) ), "one-point-small / 100 should be 0.01").toBe(0.010000)
    })

    it("divides negative numbers correctly", () => {
        expect(realDiv(-1.00001, 10)).toBe(-0.100001);
        expect(realDiv(1.00001, -10)).toBe(-0.100001);
        expect(realDiv(-1.00001, -10)).toBe(0.100001);
    });

    it("divides 0.035 by 1.166667 to get 0.03", () => {
        expect(realDiv(0.035, 1.166667)).toBe(0.03);
    });

    it("-0.035 / 1.166667 == -0.03", () => {
        expect(realDiv(-0.035, 1.166667)).toBe(-0.03);
    });

    it("-0.035 / -1.166667 == 0.03", () => {
        expect(realDiv(-0.035, -1.166667)).toBe(0.03);
    });

    it("0.035 / -1.166667 == -0.03", () => {
        expect(realDiv(0.035, -1.166667)).toBe(-0.03);
    });

})

