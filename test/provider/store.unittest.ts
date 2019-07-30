import {Scope} from '../../gen/provider/config/layouts-config';
import {RequiredRecursive} from '../../src/provider/config/ConfigUtil';
import {ScopedConfig, Store} from '../../src/provider/config/Store';
import {MaskWatch, ScopeWatch} from '../../src/provider/config/Watch';

import {addConsoleSpies, ConsoleSpy} from './utils-unit/console';

/**
 * Configuration object used for testing.
 *
 * In real usage, this would come from a JSON schema.
 */
interface Config {
    // Generic properties of each primitive type
    bool?: boolean;
    num?: number;
    str?: string;

    // Object type, where all members are optional (borrowing the 'features' use-case from layouts config)
    features?: {
        snap?: boolean;
        dock?: boolean;
        tab?: boolean;
    };

    // Object type, must either be fully-specified or not at all specified (borrowing the 'tabstrip' use-case from layouts config)
    tabstrip?: {
        url: string;
        height: number;
    };

    // Object type, with some more detailed properties
    theme?: {
        scheme?: string;
        opacity?: number;
        backColour?: number|string;
        borderColour?: number|string;
        borderThickness?: number;
    };
}

/**
 * To reduce verbosity of tests, pre-define scopes that can be used for defining rules and querying the store.
 */
const scopes = {
    // "Generic" scopes with no contextual parameters
    service: {level: 'service'} as Scope,
    desktop: {level: 'desktop'} as Scope,

    // Three dummy applications
    app_1: {level: 'application', uuid: 'app-1'} as Scope,
    app_2: {level: 'application', uuid: 'app-2'} as Scope,
    app_3: {level: 'application', uuid: 'app-3'} as Scope,

    // Define two windows for each application
    win_1_1: {level: 'window', uuid: 'app-1', name: 'win-1'} as Scope,
    win_1_2: {level: 'window', uuid: 'app-1', name: 'win-2'} as Scope,
    win_2_1: {level: 'window', uuid: 'app-2', name: 'win-1'} as Scope,
    win_2_2: {level: 'window', uuid: 'app-2', name: 'win-2'} as Scope,
    win_3_1: {level: 'window', uuid: 'app-3', name: 'win-1'} as Scope,
    win_3_2: {level: 'window', uuid: 'app-3', name: 'win-2'} as Scope
};

/**
 * Parameters of the callbacks added to the `onAdd` and `onRemove` signals of a `Watch` object.
 */
type WatchCallbackParams = [ScopedConfig<Config>, Scope];

let store: Store<Config>;
const defaults: RequiredRecursive<Config> = {
    bool: true,
    num: 0,
    str: '',
    features: {snap: true, dock: true, tab: true},
    tabstrip: {url: 'http://localhost/tabstrip.html', height: 60},
    theme: {
        scheme: 'default',
        opacity: 1,
        backColour: 0x808080,
        borderColour: 'black',
        borderThickness: 1
    }
};

let spyConsole: ConsoleSpy;

beforeEach(() => {
    spyConsole = addConsoleSpies();

    jest.restoreAllMocks();
    store = new Store(defaults);
});

afterEach(() => {
    // Config store will typically report errors to the console rather than via exceptions
    // Any test that outputs warnings/errors should be considered a failure, much like any test that throws exceptions would
    expect(spyConsole.warn).not.toBeCalled();
    expect(spyConsole.error).not.toBeCalled();
});


it('Immediately after initialisation, all scopes should return a full config object', () => {
    expect(store.query(scopes.service)).toEqual(defaults);
    expect(store.query(scopes.desktop)).toEqual(defaults);
    expect(store.query(scopes.app_1)).toEqual(defaults);
    expect(store.query(scopes.win_1_1)).toEqual(defaults);
});

