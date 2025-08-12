// Function to load JSON files from a directory
import fs from "fs";

export function loadJson(filePath: string): object | undefined {
    try {
        const content = fs.readFileSync(filePath, 'utf-8')
        return JSON.parse(content);
    } catch (e) {
        console.log(e)
        return undefined
    }
}
