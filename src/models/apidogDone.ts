type stat = { total: number, passed: number, failed: number }


export type assertion = {
    name: string,
    assertion: string,
    skipped: boolean,
    passed: boolean,
    error: {
        name: string,
        index: number,
        test: string,
        message: string,
        expected: string,
        stack: string,
        isNotPlainError: boolean
    }
}

type scriptErrorStacktrace = {
    fileName: string,
    lineNumber: number,
    functionName: string,
    typeName: string,
    methodName: string,
    columnNumber: number,
    native: boolean
}

type scriptError = {
    error: {
        name: string,
        message: string,
        stack: string,
        timestamp: number,
        stacktrace: scriptErrorStacktrace[]
    },
    "source": {
        "listen": string,
        "scriptId": string
    }
}

export type request = {
    "url": {
        "protocol": "http",
        "path": string[],
        "host": string[],
        "query": [],
        "variable": {
            "disabled": boolean,
            "type": string,
            "value": string,
            "key": string
        }[]
    },
    headers: {
        disabled?: boolean,
        key: string,
        value: string
    }[],
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    baseUrl: string,
    body: {
        mode: string,
        raw: unknown,
    },
    auth: {
        type: string,
        bearer: {
            type: string,
            value: string,
            key: string
        }[]
    }
}

export type execution = {
    id: string,
    type: 'http' | 'script',
    name: string,
    metaInfo: {
        type: 'http' | 'script'
        "httpApiName": "Get  token",
        "httpApiPath": string,
        "httpApiMethod": "post",
    }
    request: request,
    "requestError"?: {
        "code": string,
        "message": string,
        "port": number,
        "address": string
    },
    "response"?: {
        "id": string,
        "status": string,
        "code": number,
        stream: {
            data: number[]
        }
        "headers": {
            "key": string,
            "value": string
        }[],
        "cookies": {
            "key": string,
            "value": string
        }[],
    }
    "responseValidation"?: {
        "schema"?: {
            "valid": boolean,
            "message": string
        },
        "responseCode"?: {
            "valid": boolean,
            "message": string
        }
    }
    timings: {
        started: number,
        preProcessorsCompleted
            :
            number,
        postProcessorsStarted
            :
            number,
        completed
            :
            number
    },
    assertions: assertion[]
    scriptErrors: scriptError[]
    cursor: {
        requestIndex: number
    }
    passed: boolean,
}

export type doneData = {
    stats: {
        steps: stat,
        iterations: stat,
        items: {},
        scripts: stat,
        prerequests: stat,
        requests: stat,
        socketRequests: stat,
        tests: stat,
        assertions: stat,
        testScripts: stat,
        prerequestScripts: stat,
    },
    timings: {
        started: number,
        completed: number
    },
    executions: execution[],
    assertions: assertion[],
    scriptErrors: scriptError[],
    failures: object
}