describe('When querying the store', () => {
    it('Application scopes are applied only on matching uuids', () => {
        store.add({level: 'application', uuid: 'app-1'}, {
            features: {tab: false},
            rules: [
                {scope: {level: 'application', uuid: 'app-2'}, config: {features: {snap: false, dock: false}}},
                {scope: {level: 'application', uuid: {expression: 'app-2|3'}}, config: {features: {snap: false, dock: true}}},
                {scope: {level: 'application', uuid: 'app-3'}, config: {features: {tab: false, dock: false}}}
            ]
        });

        // App1 receives top-level config, but none of the nested rules apply
        expect(store.query(scopes.app_1)).toHaveProperty('features', {snap: true, dock: true, tab: false});

        // App2 receives first and second rules, with first taking precedence due to higher specifity
        expect(store.query(scopes.app_2)).toHaveProperty('features', {snap: false, dock: false, tab: true});

        // App3 receives second and third rules, with the third taking precedence due to higher specifity
        expect(store.query(scopes.app_3)).toHaveProperty('features', {snap: false, dock: false, tab: false});
    });

    it('Application scopes are also applied to window scopes with matching uuids', () => {
        store.add({level: 'application', uuid: 'app-1'}, {
            features: {tab: false},
            rules: [
                {scope: {level: 'application', uuid: 'app-2'}, config: {features: {snap: false, dock: false}}},
                {scope: {level: 'application', uuid: {expression: 'app-2|3'}}, config: {features: {snap: false, dock: true}}},
                {scope: {level: 'application', uuid: 'app-3'}, config: {features: {tab: false, dock: false}}}
            ]
        });

        // App1 receives top-level config, but none of the nested rules apply
        expect(store.query(scopes.win_1_1)).toHaveProperty('features', {snap: true, dock: true, tab: false});
        expect(store.query(scopes.win_1_2)).toHaveProperty('features', {snap: true, dock: true, tab: false});

        // App2 receives first and second rules, with first taking precedence due to higher specifity
        expect(store.query(scopes.win_2_1)).toHaveProperty('features', {snap: false, dock: false, tab: true});
        expect(store.query(scopes.win_2_2)).toHaveProperty('features', {snap: false, dock: false, tab: true});

        // App3 receives second and third rules, with the third taking precedence due to higher specifity
        expect(store.query(scopes.win_3_1)).toHaveProperty('features', {snap: false, dock: false, tab: false});
        expect(store.query(scopes.win_3_2)).toHaveProperty('features', {snap: false, dock: false, tab: false});
    });

    it('Window scopes are applied only on matching uuids and names', () => {
        store.add({level: 'window', uuid: 'app-1', name: 'win-1'}, {
            features: {tab: false},
            rules: [
                {scope: {level: 'window', uuid: 'app-2', name: 'win-2'}, config: {features: {snap: false, dock: false}}},
                {scope: {level: 'window', uuid: {expression: 'app-2|3'}, name: 'win-1'}, config: {features: {snap: false, dock: true}}},
                {scope: {level: 'window', uuid: 'app-3', name: {expression: 'win-.+'}}, config: {features: {tab: false, dock: false}}}
            ]
        });

        expect(store.query(scopes.win_1_1)).toHaveProperty('features', {snap: true, dock: true, tab: false});
        expect(store.query(scopes.win_1_2)).toHaveProperty('features', {snap: true, dock: true, tab: true});
        expect(store.query(scopes.win_2_1)).toHaveProperty('features', {snap: false, dock: true, tab: true});
        expect(store.query(scopes.win_2_2)).toHaveProperty('features', {snap: false, dock: false, tab: true});
        expect(store.query(scopes.win_3_1)).toHaveProperty('features', {snap: false, dock: false, tab: false});
        expect(store.query(scopes.win_3_2)).toHaveProperty('features', {snap: true, dock: false, tab: false});
    });

    it('Window scopes are not applied to application queries', () => {
        store.add({level: 'window', uuid: 'app-1', name: 'win-1'}, {
            features: {tab: false},
            rules: [
                {scope: {level: 'window', uuid: 'app-2', name: 'win-2'}, config: {features: {snap: false, dock: false}}},
                {scope: {level: 'window', uuid: {expression: 'app-2|3'}, name: 'win-1'}, config: {features: {snap: false, dock: true}}},
                {scope: {level: 'window', uuid: 'app-3', name: {expression: 'win-.+'}}, config: {features: {tab: false, dock: false}}}
            ]
        });

        expect(store.query(scopes.app_1)).toHaveProperty('features', {snap: true, dock: true, tab: true});
        expect(store.query(scopes.app_2)).toHaveProperty('features', {snap: true, dock: true, tab: true});
        expect(store.query(scopes.app_3)).toHaveProperty('features', {snap: true, dock: true, tab: true});
    });
});

