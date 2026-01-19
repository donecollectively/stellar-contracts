# RateMeterGauge

## MAINTAINERS MUST READ:

> **🛑 COMPLIANCE TRIGGER: READ THIS FIRST**
> Before modifying this requirements document, you MUST:
> 1. Read and fully understand `skillz/reqm/reqm.SKILL.md`
> 2. Follow all requirements format guidelines including UUT generation via `mkids`
> 3. Never modify Implementation Log history - only append
> 4. Use RFC 2119 language (MUST/SHOULD/MAY) consistently
>
> **hash.notice.reqt-consumer**: ef6a1fc351265553

> NOTE: See [reqm.SKILL.md](../../skillz/reqm/reqm.SKILL.md); When managing requirements, you MUST follow the guidelines and conventions in that document.

## About RateMeterGauge

The RateMeterGauge is a React component that visualizes API rate limiting metrics as a circular speedometer gauge. It displays the current request rate, rate limit thresholds, and available burst capacity in an intuitive analog meter format.

This component consumes metrics events from `CachedUtxoIndex` (which forwards them from `RateLimitedFetch`) and renders them using SVG graphics with smooth CSS transitions. The gauge provides at-a-glance visibility into API consumption patterns, helping users understand when rate limiting is active or imminent.

**Essential Technologies**: React, SVG, CSS Transitions, EventEmitter3
**Related Technologies**: CachedUtxoIndex, RateLimitedFetch (metrics source)

## Must Read: Special Skills and Know-how

This section provides directives for proactive-research triggers.

1. **Rate Limiter Internals**: When implementing metric interpretation logic, you MUST first read `src/networkClients/UtxoIndex/RateLimitedFetch.ts` to understand the token bucket algorithm and recovery mechanics.
2. **Event Interface**: Before modifying event subscriptions, you SHOULD review the `CachedUtxoIndexEvents` interface in `src/networkClients/UtxoIndex/CachedUtxoIndex.ts` to understand the full event catalog.

## Collaborators

- **USED BY RateMeterGauge**: `EventEmitter3` for metrics subscription, `RateLimiterMetrics` type from `RateLimitedFetch.ts`
- **Expected to USE RateMeterGauge**: React applications using `CachedUtxoIndex` for blockchain data caching
- **First-class instances that USE RateMeterGauge**: `CapoDappProvider` UI components displaying sync status

## Background

When interacting with the Blockfrost API through `CachedUtxoIndex`, rate limiting is a critical operational concern. The rate limiter uses a token bucket algorithm with:

1. **Burst Capacity**: Maximum of 300 requests can be made in rapid succession
2. **Refill Rate**: Tokens refill at 7 per second (default), reduced during recovery
3. **Recovery Mode**: After HTTP 429, refill rate drops to half and gradually recovers
4. **Hold State**: Requests pause for 10 seconds after hitting external rate limits

Without visibility into these metrics, users cannot understand why operations may be delayed or why sync performance varies. The RateMeterGauge addresses this by providing real-time visualization of:

- Current request rate (requests per second)
- Available burst capacity
- Rate limit threshold changes during recovery
- Hold and recovery states

## RateMeterGauge Design Goals

### General Approach

- Single SVG-based React component with no external charting dependencies
- Receives metrics via EventEmitter subscription pattern
- Uses CSS transitions for smooth needle and arc animations
- Minimal footprint suitable for embedding in status bars or dashboards

### Specific Goals

1. **Intuitive Analog Visualization**: Present rate limiting data as a familiar speedometer gauge that users can interpret at a glance without understanding the underlying algorithm.
2. **Real-time Updates**: Reflect metric changes within 100ms with smooth animated transitions between states.
3. **Clear Rate Limit Indication**: Show the current rate limit as a red "danger zone" arc that visually expands when the limit decreases during recovery.
4. **Numeric Precision**: Display key values (current rate, max rate, limit) as readable numbers alongside the analog display.
5. **Compact & Scalable**: Support various sizes through a simple `size` prop while maintaining visual clarity.
6. **State Awareness**: Visually indicate special states (on hold, recovering) through color changes or indicators.

## The Development Plan

We will start simple with essential requirements and develop incrementally to achieve key results, a bit at a time. Implementer should focus exclusively on achieving one incremental result at a time.

BACKLOGGED items SHOULD be considered in the structural design, but implementation MUST focus entirely on IN-PROGRESS requirements. COMPLETED requirements that are working MUST be retained in working order. NEXT requirements are those that can be implemented and work, based on having their dependencies already working or sufficiently stubbed.

## Functional Areas and Key Requirements

### 1. Gauge Geometry

#### Functional Requirements:
1. **Arc Layout**:
    - MUST render a circular arc from 7:30 position (225°) to 4:30 position (315° past 12 o'clock = 45° relative to 3 o'clock)
    - The sweep covers 270° total (from 225° counterclockwise to 315°)
    - Zero position MUST be at 7:30 (225°)
    - Maximum value position MUST be at 4:30 (45°)
