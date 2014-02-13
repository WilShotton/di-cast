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
            NO_MAPPING = '[#005] No mapping found',
            MAPPING_HAS_DEPENDANTS = '[#006] The mapping has dependants',
            INVALID_RESOLVE_TARGET = '[#007] The resolve target must be an Object or Function';

        //var mappingKeys = ['injector', 'toFactory', 'toType', 'toValue', 'asSingleton', 'using']; //'as'

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

                xit(' should return mapping config options', function() {

                    var mapping = injector.map('NewMapping');

                    mappingKeys.forEach(function(key) {
                        expect(is(mapping[key], 'Function')).toBe(true);
                    })
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
            xdescribe(' unMap()', function() {

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

                    expect(injector.hasMappingFor('MyFactory'))
                        .toBe(false);

                    expect(injector.hasMappingFor('MyType'))
                        .toBe(false);

                    expect(injector.hasMappingFor('MyValue'))
                        .toBe(false);
                });

                it(' should throw if a mapping depends on the mapping to be removed', function() {

                    injector.map('MyDependantFactory').toType(function() {
                        this.i_MyType = null;
                    });

                    expect(function() {
                        injector.unMap('MyType');
                    }).toThrow(MAPPING_HAS_DEPENDANTS);
                });

                it(' should return the mapping target value', function() {

                    expect(injector.unMap('MyFactory'))
                        .toBe(MyFactory);

                    expect(injector.unMap('MyType'))
                        .toBe(MyType);

                    expect(injector.unMap('MyValue'))
                        .toBe(myValue);
                });

                it(' should return null for an unmapped key', function() {

                    expect(injector.unMap('MyMissing'))
                        .toBe(null);
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

                    expect(function() {
                        injector.map('MyFactory1').toFactory(MyFactory);
                        injector.map('MyFactory2').toFactory(MyFactory);
                    }).not.toThrow();

                    var f1 = injector.getMappingFor('MyFactory1'),
                        f2 = injector.getMappingFor('MyFactory2');

                    expect(f1).not.toBe(f2);

                    // @TODO Set the instance.prototype.constructor in the factory resolver
                    // expect(f1.make().constructor).toBe(f2.make().constructor);
                });

                it(' should throw if the factory is not a function', function() {

                    expect(function() {
                        injector.map('InvalidFactory').toFactory({});
                    }).toThrow(INVALID_MAPPING_TYPE);

                    expect(function() {
                        injector.map('AnotherInvalidFactory').toFactory(null);
                    }).toThrow(INVALID_MAPPING_TYPE);
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
                    }).toThrow(INVALID_MAPPING_TYPE);

                    expect(function() {
                        injector.map('NullType').toType(null);
                    }).toThrow(INVALID_MAPPING_TYPE);

                    expect(function() {
                        injector.map('NumberType').toType(42);
                    }).toThrow(INVALID_MAPPING_TYPE);

                    expect(function() {
                        injector.map('ObjectType').toType({});
                    }).toThrow(INVALID_MAPPING_TYPE);

                    expect(function() {
                        injector.map('StringType').toType('FN');
                    }).toThrow(INVALID_MAPPING_TYPE);

                    expect(function() {
                        injector.map('UndefinedType').toType(undefined);
                    }).toThrow(INVALID_MAPPING_TYPE);
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
                    myString = 'MyString';

                function MyFunction() {}

                function MyInstance() {
                    this.name = 'MyInstance';
                }

                function MyPropertyInstance() {
                    this.i_MyNumber = null;
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyArray').toValue(myArray);
                    injector.map('MyBoolean').toValue(myBoolean);
                    injector.map('MyFunction').toValue(MyFunction);
                    injector.map('MyInstance').toValue(new MyInstance());
                    injector.map('MyNumber').toValue(myNumber);
                    injector.map('MyObject').toValue(myObject);
                    injector.map('MyPropertyInstanceValue').toValue(new MyPropertyInstance());
                    injector.map('MyString').toValue(myString);
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

                it(' should NOT resolve properties of the target value', function() {

                    expect(injector.getMappingFor('MyPropertyInstanceValue').i_MyNumber)
                        .toBe(null);
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
            describe(' using', function() {

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

            // as()
            xdescribe(' duck typing', function() {

            });

            // Constructor injection
            // ------------------------------
            xdescribe(' constructor injection', function() {

                xit(' should retrieve a constructor for a factory mapping with dependencies', function() {

                    var name = 'MyName',
                        factory = injector.getMappingFor('MyDependantFactory'),
                        instance = factory.make(name);

                    expect(instance.constructor.name).toBe('MyDependantFactoryInstance');
                    expect(instance.getName()).toBe('Dependant > ' + name);
                });

                xit(' should create typed dependencies', function() {

                    var myDependantType = injector.getMappingFor('MyDependantType');

                    expect(myDependantType instanceof MyDependantType).toBeTruthy();
                    expect(myDependantType.constructor).toBe(MyDependantType);
                    expect(myDependantType.constructor.name).toBe('MyDependantType');
                    expect(myDependantType.hasOwnProperty('getName')).toBe(true);
                    expect(myDependantType.getName()).toBe('MyDependantType > MyType');

                    expect(myDependantType.hasOwnProperty('myType')).toBe(true);
                    expect(myDependantType.myType.getName()).toBe('MyType');
                    expect(myDependantType.myType instanceof MyType).toBeTruthy();
                    expect(myDependantType.myType.constructor).toBe(MyType);
                    expect(myDependantType.myType.constructor.name).toBe('MyType');

                    expect(myDependantType.hasOwnProperty('mySingletonType')).toBe(true);
                    expect(myDependantType.mySingletonType.getName()).toBe('MySingletonType');
                    expect(myDependantType.mySingletonType instanceof MySingletonType).toBeTruthy();
                    expect(myDependantType.mySingletonType.constructor).toBe(MySingletonType);
                    expect(myDependantType.mySingletonType.constructor.name).toBe('MySingletonType');
                });


                xit(' should should inject the instance with its dependencies', function() {

                    var instance = injector.getMappingFor('MyDependantType');

                    expect(instance.constructor.name).toBe('MyDependantType');
                    expect(instance.hasOwnProperty('getName')).toBe(true);
                    expect(instance.getName()).toBe('MyDependantType > MyType');
                });
            });

            // Property injection
            // ------------------------------
            xdescribe(' property injection', function() {

                function MyDependantFactory() {
                    return function MyDependantFactoryInstance(name) {
                        this.i_MyProp = null;
                        this.myProp = 'Not mutated';
                    };
                }

                function MyDependant() {
                    this.i_MyProp = null;
                    this.i_MyOtherProp = 'i_MyOtherProp';
                    this.myProp = 'Not mutated';
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyProp').toType(function prop() {});
                    injector.map('MyOtherProp').toType(function otherProp() {});
                    injector.map('MyDependantFactory').toFactory(MyDependantFactory);
                    injector.map('MyDependant').toType(MyDependant);
                });

                it(' should inject properties prefixed with i_', function() {

                    expect(
                        injector.getMappingFor('MyDependantFactory')
                        .make().i_MyProp.constructor.name
                    ).toBe('prop');

                    expect(injector.getMappingFor('MyDependant').i_MyProp.constructor.name)
                        .toBe('prop');
                });

                it(' should inject prototype properties prefixed with i_', function() {

                    function MyProtoFactory() {
                        function MyProtoFactoryInstance() {}
                        MyProtoFactoryInstance.prototype = {
                            i_MyProp: null
                        };
                        return MyProtoFactoryInstance;
                    }

                    function MyProtoType() {}
                    MyProtoType.prototype = {
                        i_MyProp: null
                    };

                    injector.map('MyProtoFactory').toFactory(MyProtoFactory);
                    injector.map('MyProtoType').toType(MyProtoType);

                    expect(injector.getMappingFor('MyDependantFactory').make().i_MyProp.constructor.name)
                        .toBe('prop');

                    expect(injector.getMappingFor('MyProtoType').i_MyProp.constructor.name)
                        .toBe('prop');
                });

                it(' should inject constructor and property mappings', function() {

                    function MyCombined(MyProp) {
                        this.MyProp = MyProp;
                    }
                    MyCombined.prototype = {
                        i_MyProp: null
                    };
                    // NOTE: explicitly set constructor to preserve type via constructor.name
                    MyCombined.prototype.constructor = MyCombined;

                    injector.map('MyCombined')
                        .toType(MyCombined)
                        .using('MyProp')
                        .asSingleton();

                    expect(injector.getMappingFor('MyCombined').MyProp.constructor.name)
                        .toBe('prop');

                    expect(injector.getMappingFor('MyCombined').i_MyProp.constructor.name)
                        .toBe('prop');

                    expect(injector.getMappingFor('MyCombined').MyProp)
                        .not.toBe(injector.getMappingFor('MyCombined').i_MyProp);

                    function MyCombinedSingleton(MyCombined) {
                        this.myCombined = MyCombined;
                    }
                    MyCombinedSingleton.prototype = {
                        i_MyCombined: null
                    };

                    injector.map('MyCombinedSingleton')
                        .toType(MyCombinedSingleton)
                        .using('MyCombined');

                    expect(injector.getMappingFor('MyCombinedSingleton').myCombined.constructor.name)
                        .toBe('MyCombined');

                    expect(injector.getMappingFor('MyCombinedSingleton').i_MyCombined.constructor.name)
                        .toBe('MyCombined');

                    expect(injector.getMappingFor('MyCombinedSingleton').myCombined)
                        .toBe(injector.getMappingFor('MyCombinedSingleton').i_MyCombined);
                });

                it(' should inject inherited prefixed properties', function() {

                    function MyRoot() {}
                    MyRoot.prototype = {
                      i_MyProp: null
                    };

                    function MyChild() {}
                    MyChild.prototype = new MyRoot();

                    function MyOtherChild() {}
                    MyOtherChild.prototype = MyRoot.prototype;

                    function MyChildFactory() {
                        function MyChildFactoryInstance() {}
                        MyChildFactoryInstance.prototype = new MyRoot();
                        return MyChildFactoryInstance;
                    }

                    function MyOtherChildFactory() {
                        function MyOtherChildFactoryInstance() {}
                        MyOtherChildFactoryInstance.prototype = MyRoot.prototype;
                        return MyOtherChildFactoryInstance;
                    }

                    injector.map('MyRoot').toType(MyRoot);
                    injector.map('MyChild').toType(MyChild);
                    injector.map('MyOtherChild').toType(MyOtherChild);
                    injector.map('MyChildFactory').toFactory(MyChildFactory);
                    injector.map('MyOtherChildFactory').toFactory(MyOtherChildFactory);

                    expect(injector.getMappingFor('MyChild').i_MyProp.constructor.name)
                        .toBe('prop');

                    expect(new MyRoot().i_MyProp)
                        .toBeNull();

                    expect(injector.getMappingFor('MyOtherChild').i_MyProp.constructor.name)
                        .toBe('prop');

                    expect(new MyRoot().i_MyProp)
                        .toBeNull();

                    expect(injector.getMappingFor('MyChildFactory').make().i_MyProp.constructor.name)
                        .toBe('prop');

                    expect(new MyRoot().i_MyProp)
                        .toBeNull();

                    expect(injector.getMappingFor('MyOtherChildFactory').make().i_MyProp.constructor.name)
                        .toBe('prop');

                    expect(new MyRoot().i_MyProp)
                        .toBeNull();
                });

                it(' should ignore non-prefixed properties', function() {

                    expect(injector.getMappingFor('MyDependant').myProp)
                        .toBe('Not mutated');

                    expect(injector.getMappingFor('MyDependantFactory').make().myProp)
                        .toBe('Not mutated');
                });

                it(' should ignore non-null prefixed properties', function() {

                    expect(injector.getMappingFor('MyDependant').i_MyOtherProp)
                        .toBe('i_MyOtherProp');
                });

                it(' should throw if a dependency is unmapped', function() {

                    function MyMissing() {
                        this.i_Property = null;
                    }

                    function MyMissingFactory() {
                        return function MyMissingFactoryInstance() {
                            this.i_Property = null;
                        };
                    }

                    injector.map('MyMissing').toType(MyMissing);
                    injector.map('MyMissingFactory').toFactory(MyMissingFactory);

                    expect(function() {
                        injector.getMappingFor('MyMissing');
                    }).toThrow(NO_MAPPING);

                    expect(function() {
                        injector.getMappingFor('MyMissingFactory').make();
                    }).toThrow(NO_MAPPING);
                });
            });

            // postConstruct()
            // ------------------------------
            xdescribe(' postConstruct', function() {

                var MyPostValue = {

                    isConstructed: false,

                    postConstruct: function() {
                        this.isConstructed = true;
                    }
                };

                function MyArg() {}
                function MyProp() {}

                function MyPostFactory(MyArg) {
                    return function MyPostFactoryInstance() {

                        var isConstructed = false;

                        this.i_MyProp = null;

                        this.myArg = MyArg;

                        this.postConstruct = function() {
                            isConstructed = true;
                        };

                        this.constructed = function() {
                            return isConstructed;
                        };
                    };
                }

                function MyPostType(MyArg) {

                    var isConstructed = false;

                    this.i_MyProp = null;

                    this.myArg = MyArg;

                    this.postConstruct = function() {
                        isConstructed = true;
                    };

                    this.constructed = function() {
                        return isConstructed;
                    };
                }

                function MyPostSingleton(MyArg) {

                    var counter = 0;

                    this.i_MyProp = null;

                    this.myArg = MyArg;

                    this.postConstruct = function() {
                        counter++;
                    };

                    this.counter = function() {
                        return counter;
                    };
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyArg').toType(MyArg);
                    injector.map('MyProp').toType(MyProp);
                    injector.map('MyPostFactory').toFactory(MyPostFactory).using('MyArg');
                    injector.map('MyPostSingleton').toType(MyPostSingleton).using('MyArg').asSingleton();
                    injector.map('MyPostType').toType(MyPostType).using('MyArg');
                    injector.map('MyPostValue').toValue(MyPostValue);
                });

                it(' should call postConstruct on toType mappings after injecting dependencies', function() {

                    var myPostType = injector.getMappingFor('MyPostType');

                    expect(myPostType.myArg.constructor).toBe(MyArg);
                    expect(myPostType.i_MyProp.constructor).toBe(MyProp);
                    expect(myPostType.constructed()).toBe(true);
                });

                it(' should call postConstruct on toFactory mappings after injecting dependencies', function() {

                    var myPostInstance = injector.getMappingFor('MyPostFactory').make();

                    expect(myPostInstance.myArg.constructor).toBe(MyArg);
                    expect(myPostInstance.i_MyProp.constructor).toBe(MyProp);
                    expect(myPostInstance.constructed()).toBe(true);
                });

                it(' should NOT call postConstruct on toValue mappings', function() {

                    var myPostValue = injector.getMappingFor('MyPostValue');

                    expect(myPostValue.isConstructed).toBe(false);
                });

                it(' should only call postConstruct once for a singleton', function() {

                    var myPostSingleton_1 = injector.getMappingFor('MyPostSingleton'),
                        myPostSingleton_2 = injector.getMappingFor('MyPostSingleton');

                    expect(myPostSingleton_1).toBe(myPostSingleton_2);
                    expect(myPostSingleton_1.counter()).toBe(1);
                    expect(myPostSingleton_2.counter()).toBe(1);
                });
            });




            // Injector.resolve...
            // ------------------------------
            xdescribe(' Injector.resolveFactory()', function() {

                function MyFactory(MyFactoryArg) {
                    return function MyFactoryInstance(MyInstanceArg) {
                        this.i_MyProp = null;
                        this.myFactoryArg = MyFactoryArg;
                        this.myInstanceArg = MyInstanceArg;
                    };
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyFactoryArg').toType(function MyFactoryArg(){});
                    injector.map('MyProp').toValue({name: 'MyProp'});
                });

                it(' should resolve the supplied target as a Factory', function() {

                    var factory = injector.resolveFactory(MyFactory, 'MyFactoryArg'),
                        instance = factory.make('MyInstanceArg');

                    expect(is(factory.make, 'function')).toBe(true);
                    expect(factory.name).toBe('MyFactoryInstance');
                    expect(factory.type).toBe(factory.make().constructor);

                    expect(instance.i_MyProp.name).toBe('MyProp');
                    expect(instance.myFactoryArg.constructor.name).toBe('MyFactoryArg');
                    expect(instance.myInstanceArg).toBe('MyInstanceArg');
                });

                it(' should throw if the target is not a function', function() {

                    expect(function() {
                        injector.resolveFactory('MyFactory');
                    }).toThrow(INVALID_RESOLVE_TARGET);
                });
            });

            xdescribe(' Injector.resolveType()', function() {

                function MyType(MyArg) {
                    this.i_MyProp = null;
                    this.myArg = MyArg;
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyArg').toType(function MyArg(){});
                    injector.map('MyProp').toValue({name: 'MyProp'});
                });

                it(' should resolve the supplied target as a Type', function() {

                    var instance = injector.resolveType(MyType, 'MyArg');

                    expect(instance.constructor).toBe(MyType);
                    expect(instance.i_MyProp.name).toBe('MyProp');
                    expect(instance.myArg.constructor.name).toBe('MyArg');
                });

                it(' should throw if the target is not a function', function() {

                    expect(function() {
                        injector.resolveType('MyType');
                    }).toThrow(INVALID_RESOLVE_TARGET);
                });
            });

            xdescribe(' Injector.resolveValue()', function() {

                var myValue = {
                    i_MyProp: null
                };

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyProp').toValue({name: 'MyProp'});
                });

                it(' should return the identical mapped value', function() {

                    expect(injector.resolveValue(myValue))
                        .toBe(myValue);
                });

                it(' should NOT resolve properties of the target', function() {

                    var instance = injector.resolveValue(myValue);

                    expect(instance.i_MyProp).toBe(null);
                });

                it(' should throw if the target is not an object', function() {

                    expect(function() {
                        injector.resolveValue('myValue');
                    }).toThrow(INVALID_RESOLVE_TARGET);
                });
            });
        });
    }
);