describe('When querying using a mask', () => {
    beforeEach(() => {
        store.add(scopes.app_1, {
            bool: false,
            str: 'Hello World',
            theme: {
                scheme: 'default',
                opacity: 0.5,
                backColour: 'green',
                borderThickness: 5
            }
        });
    });

    it('Only the fields in the mask are returned', () => {
        const mask = {
            bool: true,
            num: true
        };
        const result = {
            bool: false,
            num: 0
        };

        expect(store.queryPartial(scopes.app_1, mask)).toEqual(result);
    });

    it('Any "false" fields within the mask are ignored (not returned by query)', () => {
        const mask = {
            bool: false,
            num: true
        };
        const result = {
            num: 0
        };

        expect(store.queryPartial(scopes.app_1, mask)).toEqual(result);
    });

    it('Masks can be used recursively', () => {
        const mask = {
            bool: true,
            num: true,
            theme: {
                borderColour: true,
                borderThickness: true
            }
        };
        const result = {
            bool: false,
            num: 0,
            theme: {
                borderColour: 'black',
                borderThickness: 5
            }
        };

        expect(store.queryPartial(scopes.app_1, mask)).toEqual(result);
    });

    it('Can use true/false objects to mask the sub-tree below that point', () => {
        const mask = {
            bool: true,
            num: true,
            tabstrip: true,
            theme: false
        };
        const result = {
            bool: false,
            num: 0,
            tabstrip: {
                url: 'http://localhost/tabstrip.html',
                height: 60
            }
        };

        expect(store.queryPartial(scopes.app_1, mask)).toEqual(result);
    });

    it('Queries using masks still respect rules', () => {
        store.add(scopes.app_2, {
            // Top-level config doesn't apply to our queries below
            num: 999,
            rules: [{
                // Rule that applies to both queries, through application scope
                scope: scopes.app_1,
                config: {
                    tabstrip: {
                        url: 'http://localhost/tabstrip2.html',
                        height: 80
                    },
                    theme: {
                        opacity: 0.5
                    }
                }
            }, {
                // Rule that applies to second query only, through window scope
                scope: scopes.win_1_1,
                config: {
                    theme: {
                        'scheme': 'blue'
                    }
                }
            }]
        });

        const mask = {
            bool: false,
            num: true,
            tabstrip: true,
            theme: {
                scheme: true,
                opacity: true,
                borderColour: false,
                borderThickness: true
            }
        };
        const resultApp = {
            num: 0,
            tabstrip: {
                url: 'http://localhost/tabstrip2.html',
                height: 80
            },
            theme: {
                scheme: 'default',
                opacity: 0.5,
                borderThickness: 5
            }
        };
        const resultWindow = {
            num: 0,
            tabstrip: {
                url: 'http://localhost/tabstrip2.html',
                height: 80
            },
            theme: {
                scheme: 'blue',
                opacity: 0.5,
                borderThickness: 5
            }
        };

        expect(store.queryPartial(scopes.app_1, mask)).toEqual(resultApp);
        expect(store.queryPartial(scopes.win_1_1, mask)).toEqual(resultWindow);
    });
});

