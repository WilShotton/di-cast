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

                    function test(mapping) {

                        expect(mapping.asSingleton()).toBe(mapping);
                        expect(mapping.using()).toBe(mapping);
                    }

                    var factoryMapping = injector.map('FactoryFluidTest'),
                        typeMapping = injector.map('TypeFluidTest');

                    expect(factoryMapping.toFactory(function(){})).toBe(factoryMapping);
                    test(factoryMapping);

                    expect(typeMapping.toType(function(){})).toBe(typeMapping);
                    test(typeMapping);
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
                    injector.map('MyDependantFactory').toFactory(MyDependantFactory).using('MyFactory');
                });

                it(' should retrieve a factory method for a mapping', function() {

                    var factory = injector.getMappingFor('MyFactory');

                    expect(factory.hasOwnProperty('make')).toBe(true);
                    expect(is(factory.make, 'function')).toBe(true);
                });

                it(' should provide the name of the factory instance type', function() {

                    var factory = injector.getMappingFor('MyFactory');

                    expect(factory.hasOwnProperty('name')).toBe(true);
                    expect(factory.name).toBe('MyFactoryInstance');
                });

                it(' should provide the factory instance type', function() {

                    var factory = injector.getMappingFor('MyFactory');

                    expect(factory.hasOwnProperty('type')).toBe(true);
                    expect(factory.type).toBe(factory.make().constructor);
                });

                it(' should be commutative', function() {

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
                        injector.map('AnotherInvalidFactory').toFactory(null);
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

                function MySingletonType() {
                    this.getName = function() {
                        return 'MySingletonType';
                    };
                }

                function MyDependantType(myType, mySingletonType) {
                    this.myType = myType;
                    this.mySingletonType = mySingletonType;
                    this.getName = function() {
                        return 'MyDependantType > ' + myType.getName();
                    };
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyType').toType(MyType);
                    injector.map('MySingletonType').toType(MySingletonType).asSingleton();
                    injector.map('MyDependantType').toType(MyDependantType).using('MyType', 'MySingletonType');
                });

                it(' should create a typed instance for a mapping', function() {

                    var myType = injector.getMappingFor('MyType');

                    expect(myType instanceof MyType).toBeTruthy();
                    expect(myType.constructor).toBe(MyType);
                    expect(myType.constructor.name).toBe('MyType');
                    expect(myType.hasOwnProperty('getName')).toBe(true);
                    expect(myType.getName()).toBe('MyType');
                });

                it(' should retrieve a typed instance for a singleton mapping', function() {

                    var mySingletonType = injector.getMappingFor('MySingletonType');

                    expect(mySingletonType instanceof MySingletonType).toBeTruthy();
                    expect(mySingletonType.constructor).toBe(MySingletonType);
                    expect(mySingletonType.constructor.name).toBe('MySingletonType');
                    expect(mySingletonType.hasOwnProperty('getName')).toBe(true);
                    expect(mySingletonType.getName()).toBe('MySingletonType');
                });

                it(' should create typed dependencies', function() {

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

                it(' should be commutative', function() {

                    injector.map('MyCommutativeType')
                        .using('MyType')
                        .asSingleton()
                        .toType(MyDependantType);

                    expect(
                        injector.getMappingFor('MyCommutativeType').getName()
                    ).toBe('MyDependantType > MyType');
                });

                it(' should should inject the instance with its dependencies', function() {

                    var instance = injector.getMappingFor('MyDependantType');

                    expect(instance.constructor.name).toBe('MyDependantType');
                    expect(instance.hasOwnProperty('getName')).toBe(true);
                    expect(instance.getName()).toBe('MyDependantType > MyType');
                });

                it(' should take a list of strings as dependencies', function() {

                    injector.map('MyUsingType')
                        .toType(MyDependantType)
                        .using('MyType');

                    expect(injector
                        .getMappingFor('MyUsingType')
                        .getName()
                    ).toBe('MyDependantType > MyType');

                    injector.map('MyMissingType')
                        .toFactory(MyDependantType)
                        .using();

                    expect(function() {
                       injector.getMappingFor('MyMissingType');
                    }).toThrow();
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
                        injector.map('AnotherInvalidType').toType(null);
                    }).toThrow(INVALID_MAPPING_TYPE);
                });
            });

            describe(' toValue mappings', function() {

                function MyInstance() {
                    this.name = 'MyInstance';
                }

                function MyPropertyInstance() {
                    this.i_MyNumber = null;
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyArray').toValue([1, 2, 3]);
                    injector.map('MyBoolean').toValue(true);
                    injector.map('MyInstance').toValue(new MyInstance());
                    injector.map('MyNumber').toValue(42);
                    injector.map('MyObject').toValue({name:'MyObject'});
                    injector.map('MyPropertyInstanceValue').toValue(new MyPropertyInstance());
                    injector.map('MyPropertyInstanceInjected')
                        .toValue(injector.resolveType(MyPropertyInstance));
                    injector.map('MyString').toValue('MyString');
                });

                it(' should map a value to a key', function() {

                    expect(injector.getMappingFor('MyArray').length)
                        .toBe(3);

                    expect(injector.getMappingFor('MyBoolean'))
                        .toBe(true);

                    expect(injector.getMappingFor('MyInstance').name)
                        .toBe('MyInstance');

                    expect(injector.getMappingFor('MyNumber'))
                        .toBe(42);

                    expect(injector.getMappingFor('MyObject').name)
                        .toBe('MyObject');

                    expect(injector.getMappingFor('MyPropertyInstanceValue')
                        .i_MyNumber).toBe(null);

                    expect(injector.getMappingFor('MyPropertyInstanceInjected')
                        .i_MyNumber).toBe(42);

                    expect(injector.getMappingFor('MyString'))
                        .toBe('MyString');
                });

                it(' should NOT resolve arguments of the target value', function() {

                    injector.map('MyArgsValue')
                        .toValue(function MyArgsValue(MyArray){
                            this.myArray = MyArray;
                        })
                        .using('MyArray');

                    expect(injector.getMappingFor('MyArgsValue').myArray).toBe(undefined);
                });

                it(' should NOT resolve properties of the target value', function() {

                    expect(injector.getMappingFor('MyPropertyInstanceValue').i_MyNumber).toBe(null);
                });

                it(' should map values as singletons', function() {

                    expect(injector.getMappingFor('MyArray'))
                        .toBe(injector.getMappingFor('MyArray'));

                    expect(injector.getMappingFor('MyBoolean'))
                        .toBe(injector.getMappingFor('MyBoolean'));

                    expect(injector.getMappingFor('MyInstance'))
                        .toBe(injector.getMappingFor('MyInstance'));

                    expect(injector.getMappingFor('MyNumber'))
                        .toBe(injector.getMappingFor('MyNumber'));

                    expect(injector.getMappingFor('MyObject'))
                        .toBe(injector.getMappingFor('MyObject'));

                    expect(injector.getMappingFor('MyPropertyInstanceValue'))
                        .toBe(injector.getMappingFor('MyPropertyInstanceValue'));

                    expect(injector.getMappingFor('MyPropertyInstanceInjected'))
                        .toBe(injector.getMappingFor('MyPropertyInstanceInjected'));

                    expect(injector.getMappingFor('MyString'))
                        .toBe(injector.getMappingFor('MyString'));
                });
            });

            // ------------------------------
            describe('injecting properties', function() {

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

            // Injector.unMap()
            // ------------------------------
            describe(' Injector.unMap()', function() {

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

            describe(' postConstruct', function() {

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

            // Mapping.using()
            // ------------------------------
            describe(' Mapping.using()', function() {

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('DepA').toType(function DepA(){});
                    injector.map('DepB').toType(function DepB(){});
                });

                it(' should do nothing if the arguments length is 0', function() {

                    expect(function() {
                        injector.map('MyA').toType(function MyA(){}).using();
                        injector.getMappingFor('MyA');
                    }).not.toThrow();

                    injector.map('MyB').toType(function MyA(DepA){
                        this.depA = DepA;
                    }).using();

                    expect(injector.getMappingFor('MyB').depA).toBe(undefined);
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

                it(' should accept a list of strings as arguments and set them as dependencies', function() {

                    expect(function() {
                        injector.map('MyA').toType(function MyA(DepA, DepB){
                            this.depA = DepA;
                            this.depB = DepB;
                        }).using('DepA', 'DepB');
                        injector.getMappingFor('MyA');
                    }).not.toThrow();
                });

                it(' should accept an array as the first argument and set that as dependencies', function() {

                    expect(function() {
                        injector.map('MyA').toType(function MyA(DepA, DepB){
                            this.depA = DepA;
                            this.depB = DepB;
                        }).using(['DepA', 'DepB']);
                        injector.getMappingFor('MyA');
                    }).not.toThrow();
                });
            });


            // Injector.resolve...
            // ------------------------------
            describe(' Injector.resolveFactory()', function() {

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

            describe(' Injector.resolveType()', function() {

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

            describe(' Injector.resolveValue()', function() {

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
