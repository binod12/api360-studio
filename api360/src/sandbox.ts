export interface SandboxContext {
    request?: {
        url: string;
        method: string;
        headers: Record<string, string>;
        body: any;
    };
    response?: {
        status: number;
        time: number;
        size: number;
        body: any;
        headers: Record<string, string>;
    };
    environment: {
        get: (key: string) => string | undefined;
        set: (key: string, value: string) => void;
    };
    variables: Record<string, string>;
}

export interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
}

export const executeScript = (
    script: string,
    context: SandboxContext
): {
    context: SandboxContext;
    tests: TestResult[];
    error?: string;
} => {
    const tests: TestResult[] = [];

    // Define the isolated `api360` SDK provided natively within the sandbox.
    const api360 = {
        environment: {
            get: context.environment.get,
            set: context.environment.set
        },
        variables: {
            get: (k: string) => context.variables[k],
            set: (k: string, v: string) => { context.variables[k] = v; }
        },
        test: (name: string, fn: () => void) => {
            try {
                fn();
                tests.push({ name, passed: true });
            } catch (e: any) {
                tests.push({ name, passed: false, error: e.message });
            }
        },
        expect: (val: any) => ({
            toBe: (expected: any) => {
                if (val !== expected) throw new Error(`Expected ${expected} but got ${val}`);
            },
            toNotBe: (expected: any) => {
                if (val === expected) throw new Error(`Expected not ${expected} but got ${val}`);
            },
            toContain: (expected: any) => {
                if (!val?.includes?.(expected)) throw new Error(`Expected ${JSON.stringify(val)} to contain ${expected}`);
            },
            toBeGreaterThan: (expected: number) => {
                if (val <= expected) throw new Error(`Expected ${val} to be greater than ${expected}`);
            },
            toBeLessThan: (expected: number) => {
                if (val >= expected) throw new Error(`Expected ${val} to be less than ${expected}`);
            }
        })
    };

    // Build the strict lexical scope properties overrides to inject into the execution thread
    const sandboxScope = {
        api360,
        pm: api360, // Postman compatibility alias
        request: context.request,
        response: context.response,
        console: {
            log: (...a: any) => console.log('Sandbox Log:', ...a),
            warn: (...a: any) => console.warn('Sandbox Warn:', ...a),
            error: (...a: any) => console.error('Sandbox Error:', ...a),
        },
        // Nullify dangerous global browser objects to prevent DOM escapes
        window: undefined,
        document: undefined,
        localStorage: undefined,
        sessionStorage: undefined,
        fetch: undefined,
        XMLHttpRequest: undefined
    };

    const argNames = Object.keys(sandboxScope);
    const argValues = Object.values(sandboxScope);

    try {
        // Dynamically compile the user script with the sandboxed variables enforced as parameters
        const compiledFunction = new Function(...argNames, script);

        // Execute
        compiledFunction(...argValues);

        return { context, tests };
    } catch (e: any) {
        return { context, tests, error: e.message };
    }
};
