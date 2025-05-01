import {
    AllureConfig,
    AllureGroup,
    AllureRuntime,
    AllureStep,
    AllureTest, Category,
    Status,
    StatusDetails
} from "allure-js-commons";
import {joinMethods} from "../utils";

type stepHolder = {
    parent?: stepHolder
    step: AllureStep
}

type allureWrapper = {
    testStatusDetails?: StatusDetails
    allureConfig: AllureConfig
    allureRuntime: AllureRuntime
    currentGroup?: AllureGroup
    currentTest?: AllureTest
    currentStep?: stepHolder
    startGroup: (groupName?: string) => void
    startTest: (testName: string, started?: number) => void
    startStep: (stepName: string, start?: number) => void
    endGroup: () => void
    endTest: (end?: number) => void
    endStep: (end?: number) => void
    stepStatus: (payload: { status?: Status, message?: string, trace?: string, end?: number }) => void
    testStatus: (payload: { message: string, trace?: string }) => void
}

const allureConfig: AllureConfig = {
    resultsDir: 'allure-results',
}

const allureAdapter = function () {
    const data: allureWrapper = {
        allureConfig,
        allureRuntime: new AllureRuntime(allureConfig),
        startGroup: function (this: allureWrapper, groupName = 'standalone') {
            this.currentGroup = this.allureRuntime.startGroup(groupName)
        },
        endGroup: function (this: allureWrapper) {
            if (!this.currentGroup) {
                console.log("No group exists")
                return
            }
            this.currentGroup.endGroup()
            this.currentGroup = undefined
        },
        startTest: function (this: allureWrapper, testName, started) {
            if (this.currentTest) {
                console.log('Previous test was run')
                this.currentTest.endTest(started)
            }
            if (!this.currentGroup) {
                console.log("No group exists")
                this.startGroup()
            }
            this.currentTest = this.currentGroup?.startTest(testName, started)
        },
        endTest: function (this: allureWrapper, end) {
            if (!this.currentTest) {
                console.log('Could not end test. No Test exists')
                return
            }
            this.currentTest.endTest(end)
            this.currentTest = undefined
        },
        startStep: function (this: allureWrapper, stepName, start) {
            if (!this.currentTest) {
                console.log('Could not attach step. No test exists')
                return;
            }
            if (this.currentStep) {
                this.currentStep = {
                    step: this.currentStep.step.startStep(stepName, start),
                    parent: this.currentStep
                }
            } else {
                this.currentStep = {
                    step: this.currentTest.startStep(stepName, start)
                }
            }
        },
        endStep: function (this: allureWrapper, end) {
            if (!this.currentStep) {
                console.log('No step was running')
                return
            }
            this.currentStep.step.endStep(end)
            this.currentStep = this.currentStep.parent
        },
        stepStatus: function (this: allureWrapper, {status, message, trace, end}) {
            if (!this.currentStep) {
                console.log('No step was running')
                return
            }
            if (status) {
                this.currentStep.step.status = status
            }
            if (message || trace) {
                this.currentStep.step.statusDetails = {
                    message,
                    trace
                }
            }
            if (end) {
                this.endStep(end)
            }
        },
        testStatus: function (this: allureWrapper, {message, trace}) {
            if (this.testStatusDetails) {
                return
            }
            if (!this.currentTest) {
                console.log('No test was running')
                return;
            }
            if (message || trace) {
                this.currentTest.statusDetails = {
                    message, trace
                }
            }
        }
    }
    joinMethods(data)
    return data
}()

export type allureAdapter = typeof allureAdapter

export default allureAdapter
