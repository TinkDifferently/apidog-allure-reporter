import allure from "../allure";
import {LabelName, Status} from "allure-js-commons";
import {apidogData, summary} from "../models/apidogData";
import {doneData, execution, executionTimings, timings} from "../models/apidogDone";
import {handleHttpExecution} from "./handleHttp";
import {handleScriptExecution} from "./handleScript";
import {parseTestDataRow} from "../utils";

type dataRow = {
    name: string,
    values: string[]
}

type iterations = {
    headers: string[],
    dataRows: dataRow[]
}

type testMultiRunInfo = {
    name: string
    env: string
    executions: execution[],
    timings: timings,
    iterations: iterations
}

type testRunInfo = {
    name: string
    env: string
    executions: execution[],
    timings: timings
    variables: { key: string, value: string }[]
}

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

function parseIterations(iterationData?: string): iterations | undefined {
    if (!iterationData) {
        return undefined
    }
    const iterations = iterationData.trim().split('\n').map(parseTestDataRow)
    return {
        headers: iterations[0].slice(1),
        dataRows: iterations.slice(1).map((item) => {
            return {
                name: item[0],
                values: item.slice(1)
            }
        })
    }
}

function handleSingleRun({
                             name,
                             env,
                             executions,
                             timings,
                             variables
                         }: testRunInfo,
                         {options}: summary) {
    const sorted = executions.sort((sourceA, sourceB) => sourceA.cursor.requestIndex - sourceB.cursor.requestIndex)
    allure.startTest(name, timings.started)
    if (options.reporterOptions.name) {
        console.log(`Processing ${options.reporterOptions.name}: '${name}'`)
        allure.currentTest?.addLabel(
            LabelName.SUITE,
            options.reporterOptions.name
        )
    } else {
        console.log(`Processing '${name}'`)
    }
    allure.currentTest?.addParameter('env', env)
    variables.forEach(({key, value}) => allure.currentTest?.addParameter(key, value))
    let hasPassed = true
    sorted.forEach(item => hasPassed &&= handleExecution(item))
    if (allure.currentTest) {
        allure.currentTest.historyId = name
        allure.currentTest.status = hasPassed ? Status.PASSED : Status.FAILED
        allure.endTest(timings.completed)
    }
}

function handleMultiRun({env, executions, timings, iterations, name}: testMultiRunInfo, summary: summary) {
    iterations.dataRows.forEach((dataRow, index) => {
        const testName = name.endsWith('.') ? `${name} ${dataRow.name}` : `${name}. ${dataRow.name}`
        const testExecutions = executions.filter(({cursor}) => cursor.iteration === index)
        handleSingleRun({
            name: testName,
            executions: testExecutions,
            timings: {
                started: testExecutions.find(({timings}) => timings)?.timings?.started || timings.started,
                completed: testExecutions.filter(({timings}) => timings)[-1]?.timings?.completed || timings.completed
            },
            env,
            variables: dataRow.values.map((value, index) => {
                return {
                    key: iterations.headers[index],
                    value
                }
            })
        }, summary)
    })
}

export default function handleDone({app}: apidogData) {
    const {name, environment, ciRunningOptions} = app.summary.collection
    const iterations = parseIterations(ciRunningOptions.iterationData)
    app.on('done', (err, {executions, timings}: doneData) => {
        if (iterations) {
            handleMultiRun({
                    iterations,
                    name,
                    env: environment.name,
                    executions,
                    timings
                }, app.summary
            )
        } else {
            handleSingleRun({
                name,
                env: environment.name,
                executions,
                timings,
                variables: []
            }, app.summary)
        }
        allure.endGroup()
    })
}
