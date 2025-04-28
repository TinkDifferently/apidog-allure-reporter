import fs from 'fs'
import path from 'path'


export default function mountLogger(filePath: string) {
    return function (data: unknown) {
        const logMessage = `${new Date().toISOString()} - ${typeof data === 'object' ? JSON.stringify(data) : data}\n\n\n`;
        const logFilePath = path.join(filePath || __dirname, 'log.txt');
        fs.appendFile(logFilePath, logMessage, (err) => {
            if (err) {
                console.error('Error writing to log file:', err);
            }
        });
    }
}

export const info = mountLogger('/reporter');
