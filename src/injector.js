/**
 * Created by wil on 14/01/2014.
 */

/**
 * ++
 * @TODO: The props list should be generated when the value is mapped
 *  - use a regex to parse the string representation of the value
 *  - Match injection point keys in an Object ([\w\$'"]*)(?=\s*[:=]\s*(?:'|"){I}(?:"|'))
 *
 *  - NEXT
 *  - apply props to factory and value mapping methods
 *  - remove getProps() from instantiate()
 *  - refactor mapping to deps.arguments, deps.properties
 *
 * ++
 * @TODO: Interface checking should when the value is mapped
 *  - use a regex to parse the string representation of the value
 *  - toValue mappings can be inspected as they are
 *
 * ++
 * @TODO: Integrate Karma into grunt for Browser tests
 *
 * ++
 * @TODO: Non singleton type mappings injected into a factory will behave as a singleton
 * for all instances of that factory...
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
 * @TODO: Inject toValue function mapping properties by inspection
 *
 * ++
 * @TODO: I_POINT setter
 *  - NOTE: Will have to dynamically generate regex
 *
 * ++
 * @TODO: Injector.autoInject() for Angular style constructor injection
 *  - NOTE: Will need to split tests into pre / post compile
 *
 * ++
 * @TODO: Add parent injector stuff...
 *
 * ++
 * @TODO: Circular dependency management
 */

// http://docs.angularjs.org/api/auto/service/$injector

