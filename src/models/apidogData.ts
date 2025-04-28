const eventTypes = ["prerequest"
    , "beforeItem"
    , "item"
    , "request"
    , "socketRequest"
    , "script"
    , "assertion"
    , "console"
    , "beforeDone"
    , "beforeIteration"
    , "iteration"
    , "beforeScript"
    , "beforePrerequest"
    , "beforeRequest"
    , "beforeSocketRequest"
    , "beforeTest"
    , "test"
    , "beforeAssertion"
    , "beforeTestScript"
    , "testScript"
    , "beforePrerequestScript"
    , "prerequestScript"
    , "start"
    , "done"] as const

type eventType = typeof eventTypes[number]


interface environment {
    name: string
}

interface collection {
    item: ({ item: { id: string }[] })[]
    name: string
    environment: environment
}

interface summary {
    collection: collection
    options: {
        reporterOptions: {
            name: string
        }
    }
}

export interface app {
    summary: summary
    on: (eventType: eventType, callback: (err: unknown, data: unknown) => void) => void
    _events: string
}

export interface options {
    folderId: number
}

export interface apidogData {
    app: app,
    options: options,
    collectionRunOptions: unknown
}
