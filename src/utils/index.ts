const formats = ['json', 'html', 'xml'] as const

type format = 'raw' | typeof formats[number]

export function joinMethods(obj: object) {
    const propertyNames = Object.getOwnPropertyNames(obj)
    propertyNames.filter(propertyName => typeof obj[propertyName] === "function")
        .forEach(propertyName => obj[propertyName] = obj[propertyName].bind(obj))
}

export function prettyHeaders(headers: { key: string, value: string }[]) {
    return headers.map(({key, value}) => `${key} -> ${value}`).join('\n')
}

export function safe<T>(callback: () => T, defaultValue?: T) {
    try {
        return callback()
    } catch (e) {
        console.log(e)
        return defaultValue
    }
}

function parseContentType(contentType?: string): format {
    return (
        contentType
        &&
        formats.find(item => contentType.includes(item))
    ) || 'raw'
}

export function prettyBody(content: string, contentType?: string): string {
    const format = parseContentType(contentType)
    switch (format) {
        case "json":
            return safe(() => JSON.stringify(JSON.parse(content)), content) || ''
        case "html":
        case "xml":
        case "raw":
        default:
            return content
    }
}
