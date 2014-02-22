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

        var INVALID_TARGET = '[#001] The target must be an Object or Function',
            INVALID_KEY_TYPE = '[#002] The key must be a String',
            NO_RESOLVER = '[#003] No resolver found',
            MAPPING_EXISTS = '[#004] A mapping already exists',
            NO_MAPPING = '[#005] No mapping found',
            MAPPING_HAS_DEPENDANTS = '[#006] The mapping has dependants',
            INTERFACE_MEMBER_MISSING = '[#007] The mapping is missing a required member',
            INTERFACE_METHOD_ARITY_MISMATCH = '[#008] The mapping has an interface method with an incorrect arity';

        function is(value, type) {
            return Object.prototype.toString
                .call(value)
                .split(' ')[1]
                .toLowerCase()
                .indexOf(type.toLowerCase()) !== -1;
        }

        describe('Injector', function() {

            var injector;

            // Injector methods
            // ------------------------------

            // map()
            describe('map', function() {

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyMapping');
                });

                it(' should index a mapping to a key', function() {

                    expect(injector.hasMappingFor('MyMapping')).toBe(true);
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
            });

            // hasMappingFor()
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

                it(' should throw if the key is not a string', function() {

                    expect(function() {
                        injector.hasMappingFor({});
                    }).toThrow(INVALID_KEY_TYPE);
                });
            });

            // getMappingFor()
            describe('getMappingFor', function() {

                it(' should retrieve a mapping for a key', function() {

                    injector = new Injector();
                    injector.map('MyFactory').toFactory(function MyFactory() {
                        return function MyInstance() {};
                    });

                    expect(is(injector.getMappingFor('MyFactory').make, 'Function'))
                        .toBe(true);
                });

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

            // unMap()
            describe('unMap()', function() {

                var myValue = {};

                function MyFactory() {
                    return function MyFactoryInstance() {};
                }

                function MyType() {}

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyFactory').toFactory(MyFactory);
                    injector.map('MyType').toType(MyType);
                    injector.map('MyValue').toValue(myValue);
                });

                it(' should remove the mapping', function() {

                    injector.unMap('MyFactory');
                    injector.unMap('MyType');
                    injector.unMap('MyValue');

                    expect(injector.hasMappingFor('MyFactory')).toBe(false);
                    expect(injector.hasMappingFor('MyType')).toBe(false);
                    expect(injector.hasMappingFor('MyValue')).toBe(false);
                });

                it(' should throw if a mapping depends on the mapping to be removed', function() {

                    injector.map('MyDependantType').toType(function() {
                        this.i_MyType = null;
                    });

                    expect(function() {
                        injector.unMap('MyType');
                    }).toThrow(MAPPING_HAS_DEPENDANTS);
                });

                it(' should return the mapping target value', function() {

                    expect(injector.unMap('MyFactory')).toBe(MyFactory);
                    expect(injector.unMap('MyType')).toBe(MyType);
                    expect(injector.unMap('MyValue')).toBe(myValue);
                });

                it(' should return null for an unmapped key', function() {

                    expect(injector.unMap('MyMissing')).toBe(null);
                });
            });

            // Mapping methods
            // ------------------------------

            // mapping config options
            describe('mapping config options', function() {

                beforeEach(function() {

                    injector = new Injector();
                });

                it(' should have a reference to the injector', function() {

                    var mapping = injector.map('Map');

                    expect(mapping.hasOwnProperty('injector')).toBe(true);
                    expect(mapping.injector()).toBe(injector);
                });

                it(' should be fluid', function() {

                    function test(mapping) {

                        var keys = ['injector', 'toFactory', 'toType', 'toValue', 'asSingleton', 'using']; //'as'

                        keys.forEach(function(key) {
                            expect(is(mapping[key], 'Function')).toBe(true);
                        });
                    }

                    test(injector.map('Map'));

                    test(injector.map('Factory').toFactory(function Factory() {}));
                    test(injector.map('Type').toType(function Type() {}));
                    test(injector.map('Value').toValue(function Value() {}));

                    test(injector.map('Singleton').toType(function Singleton() {}).asSingleton());
                    test(injector.map('Using').toType(function Using() {}).using());
                });

                // @TODO
                xit(' should be commutative', function() {

                    var name = 'MyName';

                    injector.map('MyCommutativeFactory')
                        .using('MyFactory')
                        .toFactory(MyDependantFactory);

                    expect(injector
                        .getMappingFor('MyDependantFactory')
                        .make(name)
                        .getName()
                    ).toBe('Dependant > ' + name);
                });

                // @TODO
                xit(' should be commutative', function() {

                    injector.map('MyCommutativeType')
                        .using('MyType')
                        .asSingleton()
                        .toType(MyDependantType);

                    expect(
                        injector.getMappingFor('MyCommutativeType').getName()
                    ).toBe('MyDependantType > MyType');
                });
            });

            // toFactory()
            describe('toFactory', function() {

                function MyFactory() {
                    return function MyFactoryInstance(name) {
                        this.getName = function() {
                            return name;
                        };
                    };
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyFactory').toFactory(MyFactory);
                });

                it(' should retrieve a factory method for a mapping', function() {

                    var factory = injector.getMappingFor('MyFactory');

                    expect(factory.hasOwnProperty('make')).toBe(true);
                    expect(is(factory.make, 'function')).toBe(true);
                });

                it(' should create an instance when its factory method is called', function() {

                    var name = 'MyName',
                        factory = injector.getMappingFor('MyFactory'),
                        instance = factory.make(name);

                    expect(instance.constructor.name).toBe('MyFactoryInstance');
                    expect(instance.getName()).toBe(name);
                });

                it(' should return a singleton', function() {

                    expect(injector.getMappingFor('MyFactory')).toBe(injector.getMappingFor('MyFactory'));
                });

                it(' should allow multiple mappings of the same factory with different keys', function() {

                    /**
                     * NOTE: Not sure why you'd want to though.
                     * This is really just a proof of concept and demonstrates some
                     * possibly unexpected behaviour regarding identity.
                     */

                    expect(function() {
                        injector.map('MyFactory1').toFactory(MyFactory);
                        injector.map('MyFactory2').toFactory(MyFactory);
                    }).not.toThrow();

                    var f1 = injector.getMappingFor('MyFactory1'),
                        f2 = injector.getMappingFor('MyFactory2');

                    expect(f1).not.toBe(f2);

                    // Although the Constructor 'looks' the same...
                    expect(f1.make().constructor.name).toBe(f2.make().constructor.name);
                    expect(f1.make().constructor.toString()).toEqual(f2.make().constructor.toString());

                    // ...it's not.
                    expect(f1.make().constructor).not.toEqual(f2.make().constructor);
                });

                it(' should throw if the factory is not a function', function() {

                    expect(function() {
                        injector.map('InvalidFactory').toFactory({});
                    }).toThrow(INVALID_TARGET);

                    expect(function() {
                        injector.map('AnotherInvalidFactory').toFactory(null);
                    }).toThrow(INVALID_TARGET);
                });

                it(' should throw if the mapping has already been set', function() {

                    expect(function() {
                        injector.map('Factory->Factory').toFactory(MyFactory).toFactory(MyFactory);
                    }).toThrow(MAPPING_EXISTS);

                    expect(function() {
                        injector.map('Type->Factory').toType(MyFactory).toFactory(MyFactory);
                    }).toThrow(MAPPING_EXISTS);

                    expect(function() {
                        injector.map('Value->Factory').toValue(MyFactory).toFactory(MyFactory);
                    }).toThrow(MAPPING_EXISTS);
                });
            });

            describe('toFactory Facade', function() {

                function MyFactory() {
                    return function MyFactoryInstance(myArg) {
                        this.myArg = myArg;
                    };
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyFactory').toFactory(MyFactory);
                });

                it(' should have lazy instantiation', function() {

                    function MyMissingFactory() {
                        return function MyFactoryInstance() {
                            this.i_MyMissingProp = null;
                        };
                    }

                    injector.map('MyMissingFactory').toFactory(MyMissingFactory);

                    var myMissingFactory = null;

                    expect(function() {
                        myMissingFactory = injector.getMappingFor('MyMissingFactory');
                    }).not.toThrow();

                    expect(function() {
                        myMissingFactory.make();
                    }).toThrow(NO_MAPPING);
                });

                it(' should create an Object with a make() function', function() {

                    var factory = injector.getMappingFor('MyFactory');

                    expect(is(factory, 'Object')).toBe(true);
                    expect(factory.hasOwnProperty('make')).toBe(true);
                });

                it(' should make an instance of the factory instance', function() {

                    expect(injector.getMappingFor('MyFactory').make().constructor.name)
                        .toBe('MyFactoryInstance');
                });

                it(' should supply arguments as instance constructor arguments', function() {

                    var instance = injector.getMappingFor('MyFactory').make('foo');

                    expect(instance.myArg).toBe('foo');
                });
            });

            // toType
            describe('toType', function() {

                function MyType() {}

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyType').toType(MyType);
                });

                it(' should create a typed instance for a mapping', function() {

                    expect(injector.getMappingFor('MyType').constructor)
                        .toBe(MyType);
                });

                it(' should resolve a new instance each time', function() {

                    expect(injector.getMappingFor('MyType'))
                        .not.toBe(injector.getMappingFor('MyType'));
                });

                it(' should allow multiple mappings of the same function with different keys', function() {

                    expect(function() {
                        injector.map('MyType1').toType(MyType);
                        injector.map('MyType2').toType(MyType);
                    }).not.toThrow();

                    expect(injector.getMappingFor('MyType1').constructor)
                        .toBe(injector.getMappingFor('MyType2').constructor);
                });

                it(' should throw if the type is not a function', function() {

                    expect(function() {
                        injector.map('ArrayType').toType([]);
                    }).toThrow(INVALID_TARGET);

                    expect(function() {
                        injector.map('NullType').toType(null);
                    }).toThrow(INVALID_TARGET);

                    expect(function() {
                        injector.map('NumberType').toType(42);
                    }).toThrow(INVALID_TARGET);

                    expect(function() {
                        injector.map('ObjectType').toType({});
                    }).toThrow(INVALID_TARGET);

                    expect(function() {
                        injector.map('StringType').toType('FN');
                    }).toThrow(INVALID_TARGET);

                    expect(function() {
                        injector.map('UndefinedType').toType(undefined);
                    }).toThrow(INVALID_TARGET);
                });

                it(' should throw if the mapping value has already been set', function() {

                    expect(function() {
                        injector.map('Type->Type').toType(MyType).toType(MyType);
                    }).toThrow(MAPPING_EXISTS);

                    expect(function() {
                        injector.map('Factory->Type').toFactory(MyType).toType(MyType);
                    }).toThrow(MAPPING_EXISTS);

                    expect(function() {
                        injector.map('Value->Type').toValue(MyType).toType(MyType);
                    }).toThrow(MAPPING_EXISTS);
                });
            });

            // toValue
            describe('toValue', function() {

                var myArray = [1, 2, 3],
                    myBoolean = true,
                    myNumber = 42,
                    myObject = {name:'MyObject'},
                    myString = 'MyString',

                    myPropertyArray = ['i_MyNumber'],
                    myPropertyObject = {i_MyNumber: null},
                    myPropertyString = 'i_MyNumber';

                function MyFunction() {}

                function MyInstance() {
                    this.name = 'MyInstance';
                }

                function MyPropertyFunction() {
                    this.i_MyNumber = null;
                }

                function MyPrototypeFunction() {}
                MyPrototypeFunction.prototype = {
                    i_MyNumber: null
                };
                MyPrototypeFunction.prototype.constructor = MyPrototypeFunction;

                function MyBorrowedFunction() {}
                MyBorrowedFunction.prototype = MyPrototypeFunction.prototype;
                MyBorrowedFunction.prototype.constructor = MyBorrowedFunction;

                function MyInheritedFunction() {}
                MyInheritedFunction.prototype = new MyPrototypeFunction();
                MyInheritedFunction.prototype.constructor = MyInheritedFunction;

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyArray').toValue(myArray);
                    injector.map('MyBoolean').toValue(myBoolean);
                    injector.map('MyFunction').toValue(MyFunction);
                    injector.map('MyInstance').toValue(new MyInstance());
                    injector.map('MyNumber').toValue(myNumber);
                    injector.map('MyObject').toValue(myObject);
                    injector.map('MyString').toValue(myString);

                    injector.map('MyPropertyArray').toValue(myPropertyArray);
                    injector.map('MyPropertyFunction').toValue(MyPropertyFunction);
                    injector.map('MyPropertyInstance').toValue(new MyPropertyFunction());
                    injector.map('MyPropertyObject').toValue(myPropertyObject);
                    injector.map('MyPropertyString').toValue(myPropertyString);

                    injector.map('MyPrototypeInstance').toValue(new MyPropertyFunction());

                    injector.map('MyBorrowedInstance').toValue(new MyBorrowedFunction());
                    injector.map('MyInheritedInstance').toValue(new MyInheritedFunction());
                });

                it(' should map a value to a key', function() {

                    expect(injector.getMappingFor('MyArray'))
                        .toBe(myArray);

                    expect(injector.getMappingFor('MyBoolean'))
                        .toBe(myBoolean);

                    expect(injector.getMappingFor('MyFunction'))
                        .toBe(MyFunction);

                    expect(injector.getMappingFor('MyInstance').constructor)
                        .toBe(MyInstance);

                    expect(injector.getMappingFor('MyNumber'))
                        .toBe(myNumber);

                    expect(injector.getMappingFor('MyObject'))
                        .toBe(myObject);

                    expect(injector.getMappingFor('MyString'))
                        .toBe(myString);
                });

                it(' should map values as singletons', function() {

                    expect(injector.getMappingFor('MyArray'))
                        .toBe(injector.getMappingFor('MyArray'));

                    expect(injector.getMappingFor('MyBoolean'))
                        .toBe(injector.getMappingFor('MyBoolean'));

                    expect(injector.getMappingFor('MyFunction'))
                        .toBe(injector.getMappingFor('MyFunction'));

                    expect(injector.getMappingFor('MyInstance'))
                        .toBe(injector.getMappingFor('MyInstance'));

                    expect(injector.getMappingFor('MyNumber'))
                        .toBe(injector.getMappingFor('MyNumber'));

                    expect(injector.getMappingFor('MyObject'))
                        .toBe(injector.getMappingFor('MyObject'));

                    expect(injector.getMappingFor('MyString'))
                        .toBe(injector.getMappingFor('MyString'));
                });

                it(' should allow multiple mappings of the same value with different keys', function() {

                    function MyValue() {}

                    expect(function() {
                        injector.map('MyValue1').toValue(MyValue);
                        injector.map('MyValue2').toValue(MyValue);
                    }).not.toThrow();

                    expect(injector.getMappingFor('MyValue1'))
                        .toBe(injector.getMappingFor('MyValue2'));
                });

                it(' should resolve properties of target Objects', function() {

                    expect(injector.getMappingFor('MyPropertyInstance').i_MyNumber).toBe(42);
                    expect(injector.getMappingFor('MyPropertyObject').i_MyNumber).toBe(42);
                });

                it(' should resolve prototypical properties of target Objects', function() {

                    expect(injector.getMappingFor('MyPrototypeInstance').i_MyNumber).toBe(42);
                });

                it(' should resolve inherited properties of target Objects', function() {

                    expect(injector.getMappingFor('MyBorrowedInstance').i_MyNumber).toBe(42);
                    expect(injector.getMappingFor('MyInheritedInstance').i_MyNumber).toBe(42);
                });

                it(' should NOT resolve non Object target values', function() {

                    var MyPropertyFunction = injector.getMappingFor('MyPropertyFunction'),
                        myPropertyInstance = new MyPropertyFunction();

                    expect(myPropertyInstance.i_MyNumber).toBeNull();

                    expect(injector.getMappingFor('MyPropertyArray')[0]).toBe('i_MyNumber');
                    expect(injector.getMappingFor('MyPropertyString')).toBe('i_MyNumber');
                });

                it(' should throw if the mapping value has already been set', function() {

                    function MyValue() {}

                    expect(function() {
                        injector.map('Value->Value').toValue(MyValue).toValue(MyValue);
                    }).toThrow(MAPPING_EXISTS);

                    expect(function() {
                        injector.map('Factory->Value').toFactory(MyValue).toValue(MyValue);
                    }).toThrow(MAPPING_EXISTS);

                    expect(function() {
                        injector.map('Type->Value').toType(MyValue).toValue(MyValue);
                    }).toThrow(MAPPING_EXISTS);
                });
            });

            // asSingleton()
            describe('asSingleton', function() {

                function MyType() {}

                function MySingleton() {}

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyType').toType(MyType);
                    injector.map('MySingleton').toType(MySingleton).asSingleton();
                });

                it(' should retrieve a typed instance for a singleton mapping', function() {

                    expect(injector.getMappingFor('MySingleton').constructor)
                        .toBe(MySingleton);
                });

                it(' should be a singleton if asSingleton is set', function() {

                    expect(injector.getMappingFor('MySingleton'))
                        .toBe(injector.getMappingFor('MySingleton'));
                });

                it(' should NOT map types as singletons by default', function() {

                    expect(injector.getMappingFor('MyType'))
                        .not.toBe(injector.getMappingFor('MyType'));
                });
            });

            // using()
            describe('using', function() {

                function MyFactory() {
                    return function MyFactoryInstance() {};
                }

                function MyUsingFactory(MyFactory) {
                    return function MyUsingFactoryInstance() {
                        this.myFactory = MyFactory;
                    };
                }

                function MyType() {}

                function MySingletonType() {}

                function MyUsingType(myType, mySingletonType) {
                    this.myType = myType;
                    this.mySingletonType = mySingletonType;
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyType').toType(MyType);
                    injector.map('MySingletonType').toType(MySingletonType).asSingleton();
                });

                it(' should do nothing if the arguments length is 0', function() {

                    expect(function() {

                        injector.map('MyA').toType(function MyA(DepA){
                            this.depA = DepA;
                        }).using();

                    }).not.toThrow();

                    expect(injector.getMappingFor('MyA').depA).toBe(undefined);
                });

                it(' should do nothing if the first argument is null', function() {

                    expect(function() {
                        injector.map('MyA').toType(function MyA(DepA){
                            this.depA = DepA;
                        }).using(null);
                        injector.getMappingFor('MyA');
                    }).not.toThrow();

                    expect(injector.getMappingFor('MyA').depA).toBe(undefined);
                });

                it(' should do nothing if the first argument is undefined', function() {

                    expect(function() {
                        injector.map('MyA').toType(function MyA(DepA){
                            this.depA = DepA;
                        }).using(undefined);
                        injector.getMappingFor('MyA');
                    }).not.toThrow();

                    expect(injector.getMappingFor('MyA').depA).toBe(undefined);
                });


                it(' should accept a list of strings as dependencies', function() {

                    injector.map('MyUsingType')
                        .toType(MyUsingType)
                        .using('MyType', 'MySingletonType');

                    expect(injector.getMappingFor('MyUsingType').myType.constructor)
                        .toBe(MyType);

                    expect(injector.getMappingFor('MyUsingType').mySingletonType.constructor)
                        .toBe(MySingletonType);
                });

                it(' should accept an array as dependencies', function() {

                    injector.map('MyUsingType')
                        .toType(MyUsingType)
                        .using(['MyType', 'MySingletonType']);

                    expect(injector.getMappingFor('MyUsingType').myType.constructor)
                        .toBe(MyType);

                    expect(injector.getMappingFor('MyUsingType').mySingletonType.constructor)
                        .toBe(MySingletonType);
                });

                it(' should NOT resolve arguments of a toValue mapping', function() {

                    injector.map('MyArgsValue')
                        .toValue(function MyArgsValue(MyArray){
                            this.myArray = MyArray;
                        })
                        .using('MyArray');

                    expect(injector.getMappingFor('MyArgsValue').myArray).toBe(undefined);
                });
            });

            describe('as - duck typing', function() {

                /*
                IMyType = {
                    myMethod: {
                        arity: 1
                    }
                };
                */

                var IMyInterface = [

                    {name: 'myMethod', arity: 1},
                    {name: 'myProperty'},
                    {name: 'myPrototypeMethod', arity: 1},
                    {name: 'myPrototypeProperty'}
                ];

                var MyValue = {

                    myMethod: function(myArg) {},
                    myProperty: 'MyProperty',
                    myPrototypeMethod: function(myArg) {},
                    myPrototypeProperty: 'MyPrototypeProperty'
                };

                function MyFactory() {

                    function MyInstance() {
                        this.myMethod = function(myArg) {};
                        this.myProperty = 'My property';
                    }
                    MyInstance.prototype.myPrototypeMethod = function(myArg) {};
                    MyInstance.prototype.myPrototypeProperty = 'MyPrototypeProperty';
                    MyInstance.prototype.constructor = MyInstance;

                    return MyInstance;
                }

                function MyType() {
                    this.myMethod = function(myArg) {};
                    this.myProperty = 'My property';
                }
                MyType.prototype.myPrototypeMethod = function(myArg) {};
                MyType.prototype.myPrototypeProperty = 'MyPrototypeProperty';
                MyType.prototype.constructor = MyType;

                beforeEach(function() {

                    injector = new Injector();

                    injector.map('MyFactory').toFactory(MyFactory).as(IMyInterface);
                    injector.map('MyType').toType(MyType).as(IMyInterface);
                    injector.map('MyValue').toValue(MyValue).as(IMyInterface);
                });

                it(' should ensure a defined public API for a toFactory mapping instance', function() {

                    var instance = null;

                    expect(function() {
                        instance = injector.getMappingFor('MyFactory').make();
                    }).not.toThrow();

                    expect(instance.myMethod).toBeDefined();
                    expect(instance.myMethod.length).toBe(1);

                    expect(instance.myPrototypeMethod).toBeDefined();
                    expect(instance.myPrototypeMethod.length).toBe(1);

                    expect(instance.myProperty).toBeDefined();
                    expect(instance.myPrototypeProperty).toBeDefined();
                });

                it(' should ensure a defined public API for a toType mapping', function() {

                    var instance = null;

                    expect(function() {
                        instance = injector.getMappingFor('MyType');
                    }).not.toThrow();

                    expect(instance.myMethod).toBeDefined();
                    expect(instance.myMethod.length).toBe(1);

                    expect(instance.myPrototypeMethod).toBeDefined();
                    expect(instance.myPrototypeMethod.length).toBe(1);

                    expect(instance.myProperty).toBeDefined();
                    expect(instance.myPrototypeProperty).toBeDefined();
                });

                it(' should ensure a defined public API for a toValue mapping', function() {

                    var target = null;

                    expect(function() {
                        target = injector.getMappingFor('MyValue');
                    }).not.toThrow();

                    expect(target.myMethod).toBeDefined();
                    expect(target.myMethod.length).toBe(1);

                    expect(target.myPrototypeMethod).toBeDefined();
                    expect(target.myPrototypeMethod.length).toBe(1);

                    expect(target.myProperty).toBeDefined();
                    expect(target.myPrototypeProperty).toBeDefined();
                });

                it(' should NOT mutate the interface', function() {

                    injector.getMappingFor('MyFactory');
                    expect(IMyInterface.length).toBe(4);

                    injector.getMappingFor('MyType');
                    expect(IMyInterface.length).toBe(4);

                    injector.getMappingFor('MyValue');
                    expect(IMyInterface.length).toBe(4);
                });

                // @TODO: Still need a way to test the interface check has only been called once
                it(' should only test the Interface on the first instantiation', function() {

                    injector.map('MyMissing').toType(function(){}).as(IMyInterface);

                    expect(function() {
                        injector.getMappingFor('MyMissing');
                    }).toThrow(INTERFACE_MEMBER_MISSING);
                });

                it(' should throw if an interface member is missing', function() {

                    var IMemberTest = [
                        {name: 'myMethod'}
                    ];

                    function MyCorrect() {
                        this.myMethod = function(myArg) {};
                    }

                    function MyMissing() {}

                    expect(function() {
                        injector.map('MyCorrect').toType(MyCorrect).as(IMemberTest);
                        injector.map('MyMissing').toType(MyMissing).as(IMemberTest);
                    }).not.toThrow();

                    expect(function() {
                        injector.getMappingFor('MyMissing');
                    }).toThrow(INTERFACE_MEMBER_MISSING);
                });

                it(' should throw if an interface method has the wrong arity', function() {

                    var IArityTest = [
                        {name: 'myMethod', arity: 1}
                    ];

                    function MyCorrect() {
                        this.myMethod = function(myArg) {};
                    }

                    function MyMissing() {
                        this.myMethod = function() {};
                    }

                    expect(function() {
                        injector.map('MyCorrect').toType(MyCorrect).as(IArityTest);
                        injector.map('MyMissing').toType(MyMissing).as(IArityTest);
                    }).not.toThrow();

                    expect(function() {
                        injector.getMappingFor('MyCorrect');
                    }).not.toThrow();

                    expect(function() {
                        injector.getMappingFor('MyMissing');
                    }).toThrow(INTERFACE_METHOD_ARITY_MISMATCH);
                });
            });

            // Injection
            // ------------------------------

            // Constructor
            describe('constructor injection', function() {

                function MyFactory() {
                    return function MyFactoryInstance() {};
                }

                function MyType() {}

                function MyValue() {}

                function MySingletonFactory() {
                    return function MySingletonFactoryInstance() {};
                }

                function MySingletonType() {}

                function MyDependantFactory(myFactory, myType, mySingletonFactory, mySingletonType, myValue) {
                    return function MyDependantFactoryInstance() {
                        this.myFactory = myFactory;
                        this.myType = myType;
                        this.mySingletonFactory = mySingletonFactory;
                        this.mySingletonType = mySingletonType;
                        this.myValue = myValue;
                    };
                }

                function MyDependantType(myFactory, myType, mySingletonFactory, mySingletonType, myValue) {
                    this.myFactory = myFactory;
                    this.myType = myType;
                    this.mySingletonFactory = mySingletonFactory;
                    this.mySingletonType = mySingletonType;
                    this.myValue = myValue;
                }

                function MyNestedDependantFactory(myDependantFactory, myDependantType) {
                    return function MyNestedDependantFactoryInstance() {
                        this.myFactory = myDependantFactory;
                        this.myType = myDependantType;
                    };
                }

                function MyNestedDependantType(myDependantFactory, myDependantType) {
                    this.myFactory = myDependantFactory;
                    this.myType = myDependantType;
                }

                beforeEach(function() {

                    injector = new Injector();

                    injector.map('MyFactory')
                        .toFactory(MyFactory);

                    injector.map('MySingletonFactory')
                        .toFactory(MySingletonFactory)
                        .asSingleton();

                    injector.map('MyDependantFactory')
                        .toFactory(MyDependantFactory)
                        .using('MyFactory', 'MyType', 'MySingletonFactory', 'MySingletonType', 'MyValue');

                    injector.map('MyNestedDependantFactory')
                        .toFactory(MyNestedDependantFactory)
                        .using('MyDependantFactory', 'MyDependantType');

                    injector.map('MyType')
                        .toType(MyType);

                    injector.map('MySingletonType')
                        .toType(MySingletonType)
                        .asSingleton();

                    injector.map('MyDependantType')
                        .toType(MyDependantType)
                        .using('MyFactory', 'MyType', 'MySingletonFactory', 'MySingletonType', 'MyValue');

                    injector.map('MyNestedDependantType')
                        .toType(MyNestedDependantType)
                        .using('MyDependantFactory', 'MyDependantType');

                    injector.map('MyValue')
                        .toValue(new MyValue());
                });

                it(' should throw for an arity / dependency length mismatch', function() {

                    // @TODO.
                });

                it(' should map on dependencies by index, not name', function() {

                    function DepA(Foo) {
                        this.foo = Foo;
                    }

                    function DepB(Bar) {
                        this.bar = Bar;
                    }

                    injector.map('DepA').toType(DepA).using('MyType');
                    injector.map('DepB').toType(DepB).using('MyType');

                    expect(injector.getMappingFor('DepA').foo.constructor)
                        .toBe(injector.getMappingFor('DepB').bar.constructor);
                });

                it(' should inject a factory constructor with dependencies specified in using()', function() {

                    var instance = injector.getMappingFor('MyDependantFactory').make();

                    expect(instance.constructor.name).toBe('MyDependantFactoryInstance');
                    expect(instance.myFactory.make().constructor.name).toBe('MyFactoryInstance');
                    expect(instance.myType.constructor.name).toBe('MyType');
                    expect(instance.mySingletonFactory.make().constructor.name).toBe('MySingletonFactoryInstance');
                    expect(instance.mySingletonType.constructor.name).toBe('MySingletonType');
                    expect(instance.myValue.constructor.name).toBe('MyValue');

                    instance = injector.getMappingFor('MyNestedDependantFactory').make();

                    expect(instance.constructor.name).toBe('MyNestedDependantFactoryInstance');
                    expect(instance.myFactory.make().constructor.name).toBe('MyDependantFactoryInstance');
                    expect(instance.myType.constructor.name).toBe('MyDependantType');
                });

                it(' should inject a type constructor with dependencies specified in using()', function() {

                    var instance = injector.getMappingFor('MyDependantType');

                    expect(instance.constructor).toBe(MyDependantType);
                    expect(instance.myFactory.make().constructor.name).toBe('MyFactoryInstance');
                    expect(instance.myType.constructor.name).toBe('MyType');
                    expect(instance.mySingletonFactory.make().constructor.name).toBe('MySingletonFactoryInstance');
                    expect(instance.mySingletonType.constructor.name).toBe('MySingletonType');
                    expect(instance.myValue.constructor.name).toBe('MyValue');

                    instance = injector.getMappingFor('MyNestedDependantType');

                    expect(instance.constructor).toBe(MyNestedDependantType);
                    expect(instance.myFactory.make().constructor.name).toBe('MyDependantFactoryInstance');
                    expect(instance.myType.constructor.name).toBe('MyDependantType');
                });
            });

            // Property injection
            describe('property injection', function() {

                beforeEach(function() {

                    injector = new Injector();

                    injector.map('MyNull').toValue('Null');
                    injector.map('MyUndefined').toValue('Undefined');
                });

                it(' should inject null and undefined properties prefixed with i_', function() {

                    function MyFactory() {
                        return function MyFactoryInstance() {
                            this.i_MyNull = null;
                            this.i_MyUndefined = null;
                        };
                    }

                    function MyType() {
                        this.i_MyNull = null;
                        this.i_MyUndefined = undefined;
                    }

                    injector.map('MyFactory').toFactory(MyFactory);
                    injector.map('MyType').toType(MyType);

                    function test(instance) {

                        expect(instance.i_MyNull).toEqual('Null');
                        expect(instance.i_MyUndefined).toEqual('Undefined');
                    }

                    test(injector.getMappingFor('MyFactory').make());
                    test(injector.getMappingFor('MyType'));
                });

                it(' should inject null and undefined prototype properties prefixed with i_', function() {

                    function MyFactory() {
                        function MyFactoryInstance() {}
                        MyFactoryInstance.prototype = {
                            i_MyNull: null,
                            i_MyUndefined: null
                        };
                        MyFactoryInstance.prototype.constructor = MyFactoryInstance;
                        return MyFactoryInstance;
                    }

                    function MyType() {}
                    MyType.prototype = {
                        i_MyNull: null,
                        i_MyUndefined: null
                    };
                    MyType.prototype.constructor = MyType;

                    injector.map('MyFactory').toFactory(MyFactory);
                    injector.map('MyType').toType(MyType);

                    function test(instance) {

                        expect(instance.i_MyNull).toEqual('Null');
                        expect(instance.i_MyUndefined).toEqual('Undefined');
                    }

                    test(injector.getMappingFor('MyFactory').make());
                    test(injector.getMappingFor('MyType'));
                });

                it(' should inject inherited null and undefined properties prefixed with i_', function() {

                    function MyRoot() {}
                    MyRoot.prototype = {
                        i_MyNull: null,
                        i_MyUndefined: undefined
                    };
                    MyRoot.prototype.constructor = MyRoot;

                    function MyInstantiatedPrototype_Factory() {
                        function MyInstantiatedPrototype_Instance() {}
                        MyInstantiatedPrototype_Instance.prototype = new MyRoot();
                        MyInstantiatedPrototype_Instance.prototype.constructor = MyInstantiatedPrototype_Instance;
                        return MyInstantiatedPrototype_Instance;
                    }

                    function MyBorrowedPrototype_Factory() {
                        function MyBorrowedPrototype_Instance() {}
                        MyBorrowedPrototype_Instance.prototype = MyRoot.prototype;
                        MyBorrowedPrototype_Instance.prototype.constructor = MyBorrowedPrototype_Instance;
                        return MyBorrowedPrototype_Instance;
                    }

                    function MyInstantiatedPrototype_Type() {}
                    MyInstantiatedPrototype_Type.prototype = new MyRoot();
                    MyInstantiatedPrototype_Type.prototype.constructor = MyInstantiatedPrototype_Type;

                    function MyBorrowedPrototype_Type() {}
                    MyBorrowedPrototype_Type.prototype = MyRoot.prototype;
                    MyBorrowedPrototype_Type.prototype.constructor = MyBorrowedPrototype_Type;

                    injector.map('MyRoot').toType(MyRoot);

                    injector.map('MyInstantiatedPrototype_Factory')
                        .toFactory(MyInstantiatedPrototype_Factory);

                    injector.map('MyBorrowedPrototype_Factory')
                        .toFactory(MyBorrowedPrototype_Factory);

                    injector.map('MyInstantiatedPrototype_Type')
                        .toType(MyInstantiatedPrototype_Type);

                    injector.map('MyBorrowedPrototype_Type')
                        .toType(MyBorrowedPrototype_Type);

                    function test(instance) {

                        var myRoot;

                        expect(instance.i_MyNull).toEqual('Null');
                        expect(instance.i_MyUndefined).toEqual('Undefined');

                        // Control to ensure the prototype is NOT being mutated
                        myRoot = new MyRoot();
                        expect(myRoot.i_MyNull).toBeNull();
                        expect(myRoot.i_MyUndefined).toBeUndefined();
                    }

                    test(injector.getMappingFor('MyInstantiatedPrototype_Factory').make());
                    test(injector.getMappingFor('MyBorrowedPrototype_Factory').make());

                    test(injector.getMappingFor('MyInstantiatedPrototype_Type'));
                    test(injector.getMappingFor('MyBorrowedPrototype_Type'));
                });

                it(' should NOT inject non null and undefined properties prefixed with an i_', function() {

                    function Props() {

                        this.i_MyArray = [1, 2, 3];
                        this.i_MyArray_Empty = [];

                        this.i_MyBoolean_False = false;
                        this.i_MyBoolean_True = true;

                        this.i_MyFunction = function Props() {};

                        this.i_MyNumber = 42;
                        this.i_MyNumber_Zero = 0;

                        this.i_MyObject = {foo:'bar'};
                        this.i_MyObject_Empty = {};

                        this.i_MyString = 'Hello World';
                        this.i_MyString_Empty = '';
                    }

                    injector.map('MyArray').toValue([10, 11, 12]);
                    injector.map('MyArray_Empty').toValue(['empty']);

                    injector.map('MyBoolean_False').toValue(true);
                    injector.map('MyBoolean_True').toValue(false);

                    injector.map('MyFunction').toValue(function() {});

                    injector.map('MyNumber').toValue(180);
                    injector.map('MyNumber_Zero').toValue(100);

                    injector.map('MyObject').toValue({foo:'OOPS'});
                    injector.map('MyObject_Empty').toValue({foo:'Not empty'});

                    injector.map('MyString').toValue('Goodbye');
                    injector.map('MyString_Empty').toValue('Not empty');

                    injector.map('Props').toType(Props);

                    var props = injector.getMappingFor('Props');

                    expect(props.i_MyArray).toEqual([1, 2, 3]);
                    expect(props.i_MyArray_Empty).toEqual([]);

                    expect(props.i_MyBoolean_False).toEqual(false);
                    expect(props.i_MyBoolean_True).toEqual(true);

                    expect(new props.i_MyFunction().constructor.name).toEqual('Props');

                    expect(props.i_MyNumber).toEqual(42);
                    expect(props.i_MyNumber_Zero).toEqual(0);

                    expect(props.i_MyObject.foo).toEqual('bar');
                    expect(props.i_MyObject_Empty).toEqual({});

                    expect(props.i_MyString).toEqual('Hello World');
                    expect(props.i_MyString_Empty).toEqual('');
                });

                it(' should NOT inject non prefixed properties', function() {

                    var myString = 'MyString',

                        myInjectedString = 'MyInjectedString',
                        myEmptyString = 'MyEmptyString',
                        myNullString = 'MyNullString',
                        myUndefinedString = 'MyUndefinedString';

                    function MyType() {
                        this.i_MyString = undefined;
                        this.MyString = myString;
                        this.MyEmptyString = '';
                        this.MyNullString = null;
                        this.MyUndefinedString = undefined;
                    }

                    injector.map('MyString').toValue(myInjectedString);
                    injector.map('MyEmptyString').toValue(myEmptyString);
                    injector.map('MyNullString').toValue(myNullString);
                    injector.map('MyUndefinedString').toValue(myUndefinedString);
                    injector.map('MyType').toType(MyType);

                    var myType = injector.getMappingFor('MyType');

                    expect(myType.i_MyString).toEqual(myInjectedString);
                    expect(myType.MyString).toEqual(myString);
                    expect(myType.MyEmptyString).toEqual('');
                    expect(myType.MyNullString).toEqual(null);
                    expect(myType.MyUndefinedString).toEqual(undefined);
                });

                it(' should throw if a dependency is unmapped', function() {

                    function MyType() {
                        this.i_MyString = null;
                    }

                    function MyFactory() {
                        return function MyMissingFactoryInstance() {
                            this.i_MyString = null;
                        };
                    }

                    injector.map('MyType').toType(MyType);
                    injector.map('MyFactory').toFactory(MyFactory);

                    expect(function() {
                        injector.getMappingFor('MyType');
                    }).toThrow(NO_MAPPING);

                    expect(function() {
                        injector.getMappingFor('MyFactory').make();
                    }).toThrow(NO_MAPPING);
                });
            });

            // Combined
            describe('combined injection', function() {

                beforeEach(function() {

                    injector = new Injector();
                });

                it(' should inject constructor and property mappings', function() {

                    function MyType(myConstructor) {
                        this.myConstructor = myConstructor;
                        this.i_MyProperty = null;
                    }
                    MyType.prototype = {
                        i_MyPrototypeProperty: null
                    };
                    MyType.prototype.constructor = MyType;

                    function MyFactory(myConstructor) {

                        function MyFactoryInstance() {
                            this.myConstructor = myConstructor;
                            this.i_MyProperty = null;
                        }
                        MyFactoryInstance.prototype = {
                            i_MyPrototypeProperty: null
                        };
                        MyFactoryInstance.prototype.constructor = MyFactoryInstance;

                        return MyFactoryInstance;
                    }

                    injector.map('MyConstructor').toValue('MyConstructor');
                    injector.map('MyProperty').toValue('MyProperty');
                    injector.map('MyPrototypeProperty').toValue('MyPrototypeProperty');

                    injector.map('MyType').toType(MyType).using('MyConstructor');
                    injector.map('MyFactory').toFactory(MyFactory).using('MyConstructor');

                    function test(instance) {

                        expect(instance.myConstructor).toEqual('MyConstructor');
                        expect(instance.i_MyProperty).toEqual('MyProperty');
                        expect(instance.i_MyPrototypeProperty).toEqual('MyPrototypeProperty');
                    }

                    test(injector.getMappingFor('MyType'));
                    test(injector.getMappingFor('MyFactory').make());
                });
            });

            // postConstruct()
            // ------------------------------
            describe('postConstruct', function() {

                var MyValue = {
                    isConstructed: false,
                    postConstruct: function() {
                        this.isConstructed = true;
                    }
                };

                function MyFactory() {
                    return function MyPostFactoryInstance() {
                        this.isConstructed = false;
                        this.postConstruct = function() {
                            this.isConstructed = true;
                        };
                    };
                }

                function MySingleton() {
                    this.counter = 0;
                    this.postConstruct = function() {
                        this.counter++;
                    };
                }

                function MyType() {
                    this.isConstructed = false;
                    this.postConstruct = function() {
                        this.isConstructed = true;
                    };
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyFactory').toFactory(MyFactory);
                    injector.map('MySingleton').toType(MySingleton).asSingleton();
                    injector.map('MyType').toType(MyType);
                    injector.map('MyValue').toValue(MyValue);
                });

                it(' should call postConstruct on toFactory mappings after injecting dependencies', function() {

                    expect(injector.getMappingFor('MyFactory').make().isConstructed).toBe(true);
                });

                it(' should call postConstruct on toType mappings after injecting dependencies', function() {

                    expect(injector.getMappingFor('MyType').isConstructed).toBe(true);
                });

                it(' should only call postConstruct once for a singleton', function() {

                    var mySingleton_1 = injector.getMappingFor('MySingleton'),
                        mySingleton_2 = injector.getMappingFor('MySingleton');

                    expect(mySingleton_1).toBe(mySingleton_2);
                    expect(mySingleton_1.counter).toBe(1);
                    expect(mySingleton_2.counter).toBe(1);
                });

                it(' should NOT call postConstruct on toValue mappings', function() {

                    expect(injector.getMappingFor('MyValue').isConstructed).toBe(false);
                });
            });


            // Injector.resolve methods
            // ------------------------------
            describe('resolveFactory()', function() {

                function MyFactory(myFactoryArg) {
                    return function MyFactoryInstance(myInstanceArg) {
                        this.i_MyProp = null;
                        this.myFactoryArg = myFactoryArg;
                        this.myInstanceArg = myInstanceArg;
                    };
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyFactoryArg').toValue('MyFactoryArg');
                    injector.map('MyProp').toValue('MyProp');
                });

                it(' should resolve the supplied target as a Factory', function() {

                    var factory = injector.resolveFactory(MyFactory, 'MyFactoryArg'),
                        instance = factory.make('MyInstanceArg');

                    expect(is(factory.make, 'function')).toBe(true);

                    expect(instance.constructor.name).toBe('MyFactoryInstance');

                    expect(instance.i_MyProp).toBe('MyProp');
                    expect(instance.myFactoryArg).toBe('MyFactoryArg');
                    expect(instance.myInstanceArg).toBe('MyInstanceArg');
                });

                it(' should throw if a constructor dependency cannot be resolved', function() {

                    function MyFactory(myMissingArg) {
                        return function MyFactoryInstance() {};
                    }

                    expect(function() {
                        injector.resolveFactory(MyFactory, 'MyMissingArg');
                    }).toThrow(NO_MAPPING);
                });

                it(' should throw if a property dependency cannot be resolved', function() {

                    function MyFactory() {
                        return function MyFactoryInstance() {
                            this.i_MyMissingProp = null;
                        };
                    }

                    expect(function() {
                        injector.resolveFactory(MyFactory).make();
                    }).toThrow(NO_MAPPING);
                });

                it(' should throw if the target is not a function', function() {

                    expect(function() {
                        injector.resolveFactory('MyFactory');
                    }).toThrow(INVALID_TARGET);
                });
            });

            describe('resolveType()', function() {

                function MyType(MyArg) {
                    this.i_MyProp = null;
                    this.myArg = MyArg;
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyArg').toValue('MyArg');
                    injector.map('MyProp').toValue('MyProp');
                });

                it(' should resolve the supplied target as a Type', function() {

                    var instance = injector.resolveType(MyType, 'MyArg');

                    expect(instance.constructor).toBe(MyType);
                    expect(instance.i_MyProp).toBe('MyProp');
                    expect(instance.myArg).toBe('MyArg');
                });

                it(' should throw if a constructor dependency cannot be resolved', function() {

                    function MyType(myMissingArg) {}

                    expect(function() {
                        injector.resolveType(MyType, 'MyMissingArg');
                    }).toThrow(NO_MAPPING);
                });

                it(' should throw if a property dependency cannot be resolved', function() {

                    function MyType() {
                        this.i_MyMissingProp = null;
                    }

                    expect(function() {
                        injector.resolveType(MyType);
                    }).toThrow(NO_MAPPING);
                });

                it(' should throw if the target is not a function', function() {

                    expect(function() {
                        injector.resolveType('MyType');
                    }).toThrow(INVALID_TARGET);
                });
            });

            describe('resolveValue()', function() {

                var myValue = {
                    i_MyProp: null
                };

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyProp').toValue('MyProp');
                });

                it(' should resolve properties of the target', function() {

                    expect(injector.resolveValue(myValue).i_MyProp).toBe('MyProp');
                });

                it(' should throw if the target is not an object', function() {

                    expect(function() {
                        injector.resolveValue('myValue');
                    }).toThrow(INVALID_TARGET);
                });
            });
        });
    }
);
