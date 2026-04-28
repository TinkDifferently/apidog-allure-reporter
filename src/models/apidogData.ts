import {loadJson} from "../files";

export type stepType = "testCaseRef" | "script"

export type step = {
    id: string,
    type: stepType,
    disable: false,
    parameters: object,
    relatedId: number,
    name: string,
    number: number
}

export type testCase = {
    steps: step[],
    id: number,
    name: string,
    tags: string[]
}

export type folder = {
    name: string,
    children: folder[],
    items: testCase[]
}

type node = folder | testCase

export type apidogData = {
    apiTestCaseCollection: node[]
}

export function isFolder(node: node): node is folder {
    return !node.hasOwnProperty('steps');
}

const apidogData: apidogData | undefined = (function (): apidogData | undefined {
    console.log('Parsing apidog model')
    const result = loadJson('apidogExport.json') as apidogData | undefined
    if (!result) {
        console.log('Could not parse apidog data')
    }
    return result
})()

export type testPathInfo = { path: string[], id: number, name: string, tags: string[] }

function getTestPath(node: folder, name: string, path: string[] = []): testPathInfo | undefined {
    const currentPath = [...path, node.name]
    const testCase = node.items.find(item => item.name === name)
    if (testCase) {
        return { ...testCase, path: currentPath }
    }
    for (const child of node.children) {
        const result = getTestPath(child, name, currentPath)
        if (result) return result
    }
    return undefined
}

export function findTestCase(name: string): testPathInfo | undefined {
    if (!apidogData) return undefined
    for (const node of apidogData.apiTestCaseCollection) {
        if (isFolder(node)) {
            // The top-level node is a "Root" container — start paths from its children
            for (const child of node.children) {
                const result = getTestPath(child, name)
                if (result) return result
            }
            const direct = node.items.find(i => i.name === name)
            if (direct) return { ...direct, path: [] }
        } else if (node.name === name) {
            return { ...(node as testCase), path: [] }
        }
    }
    return undefined
}

export default apidogData
