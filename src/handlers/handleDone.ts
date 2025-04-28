import allure from "../allure";
import {LabelName, Status} from "allure-js-commons";
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

export default function handleDone({app}: apidogData) {
    const {name, environment} = app.summary.collection
    const appInfo = {
        name,
        env: environment.name
    }
    app.on('done', (err, {executions, timings}: doneData) => {
        const sorted = executions.sort((sourceA, sourceB) => sourceA.cursor.requestIndex - sourceB.cursor.requestIndex)
        allure.startTest(appInfo.name, timings.started)
        if (app.summary.options.reporterOptions.name) {
            console.log(`Processing ${app.summary.options.reporterOptions.name}: '${appInfo.name}'`)
            allure.currentTest?.addLabel(
                LabelName.SUITE,
                app.summary.options.reporterOptions.name
            )
        } else {
            console.log(`Processing '${appInfo.name}'`)
        }
        allure.currentTest?.addParameter('env', appInfo.env)
        let hasPassed = true
        sorted.forEach(item => hasPassed &&= handleExecution(item))
        if (allure.currentTest) {
            allure.currentTest.historyId = appInfo.name
            allure.currentTest.status = hasPassed ? Status.PASSED : Status.FAILED
            allure.endTest(timings.completed)
        }
        console.log('Success')
        allure.endGroup()
    })
}
