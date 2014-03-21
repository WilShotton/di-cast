/**
 * Created by wil on 14/01/2014.
 */

/**
 * ++
 * @TODO: InjectionError tests
 *
 * ++
 * @TODO: testing the api on toValue function mappings
 *  - will return unexpected results
 *
 * ++
 * @TODO: Add toValue tests for primitives with custom properties
 *  - ''.prop = '{I}';
 *
 * ++
 * @TODO: Other function property creation  methods...
 *  - Object.create()
 *  - Object.defineProperties()
 *  - etc.
 *
 * ++
 * @TODO: Integrate Karma into grunt for Browser tests
 *
 * ++
 * @TODO: NPM
 *
 * ++
 * @TODO: Bower
 *
 * ------------------------------
 *
 * ++
 * @TODO: refactor mapping to deps.arguments, deps.properties
 *
 * ++
 * @TODO: The API checking should be a separate mapping (like injector)
 *  - This could also help with memory footprint with nested injectors
 *
 * ++
 * @TODO: Inject toValue function mapping properties by inspection
 *
 * ++
 * @TODO: I_POINT setter
 *  - NOTE: Will have to dynamically generate regex
 *
 * ++
 * @TODO: DiCast.autoInject() for Angular style constructor injection
 *  - NOTE: Will need to split tests into pre / post compile
 *
 *  - http://docs.angularjs.org/api/auto/service/$injector
 *
 * ++
 * @TODO: Add parent injector stuff...
 *
 * ++
 * @TODO: Circular dependency management
 */

