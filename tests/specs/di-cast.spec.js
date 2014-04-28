/**
 * Created by wil on 15/01/2014.
 */

/*global describe, xdescribe, it, xit, beforeEach, afterEach, spyOn */
define(

    [
        'di-cast'
    ],

    function(Injector) {

        "use strict";

        var INVALID_PARENT = 'The parent injector must be an injector',
            INVALID_TARGET = 'The target must be an Object or Function',
            INCORRECT_METHOD_SIGNATURE = 'Incorrect method signature supplied',
            INVALID_KEY_TYPE = 'The key must be a String',

            MISSING_TARGET = 'The target must be specified',
            MAPPING_EXISTS = 'A mapping already exists',
            NO_MAPPING = 'No mapping found',
            MAPPING_HAS_DEPENDANTS = 'The mapping has dependants',
            INTERFACE_MEMBER_MISSING = 'The mapping is missing a required member',
            INTERFACE_METHOD_ARITY_MISMATCH = 'The mapping has an interface method with an incorrect arity',
            INVALID_FACTORY = 'The factory function must return a value',

            CIRCULAR_DEPENDENCY = 'Can not resolve a circular dependency';

        function is(value, type) {
            return Object.prototype.toString
                .call(value)
                .split(' ')[1]
                .toLowerCase()
                .indexOf(type.toLowerCase()) !== -1;
        }

        describe('InjectionError', function() {

            var injector;

            beforeEach(function() {

                injector = new Injector();
            });

            it(' should have a message', function() {

                try {

                    injector.get('missing');

                } catch(error) {

                    expect(error.message).toBe(NO_MAPPING);
                }
            });

            it(' should have more info about the error', function() {

                try {

                    injector.get('missing');

                } catch(error) {

                    expect(error.info).toBe('No mapping for [missing] found');
                }
            });

            it(' should have a stack trace', function() {

                try {

                    injector.get('missing');

                } catch(error) {

                    // Pretty vague but PhantomJS based tests return a
                    // different index to Karma based tests.
                    expect(error.stack.indexOf(NO_MAPPING)).toBeGreaterThan(-1);
                }
            });
        });

        describe('Injector', function() {

            var injector;

            // Injector methods
            // ------------------------------
            describe('parent', function() {

                it(' should accept a parent injector as a constructor argument', function() {

                    expect(function() {
                        new Injector(new Injector());
                    }).not.toThrow();
                });

                it(' should throw if the parent injector is not an injector', function() {

                    expect(function() {
                        new Injector({});
                    }).toThrow(INVALID_PARENT);
                });
            });

            // map()
            describe('map', function() {

                var parent = null,
                    child = null;

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyMapping').toType({target: function() {}});

                    parent = new Injector();
                    child = new Injector(parent);
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
                        keys = ['toFactory', 'toType', 'toValue'];

                    keys.forEach(function(key) {
                        expect(is(mapping[key], 'Function')).toBe(true);
                    });
                });

                it(' should NOT override parental mappings', function() {

                    parent.map('MyValue').toValue({
                        target: 'Parent'
                    });

                    child.map('MyValue').toValue({
                        target: 'Child'
                    });

                    expect(parent.get('MyValue')).toBe('Parent');
                    expect(child.get('MyValue')).toBe('Child');
                });

                it(' should NOT throw if a mapping key exists in the parent scope', function() {

                    parent.map('MyValue').toValue({
                        target: 'Parent'
                    });

                    expect(function() {
                        child.map('MyValue').toValue({
                            target: 'Child'
                        });
                    }).not.toThrow();
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
            describe('has', function() {

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

                it(' should look in the parental scope for missing mappings', function() {

                    var parent = new Injector(),
                        child = new Injector(parent);

                    parent.map('MyValue').toValue({
                        target: 'Parent'
                    });

                    expect(child.get('MyValue')).toBe('Parent');
                });

                it(' should throw if the key is not a string', function() {

                    expect(function() {
                        injector.has({});
                    }).toThrow(INVALID_KEY_TYPE);
                });
            });

            // get()
            describe('get', function() {

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

                it(' should look in the parental scope for missing mappings', function() {

                    var parent = new Injector(),
                        child = new Injector(parent);

                    parent.map('MyValue').toValue({
                        target: 'Parent'
                    });

                    expect(child.get('MyValue')).toBe('Parent');
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
            describe('remove()', function() {

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

                it(' should NOT remove mappings from the parental scope', function() {

                    // NOTE: This means removing a mapping might effectively change it's value
                    var parent = new Injector(),
                        child = new Injector(parent);

                    parent.map('MyValue').toValue({
                        target: 'Parent'
                    });

                    child.map('MyValue').toValue({
                        target: 'Child'
                    });

                    expect(child.get('MyValue')).toBe('Child');

                    child.remove('MyValue');

                    expect(child.get('MyValue')).toBe('Parent');
                });

                it(' should throw if a mapping depends on the mapping to be removed', function() {

                    injector.map('MyDependantArgs').toType({
                        target: function(MyType) {},
                        using: ['MyType']
                    });

                    expect(function() {
                        injector.remove('MyType');
                    }).toThrow(MAPPING_HAS_DEPENDANTS);
                });

                it(' should return a reference to the injector', function() {

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
            describe('toFactory() mapping', function() {

                function myFactory(MyName) {
                    return function MyConstructor() {
                        this.MyName = MyName;
                    }
                }

                beforeEach(function() {

                    injector = new Injector();

                    injector.map('MyName').toValue({
                        target: 'My name'
                    });

                    injector.map('MyFactory').toFactory({
                        target: myFactory
                    });
                });

                it(' should allow multiple mappings of the same factory with different keys', function() {

                    /**
                     * NOTE: Not sure why you'd want to do this.
                     * It is really just a proof of concept and demonstrates some
                     * possibly unexpected behaviour regarding identity.
                     */

                    expect(function() {
                        injector.map('MyFactory1').toFactory({target: myFactory});
                        injector.map('MyFactory2').toFactory({target: myFactory});
                    }).not.toThrow();

                    var C1 = injector.get('MyFactory1'),
                        C2 = injector.get('MyFactory2');

                    expect(C1).not.toBe(C2);

                    expect(new C1().MyName).toBe(new C2().MyName);
                });

                it(' should return a reference to the injector', function() {

                    expect(injector.map('MyFactory1').toFactory({
                        target: myFactory
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

            describe('toFactory() response', function() {

                var F1, F2;

                beforeEach(function() {

                    injector = new Injector();

                    injector.map('MyType').toType({
                        target: function() {
                            this.name = 'type';
                        }
                    });

                    injector.map('MySingleton').toType({
                        target: function() {
                            this.name = 'singleton';
                        },
                        isSingleton: true
                    });

                    injector.map('MyValue').toValue({
                        target: function() {
                            this.name = 'value';
                        }
                    });

                    injector.map('TypeProp').toType({
                        target: function() {
                            this.name = 'TypeProp';
                        }
                    });

                    injector.map('SingletonProp').toType({
                        target: function() {
                            this.name = 'SingletonProp';
                        },
                        isSingleton: true
                    });

                    injector.map('ValueProp').toValue({
                        target: function() {
                            this.name = 'ValueProp';
                        }
                    });

                    injector.map('MyFactory').toFactory({

                        target: function(MyType, MySingleton, MyValue) {

                            return function MyFunction() {

                                this.getType = function() {
                                    return MyType;
                                };
                                this.getSingleton = function() {
                                    return MySingleton;
                                };
                                this.getValue = function() {
                                    return MyValue;
                                };
                            }
                        },
                        using: ['MyType', 'MySingleton', 'MyValue']
                    });

                    F1 = injector.get('MyFactory');
                    F2 = injector.get('MyFactory');
                });

                it(' should create unique Object', function() {

                    expect(F1).not.toBe(F2);
                });

                it(' should create instances with different toType() dependencies', function() {

                    expect(new F1().getType()).not.toBe(new F2().getType());
                });

                it(' should create instances with the same singleton toType() dependencies', function() {

                    expect(new F1().getSingleton()).toBe(new F2().getSingleton());
                });

                it(' should create instances with the same toValue() dependencies', function() {

                    expect(new F1().getValue()).toBe(new F2().getValue());
                });

                it(' should return values with the same dependencies if the factory is a singleton', function() {

                    injector.map('MySingletonFactory').toFactory({
                        target: function MySingletonFactory(MyType) {
                            return function MySingletonInstance() {
                                this.MyType = MyType;
                            };
                        },
                        using: ['MyType'],
                        isSingleton: true
                    });

                    var C1 = injector.get('MySingletonFactory'),
                        C2 = injector.get('MySingletonFactory');

                    expect(new C1().MyType).toBe(new C2().MyType);
                });

                it(' should throw if the factory does not return a value', function() {

                    injector.map('myNullFactory').toFactory({
                        target: function myNullFactory() {}
                    });

                    expect(function() {
                        injector.get('myNullFactory')
                    }).toThrow(INVALID_FACTORY);
                });

                it(' should throw for missing dependencies', function() {

                    injector.map('MyMissingFactory').toFactory({
                        target: function myMissingFactory() {},
                        using: ['MyMissingDep']
                    });

                    expect(function() {
                        injector.get('MyMissingFactory');
                    }).toThrow(NO_MAPPING);
                });
            });

            // toType()
            describe('toType', function() {

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

            // toValue()
            describe('toValue', function() {

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

                    //debugger
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

            describe('isSingleton', function() {

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

            describe('using', function() {

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

                    function MyFactoryInstance() {

                        this.myMethod = function(myArg) {};
                        this.myProperty = 'My property';
                    }

                    MyFactoryInstance.prototype.myPrototypeMethod = function(myArg) {};
                    MyFactoryInstance.prototype.myPrototypeProperty = 'MyPrototypeProperty';
                    MyFactoryInstance.prototype.constructor = MyFactoryInstance;

                    return MyFactoryInstance;
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

                    var Constructor = injector.get('MyFactory'),
                        instance = null;

                    expect(function() {
                        instance = new Constructor();
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
            describe('constructor injection', function() {

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

                    var instance = new myFactory();

                    this.myFactoryInstance = instance;
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

                    var instance = new myDependantFactory();

                    this.myFactoryInstance = instance;
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

                    var Constructor = injector.get('MyDependantFactory'),
                        instance = new Constructor();

                    expect(instance.constructor.name).toBe('MyDependantFactoryInstance');
                    expect(instance.myType.constructor.name).toBe('MyType');
                    expect(instance.mySingletonType.constructor.name).toBe('MySingletonType');
                    expect(instance.myValue.constructor.name).toBe('MyValue');

                    Constructor = injector.get('MyNestedDependantFactory');
                    instance = new Constructor();

                    expect(instance.constructor.name).toBe('MyNestedDependantFactoryInstance');
                    expect(instance.myType.constructor.name).toBe('MyDependantType');
                });

                it(' should inject a type constructor with dependencies specified in using()', function() {

                    var instance = injector.get('MyDependantType');

                    expect(instance.constructor).toBe(MyDependantType);
                    expect(instance.myFactoryInstance.constructor.name).toBe('MyFactoryInstance');
                    expect(instance.myType.constructor.name).toBe('MyType');
                    expect(instance.mySingletonType.constructor.name).toBe('MySingletonType');
                    expect(instance.myValue.constructor.name).toBe('MyValue');

                    instance = injector.get('MyNestedDependantType');

                    expect(instance.constructor).toBe(MyNestedDependantType);
                    expect(instance.myFactoryInstance.constructor.name).toBe('MyDependantFactoryInstance');
                    expect(instance.myType.constructor.name).toBe('MyDependantType');
                });
            });

            // Property
            describe('property injection', function() {

                var myPropValue = 'MyProp';

                beforeEach(function() {

                    injector = new Injector();

                    injector.map('prop1').toValue({target: 1});
                    injector.map('prop2').toValue({target: 2});
                    injector.map('prop3').toValue({target: 3});
                    injector.map('prop4').toValue({target: 4});
                    injector.map('prop5').toValue({target: 5});
                    injector.map('prop6').toValue({target: 6});
                    injector.map('prop7').toValue({target: 7});
                    injector.map('prop8').toValue({target: 8});

                    injector.map('MyProp').toValue({
                        target: myPropValue
                    });
                });

                it(' should inject properties set to the injector token', function() {

                    injector.map('MyValue').toValue({
                        target: {
                            MyProp: '{I}'
                        }
                    });

                    expect(injector.get('MyValue').MyProp).toEqual(myPropValue);
                });

                it(' should parse properties defined with Object.defineProperties', function() {

                    injector.map('MyValue').toValue({

                        target: Object.defineProperties(Object.prototype, {

                            prop1: {
                                writable: true,
                                enumerable: true,
                                configurable: true,
                                value: '{I}'
                            }
                        })
                    });

                    expect(injector.get('MyValue').prop1).toBe(1);
                });

                it(' should parse properties defined with Object.create', function() {

                    injector.map('MyValue').toValue({
                        target: Object.create(Object.prototype, {
                            prop1: {
                                writable:true,
                                enumerable:true,
                                configurable:true,
                                value:'{I}'
                            }
                        })
                    });

                    expect(injector.get('MyValue').prop1).toBe(1);
                });

                it(' should ONLY inject properties set to {I}', function() {

                    injector.map('ObjectProps').toValue({
                        target: {
                            MyNumber: 42,
                            MyInjectedNumber: '{I}'
                        }
                    });

                    injector.map('MyNumber').toValue({
                        target: 180
                    });

                    injector.map('MyInjectedNumber').toValue({
                        target: 180
                    });

                    var props = injector.get('ObjectProps');
                    expect(props.MyNumber).toEqual(42);
                    expect(props.MyInjectedNumber).toEqual(180);
                });

                it(' should throw if a mapping cannot be found', function() {

                    injector.map('MyMissingValue').toValue({
                        target: {
                            MyString: '{I}'
                        }
                    });

                    expect(function() {
                        injector.get('MyMissingValue');
                    }).toThrow(NO_MAPPING);
                });
            });

            // Circular dependencies
            describe('Circular dependencies', function() {

                it(' should throw if a circular dependency is encountered', function() {

                    injector = new Injector();

                    injector.map('MyControl').toType({

                        target: function MyControl() {}
                    });

                    injector.map('MyTypeA').toType({

                        target: function MyTypeA(MyControl, MyTypeB) {},
                        using: ['MyControl', 'MyTypeB']
                    });

                    injector.map('MyTypeB').toType({

                        target: function MyTypeB(MyTypeA, MyControl) {},
                        using: ['MyTypeA', 'MyControl']
                    });

                    injector.map('MyTypeZ').toType({

                        target: function MyTypeZ(MyControl) {},
                        using: ['MyControl']
                    });

                    expect(function() {
                        injector.get('MyTypeA');
                    }).toThrow(CIRCULAR_DEPENDENCY);

                    expect(function() {
                        injector.get('MyControl');
                    }).not.toThrow();

                    expect(function() {
                        injector.get('MyTypeZ');
                    }).not.toThrow();
                });

                it(' should throw if a nested circular dependency is encountered', function() {

                    injector = new Injector();

                    injector.map('MyTypeA').toType({

                        target: function MyTypeA(MyTypeB) {},
                        using: ['MyTypeB']
                    });

                    injector.map('MyTypeB').toType({

                        target: function MyTypeB(MyTypeC) {},
                        using: ['MyTypeC']
                    });

                    injector.map('MyTypeC').toType({

                        target: function MyTypeC(MyTypeA) {},
                        using: ['MyTypeA']
                    });

                    expect(function() {
                        injector.get('MyTypeA');
                    }).toThrow(CIRCULAR_DEPENDENCY);
                });

                it(' should continue working after a circular dependency error has been handled', function() {

                    injector = new Injector();

                    injector.map('MyTypeA').toType({

                        target: function MyTypeA(MyTypeB, MyTypeC) {},
                        using: ['MyTypeB', 'MyTypeC']
                    });

                    injector.map('MyTypeB').toType({

                        target: function MyTypeB(MyTypeA) {},
                        using: ['MyTypeA']
                    });

                    injector.map('MyTypeC').toType({

                        target: function MyTypeC() {}
                    });

                    injector.map('MyTypeAA').toType({

                        target: function MyTypeAA(MyTypeC) {
                            this.MyTypeC = MyTypeC;
                        },
                        using: ['MyTypeC']
                    });

                    expect(function() {
                        injector.get('MyTypeA');
                    }).toThrow(CIRCULAR_DEPENDENCY);

                    expect(injector.get('MyTypeAA').MyTypeC.constructor.name).toBe('MyTypeC');
                });
            });


            // postConstruct()
            // ------------------------------
            describe('postConstruct', function() {

                beforeEach(function() {

                    injector = new Injector();

                    injector.map('MyValue').toValue({
                        target: {
                            counter: 0,
                            postConstruct: function() {
                                this.counter++;
                            }
                        }
                    });
                });

                it(' should call postConstruct on toValue mappings', function() {

                    expect(injector.get('MyValue').counter).toBe(1);
                });

                it(' should only call postConstruct once for a toValue mapping', function() {

                    var myValue_1 = injector.get('MyValue'),
                        myValue_2 = injector.get('MyValue');

                    expect(myValue_1).toBe(myValue_2);
                    expect(myValue_1.counter).toBe(1);
                    expect(myValue_2.counter).toBe(1);
                });

                it(' should NOT call postConstruct on toType mappings', function() {

                    injector.map('MyConstructor').toType({
                       target: function MyConstructor() {
                           this.counter = 0;
                           this.postConstruct = function() {
                               this.counter++;
                           };
                       }
                    });

                    expect(injector.get('MyConstructor').counter).toBe(0);
                });

                it(' should NOT call postConstruct on toFactory mappings', function() {

                    injector.map('MyFactory').toFactory({
                        target: function MyFactory() {
                            return {
                                counter: 0,
                                postConstruct: function() {
                                    this.counter++;
                                }
                            };
                        }
                    });

                    expect(injector.get('MyFactory').counter).toBe(0);
                });
            });


            // Injector.resolve methods
            // ------------------------------
            describe('resolveFactory()', function() {

                function MyFactory(myFactoryArg) {
                    return function MyInstance(myInstanceArg) {
                        this.myFactoryArg = myFactoryArg;
                        this.myInstanceArg = myInstanceArg;
                    };
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyFactoryArg').toValue({target: 'MyFactoryArg'});
                });

                it(' should resolve the supplied target as a Factory', function() {

                    var Constructor = injector.resolveFactory(MyFactory, 'MyFactoryArg'),
                        instance = new Constructor('MyInstanceArg');

                    expect(instance.constructor.name).toBe('MyInstance');

                    expect(instance.myFactoryArg).toBe('MyFactoryArg');
                    expect(instance.myInstanceArg).toBe('MyInstanceArg');
                });

                it(' should throw if a constructor dependency cannot be resolved', function() {

                    function MyFactory(myMissingArg) {}

                    expect(function() {
                        injector.resolveFactory(MyFactory, 'MyMissingArg');
                    }).toThrow(NO_MAPPING);
                });

                it(' should throw if the target is not a function', function() {

                    expect(function() {
                        injector.resolveFactory('MyFactory');
                    }).toThrow(INVALID_TARGET);
                });

                it(' should throw if the factory function does not return a value', function() {

                });
            });

            describe('resolveType()', function() {

                function MyType(MyArg) {
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
                    expect(instance.myArg).toBe('MyArg');
                });

                it(' should throw if a constructor dependency cannot be resolved', function() {

                    function MyType(myMissingArg) {}

                    expect(function() {
                        injector.resolveType(MyType, 'MyMissingArg');
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
        });
    }
);
