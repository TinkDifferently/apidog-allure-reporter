import {apidogRuntimeData} from "../models/apidogRuntimeData";
import handleDone from "./handleDone";
import apidogData, {findTestCase} from "../models/apidogData";

export function handleScenario(apidogData: apidogData | undefined, runtimeData: apidogRuntimeData) {
    const path = findTestCase(runtimeData.app.summary.collection.name)
    handleDone(runtimeData, path)
}
