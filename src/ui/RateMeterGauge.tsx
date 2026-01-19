/**
 * RateMeterGauge - Circular speedometer visualization for rate limiter metrics
 *
 * Displays current request rate, rate limit threshold, and operational states
 * as an analog gauge. Consumes metrics from CachedUtxoIndex event emitter.
 *
 * REQT/dyf2tb78vk (SVG Gauge Structure)
 * REQT/7gzfvcb4w7 (Rate Limit Red Zone)
 * REQT/gy3tnvgtmd (Needle Indicator)
 * REQT/071fre8ztj (Numeric Display)
 * REQT/yvbwgkxace (State Visualization)
 * REQT/ytd4r23v30 (Event Integration)
 */

import React, { useEffect, useState } from "react";
import type EventEmitter from "eventemitter3";
import type { CachedUtxoIndexEvents } from "../networkClients/UtxoIndex/CachedUtxoIndex.js";
import type { RateLimiterMetrics } from "../networkClients/UtxoIndex/RateLimitedFetch.js";

export interface RateMeterGaugeProps {
    /** EventEmitter from CachedUtxoIndex.events */
    events: EventEmitter<CachedUtxoIndexEvents>;
    /** Size of the gauge in pixels (default: 120) */
    size?: number;
    /** Maximum scale value (default: baseRefillRate * 1.5, or 10 before first metrics) */
    maxScale?: number;
}

// Gauge geometry constants
// Arc spans from 7:30 (225°) to 4:30 (45°) = 270° sweep
const START_ANGLE = 225; // 7:30 position (degrees from 3 o'clock, counterclockwise)
const END_ANGLE = -45; // 4:30 position (same reference)
const SWEEP_DEGREES = 270;

/**
 * Converts a value to its angle on the gauge.
 * 0 -> 225° (7:30), max -> -45° (4:30)
 */
function valueToAngle(value: number, max: number): number {
    const ratio = Math.min(Math.max(value / max, 0), 1);
    return START_ANGLE - ratio * SWEEP_DEGREES;
}

/**
 * Converts degrees to radians.
 */
function degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

/**
 * Calculates a point on a circle given center, radius, and angle.
 */
function polarToCartesian(
    cx: number,
    cy: number,
    radius: number,
    angleDeg: number
): { x: number; y: number } {
    const rad = degToRad(angleDeg);
    return {
        x: cx + radius * Math.cos(rad),
        y: cy - radius * Math.sin(rad), // SVG y is inverted
    };
}

/**
 * Creates an SVG arc path from startAngle to endAngle.
 * Angles are in degrees, measured counterclockwise from 3 o'clock.
 */
function describeArc(
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number
): string {
    const start = polarToCartesian(cx, cy, radius, startAngle);
    const end = polarToCartesian(cx, cy, radius, endAngle);

    // Calculate sweep angle (handling wrap-around)
    let sweep = startAngle - endAngle;
    if (sweep < 0) sweep += 360;

    const largeArcFlag = sweep > 180 ? 1 : 0;
    // Sweep flag: 0 = counterclockwise in standard coords, but SVG y is inverted
    // so 0 = clockwise visually, 1 = counterclockwise visually
    const sweepFlag = 1;

    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
}

const defaultMetrics: RateLimiterMetrics = {
    requestsPerSecond: 0,
    currentRefillRate: 7,
    baseRefillRate: 7,
    availableBurst: 300,
    isRateLimited: false,
    isOnHold: false,
    isRecovering: false,
};

