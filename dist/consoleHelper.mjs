function debugBox(msg, ...args) {
  console.debug(`%c${msg}`, "background: blue; color: white; padding: 2px 4px;", ...args);
}

export { debugBox as d };
//# sourceMappingURL=consoleHelper.mjs.map
