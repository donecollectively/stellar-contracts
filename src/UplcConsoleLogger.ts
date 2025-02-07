import type { Site } from "@helios-lang/compiler-utils";
import type { UplcLogger } from "@helios-lang/uplc";

export class UplcConsoleLogger implements UplcLogger {
    didStart: boolean = false;
    lines: string[] = [];
    lastMessage: string = "";
    lastReason?: "build" | "validate";
    history: string[] = [];

    constructor() {
        this.logPrint = this.logPrint.bind(this);
        // this.printlnFunction = this.printlnFunction.bind(this);
        this.reset = this.reset.bind(this);
    }
    reset(reason: "build" | "validate") {
        this.lastMessage = "";
        this.lastReason = reason;
        // console.log("    ---- resetting printer due to " + reason);
        // this.didStart = false;
        if (reason == "build") {
            // throw new Error(`unexpected`)
            this.lines = [];
            return;
        }
        if (reason == "validate") {
            this.flush();
            return;
        }
    }
    // log(...msgs: string[]) {
    //     return this.logPrint(...msgs);
    // }
    // error(...msgs: string[]) {
    //     return this.logError(...msgs, "\n");
    // }

    // logPrintLn(...msgs: string[]) {
    //     return this.logPrint(...msgs, "\n");
    // }

    logPrint(message: string, site?: Site) {
        // if ( global.validating) debugger
        // if (msg == "no") { debugger }
        // if (this.lastReason && this.lastReason == "validate") {
        //     debugger
        // }
        
        if ("string" != typeof message) {
            console.log("wtf");
        }
        if (message && message.at(-1) != "\n") {
            message += "\n";
        }
        this.lastMessage = message;
        this.lines.push(message);
        return this;
    }
    logError(message: string, stack? : Site) {
        this.logPrint("\n");
        this.logPrint(
            "-".repeat((process?.stdout?.columns || 65) - 8)
        );
        this.logPrint("--- ⚠️  ERROR: " + message.trimStart() + "\n");
        this.logPrint(
            "-".repeat((process?.stdout?.columns || 65) - 8) + "\n"
        );
        // return this;
    }
    // printlnFunction(msg) {
    //     console.log("                              ---- println")
    //     this.lines.push(msg);
    //     this.lines.push("\n");
    //     this.flushLines();
    // }
    toggler = 0;
    toggleDots() {
        this.toggler = 1 - this.toggler;
    }
    get isMine() {
        return true;
    }
    resetDots() {
        this.toggler = 0;
    }
    showDot() {
        // ◌ or ●
        const s = this.toggler ? "│   ┊ " : "│ ● ┊ ";
        this.toggleDots();
        return s;
    }

    flushLines(footerString?: string) {
        // this.lines.push(this.accumulator.join(""))
        let content: string[] = [];
        // get terminal width if available:
        const terminalWidth = process?.stdout?.columns || 65;
        const thisBatch = this.lines.join("").trimEnd();
        this.history.push(thisBatch);
        if (!this.didStart) {
            this.didStart = true;
            content.push("╭┈┈┈┬" + "┈".repeat(terminalWidth - 5));
            this.resetDots();
        } else if (this.lines.length) {
            content.push("├┈┈┈┼" + "┈".repeat(terminalWidth - 5));
            this.resetDots();
        }
        for (const line of thisBatch.split("\n")) {
            //"│" or "┊" or "┆" or "┇" // unicode tiny  circle "·"
            content.push(`${this.showDot()}${line}`);
        }
        // adds a little extra space before the footer
        content.push(this.showDot());
        // feed extra space if needed for the dots to look consistent
        if (!this.toggler) {
            content.push(this.showDot());
        }
        if (footerString) {
            // if (!this.toggler && abortMarker) {
            //     content.push(this.showDot());
            // }
            content.push(footerString);
            // if (abortMarker) {
            //     content.push(abortMarker);
            // }
        }
        console.log(content.join("\n"));
        this.lines = [];
    }
    finish() {
        this.flushLines(
            "╰┈┈┈┴" + "┈".repeat((process?.stdout?.columns || 65) - 5)
        );
        return this;
    }
    flush() {
        if (this.lines.length) {
            // console.log("    ---- flushing lines");
            if (this.lastMessage.at(-1) != "\n") {
                this.lines.push("\n");
            }
            this.flushLines();
            //     "╰,"┈"
            // );
        }
        // console.log("╰ // ──────
        return this;
    }
    flushError(message: string = "") {
        // if (this.lastMsg == message) {
        //     this.lines.pop();
        // }
        if (this.lastMessage.at(-1) != "\n") {
            this.lines.push("\n");
        }
        if (message.at(-1) == "\n") {
            message = message.slice(0, -1);
        }
        const terminalWidth = process?.stdout?.columns || 65;
        if (message) this.logError(message);
        if (this.lines.length) {
            this.flushLines(
                "⎽⎼⎻⎺⎻⎺⎼⎼⎻⎺⎻⎽⎼⎺⎻⎻⎺⎼⎼⎻⎺".repeat((terminalWidth - 2) / 21)
            );
        }
        // this.didStart = false;
        return this;
    }
}
