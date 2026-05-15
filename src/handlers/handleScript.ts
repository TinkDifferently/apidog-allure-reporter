import {execution} from "../models/apidogDone";
import allure from "../allure";
import {Status} from "allure-js-commons";

function handleScriptAssertions({assertions, name, timings}: execution): boolean {
    const failed = assertions?.filter(a => !a.passed) ?? []
    if (failed.length === 0) return false
    failed.forEach(assertion => {
        allure.startStep(assertion.name, timings.completed)
        allure.testStatus({
            message: `[SCRIPT] ${name}: ${assertion.name}`,
            trace: assertion.error?.message
        })
        allure.stepStatus({
            status: Status.FAILED,
            end: timings.completed
        })
    })
    return true
}

function handleScriptErrors({scriptErrors, name, timings}: execution) {
    if (!scriptErrors || scriptErrors.length === 0) {
        allure.stepStatus({
            status: Status.FAILED,
            end: timings.completed
        })
        return
    }
    scriptErrors.map(scriptError => scriptError.error).sort((a1, a2) => a1.timestamp - a2.timestamp).forEach(({
                                                                                                                  message,
                                                                                                                  timestamp
                                                                                                              }) => {
        allure.startStep(message, timestamp)
        allure.testStatus(
            {
                message: `[SCRIPT] ${name}`,
                trace: message
            }
        )
        allure.stepStatus({
            status: Status.FAILED,
            end: timestamp
        })
    })
    allure.stepStatus({
        status: Status.FAILED,
        end: timings.completed
    })
}

export function handleScriptExecution(item: execution): boolean {
    allure.startStep(`[${item.metaInfo.type}] ${item.name}`, item.timings.started)
    if (allure.currentStep) {
        if (!item.passed) {
            const hasAssertionFailures = handleScriptAssertions(item)
            if (!hasAssertionFailures) {
                handleScriptErrors(item)
            } else {
                allure.stepStatus({
                    status: Status.FAILED,
                    end: item.timings.completed
                })
            }
        } else {
            allure.stepStatus({
                status: Status.PASSED,
                end: item.timings.completed
            })
        }
    }
    return item.passed
}
