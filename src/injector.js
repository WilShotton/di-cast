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
            INCORRECT_METHOD_SIGNATURE = '[#002] Incorrect method signature supplied',
            INVALID_KEY_TYPE = '[#003] The key must be a String',
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

        function validateType(value, type, errorMsg) {

            if (!is(value, type)) {
                throw new TypeError(errorMsg);
            }
        }

        // Injector
        // --------------------
        function Injector() {

            var _injector = this,
                mappings = {};

            function validateKey(key) {

                validateType(key, 'string', INVALID_KEY_TYPE);

                if (_injector.hasMappingFor(key)) {
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

            function setProps(instance, vo) {

                if (!vo.hasOwnProperty('props')) {

                    vo.props = [];

                    for (var prop in instance) {
                        if (prop.indexOf('i_') === 0) {
                            vo.props[vo.props.length] = prop;
                        }
                    }
                }

                return vo.props;
            }

            function instantiate(vo) {

                var instance = new vo.Builder(slice.call(arguments, 1));

                checkInterface(instance, vo.api);

                setProps(instance, vo).forEach(function(prop) {
                    if (instance[prop] == null) {
                        instance[prop] = _injector.getMappingFor(prop.replace('i_', ''));
                    }
                });

                if (is(instance.postConstruct, 'Function')) {
                    instance.postConstruct(_injector);
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

                if (!_injector.hasMappingFor(key)) {
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
