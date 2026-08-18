import {execution} from "../models/apidogDone";
import {AllureStep, Status} from "allure-js-commons";
import allure from "../allure";
import {prettyBody, prettyHeaders} from "../utils";

function formatBody(headers: { key: string, value: string }[], body: string): string {
    if (!body.length) {
        return ''
    }
    const contentType = headers.find(({key}) => key === 'Content-Type')?.value
    return prettyBody(body, contentType);
}

function resolveUrl(request: import('../models/apidogDone').request): string {
    const variables: Record<string, string> = {}
    if (request.url.variable) {
        request.url.variable.forEach(v => { variables[v.key] = v.value })
    }
    const path = (request.url.path || [])
        .map(segment => {
            return segment.replace(/\{\{([^}]+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`)
        })
        .join('/')
    const base = request.baseUrl.replace(/\/$/, '')
    let url = path ? `${base}/${path}` : base
    if (request.url.query && (request.url.query as any[]).length > 0) {
        const qs = (request.url.query as {key: string, value: string}[])
            .filter(q => q.key)
            .map(q => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value ?? '')}`)
            .join('&')
        if (qs) url += `?${qs}`
    }
    return url
}

function handleHttpRequest({
                               requestError,
                               metaInfo,
                               timings,
                               request,
                               response,
                               responseValidation,
                               scriptErrors
                           }: execution, step: AllureStep) {
    step.addParameter('name', metaInfo.httpApiName)
    if (request) {
        const resolvedUrl = resolveUrl(request)
        step.addParameter('url', resolvedUrl)
    }
    allure.startStep(`${metaInfo.httpApiMethod} ${metaInfo.httpApiPath}`, timings.preProcessorsCompleted)
    if (request) {
        const resolvedUrl = resolveUrl(request)
        allure.startStep('Request', timings.preProcessorsCompleted)
        allure.stepStatus({
            status: Status.PASSED,
            message: `URL: ${resolvedUrl}\n\nHeaders:\n${prettyHeaders(request.headers)}}${request.body && request.body.raw ? `\n\nBody:\n${
                formatBody(request.headers, request.body.raw)
            }` : ''}`,
            end: timings.preProcessorsCompleted
        })
        if (requestError) {
            allure.stepStatus(
                {
                    status: Status.FAILED,
                    message: `Response code: '${requestError.code}'\nReason: '${requestError.message}'`
                }
            )
            allure.testStatus(
                {
                    message: `[HTTP] ${metaInfo.httpApiMethod} ${metaInfo.httpApiPath}`,
                    trace: `Response code: '${requestError.code}'\nReason: '${requestError.message}`
                }
            )
        } else if (response) {
            allure.stepStatus(
                {
                    message: `Status code: ${
                        response.code
                    }\n\n${
                        response.cookies?.length > 0 ? `Cookies:\n\n${prettyHeaders(response.cookies)}\n\n` : ''
                    }Headers:\n${
                        response.headers ? prettyHeaders(response.headers) : '[]'
                    }\n\nBody:\n${((bytes: number[]) => {
                        const bytesView = new Uint8Array(bytes);
                        const content = new TextDecoder().decode(bytesView)
                        return formatBody(response.headers, content)
                    })(response.stream.data)}`
                }
            )
        }
        if (responseValidation) {
            let isCorrect = true
            if (responseValidation.schema) {
                allure.startStep(`Validate schema`, timings.postProcessorsStarted)
                if (!responseValidation.schema.valid) {
                    isCorrect = false
                    allure.stepStatus({
                        status: Status.FAILED,
                        message: responseValidation.schema.message,
                        end: timings.postProcessorsStarted
                    })
                    allure.testStatus(
                        {
                            message: `[HTTP] ${metaInfo.httpApiMethod} ${metaInfo.httpApiPath}`,
                            trace: `${response ? `Response code: '${response.code}'\n\n` : ''}Schema was invalid: ${responseValidation.schema.message}`
                        }
                    )
                } else {
                    allure.stepStatus({
                        status: Status.PASSED,
                        end: timings.postProcessorsStarted
                    })
                }
            }
            if (responseValidation.responseCode) {
                allure.startStep(`Validate response code`, timings.postProcessorsStarted)
                if (!responseValidation.responseCode.valid) {
                    isCorrect = false
                    allure.stepStatus({
                        status: Status.FAILED,
                        message: responseValidation.responseCode.message,
                        end: timings.postProcessorsStarted
                    })
                    allure.testStatus(
                        {
                            message: `[HTTP] ${metaInfo.httpApiMethod} ${metaInfo.httpApiPath}`,
                            trace: responseValidation.responseCode.message
                        }
                    )
                } else {
                    allure.stepStatus({
                        status: Status.PASSED,
                        end: timings.postProcessorsStarted
                    })
                }
            }
            allure.stepStatus({
                status: isCorrect ? Status.PASSED : Status.FAILED,
            })
        }
        if (scriptErrors && scriptErrors.length > 0) {
            scriptErrors.map(({error}) => error).sort((a1, a2) => a1.timestamp - a2.timestamp).forEach(({
                                                                                                            name,
                                                                                                            message,
                                                                                                            timestamp
                                                                                                        }) => {
                allure.testStatus(
                    {
                        message
                    }
                )
                allure.startStep(message, timestamp)
                allure.stepStatus({
                    status: Status.FAILED,
                    end: timestamp
                })
            })
        }
    }

    allure.endStep(timings.postProcessorsStarted)
}

function handleHttpAssertions({assertions}: execution, time: number) {
    if (!assertions) {
        return
    }
    allure.startStep('Assertions', time)
    let isSuccess = true
    assertions.forEach(assertion => {
        isSuccess &&= assertion.passed
        allure.startStep(assertion.name, time)
        if (!assertion.passed) {
            allure.stepStatus({
                status: Status.FAILED,
                message: JSON.stringify(assertion.error),
                end: time
            })
            allure.testStatus({
                message: assertion.name,
                trace: JSON.stringify(assertion.error)
            })
        } else {
            allure.stepStatus({
                status: Status.PASSED,
                end: time
            })
        }
    })
    allure.stepStatus({
        status: isSuccess ? Status.PASSED : Status.FAILED,
        end: time
    })
}

export function handleHttpExecution(item: execution): boolean {
    allure.startStep(`[${item.metaInfo.type}] ${item.name}`, item.timings.started)
    if (allure.currentStep) {
        allure.currentStep.step.status = item.passed ? Status.PASSED : Status.FAILED
        handleHttpRequest(item, allure.currentStep.step)
        handleHttpAssertions(item, item.timings.postProcessorsStarted)
        allure.endStep(item.timings.completed)
    }
    return item.passed
}
