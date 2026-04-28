import {apidogRuntimeData, app, options} from "./models/apidogRuntimeData";
import {handleFolder} from "./handlers/handleFolder";
import {handleScenario} from "./handlers/handleScenaro";


export function allureReporter(
    app: app,
    options: options,
    collectionRunOptions: unknown,
) {
    const runtimeData: apidogRuntimeData = {
        app,
        options,
        collectionRunOptions
    }
    options.folderId ? handleFolder(runtimeData) : handleScenario(runtimeData)
}

module.exports = allureReporter;
