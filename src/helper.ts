export function env(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (defaultValue !== undefined) {
        return value ?? defaultValue;
    }
    if (!value) {
        throw new Error(`Environment variable ${key} not found`);
    }
    return value;
}