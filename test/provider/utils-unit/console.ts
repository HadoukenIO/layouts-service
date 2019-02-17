import console from 'console';

export interface ConsoleSpy {
    log: jest.SpyInstance<typeof console.log>;
    warn?: jest.SpyInstance<typeof console.warn>;
    error?: jest.SpyInstance<typeof console.error>;
}

const fake = {
    log: () => {},
    warn: () => {},
    error: () => {}
};

/**
 * TODO: This probably infinitely wraps the console functions. Needs clean-up.
 */
export function addConsoleSpies(): ConsoleSpy {
    const spies: ConsoleSpy = {log: jest.spyOn(fake, 'log'), warn: jest.spyOn(fake, 'warn'), error: jest.spyOn(fake, 'error')};

    (Object.keys(spies) as (keyof ConsoleSpy)[]).forEach(key => {
        // tslint:disable-next-line:no-any
        (fake[key] as any) = spies[key];
    });

    return spies;
}
