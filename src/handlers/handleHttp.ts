import {execution, request} from "../models/apidogDone";
import {AllureStep, ContentType, Status} from "allure-js-commons";
import allure from "../allure";
import {format, parseContentType, prettyBody, prettyHeaders} from "../utils";

const contentTypes: Record<format, ContentType> = {
    json: ContentType.JSON,
    html: ContentType.HTML,
    xml: ContentType.XML,
    raw: ContentType.TEXT
}

function contentTypeOf(headers?: { key: string, value: string }[]): string | undefined {
    return headers?.find(({key}) => key.toLowerCase() === 'content-type')?.value
}

function formatBody(headers: { key: string, value: string }[], body: string): string {
    if (!body.length) {
        return ''
    }
    return prettyBody(body, contentTypeOf(headers));
}

function attachBody(name: string, headers: { key: string, value: string }[], body: string) {
    const formatted = formatBody(headers, body)
    if (!formatted.length) {
        return
    }
    allure.attach(name, formatted, contentTypes[parseContentType(contentTypeOf(headers))])
}

function responseBody({response}: execution): string {
    if (!response?.stream?.data?.length) {
        return ''
    }
    const content = new TextDecoder().decode(new Uint8Array(response.stream.data))
    return formatBody(response.headers || [], content)
}

function withBody(trace: string, body: string): string {
    return body.length ? `${trace}\n\nResponse body:\n${body}` : trace
}

function resolveUrl(req: request): string {
    const variables: Record<string, string> = {}
    if (req.url.variable) {
        req.url.variable.forEach(v => { variables[v.key] = v.value })
    }
    const path = (req.url.path || [])
        .map(segment => segment.replace(/\{\{([^}]+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`))
        .join('/')
    const base = req.baseUrl.replace(/\/$/, '')
    let url = path ? `${base}/${path}` : base
    const query = req.url.query as {key: string, value: string}[] | undefined
    if (query && query.length > 0) {
        const qs = query
            .filter(q => q.key)
            .map(q => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value ?? '')}`)
            .join('&')
        if (qs) url += `?${qs}`
    }
    return url
}

function handleHttpRequest(item: execution, step: AllureStep) {
    const {requestError, metaInfo, timings, request: req, response, responseValidation, scriptErrors} = item
    const body = responseBody(item)
    const resolvedUrl = req ? resolveUrl(req) : undefined
    step.addParameter('name', metaInfo.httpApiName)
    if (resolvedUrl) {
        step.addParameter('url', resolvedUrl)
    }
    allure.startStep(`${metaInfo.httpApiMethod} ${metaInfo.httpApiPath}`, timings.preProcessorsCompleted)
    if (req) {
        allure.startStep('Request', timings.preProcessorsCompleted)
        if (req.body && req.body.raw) {
            attachBody('Request body', req.headers, req.body.raw)
        }
        allure.stepStatus({
            status: Status.PASSED,
            message: `URL: ${resolvedUrl}\n\nHeaders:\n${prettyHeaders(req.headers)}`,
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
            allure.attach('Response body', body, contentTypes[parseContentType(contentTypeOf(response.headers))])
            allure.stepStatus(
                {
                    message: `Status code: ${
                        response.code
                    }\n\n${
                        response.cookies?.length > 0 ? `Cookies:\n\n${prettyHeaders(response.cookies)}\n\n` : ''
                    }Headers:\n${
                        response.headers ? prettyHeaders(response.headers) : '[]'
                    }`
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
                        message: withBody(responseValidation.schema.message, body),
                        end: timings.postProcessorsStarted
                    })
                    allure.testStatus(
                        {
                            message: `[HTTP] ${metaInfo.httpApiMethod} ${metaInfo.httpApiPath}`,
                            trace: withBody(
                                `${response ? `Response code: '${response.code}'\n\n` : ''}Schema was invalid: ${responseValidation.schema.message}`,
                                body
                            )
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
                        message: withBody(responseValidation.responseCode.message, body),
                        end: timings.postProcessorsStarted
                    })
                    allure.testStatus(
                        {
                            message: `[HTTP] ${metaInfo.httpApiMethod} ${metaInfo.httpApiPath}`,
                            trace: withBody(responseValidation.responseCode.message, body)
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

function handleHttpAssertions(item: execution, time: number) {
    const {assertions} = item
    if (!assertions) {
        return
    }
    const body = responseBody(item)
    allure.startStep('Assertions', time)
    let isSuccess = true
    assertions.forEach(assertion => {
        isSuccess &&= assertion.passed
        allure.startStep(assertion.name, time)
        if (!assertion.passed) {
            allure.stepStatus({
                status: Status.FAILED,
                message: withBody(JSON.stringify(assertion.error), body),
                end: time
            })
            allure.testStatus({
                message: assertion.name,
                trace: withBody(JSON.stringify(assertion.error), body)
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
