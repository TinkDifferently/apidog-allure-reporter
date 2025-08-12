import {apidogRuntimeData, app, options} from "./models/apidogRuntimeData";
import {handleFolder} from "./handlers/handleFolder";
import {handleScenario} from "./handlers/handleScenaro";
import apidogData from "./models/apidogData";


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
    options.folderId ? handleFolder(apidogData, runtimeData) : handleScenario(apidogData, runtimeData)
}

module.exports = allureReporter;
