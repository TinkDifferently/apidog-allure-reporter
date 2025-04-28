import {apidogData, app, options} from "./models/apidogData";
import {handleFolder} from "./handlers/handleFolder";
import {handleScenario} from "./handlers/handleScenaro";


export function allureReporter(
    app: app,
    options: options,
    collectionRunOptions: unknown,
) {
    const data: apidogData = {
        app,
        options,
        collectionRunOptions
    }
    options.folderId ? handleFolder(data) : handleScenario(data)
}

module.exports = allureReporter;
