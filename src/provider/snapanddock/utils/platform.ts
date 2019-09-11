// tricking ts here, promise will be awaited first thing in init, so this
// shouldn't actually be this value by the time we use it
let win10 = false;
export const win10Check = Promise.resolve(navigator.userAgent.includes('Windows NT 10')||navigator.userAgent.includes('Windows 10'));


export function isWin10() {
    return win10;
}
