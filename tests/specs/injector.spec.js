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

        var INVALID_TARGET = 'The target must be an Object or Function',
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

        xdescribe('InjectionError', function() {

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

            // map()
            xdescribe('map', function() {

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyMapping').toConstructor({target: function() {}});
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
                        keys = ['toConstructor', 'toFactory', 'toValue'];

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
                    injector.map('MyMapping').toConstructor({target: function() {}});
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
                    injector.map('MyType').toConstructor({target: MyType});

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
                    injector.map('MyType').toConstructor({target: MyType});
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

                    injector.map('MyDependantArgs').toConstructor({
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
            describe('toFactory', function() {

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

            describe('toFactory Facade', function() {

                function myFactory(myArg) {
                    return function MyConstructor() {
                        this.myArg = myArg;
                    };
                }

                beforeEach(function() {

                    injector = new Injector();

                    injector.map('MyFactory').toFactory({
                        target: myFactory
                    });
                });

                it(' should return something or throw', function() {

                    expect(injector.get('MyFactory')).not.toBeNull();

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

            describe('toFactory instances', function() {

                var f1, f1i1, f1i2,
                    f2, f2i1;

                beforeEach(function() {

                    injector = new Injector();

                    injector.map('MyType').toConstructor({
                        target: function() {
                            this.name = 'type';
                        }
                    });

                    injector.map('MySingleton').toConstructor({
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

                    injector.map('TypeProp').toConstructor({
                        target: function() {
                            this.name = 'TypeProp';
                        }
                    });

                    injector.map('SingletonProp').toConstructor({
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

                        target: function(MyType, MySingleton, MyValue, MyArg) {
                            this.getArg = function() {
                                return MyArg;
                            };
                            this.getType = function() {
                                return MyType;
                            };
                            this.getSingleton = function() {
                                return MySingleton;
                            };
                            this.getValue = function() {
                                return MyValue;
                            };
                        },
                        using: ['MyType', 'MySingleton', 'MyValue']
                    });

                    f1 = injector.get('MyFactory');
                    f2 = injector.get('MyFactory');

                    f1i1 = f1.make('MyArg: f1i1');
                    f1i2 = f1.make('MyArg: f1i2');

                    f2i1 = f2.make('MyArg: f2i1');
                });

                it(' should create unique scope for the factory', function() {

                    expect(f1).not.toBe(f2);
                    expect(f1.make().constructor).toBe(f1.make().constructor);

                    expect(f1.make().constructor).toBe(f2.make().constructor);
                });

                it(' should create instances with the supplied arguments', function() {

                    expect(f1i1.getArg()).toBe('MyArg: f1i1');
                    expect(f1i2.getArg()).toBe('MyArg: f1i2');

                    expect(f2i1.getArg()).toBe('MyArg: f2i1');
                });

                it(' should create instances with different type constructor dependencies', function() {

                    expect(f1i1.getType()).not.toBe(f1i2.getType());
                    expect(f1i1.getType()).not.toBe(f2i1.getType());
                });

                it(' should create instances with the same singleton constructor dependencies', function() {

                    expect(f1i1.getSingleton()).toBe(f1i2.getSingleton());
                    expect(f1i1.getSingleton()).toBe(f2i1.getSingleton());
                });

                it(' should create instances with the same value constructor dependencies', function() {

                    expect(f1i1.getValue()).toBe(f1i2.getValue());
                    expect(f1i1.getValue()).toBe(f2i1.getValue());
                });
            });

            // toConstructor
            xdescribe('toConstructor', function() {

                function MyType() {}

                var config = {
                    target: MyType
                };

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyType').toConstructor(config);
                });

                it(' should return a reference to the injector', function() {

                    expect(injector.map('MyType1').toConstructor(config)).toBe(injector);
                });

                it(' should allow multiple mappings of the same function with different keys', function() {

                    expect(function() {
                        injector.map('MyType1').toConstructor(config);
                        injector.map('MyType2').toConstructor(config);
                    }).not.toThrow();

                    expect(injector.get('MyType1').constructor)
                        .toBe(injector.get('MyType2').constructor);
                });

                it(' should throw if no config object is provided', function() {

                    expect(function() {
                        injector.map('MyType1').toConstructor();
                    }).toThrow(INCORRECT_METHOD_SIGNATURE);
                });

                it(' should should throw if the config does not have a target property', function() {

                    expect(function() {
                        injector.map('MyType1').toConstructor({});
                    }).toThrow(INVALID_TARGET);
                });

                it(' should throw if config.target is not a function', function() {

                    expect(function() {
                        injector.map('MyType1').toConstructor({
                            target: {}
                        });
                    }).toThrow(INVALID_TARGET);
                });
            });

            // toValue
            xdescribe('toValue', function() {

                // @TODO: Add tests for primitives with custom properties
                // @TODO: Add tests for Object.create() etc.

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

            xdescribe('isSingleton', function() {

                function MyType() {}

                function MySingleton() {}

                beforeEach(function() {

                    injector = new Injector();

                    injector.map('MyType').toConstructor({
                        target: MyType
                    });

                    injector.map('MySingleton').toConstructor({
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

                function MyType() {}

                function MySingletonType() {}

                function MyUsingType(myType, mySingletonType) {
                    this.myType = myType;
                    this.mySingletonType = mySingletonType;
                }

                beforeEach(function() {

                    injector = new Injector();

                    injector.map('MyType').toConstructor({
                        target: MyType
                    });

                    injector.map('MySingletonType').toConstructor({
                        target: MySingletonType,
                        isSingleton: true
                    });
                });

                it(' should do nothing if the arguments length is 0', function() {

                    expect(function() {
                        injector.map('MyA').toConstructor({
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
                        injector.map('MyA').toConstructor({
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
                        injector.map('MyA').toConstructor({
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

                    injector.map('MyUsingType').toConstructor({
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

                    this.myMethod = function(myArg) {};
                    this.myProperty = 'My property';
                }
                MyFactory.prototype.myPrototypeMethod = function(myArg) {};
                MyFactory.prototype.myPrototypeProperty = 'MyPrototypeProperty';
                MyFactory.prototype.constructor = MyFactory;

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

                    injector.map('MyType').toConstructor({
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

                it(' should ensure a defined public API for a toConstructor mapping', function() {

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

                        injector.map('MyCorrect').toConstructor({
                            target: MyCorrect,
                            api: IMemberTest
                        });

                        injector.map('MyMissing').toConstructor({
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

                        injector.map('MyCorrect').toConstructor({
                            target: MyCorrect,
                            api: IArityTest
                        });

                        injector.map('MyMissing').toConstructor({
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

                function MyFactory() {}

                function MyType() {}

                function MyValue() {}

                function MySingletonType() {}

                function MyDependantFactory(myFactory, myType, mySingletonType, myValue) {
                    this.myFactory = myFactory;
                    this.myType = myType;
                    this.mySingletonType = mySingletonType;
                    this.myValue = myValue;
                }

                function MyDependantType(myFactory, myType, mySingletonType, myValue) {
                    this.myFactory = myFactory;
                    this.myType = myType;
                    this.mySingletonType = mySingletonType;
                    this.myValue = myValue;
                }

                function MyNestedDependantFactory(myDependantFactory, myDependantType) {
                    this.myFactory = myDependantFactory;
                    this.myType = myDependantType;
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

                    injector.map('MyType').toConstructor({
                        target: MyType
                    });

                    injector.map('MySingletonType').toConstructor({
                        target: MySingletonType,
                        isSingleton: true
                    });

                    injector.map('MyDependantType').toConstructor({
                        target: MyDependantType,
                        using: ['MyFactory', 'MyType', 'MySingletonType', 'MyValue']
                    });

                    injector.map('MyNestedDependantType').toConstructor({
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

                    injector.map('DepA').toConstructor({
                        target: DepA,
                        using: ['MyType']
                    });

                    injector.map('DepB').toConstructor({
                        target: DepB,
                        using: ['MyType']
                    });

                    expect(injector.get('DepA').foo.constructor)
                        .toBe(injector.get('DepB').bar.constructor);
                });

                it(' should inject a factory constructor with dependencies specified in using()', function() {

                    var instance = injector.get('MyDependantFactory').make();

                    expect(instance.constructor.name).toBe('MyDependantFactory');
                    expect(instance.myFactory.make().constructor.name).toBe('MyFactory');
                    expect(instance.myType.constructor.name).toBe('MyType');
                    expect(instance.mySingletonType.constructor.name).toBe('MySingletonType');
                    expect(instance.myValue.constructor.name).toBe('MyValue');

                    instance = injector.get('MyNestedDependantFactory').make();

                    expect(instance.constructor.name).toBe('MyNestedDependantFactory');
                    expect(instance.myFactory.make().constructor.name).toBe('MyDependantFactory');
                    expect(instance.myType.constructor.name).toBe('MyDependantType');
                });

                it(' should inject a type constructor with dependencies specified in using()', function() {

                    var instance = injector.get('MyDependantType');

                    expect(instance.constructor).toBe(MyDependantType);
                    expect(instance.myFactory.make().constructor.name).toBe('MyFactory');
                    expect(instance.myType.constructor.name).toBe('MyType');
                    expect(instance.mySingletonType.constructor.name).toBe('MySingletonType');
                    expect(instance.myValue.constructor.name).toBe('MyValue');

                    instance = injector.get('MyNestedDependantType');

                    expect(instance.constructor).toBe(MyNestedDependantType);
                    expect(instance.myFactory.make().constructor.name).toBe('MyDependantFactory');
                    expect(instance.myType.constructor.name).toBe('MyDependantType');
                });
            });

            // Property
            xdescribe('property injection', function() {

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
            xdescribe('Circular dependencies', function() {

                it(' should throw if a circular dependency is encountered', function() {

                    injector = new Injector();

                    injector.map('MyControl').toConstructor({

                        target: function MyControl() {}
                    });

                    injector.map('MyTypeA').toConstructor({

                        target: function MyTypeA(MyControl, MyTypeB) {},
                        using: ['MyControl', 'MyTypeB']
                    });

                    injector.map('MyTypeB').toConstructor({

                        target: function MyTypeB(MyTypeA, MyControl) {},
                        using: ['MyTypeA', 'MyControl']
                    });

                    injector.map('MyTypeZ').toConstructor({

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

                    injector.map('MyTypeA').toConstructor({

                        target: function MyTypeA(MyTypeB) {},
                        using: ['MyTypeB']
                    });

                    injector.map('MyTypeB').toConstructor({

                        target: function MyTypeB(MyTypeC) {},
                        using: ['MyTypeC']
                    });

                    injector.map('MyTypeC').toConstructor({

                        target: function MyTypeC(MyTypeA) {},
                        using: ['MyTypeA']
                    });

                    expect(function() {
                        injector.get('MyTypeA');
                    }).toThrow(CIRCULAR_DEPENDENCY);
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
                    this.isConstructed = false;
                    this.postConstruct = function() {
                        this.isConstructed = true;
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

                    injector.map('MySingleton').toConstructor({
                        target: MySingleton,
                        isSingleton: true
                    });

                    injector.map('MyType').toConstructor({
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

                it(' should call postConstruct on toConstructor mappings after injecting dependencies', function() {

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

                function MyFactory(myFactoryArg, myInstanceArg) {
                    this.myFactoryArg = myFactoryArg;
                    this.myInstanceArg = myInstanceArg;
                }

                beforeEach(function() {

                    injector = new Injector();
                    injector.map('MyFactoryArg').toValue({target: 'MyFactoryArg'});
                });

                it(' should resolve the supplied target as a Factory', function() {

                    var factory = injector.resolveFactory(MyFactory, 'MyFactoryArg'),
                        instance = factory.make('MyInstanceArg');

                    expect(is(factory.make, 'function')).toBe(true);

                    expect(instance.constructor.name).toBe('MyFactory');

                    expect(instance.myFactoryArg).toBe('MyFactoryArg');
                    expect(instance.myInstanceArg).toBe('MyInstanceArg');
                });

                it(' should ONLY throw when calling make()', function() {

                    function MyArgFactory(myMissingArg) {}

                    expect(function() {
                        injector.resolveFactory(MyArgFactory, 'MyMissingArg');
                    }).not.toThrow();

                    expect(function() {
                        injector.resolveFactory(MyArgFactory, 'MyMissingArg').make();
                    }).toThrow(NO_MAPPING);
                });

                it(' should throw if a constructor dependency cannot be resolved', function() {

                    function MyFactory(myMissingArg) {}

                    expect(function() {
                        injector.resolveFactory(MyFactory, 'MyMissingArg').make();
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
        });
    }
);