;(function(root) {

    "use strict";

    var deps = [];

    /**
     * @module DiCast
     * @returns {DiCast}
     */
    function factory() {

        var INVALID_TARGET = 'The target must be an Object or Function',
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
                info: 'No mapping for {{key}} found'
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

            I_POINT = '{I}',

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

//        function sequence() {
//
//            return Array.prototype.reduce.call(Array.prototype.slice.call(arguments).reverse(), function(composite, fn) {
//                return function() {
//                    return composite(fn.apply(null, arguments));
//                };
//            });
//        }

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

            this.stack = (new Error()).stack || 'Stack trace not available';

            this.message = template.message;
            this.info = template.info.replace(/\{\{(\w+)\}\}/g, function(_, match) {
                return context[match];
            });
        }
        InjectionError.prototype = new Error();
        InjectionError.prototype.name = 'InjectionError';
        InjectionError.prototype.constructor = InjectionError;

        /**
         * A JavaScript dependency injector.
         *
         * Injects dependencies via constructor arguments and
         * public properties prefixed with an initial value set to '{I}'.
         *
         * @class DiCast
         * @constructor
         */
        function DiCast() {

            var _injector = this,

                mappings = {
                    injector: {
                        target: _injector,
                        resolver: makeValue,
                        api: [],
                        args: [],
                        props: []
                    }
                };

            function validateKey(key) {

                validateType(key, 'string', INVALID_KEY_TYPE);

                if (_injector.has(key)) {
                    throw new InjectionError(MAPPING_EXISTS, {key: key});
                }
            }

            function pipe(vo) {

                return {

                    instantiate: function(args) {

                        vo.instance = new vo.Builder(args);

                        return this;
                    },

                    checkInterface: function() {

                        vo.api.forEach(function(item) {

                            if(vo.instance[item.name] == null) {

                                throw new InjectionError(INTERFACE_MEMBER_MISSING, item);
                            }

                            if (item.hasOwnProperty('arity') && vo.instance[item.name].length !== item.arity) {

                                throw new InjectionError(INTERFACE_METHOD_ARITY_MISMATCH, item);
                            }
                        });

                        return this;
                    },

                    setProps: function() {

                        vo.props.forEach(function(prop) {

                            vo.instance[prop] = _injector.get(prop);
                        });

                        return this;
                    },

                    post: function() {

                        if (is(vo.instance.postConstruct, 'Function')) {
                            vo.instance.postConstruct(_injector);
                        }

                        return this;
                    },

                    value: function(key) {

                        return vo[key];
                    }
                };
            }

            function makeConstructor(vo) {

                if (vo.isSingleton && vo.hasOwnProperty('instance')) {

                    return vo.instance;

                } else {

                    return pipe(vo)
                        .instantiate(vo.args.map(function(key) {
                            return _injector.get(key);
                        }))
                        .checkInterface()
                        .setProps()
                        .post()
                        .value('instance');
                }
            }

            function makeFactory(vo) {

                return {

                    make: function() {

                        return pipe(vo)
                            .instantiate(vo.args.map(function(key) {
                                return _injector.get(key);
                            }).concat(slice.call(arguments)))
                            .checkInterface()
                            .setProps()
                            .post()
                            .value('instance');
                    }
                };
            }

            function makeValue(vo) {

                if (!vo.hasOwnProperty('instance')) {

                    vo.instance = vo.target;

                    pipe(vo).checkInterface().setProps();
                }

                return vo.instance;
            }

            function makeBuilder(target) {

                function Builder(args) {
                    return target.apply(this, args);
                }

                Builder.prototype = Object.create(target.prototype);

                return Builder;
            }

            function serialise(obj, str) {

                str = str || '';

                str += JSON.stringify(obj) || obj.toString();

                if (obj.prototype) {

                    str += serialise(obj.prototype);
                    str += serialise(Object.getPrototypeOf(obj.prototype));
                }

                return str;
            }

            function parseProps(target) {

                var re = /([\w\$'"]*)(?=\s*[:=]\s*(?:'|"){I}(?:"|'))/g,
                    list = [];

                if (is(target, 'Function')) {

                    list = (serialise(target).match(re) || [])
                        .filter(function identity(n) {
                            return n;
                        })
                        .map(function removeQuotes(item) {
                            return item.replace(/["']/g, '');
                        })
                        .filter(function removeDuplicates(item, index, self) {
                            return self.indexOf(item) === index;
                        });

                } else {

                    for (var key in target) {
                        if (target[key] === I_POINT) {
                            list[list.length] = key;
                        }
                    }
                }

                return list;
            }

            /**
             * Initialises a mapping identifier and returns the options for creating a mapping.
             *
             * @method map
             * @for DiCast
             * @param {String} key The mapping identifier.
             * @return {MapOptions} The various mapping options available.
             */
            this.map = function(key) {

                validateKey(key);

                /**
                 *
                 * @class MapOptions
                 * @constructor
                 *
                 * @TODO: An Object can't really be a assigned to @constructor
                 */
                return {

                    /**
                     * Maps a key to a constructor function mapping.
                     *
                     * @method toConstructor
                     * @param {Object} config The config settings for the mapping.
                     *  @param {Function} config.target The factory function.
                     *  @param {Array} [config.api] The interface definition for duck typing.
                     *  @param {Array} [config.using] Any constructor dependencies.
                     *  @param {Boolean} [config.isSingleton] If the mapping should be treated as a singleton.
                     * @returns {DiCast} A reference back to the DiCast instance.
                     */
                    toConstructor: function(config) {

                        validateType(config, 'Object', INCORRECT_METHOD_SIGNATURE);
                        validateType(config.target, 'Function', INVALID_TARGET);

                        mappings[key] = {

                            Builder: makeBuilder(config.target),
                            resolver: makeConstructor,
                            target: config.target,
                            api: config.api || [],
                            args: config.using || [],
                            props: parseProps(config.target),

                            isSingleton: config.isSingleton || false
                        };

                        return _injector;
                    },

                    /**
                     * Maps a key to a factory mapping.
                     *
                     * @method toFactory
                     * @param {Object} config The config settings for the mapping.
                     *  @param {Function} config.target The factory function.
                     *  @param {Array} [config.api] The interface definition for duck typing.
                     *  @param {Array} [config.using] Any constructor dependencies.
                     * @returns {DiCast} A reference back to the DiCast instance.
                     */
                    toFactory: function(config) {

                        validateType(config, 'Object', INCORRECT_METHOD_SIGNATURE);
                        validateType(config.target, 'Function', INVALID_TARGET);

                        mappings[key] = {

                            Builder: makeBuilder(config.target),
                            resolver: makeFactory,
                            target: config.target,
                            api: config.api || [],
                            args: config.using || [],
                            props: parseProps(config.target)
                        };

                        return _injector;
                    },

                    /**
                     * Maps a key to a value mapping.
                     *
                     * @method toValue
                     * @param {Object} config The config settings for the mapping.
                     *  @param {Array} [config.api] The interface definition for duck typing.
                     * @returns {DiCast} A reference back to the DiCast instance.
                     */
                    toValue: function(config) {

                        validateType(config, 'Object', INCORRECT_METHOD_SIGNATURE);

                        if (!config.hasOwnProperty('target')) {
                            throw new InjectionError(MISSING_TARGET, {key: key});
                        }

                        mappings[key] = {

                            resolver: makeValue,
                            target: config.target,
                            api: config.api || [],
                            args: [],
                            props: parseProps(config.target)
                        };

                        return _injector;
                    }
                };
            };

            /**
             * Returns true if a mapping exists.
             *
             * If no mapping exists and DiCast has a parent then resolution is deferred to the parent.
             *
             * @method has
             * @for DiCast
             * @param {String} key The mapping key.
             * @return {Boolean} true if a mapping exists.
             */
            this.has = function(key) {

                validateType(key, 'String', INVALID_KEY_TYPE);

                return mappings.hasOwnProperty(key);
            };

            /**
             * Returns a resolved mapping for the given key.
             *
             * If no mapping is found an Error is thrown.
             *
             * @method get
             * @param {String} key The mapping key.
             * @return {*} The dependency.
             */
            this.get = function(key) {

                if (!_injector.has(key)) {
                    throw new InjectionError(NO_MAPPING, {key: key});
                }

                return mappings[key].resolver(mappings[key]);
            };

            /**
             * Remove a mapping.
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
                            if (mappings[n].args.indexOf(key) !== -1 || mappings[n].props.indexOf(key) !== -1) {
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
             * Creates a factory from the supplied target with all it's dependencies resolved.
             *
             * @method resolveFactory
             * @param {Function} target The target Function.
             * @returns {Object} The factory object.
             */
            this.resolveFactory = function(target) {

                validateType(target, 'Function', INVALID_TARGET);

                return makeFactory({

                    Builder: makeBuilder(target),
                    target: target,
                    api: [],
                    args: slice.call(arguments, 1),
                    props: parseProps(target)
                });
            };

            /**
             * Creates an instance from the supplied target with all it's dependencies resolved.
             *
             * @method resolveType
             * @param {Function} target The target Function.
             * @returns {Object} A injected instance of the target Function.
             */
            this.resolveType = function(target) {

                validateType(target, 'Function', INVALID_TARGET);

                return makeConstructor({

                    Builder: makeBuilder(target),
                    target: target,
                    api: [],
                    args: slice.call(arguments, 1),
                    props: parseProps(target),
                    isSingleton: false
                });
            };

            /**
             * Resolves the property dependencies defined in the target Object.
             *
             * @method resolveValue
             * @param {Object} target The target Object.
             * @returns {Object} The injected Object.
             */
            this.resolveValue = function(target) {

                validateType(target, 'Object', INVALID_TARGET);

                return makeValue({

                    target: target,
                    api: [],
                    props: parseProps(target)
                });
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
