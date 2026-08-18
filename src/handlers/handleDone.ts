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
    issueLinkLabel: string
    issueLinkPattern: string
    component: string
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
                                   isLast,
                                   issueLinkLabel,
                                   issueLinkPattern,
                                   component
                               }: singleRunInfo,
                               {options}: summary) {
    const sorted = executions.sort((sourceA, sourceB) => sourceA.cursor.requestIndex - sourceB.cursor.requestIndex)
    await async function () {
        try {
            const id = await getId(name)

            // Classify tags once so override logic and label application share the same data
            const tags = pathInfo?.tags ?? []
            const issueRegex = new RegExp(`^(?:${issueLinkPattern})$`)
            const issueTags = tags.filter(t => issueRegex.test(t))
            const kvEntries: [string, string][] = tags
                .map(t => t.match(/^([^=]+)=(.+)$/))
                .filter((m): m is RegExpMatchArray => m !== null)
                .map(m => [m[1].charAt(0).toUpperCase() + m[1].slice(1), m[2]])
            const regularTags = tags.filter(t => !issueRegex.test(t) && !/^[^=]+=.+$/.test(t))
            const overrides = new Map<string, string>(kvEntries)

            allure.startTest(name, timings.started)
            allure.currentTest?.addLabel(LabelName.FRAMEWORK, "apidog")

            if (pathInfo) {
                allure.currentTest?.addLabel(
                    LabelName.PACKAGE,
                    `${pathInfo.path.join('.')}.${pathInfo.id}`
                )
                const [epic, feature, story] = pathInfo.path.slice(-3)
                const resolvedEpic = overrides.get(LabelName.EPIC) ?? epic
                const resolvedFeature = overrides.get(LabelName.FEATURE) ?? feature
                const resolvedStory = overrides.get(LabelName.STORY) ?? story ?? name
                if (resolvedEpic) allure.currentTest?.addLabel(LabelName.EPIC, resolvedEpic)
                if (resolvedFeature) allure.currentTest?.addLabel(LabelName.FEATURE, resolvedFeature)
                allure.currentTest?.addLabel(LabelName.STORY, resolvedStory)
            }

            allure.currentTest?.addLabel('Component', overrides.get('Component') ?? component)

            console.log(`Processing '${name}'`)
            allure.currentTest?.addParameter('env', env)
            variables.forEach(({key, value}) => allure.currentTest?.addParameter(key, value))
            const httpCalls = sorted
                .filter(e => e.metaInfo?.type === 'http' && e.metaInfo?.httpApiPath)
                .map(e => `${(e.metaInfo.httpApiMethod || '').toUpperCase()} ${e.metaInfo.httpApiPath}`)
            if (httpCalls.length > 0 && allure.currentTest) {
                allure.currentTest.description = httpCalls.map(c => `- ${c}`).join('\n')
            }
            let hasPassed = true
            sorted.forEach(item => hasPassed &&= handleExecution(item))
            // Apply tags regardless of TestOps availability
            const managedLabels = new Set([LabelName.EPIC, LabelName.FEATURE, LabelName.STORY, 'Component'])
            issueTags.forEach(tag => allure.currentTest?.addLabel(issueLinkLabel, tag))
            regularTags.forEach(tag => allure.currentTest?.addLabel(LabelName.TAG, tag.toLowerCase()))
            kvEntries
                .filter(([k]) => !managedLabels.has(k))
                .forEach(([k, v]) => allure.currentTest?.addLabel(k, v))

            if (id !== undefined) {
                if (id > 0) {
                    allure.currentTest?.addLabel(LabelName.ALLURE_ID, `${id}`)
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

function handleMultiRun({env, executions, timings, iterations, name, pathInfo, issueLinkLabel, issueLinkPattern, component}: multiRunInfo, summary: summary) {
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
                issueLinkLabel,
                issueLinkPattern,
                component,
                variables: dataRow.values.map((value, index) => {
                    return {
                        key: iterations.headers[index],
                        value
                    }
                }),
                isLast: false
            }, summary)
        } catch (e: unknown) {
            console.log("Unexpected error:")
            console.log(JSON.stringify(e))
        }
    }())
    Promise.all(promises).catch(e => console.log(`Error: ${JSON.stringify(e)}`)).then(() => {
        allure.endGroup()
    })
}


function createOnDone(app: app, pathInfo?: testPathInfo, issueLinkLabel: string = 'Related', issueLinkPattern: string = 'LB-\\d+', component: string = 'Control Plane') {
    const {name, environment, ciRunningOptions} = app.summary.collection
    const iterations = parseIterations(ciRunningOptions.iterationData)
    return async function (_err: unknown, {executions, timings}: doneData) {
        try {
            allure.startGroup()
            if (iterations) {
                handleMultiRun({
                        iterations,
                        name,
                        env: environment.name,
                        executions,
                        timings,
                        pathInfo,
                        issueLinkLabel,
                        issueLinkPattern,
                        component
                    }, app.summary
                )
            } else {
                await handleSingleRun({
                    name,
                    env: environment.name,
                    executions,
                    timings,
                    pathInfo,
                    issueLinkLabel,
                    issueLinkPattern,
                    component,
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

export default function handleDone({app, options}: apidogRuntimeData, pathInfo?: testPathInfo,) {
    const component = process.env.ALLURE_COMPONENT ?? options.component ?? 'Control Plane'
    app.on('done', (err, data: unknown) => {
        createOnDone(app, pathInfo, options.issueLinkLabel, options.issueLinkPattern, component)(err, data as doneData)
    })
}