describe('When removing config of a specific scope', () => {
    beforeEach(() => {
        store.add(scopes.desktop, {num: 99});
        store.add(scopes.app_1, {num: 1});
        store.add(scopes.app_2, {num: 2});
        store.add(scopes.app_3, {num: 3});
        store.add(scopes.win_1_1, {num: 11});
        store.add(scopes.win_1_2, {num: 12});
        store.add(scopes.win_2_1, {num: 21});
        store.add(scopes.win_2_2, {num: 22});
        store.add(scopes.win_3_1, {num: 31});
        store.add(scopes.win_3_2, {num: 32});
    });

    it('Queries covering that scope no longer include those settings', () => {
        expect(store.query(scopes.app_1)).toHaveProperty('num', 1);
        store.removeFromSource(scopes.app_1);
        expect(store.query(scopes.app_1)).toHaveProperty('num', 99);
    });

    it('Removing a scope can expose previously overridden rules', () => {
        expect(store.query(scopes.win_2_1)).toHaveProperty('num', 21);
        expect(store.query(scopes.win_2_2)).toHaveProperty('num', 22);
        store.removeFromSource(scopes.win_2_1);

        // Falls-back to the previously-overridden app_2 rule
        expect(store.query(scopes.win_2_1)).toHaveProperty('num', 2);

        // Other overrides are still intact
        expect(store.query(scopes.win_2_2)).toHaveProperty('num', 22);
    });
});

describe('When adding a scope-based watch', () => {
    const config = {bool: true};

    let watch: ScopeWatch<Config>;
    let onAddProxy: jest.Mock<void, WatchCallbackParams>;
    let onRemoveProxy: jest.Mock<void, WatchCallbackParams>;

    beforeEach(() => {
        watch = new ScopeWatch(store, {level: 'application', uuid: 'my-app'});
        watch.onAdd.add(onAddProxy = jest.fn((a, b) => {}));
        watch.onRemove.add(onRemoveProxy = jest.fn((a, b) => {}));

        expect(onAddProxy.mock.calls).toHaveLength(0);
        expect(onRemoveProxy.mock.calls).toHaveLength(0);
    });

    it('Watch triggers when adding a config of that scope', () => {
        store.add({level: 'application', uuid: 'my-app'}, config);

        expect(onAddProxy.mock.calls).toHaveLength(1);
        expect(onRemoveProxy.mock.calls).toHaveLength(0);
    });

    it('Watch doesn\'t trigger when adding a config of different scope', () => {
        store.add({level: 'window', uuid: 'my-app', name: 'my-window'}, config);

        expect(onAddProxy.mock.calls).toHaveLength(0);
        expect(onRemoveProxy.mock.calls).toHaveLength(0);
    });

    it('Watch doesn\'t trigger when adding a config of the same level but different scope params', () => {
        store.add({level: 'application', uuid: 'other-app'}, config);

        expect(onAddProxy.mock.calls).toHaveLength(0);
        expect(onRemoveProxy.mock.calls).toHaveLength(0);
    });

    it('Watch doesn\'t trigger when config object is empty (no rules or config params)', () => {
        store.add({level: 'application', uuid: 'my-app'}, {});

        expect(onAddProxy.mock.calls).toHaveLength(0);
        expect(onRemoveProxy.mock.calls).toHaveLength(0);
    });

    describe('When a watch is removed', () => {
        beforeEach(() => {
            watch.remove();
        });

        it('Watch doesn\'t trigger once removed', () => {
            store.add({level: 'application', uuid: 'my-app'}, config);

            expect(onAddProxy.mock.calls).toHaveLength(0);
            expect(onRemoveProxy.mock.calls).toHaveLength(0);
        });

        it('The same object can be re-added and work as intended', () => {
            store.addWatch(watch);
            store.add({level: 'application', uuid: 'my-app'}, config);

            expect(onAddProxy.mock.calls).toHaveLength(1);
            expect(onRemoveProxy.mock.calls).toHaveLength(0);
        });
    });
});

