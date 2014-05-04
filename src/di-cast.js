;(function(root) {

    "use strict";

    var deps = [];

    /**
     * @module DiCast
     * @returns {DiCast}
     */
    function factory() {

        var INVALID_PARENT = 'The parent injector must be an injector',
            INVALID_TARGET = 'The target must be an Object or Function',
            INCORRECT_METHOD_SIGNATURE = 'Incorrect method signature supplied',
            INVALID_KEY_TYPE = 'The key must be a String',

            MISSING_TARGET = {
                message: 'The target must be specified',
                info: 'The mapping for {{key}} must have a target property'
            },

            MAPPING_EXISTS = {
                message: 'A mapping already exists',
                info: 'The mapping {{key}} is already in use'
            },

            NO_MAPPING = {
                message: 'No mapping found',
                info: 'No mapping for [{{key}}] found'
            },

            MAPPING_HAS_DEPENDANTS = {
                message: 'The mapping has dependants',
                info: '{{key}} could not be removed as other mapping depend on it'
            },

            INTERFACE_MEMBER_MISSING = {
                message: 'The mapping is missing a required member',
                info: 'The mapping must have a member called {{name}}'
            },

            INTERFACE_METHOD_ARITY_MISMATCH = {
                message: 'The mapping has an interface method with an incorrect arity',
                info: 'The method signature for {{name}} requires {{arity}} arguments'
            },

            INVALID_FACTORY = {
                message: 'The factory function must return a value',
                info: '{{name}} must return a value'
            },

            CIRCULAR_DEPENDENCY = {
                message: 'Can not resolve a circular dependency',
                info: '{{target}} has a dependency that depends on {{target}}'
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
                isSingleton: false
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

            this.message = template.message;
            this.info = template.info.replace(/\{\{(\w+)\}\}/g, function(_, match) {
                return context[match];
            });
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

                vo.instance = vo.target.apply(this, vo.using.map(function(key) {
                    return vo.injector.get(key);
                }));

                if (vo.instance == null) {
                    throw new InjectionError(INVALID_FACTORY, {name: vo.name});
                }
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

                /**
                 *
                 * @class MapOptions
                 * @constructor
                 */
                function MapOptions() {

                    /**
                     * Maps a key to a factory function.
                     *
                     * @method toFactory
                     * @param {Object} config The config options for the mapping.
                     *  @param {Function} config.target The factory function.
                     *  @param {Array} [config.api] An interface definition for duck typing.
                     *  @param {Boolean} [config.isSingleton] If the mapping should be treated as a singleton.
                     *  @param {Array} [config.using] Any constructor dependencies.
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

                return new MapOptions();
            };

            /**
             * Check to see if the injector has a mapping for a given key.
             *
             * If no mapping exists and DiCast has a parent then resolution is deferred to the parent.
             *
             * @method has
             * @for DiCast
             * @param {String} key The mapping key.
             * @return {Boolean} true if a mapping is found.
             */
            this.has = function(key) {

                validateType(key, 'String', INVALID_KEY_TYPE);

                return (mappings.hasOwnProperty(key) || parent && parent.has(key)) || false;
            };

            /**
             * Returns a fully resolved target for the given key as described by the mapping options.
             *
             * If no mapping is found an Injection Error is thrown.
             *
             * @method get
             * @param {String} key The mapping key.
             * @return {*} The resolved target.
             */
            this.get = function(key) {

                var instance = null;

                if (!_injector.has(key)) {
                    throw new InjectionError(NO_MAPPING, {key: key});
                }

                if (resolving.indexOf(key) !== -1) {

                    resolving.push(key);
                    throw new InjectionError(CIRCULAR_DEPENDENCY, {target: key});
                }

                resolving.push(key);

                instance = mappings.hasOwnProperty(key) ?
                    mappings[key].resolver(mappings[key]) :
                    parent.get(key);

                resolving.pop();

                return instance;
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
             * @returns {Object} The injecteed result of invoking the factory function.
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

        define(deps, factory);

    } else if (typeof module !== 'undefined' && module.exports) {

        module.exports = factory.apply(factory, deps.map(function(dep) {
            return require(dep);
        }));

    } else {

        root['DiCast'] = factory.apply(factory, deps.map(function(dep) {
            return root[dep];
        }));
    }

})(this);
