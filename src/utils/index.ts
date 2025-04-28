export function joinMethods(obj: object) {
    const propertyNames = Object.getOwnPropertyNames(obj)
    propertyNames.filter(propertyName => typeof obj[propertyName] === "function")
        .forEach(propertyName => obj[propertyName] = obj[propertyName].bind(obj))
}

export function prettyHeaders(headers: { key: string, value: string }[]) {
    return headers.map(({key, value}) => `${key} -> ${value}`).join('\n')
}