describe('When adding a mask-based watch', () => {
    const mask = {features: {dock: true}};
    let watch: MaskWatch<Config, typeof mask>;
    let onAddProxy: jest.Mock<void, any>;
    let onRemoveProxy: jest.Mock<void, any>;

    beforeEach(() => {
        watch = new MaskWatch(store, mask);
        watch.onAdd.add(onAddProxy = jest.fn((a, b) => {}));
        watch.onRemove.add(onRemoveProxy = jest.fn((a, b) => {}));

        expect(onAddProxy.mock.calls).toHaveLength(0);
        expect(onRemoveProxy.mock.calls).toHaveLength(0);
    });

    it('Watch triggers when adding a config that matches the mask', () => {
        store.add({level: 'desktop'}, {features: {dock: true}});

        expect(onAddProxy.mock.calls).toHaveLength(1);
        expect(onRemoveProxy.mock.calls).toHaveLength(0);

        store.add({level: 'application', uuid: 'my-app'}, {features: {dock: false}});

        expect(onAddProxy.mock.calls).toHaveLength(2);
        expect(onRemoveProxy.mock.calls).toHaveLength(0);

        store.add({level: 'window', uuid: 'other-app', name: 'some-window'}, {features: {dock: false}});

        expect(onAddProxy.mock.calls).toHaveLength(3);
        expect(onRemoveProxy.mock.calls).toHaveLength(0);
    });

    it('Watch doesn\'t trigger when adding a config that doesn\'t match mask', () => {
        store.add({level: 'desktop'}, {tabstrip: {url: '', height: 60}});

        expect(onAddProxy.mock.calls).toHaveLength(0);
        expect(onRemoveProxy.mock.calls).toHaveLength(0);

        store.add({level: 'application', uuid: 'my-app'}, {features: {snap: false}});

        expect(onAddProxy.mock.calls).toHaveLength(0);
        expect(onRemoveProxy.mock.calls).toHaveLength(0);

        store.add({level: 'window', uuid: 'other-app', name: 'some-window'}, {features: {tab: true}});

        expect(onAddProxy.mock.calls).toHaveLength(0);
        expect(onRemoveProxy.mock.calls).toHaveLength(0);
    });

    describe('When a watch is removed', () => {
        beforeEach(() => {
            watch.remove();
        });

        it('Watch doesn\'t trigger once removed', () => {
            store.add({level: 'application', uuid: 'my-app'}, {features: {dock: false}});

            expect(onAddProxy.mock.calls).toHaveLength(0);
            expect(onRemoveProxy.mock.calls).toHaveLength(0);
        });

        it('The same object can be re-added and work as intended', () => {
            store.addWatch(watch);
            store.add({level: 'application', uuid: 'my-app'}, {features: {dock: false}});

            expect(onAddProxy.mock.calls).toHaveLength(1);
            expect(onRemoveProxy.mock.calls).toHaveLength(0);
        });
    });
});