2. **Scaling**:
    - MUST accept a `size` prop (default: 120px) that scales the entire gauge proportionally
    - All internal dimensions MUST be relative to this size

### 2. Rate Limit Arc Display

#### Functional Requirements:
1. **Red Zone Arc**:
    - MUST display a red arc representing the rate-limited zone
    - Default position: from 3:00 to 4:30 (covering the top ~60° of the scale)
    - MUST grow counterclockwise when `currentRefillRate` decreases below `baseRefillRate`
2. **Arc Animation**:
    - MUST animate arc changes smoothly using CSS transitions
    - Transition duration SHOULD be ~300ms

### 3. Needle Display

#### Functional Requirements:
1. **Rate Needle**:
    - MUST display a needle indicating `requestsPerSecond`
    - MUST animate smoothly between values
    - MUST be styled distinctly (e.g., pointer shape with pivot at center)
2. **Scale Mapping**:
    - `requestsPerSecond` of 0 MUST position needle at 7:30
    - `requestsPerSecond` equal to `baseRefillRate` MUST position needle at 3:00 (the default rate limit boundary)

### 4. Numeric Displays

#### Functional Requirements:
1. **Current Rate (Large)**:
    - MUST display current `requestsPerSecond` as a large, prominent number
    - SHOULD be positioned centrally within or below the gauge arc
2. **Scale Labels (Small)**:
    - MUST display "0" near the 7:30 position
    - MUST display max scale value near the 4:30 position
    - MUST display current rate limit value at the red zone boundary
3. **Burst Indicator**:
    - MAY display `availableBurst` as secondary information
    - SHOULD indicate when burst is exhausted (`isRateLimited`)

### 5. State Indicators

#### Functional Requirements:
1. **Hold State**:
    - MUST visually indicate when `isOnHold` is true (e.g., pulsing red, "HOLD" label)
2. **Recovery State**:
    - MUST visually indicate when `isRecovering` is true (e.g., yellow/amber tint)
3. **Normal State**:
    - SHOULD display green/neutral coloring when operating normally

### 6. Event Integration

#### Functional Requirements:
1. **EventEmitter Subscription**:
    - MUST accept an `EventEmitter` instance (from `CachedUtxoIndex.events`) as a prop
    - MUST subscribe to `rateLimitMetrics` event on mount
    - MUST unsubscribe on unmount
2. **Fallback Rendering**:
    - MUST render a reasonable default state before first metrics event

---

# Requirements

## Component: RateMeterGauge

### REQT-1.0/dyf2tb78vk: COMPLETED: **SVG Gauge Structure**

#### Purpose: Establishes the foundational SVG structure and geometry. Applied when creating or modifying the gauge's visual layout.

 - **REQT-1.0.1**/m1b61a2xgh: COMPLETED: MUST render an SVG element with viewBox scaled to `size` prop (default 120)
 - **REQT-1.0.2**/ytd4r23v30: COMPLETED: MUST render background arc from 225° to 45° (270° sweep, counterclockwise from 7:30 to 4:30)
 - **REQT-1.0.3**/zez2rnncz7: COMPLETED: MUST use stroke-based arcs (not filled wedges) for clean gauge appearance

### REQT-1.1/7gzfvcb4w7: COMPLETED: **Rate Limit Red Zone**

#### Purpose: Governs the visual representation of the rate-limited danger zone. Applied when implementing or adjusting the red arc display.

 - **REQT-1.1.1**/fxfa3034wg: COMPLETED: MUST render red arc from the position corresponding to `currentRefillRate` to 4:30 (45°)
 - **REQT-1.1.2**/e1sbp3k00j: COMPLETED: MUST expand red arc counterclockwise when `currentRefillRate < baseRefillRate`
 - **REQT-1.1.3**/6aactpv9c8: COMPLETED: MUST animate red arc position changes with CSS transition (~300ms ease-out)

### REQT-1.2/gy3tnvgtmd: COMPLETED: **Needle Indicator**

#### Purpose: Defines the needle behavior for indicating current request rate. Applied when implementing the needle component.

 - **REQT-1.2.1**/qa12srtmn2: COMPLETED: MUST render needle pivoting from gauge center
 - **REQT-1.2.2**/hcs7jktjg2: COMPLETED: MUST position needle at 225° when `requestsPerSecond` = 0
 - **REQT-1.2.3**/scknyt1a5d: COMPLETED: MUST position needle at angle corresponding to `requestsPerSecond` relative to scale maximum
 - **REQT-1.2.4**/fvy98mzy0q: COMPLETED: MUST animate needle rotation with CSS transition (~200ms ease-out)

### REQT-1.3/071fre8ztj: COMPLETED: **Numeric Display**

