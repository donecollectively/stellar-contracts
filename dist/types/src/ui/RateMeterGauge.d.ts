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
import React from "react";
import type EventEmitter from "eventemitter3";
import type { CachedUtxoIndexEvents } from "../networkClients/UtxoIndex/CachedUtxoIndex.js";
export interface RateMeterGaugeProps {
    /** EventEmitter from CachedUtxoIndex.events (optional - shows idle state if not provided) */
    events?: EventEmitter<CachedUtxoIndexEvents>;
    /** Size of the gauge in pixels (default: 120) */
    size?: number;
    /** Maximum scale value (default: baseRefillRate * 1.5, or 10 before first metrics) */
    maxScale?: number;
}
export declare function RateMeterGauge({ events, size, maxScale: maxScaleProp, }: RateMeterGaugeProps): React.ReactElement;
export default RateMeterGauge;
//# sourceMappingURL=RateMeterGauge.d.ts.map