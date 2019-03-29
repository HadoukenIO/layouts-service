interface InstanceData {
    skip?: boolean;
}

export type Parameterized<T> = T&InstanceData;

export interface TestMacro<T> {
    (instance: T): void;
}

export interface ContextTestMacro<T, C> {
    (context: C, instance: T): void;
}

export function testParameterized<T>(title: string|((data: T) => string), instanceData: Parameterized<T>[], testFunc: TestMacro<T>): void {
    instanceData.forEach((instance: T&InstanceData) => {
        const instanceTitle: string = typeof title === 'string' ? `${title} ${JSON.stringify(instance)}` : title(instance);

        if (instance.skip === true) {
            test.skip(instanceTitle, async () => await testFunc(instance));
        } else {
            test(instanceTitle, async () => await testFunc(instance));
        }
    });
}