export function RateMeterGauge({
    events,
    size = 120,
    maxScale: maxScaleProp,
}: RateMeterGaugeProps): React.ReactElement {
    const [metrics, setMetrics] = useState<RateLimiterMetrics>(defaultMetrics);

    // REQT/ytd4r23v30: Subscribe to rateLimitMetrics on mount
    useEffect(() => {
        const handler = (m: RateLimiterMetrics) => setMetrics(m);
        events.on("rateLimitMetrics", handler);
        return () => {
            events.off("rateLimitMetrics", handler);
        };
    }, [events]);

    // Calculate dimensions
    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = size * 0.42;
    const arcRadius = size * 0.38;
    const needleLength = size * 0.32;
    const innerTickRadius = size * 0.28;

    // Scale: default to 1.5x base rate, or use prop
    const maxScale = maxScaleProp ?? Math.max(metrics.baseRefillRate * 1.5, 10);

    // Calculate angles
    const needleAngle = valueToAngle(metrics.requestsPerSecond, maxScale);
    const rateLimitAngle = valueToAngle(metrics.currentRefillRate, maxScale);

    // Arc paths
    const backgroundArc = describeArc(cx, cy, arcRadius, START_ANGLE, END_ANGLE);
    const redZoneArc = describeArc(cx, cy, arcRadius, rateLimitAngle, END_ANGLE);

    // Needle endpoint
    const needleTip = polarToCartesian(cx, cy, needleLength, needleAngle);

    // Label positions
    const zeroPos = polarToCartesian(cx, cy, innerTickRadius, START_ANGLE);
    const maxPos = polarToCartesian(cx, cy, innerTickRadius, END_ANGLE);
    const limitPos = polarToCartesian(cx, cy, outerRadius + 8, rateLimitAngle);

    // Colors based on state
    let gaugeColor = "#4ade80"; // green - normal
    let textColor = "#374151"; // gray-700
    if (metrics.isOnHold) {
        gaugeColor = "#ef4444"; // red
        textColor = "#ef4444";
    } else if (metrics.isRecovering) {
        gaugeColor = "#f59e0b"; // amber
    } else if (metrics.isRateLimited) {
        gaugeColor = "#f59e0b"; // amber when burst exhausted
    }

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ fontFamily: "system-ui, sans-serif" }}
        >
            {/* Background arc - REQT/dyf2tb78vk */}
            <path
                d={backgroundArc}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={size * 0.08}
                strokeLinecap="round"
            />

            {/* Red zone arc - REQT/7gzfvcb4w7 */}
            <path
                d={redZoneArc}
                fill="none"
                stroke="#fca5a5"
                strokeWidth={size * 0.08}
                strokeLinecap="round"
                style={{
                    transition: "d 300ms ease-out",
                }}
            />

            {/* Active arc (shows current rate) */}
            {metrics.requestsPerSecond > 0 && (
                <path
                    d={describeArc(cx, cy, arcRadius, START_ANGLE, needleAngle)}
                    fill="none"
                    stroke={gaugeColor}
                    strokeWidth={size * 0.06}
                    strokeLinecap="round"
                    style={{
                        transition: "stroke 200ms ease-out",
                    }}
                />
            )}

            {/* Needle - REQT/gy3tnvgtmd */}
            <line
                x1={cx}
                y1={cy}
                x2={needleTip.x}
                y2={needleTip.y}
                stroke={textColor}
                strokeWidth={size * 0.025}
                strokeLinecap="round"
                style={{
                    transition: "x2 200ms ease-out, y2 200ms ease-out",
                    transformOrigin: `${cx}px ${cy}px`,
                }}
            />

            {/* Needle pivot */}
            <circle cx={cx} cy={cy} r={size * 0.04} fill={textColor} />

            {/* Scale labels - REQT/071fre8ztj */}
            <text
                x={zeroPos.x}
                y={zeroPos.y + size * 0.02}
                fontSize={size * 0.08}
                fill="#9ca3af"
                textAnchor="middle"
            >
                0
            </text>
            <text
                x={maxPos.x}
                y={maxPos.y + size * 0.02}
                fontSize={size * 0.08}
                fill="#9ca3af"
                textAnchor="middle"
            >
                {Math.round(maxScale)}
            </text>

            {/* Rate limit label (at red zone boundary) */}
            <text
                x={limitPos.x}
                y={limitPos.y}
                fontSize={size * 0.07}
                fill="#ef4444"
                textAnchor="middle"
                style={{
                    transition: "x 300ms ease-out, y 300ms ease-out",
                }}
            >
                {Math.round(metrics.currentRefillRate)}
            </text>

            {/* Current rate (large) - REQT/071fre8ztj */}
            <text
                x={cx}
                y={cy + size * 0.18}
                fontSize={size * 0.2}
                fontWeight="bold"
                fill={textColor}
                textAnchor="middle"
                style={{
                    transition: "fill 200ms ease-out",
                }}
            >
                {metrics.requestsPerSecond}
            </text>

            {/* Unit label */}
            <text
                x={cx}
                y={cy + size * 0.28}
                fontSize={size * 0.07}
                fill="#9ca3af"
                textAnchor="middle"
            >
                req/s
            </text>

            {/* State indicators - REQT/yvbwgkxace */}
            {metrics.isOnHold && (
                <text
                    x={cx}
                    y={cy - size * 0.15}
                    fontSize={size * 0.1}
                    fontWeight="bold"
                    fill="#ef4444"
                    textAnchor="middle"
                    style={{
                        animation: "pulse 1s ease-in-out infinite",
                    }}
                >
                    HOLD
                </text>
            )}
            {metrics.isRecovering && !metrics.isOnHold && (
                <text
                    x={cx}
                    y={cy - size * 0.15}
                    fontSize={size * 0.08}
                    fill="#f59e0b"
                    textAnchor="middle"
                >
                    recovering
                </text>
            )}

            {/* Burst indicator (small) */}
            <text
                x={cx}
                y={cy + size * 0.38}
                fontSize={size * 0.06}
                fill={metrics.isRateLimited ? "#ef4444" : "#9ca3af"}
                textAnchor="middle"
            >
                burst: {Math.round(metrics.availableBurst)}
            </text>

            {/* CSS for pulse animation */}
            <style>
                {`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                `}
            </style>
        </svg>
    );
}

export default RateMeterGauge;
