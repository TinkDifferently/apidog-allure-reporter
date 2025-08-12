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
    return !node.hasOwnProperty('id');
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

function getTestPath(node: folder, name: string, folderName?: string, path?: string[]): testPathInfo | undefined {
    const basePath: string[] = folderName
        ? path
            ? [...path, folderName]
            : [folderName]
        : [];
    if (!folderName || basePath.includes(folderName)) {
        const testCase = node.items.find((node) => node.name === name) as testCase
        if (testCase) {
            return {
                ...testCase,
                path: basePath,
            }
        }
    }
    for (const child of node.children) {
        const testCase = getTestPath(child, name, folderName, basePath)
        if (testCase) {
            return testCase
        }
    }
    return undefined
}

export function findTestCase(name: string, folderName?: string): testPathInfo | undefined {
    if (apidogData) {
        for (const node of apidogData.apiTestCaseCollection) {
            if (isFolder(node)) {
                const path = getTestPath(node, name, folderName)
                if (path) {
                    return path
                }
                continue
            }
            if (node.name === name) {
                return {
                    ...node,
                    path: []
                }
            }
        }
    }
    return undefined
}

export default apidogData
