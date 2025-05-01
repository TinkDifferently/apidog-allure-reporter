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

function isIncl(source: string, sub: string, offset: number): boolean {
    for (let i = 0; i < sub.length; i++) {
        if (source[offset + i] !== sub[i]) {
            return false
        }
    }
    return true
}

export function indexOf(source: string, sub: string, offset: number = 0) {
    if (offset < 0) {
        offset = 0
    }
    for (let i = offset; i <= source.length - sub.length; i++) {
        if (isIncl(source, sub, i)) {
            return i;
        }
    }
    return -1;
}

export function parseTestDataRow(row: string): string[] {
    const result: string[] = []
    while (row.length !== 0) {
        if (row.startsWith(',')) {
            row = row.substring(1)
        }
        if (row.startsWith('"""')) {
            const index = indexOf(row, '"""', 3)
            result.push(row.substring(3, index))
            row = row.substring(index)
            continue
        }
        if (row.startsWith('"')) {
            const index = indexOf(row, '"', 1)
            result.push(row.substring(1, index))
            row = row.substring(index)
            continue
        }
        const index = row.indexOf(',')
        if (index < 0) {
            result.push(row)
            break
        }
        if (index === 0) {
            result.push('')
            continue
        }
        result.push(row.substring(0, index))
        row = row.substring(index)
    }
    return result
}
