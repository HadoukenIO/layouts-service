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

export function itParameterized<T>(descriptionName: string, instanceName: ((data: T) => string)|undefined, instanceData: Parameterized<T>[], testFunc: TestMacro<T>): void {
    describe(descriptionName, () => {
        instanceData.forEach((instance: T&InstanceData) => {
            const instanceTitle: string = instanceName !== undefined ? instanceName(instance) : JSON.stringify(instanceData);

            if (instance.skip === true) {
                it.skip(instanceTitle, async () => await testFunc(instance));
            } else {
                it(instanceTitle, async () => await testFunc(instance));
            }
        });
    });
}
