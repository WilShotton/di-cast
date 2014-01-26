/**
 * Created by wil on 15/01/2014.
 */

/*global describe, xdescribe, it, xit, beforeEach, afterEach, spyOn */
define(

    [
        'injector'
    ],

    function(Injector) {

        "use strict";

        var INVALID_MAPPING_TYPE = '[#001] The mapping must be a function',
            INVALID_KEY_TYPE = '[#002] The key must be a String',
            NO_RESOLVER = '[#003] No resolver found',
            MAPPING_EXISTS = '[#004] A mapping already exists',
            NO_MAPPING = '[#005] No mapping found';

        function is(value, type) {
            return toString.call(value).toLowerCase().indexOf(type.toLowerCase()) !== -1;
        }

        describe('Injector', function() {

            var injector;

            // Map
            describe('map', function() {

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyMapping');
                });

                it(' should index a Mapping to a key', function() {

                    expect(injector.hasMappingFor('MyMapping')).toBe(true);
                });

                it(' should return an instance of Mapping', function() {

                    var mapping = injector.map('NewMapping');

                    expect(mapping.constructor.name).toBe('Mapping');
                    expect(is(mapping.toFactory, 'function')).toBe(true);
                    expect(is(mapping.resolve, 'function')).toBe(true);
                    expect(is(mapping.injector, 'function')).toBe(true);
                });

                it(' should have a fluid interface', function() {

                    var mapping = injector.map('FluidTest1');

                    expect(mapping.toFactory(function(){})).toBe(mapping);
                    expect(mapping.asSingleton()).toBe(mapping);

                    mapping = injector.map('FluidTest2');

                    expect(mapping.toType(function(){})).toBe(mapping);
                    expect(mapping.asSingleton()).toBe(mapping);
                });

                it(' should should have a reference to the injector', function() {

                    expect(injector.map('InjectorTest').injector()).toBe(injector);
                });

                it(' should throw if the key is not a string', function() {

                    expect(function() {
                        injector.map({});
                    }).toThrow(INVALID_KEY_TYPE);
                });

                it(' should throw if a key is already in use', function() {

                    expect(function() {
                        injector.map('MyMapping');
                    }).toThrow(MAPPING_EXISTS);
                });

                it(' should throw if the mapping value has already been set', function() {

                    function MyValue() {}

                    expect(function() {
                        injector.map('Double->Factory').toFactory(MyValue).toFactory(MyValue);
                    }).toThrow(MAPPING_EXISTS);

                    expect(function() {
                        injector.map('Double->Type').toType(MyValue).toType(MyValue);
                    }).toThrow(MAPPING_EXISTS);

                    expect(function() {
                        injector.map('Factory->Type').toFactory(MyValue).toType(MyValue);
                    }).toThrow(MAPPING_EXISTS);

                    expect(function() {
                        injector.map('Type->Factory').toType(MyValue).toFactory(MyValue);
                    }).toThrow(MAPPING_EXISTS);
                });
            });

            // hasMappingFor
            describe('hasMappingFor', function() {

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyMapping');
                });

                it(' should return true for a mapping', function() {

                    expect(injector.hasMappingFor('MyMapping')).toBe(true);
                });

                it(' should return false for a missing mapping', function() {

                    expect(injector.hasMappingFor('MissingMapping')).toBe(false);
                });
            });

            // getMappingFor
            describe('getMappingFor', function() {

                it(' should throw if no resolver has been set', function() {

                    injector = new Injector();
                    injector.map('MyFactory');

                    expect(function() {
                        injector.getMappingFor('MyFactory');
                    }).toThrow(NO_RESOLVER);
                });

                it(' should throw if the key is not a string', function() {

                    expect(function() {
                        injector.getMappingFor({});
                    }).toThrow(INVALID_KEY_TYPE);
                });

                it(' should throw if no mapping exists', function() {

                    expect(function() {
                        injector.getMappingFor('NoMapping');
                    }).toThrow(NO_MAPPING);
                });
            });

            // toFactory mappings
            describe('toFactory mappings', function() {

                function MyFactory() {
                    return function MyFactoryInstance(name) {
                        this.getName = function() {
                            return name;
                        };
                    };
                }

                function MyDependantFactory(MyFactory) {
                    return function MyDependantFactoryInstance(name) {
                        this.getName = function() {
                            return 'Dependant > ' + MyFactory.make(name).getName();
                        };
                    };
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyFactory').toFactory(MyFactory);
                    injector.map('MyDependantFactory').toFactory(MyDependantFactory, ['MyFactory']);
                });

                it(' should retrieve a factory method for a mapping', function() {

                    var factory = injector.getMappingFor('MyFactory');

                    expect(factory.hasOwnProperty('make')).toBe(true);
                    expect(is(factory.make, 'function')).toBe(true);
                    expect(factory.make.name).toBe('Make');
                });

                it(' should create an instance when its factory method is called', function() {

                    var name = 'MyName',
                        factory = injector.getMappingFor('MyFactory'),
                        instance = factory.make(name);

                    expect(instance.constructor.name).toBe('MyFactoryInstance');
                    expect(instance.getName()).toBe(name);
                });

                it(' should retrieve a constructor for a factory mapping with dependencies', function() {

                    var name = 'MyName',
                        factory = injector.getMappingFor('MyDependantFactory'),
                        instance = factory.make(name);

                    expect(instance.constructor.name).toBe('MyDependantFactoryInstance');
                    expect(instance.getName()).toBe('Dependant > ' + name);
                });

                it(' should be a singleton', function() {

                    expect(injector.getMappingFor('MyFactory')).toBe(injector.getMappingFor('MyFactory'));
                });

                it(' should throw if the factory is not a function', function() {

                    expect(function() {
                        injector.map('InvalidFactory').toFactory({});
                    }).toThrow(INVALID_MAPPING_TYPE);

                    expect(function() {
                        injector.map('AnotherInvalidFactory').toFactory(null, ['MyFactory']);
                    }).toThrow(INVALID_MAPPING_TYPE);
                });
            });

            // toType mappings
            describe('toType mappings', function() {

                function MyType() {
                    this.getName = function() {
                        return 'MyType';
                    };
                }

                function MyDependantType(myType) {
                    this.getName = function() {
                        return 'MyDependantType > ' + myType.getName();
                    };
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyType').toType(MyType);
                    injector.map('MyDependantType').toType(MyDependantType, ['MyType']);
                });

                it(' should retrieve a typed instance for a mapping', function() {

                    var instance = injector.getMappingFor('MyType');

                    expect(instance.constructor.name).toBe('MyType');
                    expect(instance.hasOwnProperty('getName')).toBe(true);
                    expect(instance.getName()).toBe('MyType');
                });

                it(' should should inject the instance with its dependencies', function() {

                    var instance = injector.getMappingFor('MyDependantType');

                    expect(instance.constructor.name).toBe('MyDependantType');
                    expect(instance.hasOwnProperty('getName')).toBe(true);
                    expect(instance.getName()).toBe('MyDependantType > MyType');

                });

                it(' should not be a singleton by default', function() {

                    expect(injector.getMappingFor('MyType')).not.toBe(injector.getMappingFor('MyType'));
                });

                it(' should be a singleton if asSingleton is set', function() {

                    injector.map('S1').toType(function(){}).asSingleton();
                    expect(injector.getMappingFor('S1')).toBe(injector.getMappingFor('S1'));

                    injector.map('S2').asSingleton().toType(function(){});
                    expect(injector.getMappingFor('S2')).toBe(injector.getMappingFor('S2'));
                });

                it(' should throw if the type is not a function', function() {

                    expect(function() {
                        injector.map('InvalidType').toType({});
                    }).toThrow(INVALID_MAPPING_TYPE);

                    expect(function() {
                        injector.map('AnotherInvalidType').toType(null, ['MyType']);
                    }).toThrow(INVALID_MAPPING_TYPE);
                });
            });
        });
    }
);
