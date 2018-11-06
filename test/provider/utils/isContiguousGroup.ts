import {_Window} from 'hadouken-js-adapter/out/types/src/api/window/window';
import {isAdjacentTo} from './isAdjacentTo';

export async function isContiguousGroup(windows: _Window[]): Promise<boolean> {
    const contiguousGroups = await getContiguousWindows(windows);
    return contiguousGroups.length === 1;
}

export async function getContiguousWindows(windows: _Window[]): Promise<_Window[][]> {
    const adjacencyList: _Window[][] = new Array<_Window[]>(windows.length);

    // Build adjacency list
    for (let i = 0; i < windows.length; i++) {
        adjacencyList[i] = [];
        for (let j = 0; j < windows.length; j++) {
            if (i !== j && await isAdjacentTo(windows[i], windows[j])) {
                adjacencyList[i].push(windows[j]);
            }
        }
    }

    // Find all contiguous sets
    const contiguousSets: _Window[][] = [];
    const unvisited: _Window[] = windows.slice();

    while (unvisited.length > 0) {
        const visited: _Window[] = [];
        dfs(unvisited[0], visited);
        contiguousSets.push(visited);
    }

    return contiguousSets;

    function dfs(startWindow: _Window, visited: _Window[]) {
        if (visited.includes(startWindow)) {
            return;
        }
        visited.push(startWindow);
        unvisited.splice(unvisited.indexOf(startWindow), 1);
        for (let i = 0; i < adjacencyList[windows.indexOf(startWindow)].length; i++) {
            dfs(adjacencyList[windows.indexOf(startWindow)][i], visited);
        }
    }
}