import {buildUrl} from "../utils";

const testopsMetaData = {
    endpoint: process.env.ALLURE_ENDPOINT,
    token: process.env.ALLURE_TOKEN,
    project: process.env.ALLURE_PROJECT_ID,
}

const AUTH_PATH = '/api/uaa/oauth/token'

async function auth(endpoint: string, token: string): Promise<string | undefined> {
    const response = await fetch(buildUrl(endpoint, AUTH_PATH), {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
        },
        body: new URLSearchParams({
            'grant_type': 'apitoken',
            'scope': 'openid',
            'token': token,
        }),
    });

    if (!response.ok) {
        console.log(`HTTP error! status: ${response.status}`);
        return undefined
    }

    const data = await response.json();
    return data.access_token;
}

async function getCaseId(endpoint: string, projectId: number, token: string, name: string): Promise<number> {
    const response = await fetch(
        buildUrl(endpoint,
            `/api/v2/project/${projectId}/test-case/flat?deleted=false&baseAql=${encodeURIComponent(`name = "${name.replace('"', "'")}"`)}`
        ),
        {
            headers: {
                "Authorization": `Bearer ${token}`,
            }
        })
    if (!response.ok) {
        console.log(`HTTP error! getCaseId status: ${response.status}`);
        return -2
    }
    const result = await response.json()
    if (result.content.length === 0) {
        console.log(`Could not join case. Will try to create`)
        return -1
    }
    if (result.content.length > 1) {
        console.log(`Could not join case. Got\n${JSON.stringify(result)}`)
        return -2
    }
    return result.content[0].id
}

async function createTestCase(endpoint: string, projectId: number, token: string, name: string): Promise<number> {
    const response = await fetch(buildUrl(endpoint, `/api/v2/project/${projectId}/test-case/flat/`), {
        method: "POST",
        headers: {
            'Accept': '*/*',
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({name})
    });
    if (!response.ok) {
        console.log(`HTTP error! createTestCase status: ${response.status}`);
        return -2
    }
    console.log('Successfully created new testCase')
    const result = await response.json()
    return result.id
}

export async function getId(testName: string, suite?: string): Promise<number | undefined> {
    const {endpoint, token, project} = testopsMetaData
    if (!endpoint || !token || !project) {
        console.log("Did not provide env data, can not get testops id")
        return -1
    }
    const authToken = await auth(endpoint, token)
    if (!authToken) {
        return -1
    }
    const id = await getCaseId(endpoint, Number(project), authToken, testName)
    if (id === -1) {
        const createdId = await createTestCase(endpoint, Number(project), authToken, testName)
        if (createdId > 0) {
            return createdId
        }
    }
    return id
}