describe('When there are multiple rules that match the given query', () => {
    describe('When rules are of different scopes', () => {
        it('Higher-precedence scopes take priority', () => {
            store.add(scopes.app_1, {
                theme: {scheme: 'blue'}
            });
            store.add(scopes.win_1_1, {
                theme: {scheme: 'red'}
            });

            // The top-level win_1_1 rule takes precedence over the top-level app_1 rule
            expect(store.query(scopes.win_1_1)).toHaveProperty('theme.scheme', 'red');
        });

        it('Precedence rules are also applied to nested rules', () => {
            store.add(scopes.app_1, {
                theme: {scheme: 'blue'},
                rules: [{
                    scope: scopes.win_1_1,
                    config: {theme: {scheme: 'red'}}
                }]
            });

            // The nested win_1_1 rule takes precedence over the top-level app_1 rule
            expect(store.query(scopes.win_1_1)).toHaveProperty('theme.scheme', 'red');
        });

        it('Config source does not override scope precedence', () => {
            store.add(scopes.app_1, {
                theme: {scheme: 'blue'}
            });
            store.add(scopes.desktop, {
                theme: {scheme: 'green'},
                rules: [{
                    scope: scopes.win_1_1,
                    config: {theme: {scheme: 'red'}}
                }]
            });

            // The nested win_1_1 rule takes precedence over the top-level app_1 rule, despite being nested under the lower-precedence 'desktop' source
            expect(store.query(scopes.win_1_1)).toHaveProperty('theme.scheme', 'red');
        });

        it('Rule specifity does not override scope precedence', () => {
            store.add(scopes.app_1, {
                theme: {scheme: 'blue'}
            });
            store.add(scopes.desktop, {
                theme: {scheme: 'green'},
                rules: [{
                    scope: {'level': 'window', uuid: {expression: 'ap[p]-\\d'}, name: {expression: 'wi.-1'}},
                    config: {theme: {scheme: 'red'}}
                }]
            });

            // The nested window rule takes precedence over the top-level app_1 rule, despite being a non-concrete regex rule
            expect(store.query(scopes.win_1_1)).toHaveProperty('theme.scheme', 'red');
        });

        it('Order of addition does not override scope precedence', () => {
            store.add(scopes.win_1_1, {
                theme: {scheme: 'red'}
            });
            store.add(scopes.app_1, {
                theme: {scheme: 'blue'}
            });

            // The top-level win_1_1 rule takes precedence over the top-level app_1 rule, despite app_1 being added later
            expect(store.query(scopes.win_1_1)).toHaveProperty('theme.scheme', 'red');
        });
    });

    describe('When adding rules of the same scope', () => {
        it('Sources of a higher-precedence scope take priority', () => {
            store.add(scopes.desktop, {
                rules: [{
                    scope: scopes.win_1_1,
                    config: {theme: {scheme: 'blue'}}
                }]
            });
            store.add(scopes.app_1, {
                rules: [{
                    scope: scopes.win_1_1,
                    config: {theme: {scheme: 'red'}}
                }]
            });

            // The win_1_1 rule from the app_1 source takes precedence over the win_1 rule from 'desktop' source
            expect(store.query(scopes.win_1_1)).toHaveProperty('theme.scheme', 'red');
        });

        it('Rule specifity does not override scope precedence', () => {
            store.add(scopes.desktop, {
                rules: [{
                    scope: scopes.win_1_1,
                    config: {theme: {scheme: 'blue'}}
                }]
            });
            store.add(scopes.app_1, {
                rules: [{
                    scope: {'level': 'window', uuid: {expression: 'ap[p]-\\d'}, name: {expression: 'wi.-1'}},
                    config: {theme: {scheme: 'red'}}
                }]
            });

            // The rule coming from app_1 still takes precedence over the coming from 'desktop' source, despite being a non-concrete regex rule
            expect(store.query(scopes.win_1_1)).toHaveProperty('theme.scheme', 'red');
        });

        it('Order of addition does not override scope precedence', () => {
            store.add(scopes.app_1, {
                rules: [{
                    scope: scopes.win_1_1,
                    config: {theme: {scheme: 'red'}}
                }]
            });
            store.add(scopes.desktop, {
                rules: [{
                    scope: scopes.win_1_1,
                    config: {theme: {scheme: 'blue'}}
                }]
            });

            // The rule coming from app_1 takes precedence over the rule coming from 'desktop', despite the 'desktop' source being added later
            expect(store.query(scopes.win_1_1)).toHaveProperty('theme.scheme', 'red');
        });
    });

    describe('When adding configs of the same scope and source', () => {
        it('The most-specific rules are applied first', () => {
            store.add(scopes.app_1, {
                rules: [{
                    scope: {'level': 'window', uuid: {expression: 'ap[p]-\\d'}, name: {expression: 'wi.-1'}},
                    config: {theme: {scheme: 'blue'}}
                }]
            });
            store.add(scopes.app_1, {
                rules: [{
                    scope: {'level': 'window', uuid: {expression: 'ap[p]-\\d'}, name: 'win-1'},
                    config: {theme: {scheme: 'green'}}
                }]
            });
            store.add(scopes.app_1, {
                rules: [{
                    scope: {'level': 'window', uuid: 'app-1', name: 'win-1'},
                    config: {theme: {scheme: 'red'}}
                }]
            });

            // The rule with fewest regex expressions takes precedence
            expect(store.query(scopes.win_1_1)).toHaveProperty('theme.scheme', 'red');
        });

        it('Order of addition does not override rule specifity', () => {
            store.add(scopes.app_1, {
                rules: [{
                    scope: {'level': 'window', uuid: {expression: 'ap[p]-\\d'}, name: 'win-1'},
                    config: {theme: {scheme: 'green'}}
                }]
            });
            store.add(scopes.app_1, {
                rules: [{
                    scope: {'level': 'window', uuid: 'app-1', name: 'win-1'},
                    config: {theme: {scheme: 'red'}}
                }]
            });
            store.add(scopes.app_1, {
                rules: [{
                    scope: {'level': 'window', uuid: {expression: 'ap[p]-\\d'}, name: {expression: 'wi.-1'}},
                    config: {theme: {scheme: 'blue'}}
                }]
            });

            // The rule with fewest regex expressions takes precedence, regardless of ordering of expressions
            expect(store.query(scopes.win_1_1)).toHaveProperty('theme.scheme', 'red');
        });
    });

    describe('When adding configs of the same scope, source and specifity', () => {
        it('The most-recently added rule takes precedence (concrete rules)', () => {
            store.add(scopes.app_1, {
                rules: [{
                    scope: {'level': 'window', uuid: 'app-1', name: 'win-1'},
                    config: {theme: {scheme: 'blue'}}
                }]
            });
            store.add(scopes.app_1, {
                rules: [{
                    scope: {'level': 'window', uuid: 'app-1', name: 'win-1'},
                    config: {theme: {scheme: 'green'}}
                }]
            });
            store.add(scopes.app_1, {
                rules: [{
                    scope: {'level': 'window', uuid: 'app-1', name: 'win-1'},
                    config: {theme: {scheme: 'red'}}
                }]
            });

            // The most-recently added rule has precedence, as there is no other way to determine precedence
            expect(store.query(scopes.win_1_1)).toHaveProperty('theme.scheme', 'red');
        });

        it('The most-recently added rule takes precedence (mixed concrete/regex rules)', () => {
            store.add(scopes.app_1, {
                rules: [{
                    scope: {'level': 'window', uuid: {expression: 'ap[p]-\\d'}, name: 'win-1'},
                    config: {theme: {scheme: 'blue'}}
                }]
            });
            store.add(scopes.app_1, {
                rules: [{
                    scope: {'level': 'window', uuid: {expression: 'ap[p]-\\d'}, name: 'win-1'},
                    config: {theme: {scheme: 'green'}}
                }]
            });
            store.add(scopes.app_1, {
                rules: [{
                    scope: {'level': 'window', uuid: {expression: 'ap[p]-\\d'}, name: 'win-1'},
                    config: {theme: {scheme: 'red'}}
                }]
            });

            // The most-recently added rule has precedence, as there is no other way to determine precedence
            expect(store.query(scopes.win_1_1)).toHaveProperty('theme.scheme', 'red');
        });

        it('The most-recently added rule takes precedence (regex rules)', () => {
            store.add(scopes.app_1, {
                rules: [{
                    scope: {'level': 'window', uuid: {expression: 'ap[p]-\\d'}, name: {expression: 'wi.-1'}},
                    config: {theme: {scheme: 'blue'}}
                }]
            });
            store.add(scopes.app_1, {
                rules: [{
                    scope: {'level': 'window', uuid: {expression: 'ap[p]-\\d'}, name: {expression: 'wi.-1'}},
                    config: {theme: {scheme: 'green'}}
                }]
            });
            store.add(scopes.app_1, {
                rules: [{
                    scope: {'level': 'window', uuid: {expression: 'ap[p]-\\d'}, name: {expression: 'wi.-1'}},
                    config: {theme: {scheme: 'red'}}
                }]
            });

            // The most-recently added rule has precedence, as there is no other way to determine precedence
            expect(store.query(scopes.win_1_1)).toHaveProperty('theme.scheme', 'red');
        });
    });
});
