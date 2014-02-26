/**
 * Created by wil on 14/01/2014.
 */

/**
 * ++
 * @TODO: Do not reset the api array once it has been checked
 *  - Check against the instance?
 *  - or add another property to the vo
 *
 * ++
 * @TODO: Mapping vo interface refactor
 *  - a setter can only be called once then it becomes a getter
 *  - mapping.as() should return the Interface if no args are supplied
 *  - mapping.asSingleton() should return the value if no args are supplied
 *
 *  - injector.map('key').toFactory({...}):injector;
 *  - injector.map('key').toType({...}):injector;
 *  - injector.map('key').toValue({...}):injector;
 *
 *  - config => {
 *      isSingleton: <Boolean>,
 *      as: <Interface>,
 *      using: <Array>
 *    }
 *
 * ++
 * @TODO: Add the Injector instance as a mapping
 *  - target -> this
 *  - resolver -> makeValue
 *
 * ++
 * @TODO: Custom InjectorError class
 *  - Message - to be used for testing expect(...).toThrow([message]);
 *  - Info - for better debugging
 *
 * ++
 * @TODO: README
 *
 * ++
 * @TODO: Add API Docs
 *
 * ++
 * @TODO: NPM
 *
 * ++
 * @TODO: Bower
 *
 * ++
 * @TODO: Injector.autoInject() for Angular style constructor injection
 *  - NOTE: Will need to split tests into pre / post compile
 *
 * ++
 * @TODO: Add parent injector stuff...
 */