;(function(root) {

    "use strict";

    var deps = [];

    /**
     * @module Injector
     * @returns {Injector}
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

            this.name = 'InjectionError';
            this.message = template.message;
            this.info = template.info.replace(/\{\{(\w+)\}\}/g, function(_, match) {
                return context[match];
            });
        }
        InjectionError.prototype = new Error();
        InjectionError.prototype.constructor = InjectionError;

        /**
         * A JavaScript dependency injector.
         *
         * Injects dependencies via constructor arguments and
         * public properties prefixed with an initial value set to '{I}'.
         *
         * @class Injector
         * @constructor
         */
        function Injector() {

            var _injector = this,

                mappings = {
                    injector: {
                        target: _injector,
                        resolver: makeValue,
                        api: []
                    }
                };

            function validateKey(key) {

                validateType(key, 'string', INVALID_KEY_TYPE);

                if (_injector.has(key)) {
                    throw new InjectionError(MAPPING_EXISTS, {key: key});
                }
            }

            /*
            function checkInterface(instance, vo) {

                vo.api.forEach(function(item) {

                    if(instance[item.name] == null) {

                        throw new InjectionError(INTERFACE_MEMBER_MISSING, item);
                    }

                    if (item.hasOwnProperty('arity') && instance[item.name].length !== item.arity) {

                        throw new InjectionError(INTERFACE_METHOD_ARITY_MISMATCH, item);
                    }
                });
            }
            */

            function checkInterface(vo) {

                //console.log('\n checkInterface');
                //console.log('vo.hasOwnProperty(instance) : ' + vo.hasOwnProperty('instance'));

                vo.api.forEach(function(item) {

                    if(vo.instance[item.name] == null) {

                        throw new InjectionError(INTERFACE_MEMBER_MISSING, item);
                    }

                    if (item.hasOwnProperty('arity') && vo.instance[item.name].length !== item.arity) {

                        throw new InjectionError(INTERFACE_METHOD_ARITY_MISMATCH, item);
                    }
                });
            }

            /*
            function setProps(instance, vo) {

                if (!vo.hasOwnProperty('props')) {

                    vo.props = [];

                    for (var prop in instance) {

                        if (instance[prop] === I_POINT) {
                            vo.props[vo.props.length] = prop;
                        }
                    }
                }

                vo.props.forEach(function(prop) {

                    instance[prop] = _injector.get(prop);
                });
            }
            */

            function setProps(vo) {

                if (!vo.hasOwnProperty('props')) {

                    vo.props = [];

                    for (var prop in vo.instance) {

                        if (vo.instance[prop] === I_POINT) {
                            vo.props[vo.props.length] = prop;
                        }
                    }
                }

                vo.props.forEach(function(prop) {

                    vo.instance[prop] = _injector.get(prop);
                });
            }

            function instantiate(vo) {

                vo.instance = new vo.Builder(slice.call(arguments, 1));

                //checkInterface(instance, vo);
                checkInterface(vo);

                //parseProps(instance).forEach(function(prop) {
                //setProps(vo.instance, vo);
                setProps(vo);

                if (is(vo.instance.postConstruct, 'Function')) {
                    vo.instance.postConstruct(_injector);
                }

                return vo.instance;
            }

            function makeFactory(vo) {

                return {

                    make: function() {

                        vo.Factory = vo.target.apply(vo.target, vo.args.map(function(key) {

                            return _injector.get(key);
                        }));

                        if (!vo.hasOwnProperty('Builder')) {

                            vo.Builder = function Builder(args) {

                                return vo.Factory.apply(this, args);
                            };

                            vo.Builder.prototype = vo.Factory.prototype;
                        }

                        return instantiate.apply(this, [vo].concat(slice.call(arguments, 0)));
                    }
                };
            }

            function makeType(vo) {

                if (!vo.hasOwnProperty('Builder')) {

                    vo.Builder = function Builder() {

                        return vo.target.apply(this, vo.args.map(function(key) {
                            return _injector.get(key);
                        }));
                    };

                    vo.Builder.prototype = vo.target.prototype;
                }

                if (vo.isSingleton && vo.hasOwnProperty('instance')) {

                    return vo.instance;
                }

                return instantiate(vo);

                /*
                if (vo.isSingleton && !vo.hasOwnProperty('instance')) {
                    vo.instance = instantiate(vo);
                }

                return vo.instance || instantiate(vo);
                */
            }

            function makeValue(vo) {

                //console.log('\n makeValue :: ' + (vo.hasOwnProperty('instance') == vo.hasOwnProperty('props')));
                //console.log('instance: ' + vo.hasOwnProperty('instance'));
                //console.log('props: ' + vo.hasOwnProperty('props'));

                //if (!vo.hasOwnProperty('props')) {
                if (!vo.hasOwnProperty('instance')) {

                    vo.instance = vo.target;

                    //vo.props = [];

                    //checkInterface(vo.instance, vo);
                    //setProps(vo.instance, vo);

                    checkInterface(vo);
                    setProps(vo);
                }

                //return vo.instance;
                return vo.instance;
            }

//            function parseProps(obj) {
//
//                var re = /([\w\$'"]*)(?=\s*[:=]\s*(?:'|"){I}(?:"|'))/g,
//
//                    str = ''.concat(
//                        obj.toString(),
//                        JSON.stringify(obj.prototype)
//                    );
//
//                while (obj != null) {
//
//                    str += JSON.stringify(Object.getPrototypeOf(obj));
//                    obj = obj.prototype;
//                }
//
//                return (str.match(re) || [])
//                    .filter(function(n) {
//                          return n;
//                    })
//                    .map(function(item) {
//                        return item.replace(/["']/g, '');
//                    });
//            }

            /**
             * Initialises a mapping identifier and returns the options for creating a mapping.
             *
             * @method map
             * @for Injector
             * @param {String} key The mapping identifier.
             * @return {MapOptions} The various mapping options available.
             */
            this.map = function(key) {

                validateKey(key);

                /**
                 *
                 * @class MapOptions
                 * @constructor
                 */
                return {

                    /**
                     * Maps a key to a factory mapping.
                     *
                     * @method toFactory
                     * @param {Object} config The config settings for the mapping.
                     *  @param {Function} config.target The factory function.
                     *  @param {Array} [config.api] The interface definition for duck typing.
                     *  @param {Array} [config.using] Any constructor dependencies.
                     * @returns {Injector} A reference back to the Injector.
                     */
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

                    /**
                     * Maps a key to a type mapping.
                     *
                     * @method toType
                     * @param {Object} config The config settings for the mapping.
                     *  @param {Function} config.target The factory function.
                     *  @param {Array} [config.api] The interface definition for duck typing.
                     *  @param {Array} [config.using] Any constructor dependencies.
                     *  @param {Boolean} [config.isSingleton] If the mapping should be treated as a singleton.
                     * @returns {Injector}
                     */
                    toType: function(config) {

                        validateType(config, 'Object', INCORRECT_METHOD_SIGNATURE);
                        validateType(config.target, 'Function', INVALID_TARGET);

                        mappings[key] = {

                            resolver: makeType,
                            target: config.target,
                            api: config.api || [],
                            args: config.using || [],
                            isSingleton: config.isSingleton || false
                            //props: parseProps(config.target)
                        };

                        return _injector;
                    },

                    /**
                     * Maps a key to a value mapping.
                     *
                     * @method toValue
                     * @param {Object} config The config settings for the mapping.
                     *  @param {Array} [config.api] The interface definition for duck typing.
                     * @returns {Injector}
                     */
                    toValue: function(config) {

                        validateType(config, 'Object', INCORRECT_METHOD_SIGNATURE);

                        if (!config.hasOwnProperty('target')) {
                            throw new InjectionError(MISSING_TARGET, {key: key});
                        }

                        //parseProps(config.target);

                        mappings[key] = {

                            resolver: makeValue,
                            target: config.target,
                            api: config.api || []
                            //props: parseProps(config.target)
                        };

                        return _injector;
                    }
                };
            };

            /**
             * Returns true if a mapping exists.
             *
             * If no mapping exists and the Injector has a parent then resolution is deferred to the parent.
             *
             * @method has
             * @for Injector
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

                var target = null,
                    instance = null;

                if (_injector.has(key)) {

                    Object.keys(mappings)
                        .filter(function(name) {

                            return name !== key;
                        })
                        .map(function(name) {

                            return mappings[name];
                        })
                        .forEach(function(mapping) {

                            if (mapping.hasOwnProperty('args') && mapping.args.indexOf(key) !== -1) {
                                throw new InjectionError(MAPPING_HAS_DEPENDANTS, {key: key});
                            }

                            // @TODO: Changed to a 'processed' flag
                            if (!mapping.hasOwnProperty('instance')) {

                                instance = mapping.resolver(mapping);

                                if (instance.hasOwnProperty('make')) {
                                    instance.make();
                                }
                            }

                            if (mapping.props.indexOf(key) !== -1) {
                                throw new InjectionError(MAPPING_HAS_DEPENDANTS, {key: key});
                            }
                        });

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

                    target: target,
                    args: slice.call(arguments, 1),
                    api: []
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

                return makeType({

                    target: target,
                    args: slice.call(arguments, 1),
                    isSingleton: false,
                    api: []
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
