const fs = require('fs'),
    path = require('path')

// Function to log variables to a file



module.exports = function log(filePath) {
    return function (data) {
        const logMessage = `${new Date().toISOString()} - ${data}\n`;
        const logFilePath = path.join(filePath||__dirname, 'log.txt');
        fs.appendFile(logFilePath, logMessage, (err) => {
            if (err) {
                console.error('Error writing to log file:', err);
            } else {
                console.log('Log written successfully:', logMessage.trim());
            }
        });
    }
}