;(function(root) {

    "use strict";

    var deps = [];

    function factory() {

        // @TODO: INVALID_TARGET does not take into account toValue validation
        var INVALID_TARGET = '[#001] The target must be an Object or Function',
            INCORRECT_METHOD_SIGNATURE = 'Incorrect method signature supplied',
            INVALID_KEY_TYPE = '[#002] The key must be a String',
            NO_RESOLVER = '[#003] No resolver found',
            MAPPING_EXISTS = '[#004] A mapping already exists',
            NO_MAPPING = '[#005] No mapping found',
            MAPPING_HAS_DEPENDANTS = '[#006] The mapping has dependants',

            INTERFACE_MEMBER_MISSING = '[#007] The mapping is missing a required member',
            INTERFACE_METHOD_ARITY_MISMATCH = '[#008] The mapping has an interface method with an incorrect arity',

            slice = Array.prototype.slice;

        function is(value, type) {

            return Object.prototype.toString
                .call(value)
                .split(' ')[1]
                .toLowerCase()
                .indexOf(type.toLowerCase()) !== -1;
        }

        function partial(fn) {

            var args = slice.call(arguments, 1);

            return function() {
                return fn.apply(this, args.concat(slice.call(arguments, 0)));
            };
        }

        function validateType(value, type, errorMsg) {

            if (!is(value, type)) {
                throw new TypeError(errorMsg);
            }
        }

        // Injector
        // --------------------
        function Injector() {

            // TODO: deprecate self use _injector
            var self = this,
                _injector = this,
                mappings = {};

            function resolve(vo) {

                if (vo.resolver == null) {
                    throw new Error(NO_RESOLVER);
                }

                return vo.resolver(vo);
            }

            function validateKey(key) {

                validateType(key, 'string', INVALID_KEY_TYPE);

                if (self.hasMappingFor(key)) {
                    throw new Error(MAPPING_EXISTS);
                }
            }

            function checkInterface(instance, api) {

                api.forEach(function(item) {

                    if(instance[item.name] == null) {

                        throw new Error(INTERFACE_MEMBER_MISSING);
                    }

                    if (item.hasOwnProperty('arity') && instance[item.name].length !== item.arity) {

                        throw new Error(INTERFACE_METHOD_ARITY_MISMATCH);
                    }
                });

                api = [];
            }

            function instantiate(vo) {

                var instance = new vo.Builder(slice.call(arguments, 1));

                checkInterface(instance, vo.api);

                if (!vo.hasOwnProperty('props')) {

                    vo.props = [];

                    for (var prop in instance) {
                        if (prop.indexOf('i_') === 0) {
                            vo.props[vo.props.length] = prop;
                        }
                    }
                }

                vo.props.forEach(function(prop) {
                    if (instance[prop] == null) {
                        instance[prop] = _injector.getMappingFor(prop.replace('i_', ''));
                    }
                });

                if (is(instance.postConstruct, 'Function')) {
                    instance.postConstruct();
                }

                return instance;
            }

            function makeFactory(vo) {

                function make() {

                    vo.Factory = vo.target.apply(vo.target, vo.args.map(function(key) {

                        return _injector.getMappingFor(key);
                    }));

                    vo.Builder = function Builder(args) {

                        return vo.Factory.apply(this, args);
                    };

                    vo.Builder.prototype = vo.Factory.prototype;

                    vo.instance = {

                        make: function() {

                            return instantiate.apply(this, [vo].concat(slice.call(arguments, 0)));
                        }
                    };

                    return vo.instance;
                }

                return vo.instance || make();
            }

            function makeType(vo) {

                if (!vo.hasOwnProperty('Builder')) {

                    vo.Builder = function Builder() {

                        return vo.target.apply(this, vo.args.map(function(key) {
                            return _injector.getMappingFor(key);
                        }));
                    };

                    vo.Builder.prototype = vo.target.prototype;
                }

                if (vo.isSingleton && !vo.hasOwnProperty('instance')) {
                    vo.instance = instantiate(vo);
                }

                return vo.instance || instantiate(vo);
            }

            function makeValue(vo) {

                if (!vo.processed) {

                    vo.processed = true;

                    checkInterface(vo.target, vo.api);

                    vo.props = [];

                    for (var prop in vo.target) {
                        if (prop.indexOf('i_') === 0 && vo.target[prop] == null) {
                            vo.props[vo.props.length] = prop;
                            vo.target[prop] = _injector.getMappingFor(prop.replace('i_', ''));
                        }
                    }
                }

                return vo.target;
            }

            function setResolver(resolver, type, vo, target) {

                if (vo.resolver !== null) {
                    throw new Error(MAPPING_EXISTS);
                }

                if (type !== null) {
                    validateType(target, type, INVALID_TARGET);
                }

                vo.target = target;
                vo.resolver = resolver;

                return vo;
            }

            // @TODO: Deprecate
            function asSingleton(vo) {

                vo.isSingleton = true;

                return vo;
            }

            // @TODO: Deprecate
            function using(vo) {

                var args = slice.call(arguments, 1);

                if (args.length > 0 && args[0]) {
                    vo.args = is(args[0], 'Array') ? args[0] : args;
                }

                return vo;
            }

            // @TODO: Deprecate
            function as(vo, api) {

                vo.api = api;

                return vo;
            }

            // TODO: Deprecate
            function makeFacade(key) {

                function mutate(mutator, vo) {

                    return function() {

                        return makeFacade(partial(mutator, vo).apply(null, arguments));
                    };
                }

                return {

                    /*
                    toType: function(config) {

                        if (arguments.length < 1) {
                            throw new Error(INCORRECT_METHOD_SIGNATURE);
                        }

                        validateType(config, 'Object', INCORRECT_METHOD_SIGNATURE);

                        validateType(config.target, 'Function', INVALID_TARGET);

                        mappings[key] = {

                            target: config.target,
                            resolver: makeFactory,

                            api: config.api || [],
                            args: config.using || []
                        };

                        return self;
                    }

                    injector: function() {

                        return vo.injector;
                    },

                    toFactory: mutate(partial(setResolver, makeFactory, 'Function'), vo),

                    //toType: mutate(partial(setResolver, makeType, 'Function'), vo),

                    toValue: mutate(partial(setResolver, makeValue, null), vo),

                    asSingleton: mutate(asSingleton, vo),

                    using: mutate(using, vo),

                    as: mutate(as, vo)
                    */
                };
            }

            // TODO: Deprecate - mappings should be type specific
            function makeMapping() {

                return {
                    injector: self,
                    target: null,
                    isSingleton: false,
                    resolver: null,
                    args: [],
                    props: null,
                    Builder: null,
                    instance: null,
                    api: []
                };
            }

            this.map = function(key) {

                validateKey(key);

                return {

                    toFactory: function(config) {

                        validateType(config, 'Object', INCORRECT_METHOD_SIGNATURE);
                        validateType(config.target, 'Function', INVALID_TARGET);

                        mappings[key] = {

                            resolver: makeFactory,

                            target: config.target,

                            api: config.api || [],
                            args: config.using || []
                        };

                        return _injector;
                    },

                    toType: function(config) {

                        validateType(config, 'Object', INCORRECT_METHOD_SIGNATURE);
                        validateType(config.target, 'Function', INVALID_TARGET);

                        mappings[key] = {

                            resolver: makeType,

                            target: config.target,

                            api: config.api || [],
                            args: config.using || [],
                            isSingleton: config.isSingleton || false
                        };

                        return _injector;
                    },

                    toValue: function(config) {

                        validateType(config, 'Object', INCORRECT_METHOD_SIGNATURE);

                        if (!config.hasOwnProperty('target')) {
                            throw new Error(INVALID_TARGET);
                        }

                        mappings[key] = {

                            resolver: makeValue,

                            target: config.target,

                            api: config.api || []
                        };

                        return _injector;
                    }
                };
            };

            this.hasMappingFor = function(key) {

                validateType(key, 'String', INVALID_KEY_TYPE);

                return mappings.hasOwnProperty(key);
            };

            this.getMappingFor = function(key) {

                if (!self.hasMappingFor(key)) {
                    throw new Error(NO_MAPPING);
                }

                return mappings[key].resolver(mappings[key]);
            };

            this.unMap = function(key) {

                var value = null;

                if (_injector.hasMappingFor(key)) {

                    Object.keys(mappings)
                        .filter(function(name) {

                            return name !== key;
                        })
                        .map(function(name) {

                            return mappings[name];
                        })
                        .forEach(function(mapping) {

                            if (mapping.hasOwnProperty('args') && mapping.args.indexOf(key) !== -1) {
                                throw new Error(MAPPING_HAS_DEPENDANTS);
                            }

                            if (!mapping.hasOwnProperty('props')) {
                                if (mapping.resolver(mapping).hasOwnProperty('make')) {
                                    mapping.instance.make();
                                }
                            }

                            if (mapping.props.indexOf('i_' + key) !== -1) {
                                throw new Error(MAPPING_HAS_DEPENDANTS);
                            }
                        });

                    value = mappings[key].target;

                    delete mappings[key];
                }

                return value;
            };

            // @TODO: Deprecate
            function makeResolver(resolver, type, target) {

                var deps = slice.call(arguments, makeResolver.length);

                return resolve(using(setResolver(resolver, type, makeMapping(), target), deps));
            }

            this.resolveFactory = function(target) {

                validateType(target, 'Function', INVALID_TARGET);

                return makeFactory({

                    target: target,
                    args: slice.call(arguments, 1),
                    api: []
                });
            };

            this.resolveType = function(target) {

                validateType(target, 'Function', INVALID_TARGET);

                return makeType({

                    target: target,
                    args: slice.call(arguments, 1),
                    isSingleton: false,
                    api: []
                });
            };

            this.resolveValue = function(target) {

                validateType(target, 'Object', INVALID_TARGET);

                return makeValue({

                    target: target,
                    api: []
                });
            };

            //this.resolveFactory = partial(makeResolver, makeFactory, 'Function');

            //this.resolveType = partial(makeResolver, makeType, 'Function');

            //this.resolveValue = partial(makeResolver, makeValue, 'Object');
        }

        return Injector;
    }

    // UMD style export.
    // ----------------------------------------
    /* istanbul ignore next */
    if (typeof define === 'function' && define.amd) {

        define(deps, factory);

    } else if (typeof module !== 'undefined' && module.exports) {

        module.exports = factory.apply(factory, deps.map(function(dep) {
            return require(dep);
        }));

    } else {

        root['Injector'] = factory.apply(factory, deps.map(function(dep) {
            return root[dep];
        }));
    }

})(this);
