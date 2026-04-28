import {apidogRuntimeData} from "../models/apidogRuntimeData";
import handleDone from "./handleDone";
import {findTestCase} from "../models/apidogData";

export function handleScenario(runtimeData: apidogRuntimeData) {
    const path = findTestCase(runtimeData.app.summary.collection.name)
    handleDone(runtimeData, path)
}
