/**
 * Created by wil on 14/01/2014.
 */

/**
 * ++
 * @TODO: toValue() should not perform any sort of injection
 *  - do this to avoid the following type of use case
 *      - injector.map(...).toValue(new Fn(MyArg, MyDep), 'MyDep');
 *  - use injector resolve to supply an injected value to toValue()
 *  - see toValue() for more info
 *
 * ++
 * @TODO: Property injection should only inject null / undefined values
 *  - ie. don't overwrite an existing value
 *
 * ++
 * @TODO: Mapping() public methods should be defined in the prototype for improved performance
 *
 * ++
 * @TODO: Mapping.destroy() must tidy up Object
 *  - reset deps.args -> deps.args.length = 0;
 *  - reset deps.props -> deps.props.length = 0;
 *  - clear resolver
 *
 * ++
 * @TODO: Add YUIDocs
 *
 * ++
 * @TODO: as([...]) - for duck typing...
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

        function validateType(value, type, errorMsg) {
            if (!is(value, type)) {
                throw new TypeError(errorMsg);
            }
        }

        // Mapping
        // --------------------
        function Mapping(injector) {

            var isSingleton = false,
                resolver = null,
                deps = {
                    args: [],
                    props: null
                },

                target = null;

            function validate(target) {

                validateType(target, 'function', INVALID_MAPPING_TYPE);

                if (resolver !== null) {
                    throw new Error(MAPPING_EXISTS);
                }
            }

            function getProps(instance) {

                if (deps.props === null) {

                    deps.props = [];

                    for (var prop in instance) {
                        if (prop.indexOf('i_') === 0) {
                            deps.props.push(prop);
                        }
                    }
                }

                return deps.props;
            }

            function instantiate(Constructor) {

                var instance = new Constructor(slice.call(arguments, 1));

                getProps(instance).forEach(function(prop) {
                    instance[prop] = injector.getMappingFor(prop.replace('i_', ''));
                });

                //if (instance.hasOwnProperty('postConstruct')) {
                if (instance['postConstruct'] != null) {
                    instance.postConstruct();
                }

                return instance;
            }

            this.toFactory = function(value) {

                var facade = null;

                function makeFactory() {

                    var Constructor = value.apply(value, deps.args.map(function(key) {
                        return injector.getMappingFor(key);
                    }));

                    function Factory(args) {
                        return Constructor.apply(this, args);
                    }

                    Factory.prototype = Constructor.prototype;

                    return Factory;
                }

                function makeFacade(Constructor) {

                    var instance = instantiate(Constructor);

                    return {

                        make: function() {

                            return instantiate.apply(this, [Constructor].concat(slice.call(arguments, 0)));
                        },

                        name: instance.constructor.name,

                        type: instance.constructor
                    };
                }

                validate(value);

                target = value;

                resolver = function() {

                    return facade || (facade = makeFacade(makeFactory()));
                };

                return this;
            };

            this.toType = function(value) {

                var singleton = null;

                validate(value);

                function Builder() {

                    return value.apply(this, deps.args.map(function(key) {
                        return injector.getMappingFor(key);
                    }));
                }

                Builder.prototype = value.prototype;

                target = value;

                resolver = function() {

                    if (isSingleton && singleton === null) {
                        singleton = instantiate(Builder);
                    }

                    return singleton || instantiate(Builder);
                };

                return this;
            };

            this.toValue = function(value) {

                // Not sure about this - why not inject constructor args too
                // would be better to have injector.inject() method and then use...
                // injector.map('MyKey').toValue(injector.resolve(MyFunction, [deps]))
                deps.props = [];

                if (is(value, 'Object')) {

                    Object.keys(value).forEach(function(prop) {
                        if (prop.indexOf('i_') === 0) {
                            value[prop] = injector.getMappingFor(prop.replace('i_', ''));
                            deps.props.push(prop);
                        }
                    });
                }

                if (value.hasOwnProperty('postConstruct')) {
                    value.postConstruct();
                }

                target = value;

                resolver = function() {

                    return value;
                };

                return this;
            };

            this.using = function() {

                if (arguments.length > 0 && arguments[0]) {
                    deps.args = is(arguments[0], 'Array') ? arguments[0] : slice.call(arguments, 0);
                }

                return this;
            };

            this.asSingleton = function() {

                isSingleton = true;

                return this;
            };

            this.resolve = function() {

                validateType(resolver, 'function', NO_RESOLVER);

                return resolver();
            };

            this.injector = function() {

                return injector;
            };

            this.dependsOn = function(key) {

                if (deps.props === null) {
                    resolver();
                }

                return deps.args.indexOf(key) > -1 || deps.props.indexOf('i_' + key) > -1;
            };

            this.destroy = function() {

                return target;
            };
        }

        // Injector
        // --------------------
        function Injector() {
        
            var self = this,
                mappings = {};

            function validateKey(key) {

                validateType(key, 'string', INVALID_KEY_TYPE);

                if (self.hasMappingFor(key)) {
                    throw new Error(MAPPING_EXISTS);
                }
            }

            this.map = function(key) {

                validateKey(key);

                return (mappings[key] = new Mapping(self));
            };

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

            this.hasMappingFor = function(key) {

                return mappings.hasOwnProperty(key);
            };

            this.getMappingFor = function(key) {

                validateType(key, 'string', INVALID_KEY_TYPE);

                if (!self.hasMappingFor(key)) {
                    throw new Error(NO_MAPPING);
                }

                return mappings[key].resolve();
            };

            this.resolveFactory = function(target) {

                validateType(target, 'Function', INVALID_RESOLVE_TARGET);

                return new Mapping(self)
                    .toFactory(target)
                    .using(slice.call(arguments, 1))
                    .resolve();
            };

            this.resolveType = function(target) {

                validateType(target, 'Function', INVALID_RESOLVE_TARGET);

                return new Mapping(self)
                    .toType(target)
                    .using(slice.call(arguments, 1))
                    .resolve();
            };

            this.resolveValue = function(target) {

                validateType(target, 'Object', INVALID_RESOLVE_TARGET);

                return new Mapping(self)
                    .toValue(target)
                    .resolve();
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
