export function debugBox(msg: string, ...args: any[]) {
    console.debug(`%c${msg}`, 'background: blue; color: white; padding: 2px 4px;', ...args);
}

// export function blueBox(msg: string) {
//     return `\x1b[44m\x1b[37m ${msg} \x1b[0m`;
// }
// export function greenBox(msg: string) {
//     return `\x1b[42m\x1b[37m ${msg} \x1b[0m`;
// }
// export function yellowBox(msg: string) {
//     return `\x1b[43m\x1b[37m ${msg} \x1b[0m`;
// }
// export function redBox(msg: string) {
//     return `\x1b[41m\x1b[37m ${msg} \x1b[0m`;
// }
// export function magentaBox(msg: string) {
//     return `\x1b[45m\x1b[37m ${msg} \x1b[0m`;
// }
// export function cyanBox(msg: string) {
//     return `\x1b[46m\x1b[37m ${msg} \x1b[0m`;
// }
// export function whiteBox(msg: string) {
//     return `\x1b[47m\x1b[37m ${msg} \x1b[0m`;
// }
