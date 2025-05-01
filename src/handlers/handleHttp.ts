import {execution} from "../models/apidogDone";
import {AllureStep, Status} from "allure-js-commons";
import allure from "../allure";
import {prettyBody, prettyHeaders} from "../utils";

function formatBody(headers: { key: string, value: string }[], body: string): string {
    if (!body.length) {
        return ''
    }
    const contentType = headers.find(({key}) => key === 'Content-Type').value
    return prettyBody(body, contentType);
}

function handleHttpRequest({
                               requestError,
                               metaInfo,
                               timings,
                               request,
                               response,
                               responseValidation
                           }: execution, step: AllureStep) {
    step.addParameter('name', metaInfo.httpApiName)
    if (request) {
        step.addParameter('host', request.baseUrl)
    }
    allure.startStep(`${metaInfo.httpApiMethod} ${metaInfo.httpApiPath}`, timings.preProcessorsCompleted)
    if (request) {
        allure.startStep('Request', timings.preProcessorsCompleted)
        allure.stepStatus({
            status: Status.PASSED,
            message: `Headers:\n${prettyHeaders(request.headers)}}${request.body && request.body.raw ? `\n\nBody:\n${
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
                    })(response.stream)}`
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
