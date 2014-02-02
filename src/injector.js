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

                // Not sure about this.
                if (is(value, 'Object')) {

                    Object.keys(value).forEach(function(prop) {
                        if (prop.indexOf('i_') === 0) {
                            value[prop] = injector.getMappingFor(prop.replace('i_', ''));
                        }
                    });
                }

                target = value;

                resolver = function() {

                    return value;
                };

                return this;
            };

            this.using = function() {

                deps.args = arguments.length > 0 ? slice.call(arguments, 0) : [];

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

            this.destroy = function() {

                return target;
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

            this.unMap = function(key) {

                var value = null;

                if (self.hasMappingFor(key)) {

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

            // @TODO: inject(target) - could accept Objects as well
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
