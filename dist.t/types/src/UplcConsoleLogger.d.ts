import type { Site } from "@helios-lang/compiler-utils";
import type { UplcLogger } from "@helios-lang/uplc";
type Group = {
    name: string;
    lines: (LineOrGroup)[];
    result?: string;
    collapsed?: boolean;
};
type LineOrGroup = string | Group;
export declare class UplcConsoleLogger implements UplcLogger {
    didStart: boolean;
    lastMessage: string;
    lastReason?: "build" | "validate";
    history: string[];
    groupStack: Group[];
    constructor();
    get currentGroupLines(): LineOrGroup[];
    get topLines(): LineOrGroup[];
    reset(reason: "build" | "validate"): void;
    interesting: number;
    logPrint(message: string, site?: Site): this;
    get currentGroup(): Group;
    logError(message: string, stack?: Site): void;
    toggler: number;
    toggleDots(): void;
    get isMine(): boolean;
    resetDots(): void;
    showDot(): "│   ┊ " | "│ ● ┊ ";
    fullHistory(): string;
    formattedHistory: string[];
    fullFormattedHistory(): string;
    formatGroup(group: Group): string[];
    formatLines(lines: LineOrGroup[]): string[];
    flushLines(footerString?: string): void;
    finish(): this;
    get groupLines(): LineOrGroup[];
    flush(): this;
    flushError(message?: string): this;
}
export {};
//# sourceMappingURL=UplcConsoleLogger.d.ts.map