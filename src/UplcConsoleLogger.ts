import type { Site } from "@helios-lang/compiler-utils";
import type { UplcLogger } from "@helios-lang/uplc";

type Group = {
    name: string;
    lines: (LineOrGroup)[];
    result?: string;
}

type LineOrGroup = string | Group;

export class UplcConsoleLogger implements UplcLogger {
    didStart: boolean = false;
    // lines: LineOrGroup[] = [];
    lastMessage: string = "";
    lastReason?: "build" | "validate";
    history: string[] = [];
    groupStack: Group[] = [{
        name: "",
        lines: []
    }];

    constructor() {
        this.logPrint = this.logPrint.bind(this);
        // this.printlnFunction = this.printlnFunction.bind(this);
        this.reset = this.reset.bind(this);
    }

    get currentGroupLines() {
        return this.groupStack.at(-1)!.lines;
    }

    get topLines() {
        return this.groupStack.at(0)!.lines;
    }

    reset(reason: "build" | "validate") {
        this.lastMessage = "";
        this.lastReason = reason;
        this.groupStack = [{
            name: "",
            lines: []
        }];
        // console.log("    ---- resetting printer due to " + reason);
        // this.didStart = false;
        if (reason == "build") {
            // throw new Error(`unexpected`)
            // this.lines = [];
            this.groupStack[0].lines = [];
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

    interesting = 0
    logPrint(message: string, site?: Site) {
        // if ( global.validating) debugger
        // if (msg == "no") { debugger }
        // if (this.lastReason && this.lastReason == "validate") {
        //     debugger
        // }

        if (message.match(/STokMint/)) {
            this.interesting = 1
        }
        // 🐣 = bird in egg (think "nest")
        if (message.startsWith("🐣 ")) {
            const groupName = message.replace("🐣 ", "");
            const nextGroup = {
                name: groupName,
                lines: []
            };
            this.currentGroupLines.push(nextGroup)
            this.groupStack.push(nextGroup);
            
            return this;
        } else if (message.startsWith("🥚 ")) {
            // 🥚 = egg (think "close up that container")
            const rest = message.replace("🥚 ", "");
            this.currentGroup.result = rest
            this.groupStack.pop()
            return this
        }
        
        if ("string" != typeof message) {
            console.log("wtf");
        }
        // if (message && message.at(-1) != "\n") {
        //     message += "\n";
        // }
        this.lastMessage = message;
        this.currentGroup.lines.push(...message.split("\n"));
        return this;
    }

    get currentGroup() {
        const group = this.groupStack.at(-1);
        if (!group) {
            throw new Error("Too many groupEnds called in contract script");
        }
        return group;
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

    fullHistory() {
        return this.history.join("\n");
    }
    formattedHistory: string[] = [];
    fullFormattedHistory() {
        return this.formattedHistory.join("\n")
    }

    // formatGroupedOutput() {
    //     const content: string[] = [];
    //     const terminalWidth = process?.stdout?.columns || 65;
    //     for (const group of this.groupStack) {
    //         content.push(... this.formatGroup(group));

    //         let {name, lines} = group;
    //         if (name) name = `  ${name}  `;
    //         const groupHeader = `╭${name}`;
    //         content.push(groupHeader);
    //         content.push(lines.map(line => ` │ ${line}`).join("\n"));
    //         let lastLine = lines.at(-1)
    //         if (lastLine && lastLine.startsWith("╰")) {
    //             lastLine = `╰ ${lastLine.slice(1)}`;
    //         }
    //         content.push(lastLine);
    //     }
    // }

    formatGroup(group: Group) : string[] {
        let {name, lines, result=""} = group;
        const terminalWidth = process?.stdout?.columns || 65;

        const content: string[] = [];
        const groupHeader = `${name}`;
        content.push(groupHeader);
        const formattedLines = this.formatLines(lines)
        const indentedLines = formattedLines.map(line => `  │ ${line}`);
        content.push(... indentedLines);
        const lastLine = formattedLines.at(-1);

        const happySimpleResult = result && result == "✅" ?  "✅"  : ""
        const noResult = !result
        const noResultClosingLine = noResult ?  "┈".repeat(terminalWidth - 5) : ""

        if ((noResult || happySimpleResult) && lastLine && lastLine?.match(/^\s+╰/)) {
            const innerLine = lastLine.replace(/^\s+/, "")
            // coalesces groups:
            const marker = happySimpleResult || "┈"
            let replacementLastLine =  `  ╰${marker} ${innerLine}`;
            // if (replacementLastLine.length < terminalWidth) {
            //     const extra = "┈".repeat(terminalWidth - replacementLastLine.length - 1)
            //     replacementLastLine += " " + extra
            if (replacementLastLine.length > terminalWidth) {
                const tooMuch = replacementLastLine.length - terminalWidth
                if (replacementLastLine.endsWith("┈".repeat(tooMuch))) {
                    replacementLastLine = replacementLastLine.slice(0, -tooMuch)
                }
            }
            // replacementLastLine = `  ╰${marker} ${replacementLastLine}`;
            content.splice(-1, 1, replacementLastLine)
        } else if ((happySimpleResult || noResult) && lastLine?.match(/^\s*✅/)) {
            // combines the success-indicator on the last line
            // with the "close group" indicator
            const replacementLastLine = `  ╰ ${lastLine.replace(/^\s+/, "")}`;
            content.splice(-1, 1, replacementLastLine)
        } else if (result) {
            const extraClosingLine = `  ╰ ${result}`;
            content.push(extraClosingLine)
        } else {
            const extraClosingLine = `  ╰${noResultClosingLine}`;
            content.push(extraClosingLine)
        }

        // content.push(lastLine);
        return content;
    }

    formatLines(lines: LineOrGroup[]) : string[] {
        const content: string[] = [];
        for (const line of lines) {
            if (typeof line == "string") {
                content.push(line);
            } else {
                content.push(... this.formatGroup(line));
            }
        }
        content.at(-1)?.replace(/\n+$/, "");
        while(content.at(-1)?.match(/^\n?$/)) {
            content.pop();
        }
        return content;
    }

    flushLines(footerString?: string) {
        // this.lines.push(this.accumulator.join(""))
        let content: string[] = [];
        // get terminal width if available:
        const terminalWidth = process?.stdout?.columns || 65;
        const formattedLines = this.formatLines(this.topLines);
        this.history.push(formattedLines.join("\n"));
        if (!this.didStart) {
            this.didStart = true;
            content.push("╭┈┈┈┬" + "┈".repeat(terminalWidth - 5) + "\n");
            this.resetDots();
        } else if (this.topLines.length) {
            content.push("├┈┈┈┼" + "┈".repeat(terminalWidth - 5) + "\n");
            this.resetDots();
        }
        for (const line of formattedLines) {
            //"│" or "┊" or "┆" or "┇" // unicode tiny  circle "·"
            content.push(`${this.showDot()}${line}\n`);
        }
        // adds a little extra space before the footer
        content.push(this.showDot() + "\n");
        // feed extra space if needed for the dots to look consistent
        if (!this.toggler) {
            content.push(this.showDot() + "\n");
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
        const joined = content.join("");
        this.formattedHistory.push(joined);
        console.log(joined);
        this.groupStack[0] = {
            name: "",
            lines: []
        }
    }
    finish() {
        this.flushLines(
            "╰┈┈┈┴" + "┈".repeat((process?.stdout?.columns || 65) - 5)
        );
        return this;
    }

    get groupLines() {
        return this.groupStack.at(-1)?.lines || [];
    }

    flush() {
        if (this.topLines.length) {
            // console.log("    ---- flushing lines");
            if (this.lastMessage.at(-1) != "") {
                this.groupLines.push("");
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
            this.groupLines.push("\n");
        }
        if (message.at(-1) == "\n") {
            message = message.slice(0, -1);
        }
        const terminalWidth = process?.stdout?.columns || 65;
        if (message) this.logError(message);
        if (this.topLines.length) {
            this.flushLines(
                "⎽⎼⎻⎺⎻⎺⎼⎼⎻⎺⎻⎽⎼⎺⎻⎻⎺⎼⎼⎻⎺".repeat((terminalWidth - 2) / 21)
            );
        }
        // this.didStart = false;
        return this;
    }
}
