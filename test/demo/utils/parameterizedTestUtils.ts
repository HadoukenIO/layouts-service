import {Context, GenericTestContext, test} from 'ava';

// In testUtils.ts
interface InstanceData {
    skip?: boolean;
    failing?: boolean;
}

// Helper, easier to use "Parameterised<ResizeInstance>" than "ResizeInstance&InstanceData"
export type Parameterised<T> = T&InstanceData;

export interface TestMacro<T, C> {
    (t: GenericTestContext<Context<C>>, instance: T): void;
}

export function testParameterised<T, C extends {} = {}>(
    title: string|((data: T) => string), instanceData: Parameterised<T>[], testFunc: TestMacro<T, C>): void {
    instanceData.forEach((instance: T&InstanceData) => {
        const instanceTitle: string = typeof title === 'string' ? `${title} ${JSON.stringify(instance)}` : title(instance);

        if (instance.skip === true) {
            test.skip(instanceTitle, testFunc, instance);
        } else if (instance.failing === true) {
            test.failing(instanceTitle, testFunc, instance);
        } else {
            test(instanceTitle, testFunc, instance);
        }
    });
}