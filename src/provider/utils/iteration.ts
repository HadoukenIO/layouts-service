export function forEachProperty<T>(object: T, f: (property: keyof T) => (void)): void {
    (Object.keys(object) as (keyof T)[]).forEach((property) => f(property));
}
