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
 *
 * ++
 * @TODO: autoConstruct for Angular style constructor injection
 *
 * ++
 * @TODO: Add parent injector stuff...
 *
 * ++
 * @TODO: makeValue should resolve i_ properties
 */

;(function(root) {

    "use strict";

    var deps = [];

    function factory() {

        var INVALID_TARGET = '[#001] The target must be an Object or Function',
            INVALID_KEY_TYPE = '[#002] The key must be a String',
            NO_RESOLVER = '[#003] No resolver found',
            MAPPING_EXISTS = '[#004] A mapping already exists',
            NO_MAPPING = '[#005] No mapping found',
            MAPPING_HAS_DEPENDANTS = '[#006] The mapping has dependants',

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

                        return vo.injector.getMappingFor(key);
                    }));

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

            function makeValue(vo) {

                vo.props = [];

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

            function asSingleton(vo) {

                vo.isSingleton = true;

                return vo;
            }

            function using(vo) {

                var args = slice.call(arguments, 1);

                if (args.length > 0 && args[0]) {
                    vo.args = is(args[0], 'Array') ? args[0] : args;
                }

                return vo;
            }

            function makeResolver(resolver, type, target) {

                var deps = slice.call(arguments, makeResolver.length);

                return resolve(using(setResolver(resolver, type, makeMapping(), target), deps));
            }

            function makeFacade(vo) {

                function mutate(mutator, vo) {

                    return function() {

                        return makeFacade(partial(mutator, vo).apply(null, arguments));
                    };
                }

                return {

                    injector: function() {

                        return vo.injector;
                    },

                    toFactory: mutate(partial(setResolver, makeFactory, 'Function'), vo),

                    toType: mutate(partial(setResolver, makeType, 'Function'), vo),

                    toValue: mutate(partial(setResolver, makeValue, null), vo),

                    asSingleton: mutate(asSingleton, vo),

                    using: mutate(using, vo)
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

            this.unMap = function(key) {

                var value = null;

                function contains(list, key) {

                    return list.indexOf(key) !== -1;
                }

                if (self.hasMappingFor(key)) {

                    Object.keys(mappings).forEach(function(name) {

                        var mapping = mappings[name];

                        if (mapping.props === null) {
                            if (resolve(mapping).hasOwnProperty('make')) {
                                mapping.instance.make();
                            }
                        }

                        if (contains(mapping.args, key) || contains(mapping.props, 'i_' + key)) {
                            throw new Error(MAPPING_HAS_DEPENDANTS);
                        }
                    });

                    value = mappings[key].target;

                    delete mappings[key];
                }

                return value;
            };

            this.resolveFactory = partial(makeResolver, makeFactory, 'Function');

            this.resolveType = partial(makeResolver, makeType, 'Function');

            // This is pointless in its current form as toValue does not mutate the target
            // possibly toValue should resolve i_ properties on Arrays and Objects
            // this.resolveValue = partial(makeResolver, toValue, 'Object');
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
