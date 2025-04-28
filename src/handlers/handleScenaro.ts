import {LabelName, Status} from "allure-js-commons";
import allure from "../allure";
import {apidogData} from "../models/apidogData";
import {doneData, execution} from "../models/apidogDone";
import {handleHttpExecution} from "./handleHttp";
import {handleScriptExecution} from "./handleScript";


function handleExecution(item: execution) {
    switch (item.metaInfo.type) {
        case 'http': {
            return handleHttpExecution(item)
        }
        case 'script': {
            return handleScriptExecution(item);
        }
        default: {
            console.log('Unknown type')
            return true
        }
    }
}

export function handleScenario({app}: apidogData) {
    const {collection} = app.summary
    const appInfo = {
        name: collection.name,
        env: collection.environment.name
    }
    allure.startGroup()

    app.on('done', (err, data) => {
        const doneData = data as doneData
        const sorted = doneData.executions.sort((sourceA, sourceB) => sourceA.cursor.requestIndex - sourceB.cursor.requestIndex)
        allure.startTest(appInfo.name, doneData.timings.started)
        if (app.summary.reporterOptions.name) {
            allure.currentTest?.addLabel(
                LabelName.SUITE,
                app.summary.reporterOptions.name
            )
        }
        allure.currentTest?.addParameter('env', appInfo.env)
        let hasPassed = true
        sorted.forEach(item => hasPassed &&= handleExecution(item))
        if (allure.currentTest) {
            allure.currentTest.historyId = appInfo.name
            allure.currentTest.status = hasPassed ? Status.PASSED : Status.FAILED
            allure.endTest(doneData.timings.completed)
        }
        allure.endGroup()
    })
}
