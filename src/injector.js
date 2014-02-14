/**
 * Created by wil on 14/01/2014.
 */

/**
 *
 * ++
 * @TODO: Add YUIDocs
 *
 * ++
 * @TODO: as([...]) - for duck typing...
 *
 * ++
 * @TODO: README
 */

;(function(root) {

    "use strict";

    var deps = [];

    function factory() {

        var INVALID_MAPPING_TYPE = '[#001] The mapping must be a function',
            INVALID_KEY_TYPE = '[#002] The key must be a String',
            NO_RESOLVER = '[#003] No resolver found',
            MAPPING_EXISTS = '[#004] A mapping already exists',
            NO_MAPPING = '[#005] No mapping found',
            MAPPING_HAS_DEPENDANTS = '[#006] The mapping has dependants',
            INVALID_RESOLVE_TARGET = '[#007] The resolve target must be an Object or Function',

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

            var self = this,
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

            function instantiate(vo) {

                // @TODO Set instance.prototype.constructor

                var instance = new vo.Builder(slice.call(arguments, 1));

                if (vo.props === null) {

                    vo.props = [];

                    for (var prop in instance) {
                        if (prop.indexOf('i_') === 0) {
                            vo.props[vo.props.length] = prop;
                        }
                    }
                }

                vo.props.forEach(function(prop) {
                    if (instance[prop] == null) {
                        instance[prop] = vo.injector.getMappingFor(prop.replace('i_', ''));
                    }
                });

                if (is(instance.postConstruct, 'Function')) {
                    instance.postConstruct();
                }

                return instance;
            }

            function makeFactory(vo) {

                function make() {

                    var Factory = vo.target.apply(vo.target, vo.args.map(function(key) {

                        return self.getMappingFor(key);
                    }));

                    // @TODO: Check if it is necessary to explicitly set args - could use arguments instead
                    vo.Builder = function Builder(args) {

                        return Factory.apply(this, args);
                    };

                    vo.Builder.prototype = Factory.prototype;

                    vo.instance = {

                        make: function() {

                            return instantiate.apply(this, [vo].concat(slice.call(arguments, 0)));
                        }
                    };
                }

                if (vo.instance == null) {

                    make();
                }

                return vo.instance;
            }

            function makeType(vo) {

                if (vo.Builder == null) {

                    vo.Builder = function Builder() {

                        return vo.target.apply(this, vo.args.map(function(key) {

                            return vo.injector.getMappingFor(key);
                        }));
                    };

                    vo.Builder.prototype = vo.target.prototype;
                }

                if (vo.isSingleton && vo.instance === null) {

                    vo.instance = instantiate(vo);
                }

                return vo.instance || instantiate(vo);
            }

            function makeValue() {

                this.props = [];

                return function resolve() {
                    return this.target;
                }
            }

            function toFactory(vo, target) {

                if (vo.resolver !== null) {
                    throw new Error(MAPPING_EXISTS);
                }

                validateType(target, 'function', INVALID_MAPPING_TYPE);

                vo.target = target;
                vo.resolver = makeFactory;

                return makeFacade(vo);
            }

            function toType(vo, target) {

                if (vo.resolver !== null) {
                    throw new Error(MAPPING_EXISTS);
                }

                validateType(target, 'function', INVALID_MAPPING_TYPE);

                vo.target = target;
                vo.resolver = makeType;

                return makeFacade(vo);
            }

            function toValue(vo, target) {

                if (vo.resolver !== null) {
                    throw new Error(MAPPING_EXISTS);
                }

                vo.target = target;
                vo.resolver = makeValue.apply(vo);

                return makeFacade(vo);
            }

            function asSingleton(vo) {

                vo.isSingleton = true;

                return makeFacade(vo);
            }

            function using(vo) {

                var args = slice.call(arguments, 1);

                if (args.length > 0 && args[0]) {
                    vo.args = is(args[0], 'Array') ? args[0] : args;
                }

                return makeFacade(vo);
            }

            function makeFacade(vo) {

                return {

                    injector: function() {
                        return vo.injector;
                    },

                    toFactory: partial(toFactory, vo),
                    toType: partial(toType, vo),
                    toValue: partial(toValue, vo),

                    asSingleton: partial(asSingleton, vo),
                    using: partial(using, vo)
                };
            }

            function makeMapping() {

                return {
                    injector: self,
                    target: null,
                    isSingleton: false,
                    resolver: null,
                    args: [],
                    props: null,
                    Builder: null,
                    instance: null
                };
            }

            this.map = function(key) {

                validateKey(key);

                mappings[key] = makeMapping();

                // @TODO: the facade should be created once and then passed as an argument
                return makeFacade(mappings[key]);
            };

            this.hasMappingFor = function(key) {

                validateType(key, 'String', INVALID_KEY_TYPE);

                return mappings.hasOwnProperty(key);
            };

            this.getMappingFor = function(key) {

                validateType(key, 'String', INVALID_KEY_TYPE);

                if (!self.hasMappingFor(key)) {
                    throw new Error(NO_MAPPING);
                }

                return resolve(mappings[key]);
            };


            // @TODO - test unMap
            this.unMap = function(key) {

                var value = null;

                if (self.hasMappingFor(key)) {

                    Object.keys(mappings).forEach(function(name) {
                        if (mappings[name].dependsOn(key)) {
                            throw new Error(MAPPING_HAS_DEPENDANTS);
                        }
                    });

                    value = mappings[key].destroy();

                    delete mappings[key];
                }

                return value;
            };

            this.resolveFactory = function(target) {

                validateType(target, 'Function', INVALID_RESOLVE_TARGET);

                var vo = makeMapping();

                toFactory(vo, target).using(slice.call(arguments, 1));

                return resolve(vo);
            };

            this.resolveType = function(target) {

                validateType(target, 'Function', INVALID_RESOLVE_TARGET);

                var vo = makeMapping();

                toType(vo, target).using(slice.call(arguments, 1));

                return resolve(vo);
            };

            this.resolveValue = function(target) {

                validateType(target, 'Object', INVALID_RESOLVE_TARGET);

                var vo = makeMapping();

                toValue(vo, target);

                return resolve(vo);
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