#### Purpose: Specifies the numeric readouts shown on the gauge. Applied when implementing text labels and values.

 - **REQT-1.3.1**/wmmjdka66q: COMPLETED: MUST display `requestsPerSecond` as large centered number (prominent, readable)
 - **REQT-1.3.2**/5j2fhgbgge: COMPLETED: MUST display "0" label near 7:30 position
 - **REQT-1.3.3**/jdy9846msg: COMPLETED: MUST display scale maximum label near 4:30 position
 - **REQT-1.3.4**/yvnxkvget6: COMPLETED: MAY display `availableBurst` as secondary indicator

### REQT-1.4/yvbwgkxace: COMPLETED: **State Visualization**

#### Purpose: Defines visual feedback for operational states (hold, recovery). Applied when implementing state indicator logic.

 - **REQT-1.4.1**/kf06cys92c: COMPLETED: MUST indicate `isOnHold` state visually (e.g., red pulse, "HOLD" text)
 - **REQT-1.4.2**/dyf2tb78vk: COMPLETED: MUST indicate `isRecovering` state visually (e.g., amber/yellow tint)
 - **REQT-1.4.3**/m1b61a2xgh: COMPLETED: SHOULD use green/neutral coloring for normal operating state

### REQT-2.0/ytd4r23v30: COMPLETED: **Event Integration**

#### Purpose: Governs subscription to metrics events. Applied when implementing the component's data flow.

 - **REQT-2.0.1**/zez2rnncz7: COMPLETED: MUST accept `events` prop of type `EventEmitter<CachedUtxoIndexEvents>`
 - **REQT-2.0.2**/7gzfvcb4w7: COMPLETED: MUST subscribe to `rateLimitMetrics` event on component mount
 - **REQT-2.0.3**/fxfa3034wg: COMPLETED: MUST unsubscribe from `rateLimitMetrics` event on component unmount
 - **REQT-2.0.4**/e1sbp3k00j: COMPLETED: MUST render sensible defaults before first metrics event received

### REQT-2.1/6aactpv9c8: BACKLOG: **Props Interface**

#### Purpose: Defines the component's public API. Applied when documenting or extending the component interface.

 - **REQT-2.1.1**/gy3tnvgtmd: BACKLOG: MUST export `RateMeterGaugeProps` interface
 - **REQT-2.1.2**/qa12srtmn2: BACKLOG: MUST accept `size?: number` prop (default: 120)
 - **REQT-2.1.3**/hcs7jktjg2: BACKLOG: MUST accept `events: EventEmitter<CachedUtxoIndexEvents>` prop
 - **REQT-2.1.4**/scknyt1a5d: BACKLOG: MAY accept `maxScale?: number` prop for custom scale maximum

---

## Files

1. `./RateMeterGauge.tsx` - Main component implementation
2. `./RateMeterGauge.reqts.md` - This requirements document

---

## Implementation Log

Meta-requirements: maintainers MUST NOT modify past details in the implementation log (e.g. in response to architectural changes). Instead, future changes should be appended to the implementation log to show the progression of the implementation and architecture.

### Phase 0: Requirements Definition (Completed)

 - Defined component purpose and scope
 - Documented metrics interface from `RateLimitedFetch.ts`
 - Established gauge geometry specifications (7:30 to 4:30 arc)
 - Defined red zone behavior for rate limit visualization
 - Specified numeric display requirements
 - Defined event integration pattern

### Phase 1: Core Implementation (Completed)

 - Implemented SVG gauge structure with 270° arc (7:30 to 4:30)
 - Added animated needle with CSS transitions (200ms ease-out)
 - Implemented dynamic red zone arc that expands when rate limit decreases
 - Added numeric displays: current rate (large), scale labels (0, max), rate limit indicator
 - Implemented state indicators: HOLD (red pulse), recovering (amber), normal (green)
 - Integrated EventEmitter subscription with proper mount/unmount lifecycle
 - Added burst capacity display as secondary indicator
 - Exported component from `src/ui/index.ts`

#### Next Recommendations

1. **Props Interface Export**: Export `RateMeterGaugeProps` for TypeScript consumers
2. **Custom Scale Maximum**: Add support for `maxScale` prop customization
3. **Visual Polish**: Consider adding tick marks on the scale

---

## Release Management Plan

### v1 (Current - Complete)

- **Goal**: Functional rate meter with core visualization
- **Criteria**:
    - SVG gauge renders with correct geometry (REQT-1.0) ✓
    - Needle animates smoothly based on metrics (REQT-1.2) ✓
    - Red zone displays and animates (REQT-1.1) ✓
    - Event subscription works correctly (REQT-2.0) ✓
    - Hold and recovery states indicated (REQT-1.4) ✓
    - Burst capacity display (REQT-1.3.4) ✓

### v2 (Future)

- **Goal**: Enhanced customization and visual polish
- **Criteria**:
    - Exported `RateMeterGaugeProps` interface (REQT-2.1.1)
    - Tick marks on scale
    - Theme customization (colors)
