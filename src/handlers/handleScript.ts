import {execution} from "../models/apidogDone";
import allure from "../allure";
import {Status} from "allure-js-commons";

function handleScriptErrors({scriptErrors}: execution) {
    scriptErrors.map(scriptError => scriptError.error).sort((a1, a2) => a1.timestamp - a2.timestamp).forEach(({
                                                                                                                  message,
                                                                                                                  timestamp
                                                                                                              }) => {
        allure.startStep(message, timestamp)
        allure.stepStatus({
            status: Status.FAILED,
            end: timestamp
        })
        allure.stepStatus({
            status: Status.FAILED,
            end: timestamp
        })
    })
}

export function handleScriptExecution(item: execution): boolean {
    allure.startStep(`[${item.metaInfo.type}] ${item.name}`, item.timings.started)
    if (allure.currentStep) {
        if (!item.passed) {
            handleScriptErrors(item)
        } else {
            allure.stepStatus({
                status: Status.PASSED,
                end: item.timings.completed
            })
        }
    }
    return item.passed
}
