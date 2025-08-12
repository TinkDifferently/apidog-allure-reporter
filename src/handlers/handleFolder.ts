import {apidogRuntimeData} from "../models/apidogRuntimeData";
import allure from "../allure";
import handleDone from "./handleDone";
import apidogData, {findTestCase} from "../models/apidogData";

export function handleFolder(apidogData: apidogData | undefined, runtimeData: apidogRuntimeData) {
    const path = findTestCase(runtimeData.app.summary.collection.name, runtimeData.app.summary.options.reporterOptions.name)
    handleDone(runtimeData, path)
}
