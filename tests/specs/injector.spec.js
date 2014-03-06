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

        var INVALID_TARGET = 'The target must be an Object or Function',
            INCORRECT_METHOD_SIGNATURE = 'Incorrect method signature supplied',
            INVALID_KEY_TYPE = 'The key must be a String',

            MISSING_TARGET = 'The target must be specified',
            MAPPING_EXISTS = 'A mapping already exists',
            NO_MAPPING = 'No mapping found',
            MAPPING_HAS_DEPENDANTS = 'The mapping has dependants',
            INTERFACE_MEMBER_MISSING = 'The mapping is missing a required member',
            INTERFACE_METHOD_ARITY_MISMATCH = 'The mapping has an interface method with an incorrect arity';

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
            xdescribe('map', function() {

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyMapping').toType({target: function() {}});
                });

                it(' should index a successful mapping to a key', function() {

                    expect(injector.has('MyMapping')).toBe(true);
                });

                it(' should not index an incomplete / unsuccessful mapping', function() {

                    injector.map('MyMissingMapping');

                    expect(injector.has('MyMissingMapping')).toBe(false);
                });

                it(' should return mapping options', function() {

                    var mapping = injector.map('Map'),
                        keys = ['toType', 'toValue']; //'toFactory',

                    keys.forEach(function(key) {
                        expect(is(mapping[key], 'Function')).toBe(true);
                    });
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

            // has()
            xdescribe('has', function() {

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyMapping').toType({target: function() {}});
                });

                it(' should return true for a mapping', function() {

                    expect(injector.has('MyMapping')).toBe(true);
                });

                it(' should return false for a missing mapping', function() {

                    expect(injector.has('MissingMapping')).toBe(false);
                });

                it(' should throw if the key is not a string', function() {

                    expect(function() {
                        injector.has({});
                    }).toThrow(INVALID_KEY_TYPE);
                });
            });

            // get()
            xdescribe('get', function() {

                it(' should have a mapping for the injector', function() {

                    injector = new Injector();

                    expect(injector.get('injector')).toBe(injector);
                });

                it(' should retrieve a mapping for a key', function() {

                    function MyType() {}

                    injector = new Injector();
                    injector.map('MyType').toType({target: MyType});

                    expect(injector.get('MyType').constructor).toBe(MyType);
                });

                it(' should throw if the key is not a string', function() {

                    expect(function() {
                        injector.get({});
                    }).toThrow(INVALID_KEY_TYPE);
                });

                it(' should throw if no mapping exists', function() {

                    expect(function() {
                        injector.get('NoMapping');
                    }).toThrow(NO_MAPPING);
                });
            });

            // remove()
            xdescribe('remove()', function() {

                var myValue = {};

                function MyFactory() {
                    return function MyFactoryInstance() {};
                }

                function MyType() {}

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyFactory').toFactory({target: MyFactory});
                    injector.map('MyType').toType({target: MyType});
                    injector.map('MyValue').toValue({target: myValue});
                });

                it(' should remove the mapping', function() {

                    injector.remove('MyFactory');
                    injector.remove('MyType');
                    injector.remove('MyValue');

                    expect(injector.has('MyFactory')).toBe(false);
                    expect(injector.has('MyType')).toBe(false);
                    expect(injector.has('MyValue')).toBe(false);
                });

                it(' should throw if a mapping depends on the mapping to be removed', function() {

                    injector.map('MyDependantArgs').toType({
                        target: function(MyType) {},
                        using: ['MyType']
                    });

                    injector.map('MyDependantProps').toType({
                        target: function() {
                            this.MyValue = '{I}';
                        }
                    });

                    expect(function() {
                        injector.remove('MyType');
                    }).toThrow(MAPPING_HAS_DEPENDANTS);

                    expect(function() {
                        injector.remove('MyValue');
                    }).toThrow(MAPPING_HAS_DEPENDANTS);
                });

                it(' should return the mapping target value', function() {

                    expect(injector.remove('MyFactory')).toBe(MyFactory);
                    expect(injector.remove('MyType')).toBe(MyType);
                    expect(injector.remove('MyValue')).toBe(myValue);
                });

                it(' should return null for a non existant key', function() {

                    expect(injector.remove('MyMissing')).toBe(null);
                });
            });

            // Mapping methods
            // ------------------------------

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

                    injector.map('MyFactory').toFactory({
                        target: MyFactory
                    });
                });

                it(' should allow multiple mappings of the same factory with different keys', function() {

                    /**
                     * NOTE: Not sure why you'd want to do this.
                     * It is really just a proof of concept and demonstrates some
                     * possibly unexpected behaviour regarding identity.
                     */

                    expect(function() {
                        injector.map('MyFactory1').toFactory({target: MyFactory});
                        injector.map('MyFactory2').toFactory({target: MyFactory});
                    }).not.toThrow();

                    var f1 = injector.get('MyFactory1'),
                        f2 = injector.get('MyFactory2');

                    expect(f1).not.toBe(f2);

                    // Although the Constructor 'looks' the same...
                    expect(f1.make().constructor.name).toBe(f2.make().constructor.name);
                    expect(f1.make().constructor.toString()).toEqual(f2.make().constructor.toString());

                    // ...it's not.
                    expect(f1.make().constructor).not.toEqual(f2.make().constructor);
                });

                it(' should return a reference to the injector', function() {

                    expect(injector.map('MyFactory1').toFactory({
                        target: MyFactory
                    })).toBe(injector);
                });

                it(' should throw if no config object is provided', function() {

                    expect(function() {
                        injector.map('MyFactory1').toFactory();
                    }).toThrow(INCORRECT_METHOD_SIGNATURE);
                });

                it(' should throw if the config does not have a target property', function() {

                    expect(function() {
                        injector.map('MyFactory1').toFactory({});
                    }).toThrow(INVALID_TARGET);
                });

                it(' should throw if config.target is not a function', function() {

                    expect(function() {
                        injector.map('MyFactory1').toFactory({
                            target: {}
                        });
                    }).toThrow(INVALID_TARGET);
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

                    injector.map('MyFactory').toFactory({
                        target: MyFactory
                    });
                });

                // @TODO. look at reinstating make() as a singleton for performance reasons...
                xit(' should be a singleton', function() {

                    expect(injector.get('MyFactory')).toBe(injector.get('MyFactory'));
                });

                it(' should have lazy instantiation', function() {

                    function MyMissingFactory() {
                        return function MyFactoryInstance() {
                            this.MyMissingProp = '{I}';
                        };
                    }

                    injector.map('MyMissingFactory').toFactory({
                        target: MyMissingFactory
                    });

                    var myMissingFactory = null;

                    expect(function() {
                        myMissingFactory = injector.get('MyMissingFactory');
                    }).not.toThrow();

                    expect(function() {
                        myMissingFactory.make();
                    }).toThrow(NO_MAPPING);
                });

                it(' should create an Object with a make() function', function() {

                    var factory = injector.get('MyFactory');

                    expect(is(factory, 'Object')).toBe(true);
                    expect(factory.hasOwnProperty('make')).toBe(true);
                });

                it(' should create an instance when its factory method is called', function() {

                    var instance = injector.get('MyFactory').make();

                    expect(instance.constructor.name).toBe('MyFactoryInstance');
                });

                it(' should supply arguments as instance constructor arguments', function() {

                    var instance = injector.get('MyFactory').make('foo');

                    expect(instance.myArg).toBe('foo');
                });
            });

            describe('toFactory instances', function() {

                beforeEach(function() {

                    injector = new Injector();
                });

                it(' should create unique scopes for factory instances', function() {

                    injector.map('MyType').toType({
                       target: function() {
                           this.name = 'original';
                       }
                    });

                    injector.map('MyFactory').toFactory({
                       target: function(MyType) {
                           return function MyInstance() {
                               this.get = function() {
                                   return MyType;
                               };
                           }
                       },
                       using: ['MyType']
                    });

                    var f1 = injector.get('MyFactory'),
                        f2 = injector.get('MyFactory');

                    var f1i1 = f1.make(),
                        f1i2 = f1.make(),

                        f2i1 = f2.make();

                    expect(f1).not.toBe(f2);

                    expect(f1.make().constructor).toBe(f1.make().constructor);

                    expect(f1.make().constructor.name).toBe(f1.make().constructor.name);

                    expect(f1i1.get()).not.toBe(f1i2.get());
                    expect(f1i1.get()).not.toBe(f2i1.get());

                    //i1.get().name = 'changed';
                    //expect(i1.get().name).toBe('changed');
                    //expect(i2.get().name).toBe('original');
                });
            });

            // toType
            xdescribe('toType', function() {

                function MyType() {}

                var config = {
                    target: MyType
                };

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyType').toType(config);
                });

                it(' should return a reference to the injector', function() {

                    expect(injector.map('MyType1').toType(config)).toBe(injector);
                });

                it(' should allow multiple mappings of the same function with different keys', function() {

                    expect(function() {
                        injector.map('MyType1').toType(config);
                        injector.map('MyType2').toType(config);
                    }).not.toThrow();

                    expect(injector.get('MyType1').constructor)
                        .toBe(injector.get('MyType2').constructor);
                });

                it(' should throw if no config object is provided', function() {

                    expect(function() {
                        injector.map('MyType1').toType();
                    }).toThrow(INCORRECT_METHOD_SIGNATURE);
                });

                it(' should should throw if the config does not have a target property', function() {

                    expect(function() {
                        injector.map('MyType1').toType({});
                    }).toThrow(INVALID_TARGET);
                });

                it(' should throw if config.target is not a function', function() {

                    expect(function() {
                        injector.map('MyType1').toType({
                            target: {}
                        });
                    }).toThrow(INVALID_TARGET);
                });
            });

            // toValue
            xdescribe('toValue', function() {

                var myArray = [1, 2, 3],
                    myBoolean = true,
                    myNumber = 42,
                    myObject = {name:'MyObject'},
                    myString = 'MyString',

                    myPropertyObject = {MyNumber: '{I}'};

                function MyFunction() {}

                function MyInstance() {
                    this.name = 'MyInstance';
                }

                function MyPropertyFunction() {
                    this.MyNumber = '{I}';
                }

                function MyPrototypeFunction() {}
                MyPrototypeFunction.prototype = {
                    MyNumber: '{I}'
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
                    injector.map('MyArray').toValue({target: myArray});
                    injector.map('MyBoolean').toValue({target: myBoolean});
                    injector.map('MyFunction').toValue({target: MyFunction});
                    injector.map('MyInstance').toValue({target: new MyInstance()});
                    injector.map('MyNumber').toValue({target: myNumber});
                    injector.map('MyObject').toValue({target: myObject});
                    injector.map('MyString').toValue({target: myString});

                    injector.map('MyPropertyFunction').toValue({target: MyPropertyFunction});
                    injector.map('MyPropertyInstance').toValue({target: new MyPropertyFunction()});
                    injector.map('MyPropertyObject').toValue({target: myPropertyObject});

                    injector.map('MyPrototypeInstance').toValue({target: new MyPropertyFunction()});

                    injector.map('MyBorrowedInstance').toValue({target: new MyBorrowedFunction()});
                    injector.map('MyInheritedInstance').toValue({target: new MyInheritedFunction()});
                });

                it(' should return a reference to the injector', function() {

                    expect(injector.map('MyValue1').toValue({
                        target: {}
                    })).toBe(injector);
                });

                it(' should map a value to a key', function() {

                    expect(injector.get('MyArray'))
                        .toBe(myArray);

                    expect(injector.get('MyBoolean'))
                        .toBe(myBoolean);

                    expect(injector.get('MyFunction'))
                        .toBe(MyFunction);

                    expect(injector.get('MyInstance').constructor)
                        .toBe(MyInstance);

                    expect(injector.get('MyNumber'))
                        .toBe(myNumber);

                    expect(injector.get('MyObject'))
                        .toBe(myObject);

                    expect(injector.get('MyString'))
                        .toBe(myString);
                });

                it(' should map values as singletons', function() {

                    expect(injector.get('MyArray'))
                        .toBe(injector.get('MyArray'));

                    expect(injector.get('MyBoolean'))
                        .toBe(injector.get('MyBoolean'));

                    expect(injector.get('MyFunction'))
                        .toBe(injector.get('MyFunction'));

                    expect(injector.get('MyInstance'))
                        .toBe(injector.get('MyInstance'));

                    expect(injector.get('MyNumber'))
                        .toBe(injector.get('MyNumber'));

                    expect(injector.get('MyObject'))
                        .toBe(injector.get('MyObject'));

                    expect(injector.get('MyString'))
                        .toBe(injector.get('MyString'));
                });

                it(' should allow multiple mappings of the same value with different keys', function() {

                    function MyValue() {}

                    expect(function() {
                        injector.map('MyValue1').toValue({target: MyValue});
                        injector.map('MyValue2').toValue({target: MyValue});
                    }).not.toThrow();

                    expect(injector.get('MyValue1'))
                        .toBe(injector.get('MyValue2'));
                });

                it(' should resolve properties of target Objects', function() {

                    expect(injector.get('MyPropertyInstance').MyNumber).toBe(42);
                    expect(injector.get('MyPropertyObject').MyNumber).toBe(42);
                });

                it(' should resolve prototypical properties of target Objects', function() {

                    expect(injector.get('MyPrototypeInstance').MyNumber).toBe(42);
                });

                it(' should resolve inherited properties of target Objects', function() {

                    expect(injector.get('MyBorrowedInstance').MyNumber).toBe(42);
                    expect(injector.get('MyInheritedInstance').MyNumber).toBe(42);
                });

                it(' should throw if no config object is provided', function() {

                    expect(function() {
                        injector.map('MyType1').toValue();
                    }).toThrow(INCORRECT_METHOD_SIGNATURE);
                });

                it(' should should throw if the config does not have a target property', function() {

                    expect(function() {
                        injector.map('MyType1').toValue({});
                    }).toThrow(MISSING_TARGET);
                });
            });

            xdescribe('isSingleton', function() {

                function MyType() {}

                function MySingleton() {}

                beforeEach(function() {

                    injector = new Injector();

                    injector.map('MyType').toType({
                        target: MyType
                    });

                    injector.map('MySingleton').toType({
                        target: MySingleton,
                        isSingleton: true
                    });
                });

                it(' should retrieve a typed instance for a singleton mapping', function() {

                    expect(injector.get('MySingleton').constructor)
                        .toBe(MySingleton);
                });

                it(' should be a singleton', function() {

                    expect(injector.get('MySingleton'))
                        .toBe(injector.get('MySingleton'));
                });

                it(' should NOT map types as singletons by default', function() {

                    expect(injector.get('MyType'))
                        .not.toBe(injector.get('MyType'));
                });
            });

            xdescribe('using', function() {

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

                    injector.map('MyType').toType({
                        target: MyType
                    });

                    injector.map('MySingletonType').toType({
                        target: MySingletonType,
                        isSingleton: true
                    });
                });

                it(' should do nothing if the arguments length is 0', function() {

                    expect(function() {
                        injector.map('MyA').toType({
                            target: function MyA(DepA) {
                                this.depA = DepA;
                            },
                            using: []
                        });
                    }).not.toThrow();

                    expect(injector.get('MyA').depA).toBe(undefined);
                });

                it(' should do nothing if the first argument is null', function() {

                    expect(function() {
                        injector.map('MyA').toType({
                            target: function MyA(DepA){
                                this.depA = DepA;
                            },
                            using: null
                        });
                        injector.get('MyA');
                    }).not.toThrow();

                    expect(injector.get('MyA').depA).toBe(undefined);
                });

                it(' should do nothing if the first argument is undefined', function() {

                    expect(function() {
                        injector.map('MyA').toType({
                            target: function MyA(DepA){
                                this.depA = DepA;
                            },
                            using: undefined
                        });
                        injector.get('MyA');
                    }).not.toThrow();

                    expect(injector.get('MyA').depA).toBe(undefined);
                });

                it(' should accept an array as dependencies', function() {

                    injector.map('MyUsingType').toType({
                        target: MyUsingType,
                        using: ['MyType', 'MySingletonType']
                    });

                    expect(injector.get('MyUsingType').myType.constructor)
                        .toBe(MyType);

                    expect(injector.get('MyUsingType').mySingletonType.constructor)
                        .toBe(MySingletonType);
                });
            });

            xdescribe('as - duck typing', function() {

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

                    injector.map('MyFactory').toFactory({
                        target: MyFactory,
                        api: IMyInterface
                    });

                    injector.map('MyType').toType({
                        target: MyType,
                        api: IMyInterface
                    });

                    injector.map('MyValue').toValue({
                        target: MyValue,
                        api: IMyInterface
                    });
                });

                it(' should ensure a defined public API for a toFactory mapping instance', function() {

                    var instance = null;

                    expect(function() {
                        instance = injector.get('MyFactory').make();
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
                        instance = injector.get('MyType');
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
                        target = injector.get('MyValue');
                    }).not.toThrow();

                    expect(target.myMethod).toBeDefined();
                    expect(target.myMethod.length).toBe(1);

                    expect(target.myPrototypeMethod).toBeDefined();
                    expect(target.myPrototypeMethod.length).toBe(1);

                    expect(target.myProperty).toBeDefined();
                    expect(target.myPrototypeProperty).toBeDefined();
                });

                it(' should NOT mutate the interface', function() {

                    injector.get('MyFactory');
                    expect(IMyInterface.length).toBe(4);

                    injector.get('MyType');
                    expect(IMyInterface.length).toBe(4);

                    injector.get('MyValue');
                    expect(IMyInterface.length).toBe(4);
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

                        injector.map('MyCorrect').toType({
                            target: MyCorrect,
                            api: IMemberTest
                        });

                        injector.map('MyMissing').toType({
                            target: MyMissing,
                            api: IMemberTest
                        });

                    }).not.toThrow();

                    expect(function() {
                        injector.get('MyMissing');
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

                        injector.map('MyCorrect').toType({
                            target: MyCorrect,
                            api: IArityTest
                        });

                        injector.map('MyMissing').toType({
                            target: MyMissing,
                            api: IArityTest
                        });

                    }).not.toThrow();

                    expect(function() {
                        injector.get('MyCorrect');
                    }).not.toThrow();

                    expect(function() {
                        injector.get('MyMissing');
                    }).toThrow(INTERFACE_METHOD_ARITY_MISMATCH);
                });
            });


            // Injection
            // ------------------------------

            // Constructor
            xdescribe('constructor injection', function() {

                function MyFactory() {
                    return function MyFactoryInstance() {};
                }

                function MyType() {}

                function MyValue() {}

                function MySingletonType() {}

                function MyDependantFactory(myFactory, myType, mySingletonType, myValue) {
                    return function MyDependantFactoryInstance() {
                        this.myFactory = myFactory;
                        this.myType = myType;
                        this.mySingletonType = mySingletonType;
                        this.myValue = myValue;
                    };
                }

                function MyDependantType(myFactory, myType, mySingletonType, myValue) {
                    this.myFactory = myFactory;
                    this.myType = myType;
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

                    injector.map('MyFactory').toFactory({
                        target: MyFactory
                    });

                    injector.map('MyDependantFactory').toFactory({
                        target: MyDependantFactory,
                        using: ['MyFactory', 'MyType', 'MySingletonType', 'MyValue']
                    });

                    injector.map('MyNestedDependantFactory').toFactory({
                        target: MyNestedDependantFactory,
                        using: ['MyDependantFactory', 'MyDependantType']
                    });

                    injector.map('MyType').toType({
                        target: MyType
                    });

                    injector.map('MySingletonType').toType({
                        target: MySingletonType,
                        isSingleton: true
                    });

                    injector.map('MyDependantType').toType({
                        target: MyDependantType,
                        using: ['MyFactory', 'MyType', 'MySingletonType', 'MyValue']
                    });

                    injector.map('MyNestedDependantType').toType({
                        target: MyNestedDependantType,
                        using: ['MyDependantFactory', 'MyDependantType']
                    });

                    injector.map('MyValue').toValue({
                        target: new MyValue()
                    });
                });

                // @TODO: Should throw an Error for an arity / dependency length mismatch
                it(' should throw for an arity / dependency length mismatch', function() {

                });

                it(' should map on dependencies by index, not name', function() {

                    function DepA(Foo) {
                        this.foo = Foo;
                    }

                    function DepB(Bar) {
                        this.bar = Bar;
                    }

                    injector.map('DepA').toType({
                        target: DepA,
                        using: ['MyType']
                    });

                    injector.map('DepB').toType({
                        target: DepB,
                        using: ['MyType']
                    });

                    expect(injector.get('DepA').foo.constructor)
                        .toBe(injector.get('DepB').bar.constructor);
                });

                it(' should inject a factory constructor with dependencies specified in using()', function() {

                    var instance = injector.get('MyDependantFactory').make();

                    expect(instance.constructor.name).toBe('MyDependantFactoryInstance');
                    expect(instance.myFactory.make().constructor.name).toBe('MyFactoryInstance');
                    expect(instance.myType.constructor.name).toBe('MyType');
                    expect(instance.mySingletonType.constructor.name).toBe('MySingletonType');
                    expect(instance.myValue.constructor.name).toBe('MyValue');

                    instance = injector.get('MyNestedDependantFactory').make();

                    expect(instance.constructor.name).toBe('MyNestedDependantFactoryInstance');
                    expect(instance.myFactory.make().constructor.name).toBe('MyDependantFactoryInstance');
                    expect(instance.myType.constructor.name).toBe('MyDependantType');
                });

                it(' should inject a type constructor with dependencies specified in using()', function() {

                    var instance = injector.get('MyDependantType');

                    expect(instance.constructor).toBe(MyDependantType);
                    expect(instance.myFactory.make().constructor.name).toBe('MyFactoryInstance');
                    expect(instance.myType.constructor.name).toBe('MyType');
                    expect(instance.mySingletonType.constructor.name).toBe('MySingletonType');
                    expect(instance.myValue.constructor.name).toBe('MyValue');

                    instance = injector.get('MyNestedDependantType');

                    expect(instance.constructor).toBe(MyNestedDependantType);
                    expect(instance.myFactory.make().constructor.name).toBe('MyDependantFactoryInstance');
                    expect(instance.myType.constructor.name).toBe('MyDependantType');
                });
            });

            // Property injection
            xdescribe('property injection', function() {

                var myPropValue = 'MyProp';

                beforeEach(function() {

                    injector = new Injector();

                    injector.map('MyProp').toValue({
                        target: myPropValue
                    });
                });

                it(' should inject properties set to the injector token', function() {

                    function MyFactory() {
                        return function MyFactoryInstance() {
                            this.MyProp = '{I}';
                        };
                    }

                    function MyType() {
                        this.MyProp = '{I}';
                    }

                    injector.map('MyFactory').toFactory({
                        target: MyFactory
                    });

                    injector.map('MyType').toType({
                        target: MyType
                    });

                    function test(instance) {

                        expect(instance.MyProp).toEqual(myPropValue);
                    }

                    test(injector.get('MyFactory').make());
                    test(injector.get('MyType'));
                });

                it(' should inject prototype properties set to the injector token', function() {

                    function MyFactory() {
                        function MyFactoryInstance() {}
                        MyFactoryInstance.prototype = {
                            MyProp: '{I}'
                        };
                        MyFactoryInstance.prototype.constructor = MyFactoryInstance;
                        return MyFactoryInstance;
                    }

                    function MyType() {}
                    MyType.prototype = {
                        MyProp: '{I}'
                    };
                    MyType.prototype.constructor = MyType;

                    injector.map('MyFactory').toFactory({
                        target: MyFactory
                    });

                    injector.map('MyType').toType({
                        target: MyType
                    });

                    function test(instance) {

                        expect(instance.MyProp).toEqual(myPropValue);
                    }

                    test(injector.get('MyFactory').make());
                    test(injector.get('MyType'));
                });

                it(' should inject inherited properties set to {I}', function() {

                    function MyRoot() {}
                    MyRoot.prototype = {
                        MyProp: '{I}'
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

                    injector.map('MyRoot').toType({
                        target: MyRoot
                    });

                    injector.map('MyInstantiatedPrototype_Factory').toFactory({
                        target: MyInstantiatedPrototype_Factory
                    });

                    injector.map('MyBorrowedPrototype_Factory').toFactory({
                        target: MyBorrowedPrototype_Factory
                    });

                    injector.map('MyInstantiatedPrototype_Type').toType({
                        target: MyInstantiatedPrototype_Type
                    });

                    injector.map('MyBorrowedPrototype_Type').toType({
                        target: MyBorrowedPrototype_Type
                    });

                    function test(instance) {

                        expect(instance.MyProp).toEqual(myPropValue);

                        // Control to ensure the prototype is NOT being mutated
                        expect(new MyRoot().MyProp).toBe('{I}');
                    }

                    test(injector.get('MyInstantiatedPrototype_Factory').make());
                    test(injector.get('MyBorrowedPrototype_Factory').make());

                    test(injector.get('MyInstantiatedPrototype_Type'));
                    test(injector.get('MyBorrowedPrototype_Type'));
                });

                it(' should ONLY inject properties set to {I}', function() {

                    function Props() {

                        this.MyArray = [1, 2, 3];
                        this.MyArray_Empty = [];

                        this.MyBoolean_False = false;
                        this.MyBoolean_True = true;

                        this.MyFunction = function MyFunction() {};

                        this.MyNumber = 42;
                        this.MyNumber_Zero = 0;

                        this.MyObject = {foo:'bar'};
                        this.MyObject_Empty = {};

                        this.MyString = 'Hello World';
                        this.MyString_Empty = '';
                    }

                    injector.map('MyArray').toValue({
                        target: [10, 11, 12]
                    });

                    injector.map('MyArray_Empty').toValue({
                        target: ['empty']
                    });

                    injector.map('MyBoolean_False').toValue({
                        target: true
                    });

                    injector.map('MyBoolean_True').toValue({
                        target: false
                    });

                    injector.map('MyFunction').toValue({
                        target: function() {}
                    });

                    injector.map('MyNumber').toValue({
                        target: 180
                    });
                    injector.map('MyNumber_Zero').toValue({
                        target: 100
                    });

                    injector.map('MyObject').toValue({
                        target: {foo:'OOPS'}
                    });

                    injector.map('MyObject_Empty').toValue({
                        target: {foo:'Not empty'}
                    });

                    injector.map('MyString').toValue({
                        target: 'Goodbye'
                    });

                    injector.map('MyString_Empty').toValue({
                        target: 'Not empty'
                    });

                    injector.map('Props').toType({
                        target: Props
                    });

                    var props = injector.get('Props');

                    expect(props.MyArray).toEqual([1, 2, 3]);
                    expect(props.MyArray_Empty).toEqual([]);

                    expect(props.MyBoolean_False).toEqual(false);
                    expect(props.MyBoolean_True).toEqual(true);

                    expect(new props.MyFunction().constructor.name).toEqual('MyFunction');

                    expect(props.MyNumber).toEqual(42);
                    expect(props.MyNumber_Zero).toEqual(0);

                    expect(props.MyObject.foo).toEqual('bar');
                    expect(props.MyObject_Empty).toEqual({});

                    expect(props.MyString).toEqual('Hello World');
                    expect(props.MyString_Empty).toEqual('');
                });

                it(' should throw if a mapping cannot be found', function() {

                    function MyType() {
                        this.MyString = '{I}';
                    }

                    function MyFactory() {
                        return function MyMissingFactoryInstance() {
                            this.MyString = '{I}';
                        };
                    }

                    injector.map('MyType').toType({
                        target: MyType
                    });

                    injector.map('MyFactory').toFactory({
                        target: MyFactory
                    });

                    expect(function() {
                        injector.get('MyType');
                    }).toThrow(NO_MAPPING);

                    expect(function() {
                        injector.get('MyFactory').make();
                    }).toThrow(NO_MAPPING);
                });
            });

            // Combined
            xdescribe('combined injection', function() {

                beforeEach(function() {

                    injector = new Injector();
                });

                it(' should inject constructor and property mappings', function() {

                    function MyType(myConstructor) {
                        this.myConstructor = myConstructor;
                        this.MyProperty = '{I}';
                    }
                    MyType.prototype = {
                        MyPrototypeProperty: '{I}'
                    };
                    MyType.prototype.constructor = MyType;

                    function MyFactory(myConstructor) {

                        function MyFactoryInstance() {
                            this.myConstructor = myConstructor;
                            this.MyProperty = '{I}';
                        }
                        MyFactoryInstance.prototype = {
                            MyPrototypeProperty: '{I}'
                        };
                        MyFactoryInstance.prototype.constructor = MyFactoryInstance;

                        return MyFactoryInstance;
                    }

                    injector.map('MyConstructor').toValue({
                        target: 'MyConstructor'
                    });

                    injector.map('MyProperty').toValue({
                        target: 'MyProperty'
                    });

                    injector.map('MyPrototypeProperty').toValue({
                        target: 'MyPrototypeProperty'
                    });

                    injector.map('MyType').toType({
                        target: MyType,
                        using: ['MyConstructor']
                    });

                    injector.map('MyFactory').toFactory({
                        target: MyFactory,
                        using: ['MyConstructor']
                    });

                    function test(instance) {

                        expect(instance.myConstructor).toEqual('MyConstructor');
                        expect(instance.MyProperty).toEqual('MyProperty');
                        expect(instance.MyPrototypeProperty).toEqual('MyPrototypeProperty');
                    }

                    test(injector.get('MyType'));
                    test(injector.get('MyFactory').make());
                });
            });


            // postConstruct()
            // ------------------------------
            xdescribe('postConstruct', function() {

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
                    this.injector = null;
                    this.isConstructed = false;
                    this.postConstruct = function(injector) {
                        this.injector = injector;
                        this.isConstructed = true;
                    };
                }

                beforeEach(function() {

                    injector = new Injector();

                    injector.map('MyFactory').toFactory({
                        target: MyFactory
                    });

                    injector.map('MySingleton').toType({
                        target: MySingleton,
                        isSingleton: true
                    });

                    injector.map('MyType').toType({
                        target: MyType
                    });

                    injector.map('MyValue').toValue({
                        target: MyValue
                    });
                });

                it(' should call postConstruct on toFactory mappings after injecting dependencies', function() {

                    expect(injector.get('MyFactory').make().isConstructed).toBe(true);
                });

                it(' should pass the injector as an argument', function() {

                    expect(injector.get('MyType').injector).toBe(injector);
                });

                it(' should call postConstruct on toType mappings after injecting dependencies', function() {

                    expect(injector.get('MyType').isConstructed).toBe(true);
                });

                it(' should only call postConstruct once for a singleton', function() {

                    var mySingleton_1 = injector.get('MySingleton'),
                        mySingleton_2 = injector.get('MySingleton');

                    expect(mySingleton_1).toBe(mySingleton_2);
                    expect(mySingleton_1.counter).toBe(1);
                    expect(mySingleton_2.counter).toBe(1);
                });

                it(' should NOT call postConstruct on toValue mappings', function() {

                    expect(injector.get('MyValue').isConstructed).toBe(false);
                });
            });


            // Injector.resolve methods
            // ------------------------------
            describe('resolveFactory()', function() {

                function MyFactory(myFactoryArg) {
                    return function MyFactoryInstance(myInstanceArg) {
                        this.MyProp = '{I}';
                        this.myFactoryArg = myFactoryArg;
                        this.myInstanceArg = myInstanceArg;
                    };
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyFactoryArg').toValue({target: 'MyFactoryArg'});
                    injector.map('MyProp').toValue({target: 'MyProp'});
                });

                it(' should resolve the supplied target as a Factory', function() {

                    var factory = injector.resolveFactory(MyFactory, 'MyFactoryArg'),
                        instance = factory.make('MyInstanceArg');

                    expect(is(factory.make, 'function')).toBe(true);

                    expect(instance.constructor.name).toBe('MyFactoryInstance');

                    expect(instance.MyProp).toBe('MyProp');
                    expect(instance.myFactoryArg).toBe('MyFactoryArg');
                    expect(instance.myInstanceArg).toBe('MyInstanceArg');
                });

                it(' should ONLY throw when calling make()', function() {

                    function MyArgFactory(myMissingArg) {
                        return function MyArgFactoryInstance() {};
                    }

                    function MyPropFactory() {
                        return function MyPropFactoryInstance() {
                            this.MyMissingProp = '{I}';
                        };
                    }

                    expect(function() {
                        injector.resolveFactory(MyArgFactory, 'MyMissingArg');
                    }).not.toThrow();

                    expect(function() {
                        injector.resolveFactory(MyArgFactory, 'MyMissingArg').make();
                    }).toThrow(NO_MAPPING);

                    expect(function() {
                        injector.resolveFactory(MyPropFactory);
                    }).not.toThrow();

                    expect(function() {
                        injector.resolveFactory(MyPropFactory).make();
                    }).toThrow(NO_MAPPING);
                });

                it(' should throw if a constructor dependency cannot be resolved', function() {

                    function MyFactory(myMissingArg) {
                        return function MyFactoryInstance() {};
                    }

                    expect(function() {
                        injector.resolveFactory(MyFactory, 'MyMissingArg').make();
                    }).toThrow(NO_MAPPING);
                });

                it(' should throw if a property dependency cannot be resolved', function() {

                    function MyFactory() {
                        return function MyFactoryInstance() {
                            this.MyMissingProp = '{I}';
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

            xdescribe('resolveType()', function() {

                function MyType(MyArg) {
                    this.MyProp = '{I}';
                    this.myArg = MyArg;
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyArg').toValue({target: 'MyArg'});
                    injector.map('MyProp').toValue({target: 'MyProp'});
                });

                it(' should resolve the supplied target as a Type', function() {

                    var instance = injector.resolveType(MyType, 'MyArg');

                    expect(instance.constructor).toBe(MyType);
                    expect(instance.MyProp).toBe('MyProp');
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
                        this.MyMissingProp = '{I}';
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

            xdescribe('resolveValue()', function() {

                var myValue = {
                    MyProp: '{I}'
                };

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyProp').toValue({target: 'MyProp'});
                });

                it(' should resolve properties of the target', function() {

                    expect(injector.resolveValue(myValue).MyProp).toBe('MyProp');
                });

                it(' should throw if the target is not an object', function() {

                    expect(function() {
                        injector.resolveValue('myValue');
                    }).toThrow(INVALID_TARGET);
                });
            });


            // Creating a factory with toValue
            // ------------------------------
            describe('Creating a factory', function() {

                beforeEach(function() {

                    injector = new Injector();

                    injector.map('MyDep').toType({
                        target: function MyDep() {
                            this.msg = 'Hello';
                        }
                    });

                    injector.map('prop').toValue({
                        target: 'PROP'
                    });
                });

                it(' should BLAH', function() {

                    injector.map('MyFactory').toType({

                        target: function(myDep) {

                            return function MyInstance(myArg) {

                                this.arg = myArg;
                                this.dep = myDep;
                                this.prop = '{I}';
                            }
                        },
                        using: ['MyDep']
                    });

                    var F1 = injector.get('MyFactory'),

                        F1i1 = new F1('BLAH'),
                        F1i2 = new F1('BLAH');

                    expect(F1i1.arg).toBe('BLAH');
                    expect(F1i1.dep.msg).toBe('Hello');
                    expect(F1i1.prop).toBe('{I}');

                    expect(F1i2.arg).toBe('BLAH');
                    expect(F1i2.dep.msg).toBe('Hello');
                    expect(F1i2.prop).toBe('{I}');

                    expect(F1i1.dep).toBe(F1i2.dep);
                });
            });
        });
    }
);
