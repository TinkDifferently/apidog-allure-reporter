import allure from "../allure";
import {LabelName, Status} from "allure-js-commons";
import {apidogRuntimeData, summary, app} from "../models/apidogRuntimeData";
import {doneData, execution, timings} from "../models/apidogDone";
import {handleHttpExecution} from "./handleHttp";
import {handleScriptExecution} from "./handleScript";
import {parseTestDataRow} from "../utils";
import {testPathInfo} from "../models/apidogData";
import {getId} from "../allure/testops";

type dataRow = {
    name: string,
    values: string[]
}

type iterations = {
    headers: string[],
    dataRows: dataRow[]
}

type testRunInfo = {
    name: string
    env: string
    executions: execution[],
    timings: timings,
    pathInfo?: testPathInfo
}

type multiRunInfo = testRunInfo & {
    iterations: iterations
}

type singleRunInfo = testRunInfo & {
    isLast: boolean
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

async function handleSingleRun({
                                   name,
                                   env,
                                   executions,
                                   timings,
                                   variables,
                                   pathInfo,
                                   isLast
                               }: singleRunInfo,
                               {options}: summary) {
    const sorted = executions.sort((sourceA, sourceB) => sourceA.cursor.requestIndex - sourceB.cursor.requestIndex)
    await async function () {
        try {
            const id = await getId(name)
            allure.startTest(name, timings.started)
            allure.currentTest?.addLabel(
                LabelName.FRAMEWORK,
                "apidog"
            )
            if (pathInfo) {
                allure.currentTest?.addLabel(
                    LabelName.PACKAGE,
                    `${pathInfo?.path.join('.')}.${pathInfo?.id}`
                )
            }
            if (options.reporterOptions.name) {
                console.log(`Processing ${options.reporterOptions.name}: '${name}'`)
                allure.currentTest?.addLabel(
                    LabelName.SUITE,
                    options.reporterOptions.name
                )
                allure.currentTest?.addLabel(
                    LabelName.EPIC,
                    "Design time",
                )
                allure.currentTest?.addLabel(
                    LabelName.FEATURE,
                    options.reporterOptions.name,
                )
            } else {
                console.log(`Processing '${name}'`)
            }
            allure.currentTest?.addParameter('env', env)
            variables.forEach(({key, value}) => allure.currentTest?.addParameter(key, value))
            let hasPassed = true
            sorted.forEach(item => hasPassed &&= handleExecution(item))
            if (id !== undefined) {
                if (id > 0) {
                    console.log('tags')
                    console.log(pathInfo?.tags)
                    pathInfo?.tags.forEach(tag=>allure.currentTest?.addLabel(LabelName.TAG,tag))
                    allure.currentTest?.addLabel(
                        LabelName.ALLURE_ID,
                        `${id}`
                    )
                } else {
                    console.log('Could not bind a test to allure testops')
                }
                if (allure.currentTest) {
                    allure.currentTest.historyId = name
                    allure.currentTest.status = hasPassed ? Status.PASSED : Status.FAILED
                    allure.endTest(timings.completed)
                }
            }
            if (isLast) {
                allure.endGroup()
            }
        } catch (e) {
            console.log('Could not handle test.')
            console.log(JSON.stringify(e))
        }
    }()
}

function handleMultiRun({env, executions, timings, iterations, name, pathInfo}: multiRunInfo, summary: summary) {
    const promises = iterations.dataRows.map((dataRow, index) => async function () {
        try {
            const testName = name.endsWith('.') ? `${name} ${dataRow.name}` : `${name}. ${dataRow.name}`
            const testExecutions = executions.filter(({cursor}) => cursor.iteration === index)
            await handleSingleRun({
                name: testName,
                executions: testExecutions,
                timings: {
                    started: testExecutions.find(({timings}) => timings)?.timings?.started || timings.started,
                    completed: testExecutions.filter(({timings}) => timings)[-1]?.timings?.completed || timings.completed
                },
                env,
                pathInfo,
                variables: dataRow.values.map((value, index) => {
                    return {
                        key: iterations.headers[index],
                        value
                    }
                }),
                isLast: false
            }, summary)
        } catch (e: Error) {
            console.log("Unexpected error:")
            console.log(JSON.stringify(e))
        }
    }())
    Promise.all(promises).catch(e => console.log(`Error: ${JSON.stringify(e)}`)).then(() => {
        allure.endGroup()
    })
}


function createOnDone(app: app, pathInfo?: testPathInfo) {
    const {name, environment, ciRunningOptions} = app.summary.collection
    const iterations = parseIterations(ciRunningOptions.iterationData)
    return async function (err, {executions, timings}: doneData) {
        try {
            allure.startGroup()
            if (iterations) {
                handleMultiRun({
                        iterations,
                        name,
                        env: environment.name,
                        executions,
                        timings,
                        pathInfo
                    }, app.summary
                )
            } else {
                await handleSingleRun({
                    name,
                    env: environment.name,
                    executions,
                    timings,
                    pathInfo,
                    variables: [],
                    isLast: true
                }, app.summary)
            }
        } catch (e) {
            console.log('Error')
            console.log(JSON.stringify(e))
        }

    }
}

export default function handleDone({app}: apidogRuntimeData, pathInfo?: testPathInfo,) {
    app.on('done', (err, doneData: doneData) => {
        createOnDone(app, pathInfo)(err, doneData)
    })
}
