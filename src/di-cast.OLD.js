;(function(root) {

    "use strict";

    /**
     * @module DiCast
     * @returns {DiCast}
     */
    function factory() {

        var CIRCULAR_DEPENDENCY = {
                message: 'Circular dependency',
                info: '{{target}} has a dependency that depends on {{target}}'
            },

            INCORRECT_METHOD_SIGNATURE = 'Incorrect method signature',

            INTERFACE_MEMBER_MISSING = {
                message: 'Interface missing member',
                info: 'The mapping must have a member called {{name}}'
            },

            INTERFACE_METHOD_ARITY_MISMATCH = {
                message: 'Interface method with arity mismatch',
                info: 'The method signature for {{name}} requires {{arity}} arguments'
            },

            INVALID_FACTORY = {
                message: 'Invalid factory',
                info: '{{name}} must return a value'
            },

            INVALID_KEY_TYPE = 'The key must be a String',

            INVALID_PARENT = 'The parent injector must be an injector',

            INVALID_TARGET = 'The target must be an Object or Function',

            MAPPING_EXISTS = {
                message: 'Mapping exists',
                info: 'The mapping {{key}} is already in use'
            },

            MAPPING_HAS_DEPENDANTS = {
                message: 'Mapping has dependants',
                info: '{{key}} could not be removed as other mapping depend on it'
            },

            MISSING_TARGET = {
                message: 'Missing target',
                info: 'The mapping for {{key}} must have a target property'
            },

            NO_MAPPING = {
                message: 'No mapping',
                info: 'No mapping for [{{key}}] found'
            },

            I_POINT = '{I}',

            slice = Array.prototype.slice;

        function mapping() {

            var base = {

                name: 'anon',
                target: null,
                using: [],

                resolver: null,
                api: [],
                Builder: null,
                isSingleton: false,
                defer: false
            };

            slice.call(arguments).forEach(function(source) {

                Object.keys(source).forEach(function(key) {
                    if (source[key] != null) {
                        base[key] = source[key];
                    }
                });
            });

            return base;
        }

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

        /**
         * A custom Error class for the dependency injector.
         *
         * @class InjectionError
         * @extends Error
         * @param {Object} template The template strings.
         *  @param {String} template.message The error message.
         *  @param {String} template.info Contextual information about the error.
         * @param {Object} context The data Object to format the template.info String with.
         * @constructor
         */
        function InjectionError(template, context) {

            var stack = (new Error()).stack;

            /* istanbul ignore next */
            this.stack = template.message.concat(
                '\n',
                stack != null ? stack.split('\n').slice(1).join('\n') : ''
            );

            this.message = ''.concat(
                template.message.toUpperCase(),
                ': ',
                template.info.replace(/\{\{(\w+)\}\}/g, function(_, match) {
                    return context[match];
                })
            );
        }
        InjectionError.prototype = new Error();
        InjectionError.prototype.name = 'InjectionError';
        InjectionError.prototype.constructor = InjectionError;

        // Mapping mutators
        // --------------------
        function checkInterface(vo) {

            vo.api.forEach(function(item) {

                if (vo.instance[item.name] == null) {

                    throw new InjectionError(INTERFACE_MEMBER_MISSING, item);
                }

                if (item.hasOwnProperty('arity') && vo.instance[item.name].length !== item.arity) {

                    throw new InjectionError(INTERFACE_METHOD_ARITY_MISMATCH, item);
                }
            });

            return vo;
        }

        function setProps(vo) {

            vo.using.forEach(function(dep) {
                vo.instance[dep] = vo.injector.get(dep);
            });

            return vo;
        }

        function post(vo) {

            if (is(vo.instance.postConstruct, 'Function')) {
                vo.instance.postConstruct(vo.injector);
            }

            return vo;
        }

        function makeBuilder(target) {

            function Builder(args) {
                return target.apply(this, args);
            }

            Builder.prototype = Object.create(target.prototype);

            return Builder;
        }

        function parseProps(target) {

            var list = [];

            if (is(target, 'Object')) {

                for (var key in target) {
                    if (target[key] === I_POINT) {
                        list[list.length] = key;
                    }
                }
            }

            return list;
        }

        // Factory functions.
        // --------------------
        function makeConstructor(vo) {

            if (!vo.hasOwnProperty('instance') || !vo.isSingleton) {

                vo.instance = new vo.Builder(vo.using.map(function(key) {
                    return vo.injector.get(key);
                }));

                checkInterface(vo);
            }

            return vo.instance;
        }

        function makeFactory(vo) {

            if (!vo.hasOwnProperty('instance') || !vo.isSingleton) {

                vo.instance = vo.target.apply(null, vo.using.map(function(key) {
                    return vo.injector.get(key);
                }));

                if (vo.instance == null) {
                    throw new InjectionError(INVALID_FACTORY, {name: vo.name});
                }
            }

            return vo.instance;
        }

        function makeLens(vo) {

            if (!vo.hasOwnProperty('instance')) {

                var path = vo.target.split('.');

                vo.instance = path.reduce(function(previous, current) {

                    return previous[current];

                }, vo.injector.get(path.shift()));
            }

            return vo.instance;
        }

        function makeValue(vo) {

            if (!vo.hasOwnProperty('instance')) {

                vo.instance = vo.target;

                post(setProps(checkInterface(vo)));
            }

            return vo.instance;
        }

        /**
         * A JavaScript dependency injector.
         *
         * @class DiCast
         * @constructor
         */
        function DiCast(parent) {

            var _injector = this,

                resolving = [],

                mappings = {
                    injector: {
                        name: 'injector',
                        resolver: makeValue,
                        target: _injector,
                        using: [],
                        api: []
                    }
                };

            if (parent && parent.constructor !== this.constructor) {
                throw new Error(INVALID_PARENT);
            }

            /**
             *
             * @class MapOptions
             * @constructor
             */
            function MapOptions(key) {

                /**
                 * Maps a key to a factory function.
                 *
                 * @method toFactory
                 * @param {Object} config The config options for the mapping.
                 *  @param {Function} config.target The factory function.
                 *  @param {Array} [config.api] An interface definition for duck typing.
                 *  @param {Boolean} [config.isSingleton] If the mapping should be treated as a singleton.
                 *  @param {Array} [config.using] Any constructor dependencies.
                 *  @param {Boolean} [config.defer] If the injector should defer to the parent injector.
                 * @returns {DiCast} A reference back to the DiCast instance.
                 */
                this.toFactory = function(config) {

                    validateType(config, 'Object', INCORRECT_METHOD_SIGNATURE);
                    validateType(config.target, 'Function', INVALID_TARGET);

                    mappings[key] = mapping(config, {

                        injector: _injector,

                        name: key,
                        resolver: makeFactory
                    });

                    return _injector;
                };

                /**
                 * Maps a key to a member of another dependency.
                 *
                 * @method toLens
                 * @param {Object} config The config options for the mapping.
                 *  @param {String} config.target The dot delimited path to the dependency.
                 * @returns {DiCast} A reference back to the DiCast instance.
                 */
                this.toLens = function(config) {

                    validateType(config, 'Object', INCORRECT_METHOD_SIGNATURE);
                    validateType(config.target, 'String', INVALID_TARGET);

                    mappings[key] = mapping(config, {

                        injector: _injector,

                        name: key,
                        resolver: makeLens
                    });

                    return _injector;
                };

                /**
                 * Maps a key to a constructor function.
                 *
                 * @method toType
                 * @param {Object} config The config options for the mapping.
                 *  @param {Function} config.target The factory function.
                 *  @param {Array} [config.api] An interface definition for duck typing.
                 *  @param {Boolean} [config.isSingleton] If the mapping should be treated as a singleton.
                 *  @param {Array} [config.using] Any constructor dependencies.
                 * @returns {DiCast} A reference back to the DiCast instance.
                 */
                this.toType = function(config) {

                    validateType(config, 'Object', INCORRECT_METHOD_SIGNATURE);
                    validateType(config.target, 'Function', INVALID_TARGET);

                    mappings[key] = mapping(config, {

                        injector: _injector,

                        name: key,
                        resolver: makeConstructor,
                        Builder: makeBuilder(config.target)
                    });

                    return _injector;
                };

                /**
                 * Maps a key to a value.
                 *
                 * @method toValue
                 * @param {Object} config The config options for the mapping.
                 *  @param {*} config.target The value.
                 *  @param {Array} [config.api] The interface definition for duck typing.
                 * @returns {DiCast} A reference back to the DiCast instance.
                 */
                this.toValue = function(config) {

                    validateType(config, 'Object', INCORRECT_METHOD_SIGNATURE);

                    if (!config.hasOwnProperty('target')) {
                        throw new InjectionError(MISSING_TARGET, {key: key});
                    }

                    mappings[key] = mapping(config, {

                        injector: _injector,

                        name: key,
                        resolver: makeValue,
                        using: parseProps(config.target)
                    });

                    return _injector;
                };
            }

            /**
             * Gets an array of all mappings.
             *
             * @method all
             * @for DiCast
             * @return {Array} An array of mapping objects.
             */
            this.all = function() {

                if(!parent) {
                    return [mappings];
                }

                return parent.all().concat([mappings]);
            };

            /**
             * Initialises a mapping key and returns the different methods for creating a mapping.
             *
             * @method map
             * @for DiCast
             * @param {String} key The mapping identifier.
             * @return {MapOptions} The various mapping options available.
             */
            this.map = function(key) {

                validateType(key, 'string', INVALID_KEY_TYPE);

                if (mappings.hasOwnProperty(key)) {
                    throw new InjectionError(MAPPING_EXISTS, {key: key});
                }

                return new MapOptions(key);
            };

            /**
             * Check to see if the injector has a mapping for a given key.
             *
             * If no mapping exists and DiCast has a parent then resolution is deferred to the parent.
             *
             * @method has
             * @for DiCast
             * @param {String} key The mapping key.
             * @param {Boolean} local Flag to check in the local injector scope only.
             * @return {Boolean} true If the mapping exists.
             */
            this.has = function(key, local) {

                validateType(key, 'String', INVALID_KEY_TYPE);

                if (local) {

                    return mappings.hasOwnProperty(key) || false;
                }

                return (mappings.hasOwnProperty(key) || parent && parent.has(key)) || false;
            };

            /**
             * Returns a fully resolved target for the given key as described by the mapping options.
             *
             * If no mapping is found an Injection Error is thrown.
             *
             * @method get
             * @param {String} keys The mapping key.
             * @return {*} The resolved target.
             */
            this.get = function(keys) {

                var instance = null;

                var path = keys.split('.');
                var key = path[0];
                var properties = path.slice(1);

                if (!_injector.has(key)) {
                    throw new InjectionError(NO_MAPPING, {key: key});
                }

                if (resolving.indexOf(key) !== -1) {

                    resolving.push(key);
                    throw new InjectionError(CIRCULAR_DEPENDENCY, {target: key});
                }

                resolving.push(key);

                if (mappings.hasOwnProperty(key)) {

                    if (mappings[key].defer && parent.has(key)) {

                        instance = parent.get(key);

                    } else {

                        instance = mappings[key].resolver(mappings[key]);
                    }

                } else {

                    instance = parent.get(key);
                }

                resolving.pop();

                return properties.reduce(function(acc, property) {
                    return acc[property];
                }, instance);
            };

            /**
             * Removes a mapping from the local Injector scope.
             *
             * @method remove
             * @param {String} key The mapping key.
             * @returns {*} Either the removed mapping target or Null.
             */
            this.remove = function(key) {

                var target = null;

                if (_injector.has(key)) {

                    for (var n in mappings) {

                        if (mappings.hasOwnProperty(n) && n !== key) {
                            if (mappings[n].using.indexOf(key) !== -1) {
                                throw new InjectionError(MAPPING_HAS_DEPENDANTS, {key: key});
                            }
                        }
                    }

                    target = mappings[key].target;

                    delete mappings[key];
                }

                return target;
            };

            /**
             * Returns the result of the target factory function with all dependencies resolved.
             *
             * @method resolveFactory
             * @param {Function} target The factory function.
             * @returns {Object} The injected result of invoking the factory function.
             */
            this.resolveFactory = function(target) {

                validateType(target, 'Function', INVALID_TARGET);

                return makeFactory(mapping({

                    injector: _injector,

                    target: target,
                    using: slice.call(arguments, 1)
                }));
            };

            /**
             * Returns the result of the target factory function with all dependencies resolved.
             *
             * @method resolveLens
             * @param {String} target The target dependency and path.
             * @returns {*} The resolved dependency.
             */
            this.resolveLens = function(target) {

                validateType(target, 'String', INVALID_TARGET);

                return makeLens(mapping({

                    injector: _injector,

                    target: target
                }));
            };

            /**
             * Returns an instance of the target constructor function with all it's dependencies resolved.
             *
             * @method resolveType
             * @param {Function} target The constructor function.
             * @returns {Object} An injected instance of the constructor function.
             */
            this.resolveType = function(target) {

                validateType(target, 'Function', INVALID_TARGET);

                return makeConstructor(mapping({

                    injector: _injector,

                    target: target,
                    using: slice.call(arguments, 1),
                    Builder: makeBuilder(target)
                }));
            };

            /**
             * Resolves the property dependencies defined in the target object.
             *
             * @method resolveValue
             * @param {Object} target The target object.
             * @returns {Object} The injected object.
             */
            this.resolveValue = function(target) {

                validateType(target, 'Object', INVALID_TARGET);

                return makeValue(mapping({

                    injector: _injector,

                    target: target,
                    using: parseProps(target)
                }));
            };
        }

        return DiCast;
    }

    // UMD style export.
    // ----------------------------------------
    /* istanbul ignore next */
    if (typeof define === 'function' && define.amd) {

        define(factory);

    } else if (typeof module !== 'undefined' && module.exports) {

        module.exports = factory();

    } else {

        root['DiCast'] = factory();
    }

})(this);
