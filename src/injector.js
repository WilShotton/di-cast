/**
 * Created by wil on 14/01/2014.
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

            slice = Array.prototype.slice;

        function is(value, type) {
            return toString.call(value).toLowerCase().indexOf(type.toLowerCase()) !== -1;
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
                deps = [];

            function validate(target) {

                validateType(target, 'function', INVALID_MAPPING_TYPE);

                if (is(resolver, 'function')) {
                    throw new Error(MAPPING_EXISTS);
                }
            }

            this.toFactory = function(value) {

                var Builder = null,

                    facade = {

                        make: function Make() {
                            return new Builder(slice.call(arguments, 0));
                        }
                    };

                validate(value);

                resolver = function() {

                    Builder = Builder || (function() {

                        var constructor = value.apply(value, deps.map(function(key) {
                            return injector.getMappingFor(key);
                        }));

                        function Builder(args) {
                            return constructor.apply(this, args);
                        }

                        Builder.prototype = constructor.prototype;

                        return Builder;
                    })();

                    return facade;
                };

                return this;
            };

            this.toType = function(value) {

                var singleton = null,
                    props = null;

                validate(value);

                function getProps(instance) {

                    if (props === null) {

                        props = [];

                        for (var prop in instance) {

                            if (prop.indexOf('i_') === 0) {
                                props[props.length] = prop;
                            }
                        }
                    }

                    return props;
                }

                function make(Value) {

                    var instance = new Value();

                    getProps(instance).forEach(function(prop) {
                        instance[prop] = injector.getMappingFor(prop.replace('i_', ''));
                    });

                    return instance;
                }

                function Builder() {

                    return value.apply(this, deps.map(function(key) {
                        return injector.getMappingFor(key);
                    }));
                }

                Builder.prototype = value.prototype;

                resolver = function() {

                    if (isSingleton && singleton === null) {
                        singleton = make(Builder);
                    }

                    return singleton || make(Builder);
                };

                return this;
            };

            this.using = function() {

                deps = arguments.length > 0 ? slice.call(arguments, 0) : [];

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

            // @TODO: toValue(...) - returns an (injected?) object
            // @TODO: as([...]) - for duck typing...
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

            // @TODO: removeMapping(key)
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
