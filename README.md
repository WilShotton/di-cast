# Injector

A JavaScript dependency injector for Node.js and the Browser.

## Set up.

The injector can be used in AMD, Browser and CommonJS environments.

#### AMD

```
require(['path/to/injecor'], function(Injector) {

	var injector = new Injector();	
});

// or

define('Module', ['path/to/injecor'], function(Injector) {

	var injector = new Injector();	
});

```

#### Browser

	<script src="path/to/injector.js"></script>

	<script>
	
		var injector = new Injector();	
		
	</script>

#### CommonJS

```
var Injector = require('path/to/injector.js).Injector;

var injector = new Injector();

```

## Creating basic mappings.

```
// Create a mapping	
injector.map('greeting').toValue({
	target: 'Hello World'
});
	
console.log(injector.getMappingFor('greeting'));
// 'Hello World'

```	

## Creating mappings with constructor injection.

Mappings can define an Array of dependencies in their settings object with the `using` option. The dependencies are resolved whenever a mapping is instantiated and are supplied to the target in the same order as they are listed.

```
injector.map('welcome').toType({
	target: function(greeting) {
		this.greeting = greeting;
	},
	using: ['greeting']
});

console.log(injector.getMappingFor('welcome').greeting);
// 'Hello World'

```

__Note:__ only `toFactory` and `toType` can make use of constructor injection as the target must be instantiated by the injector. To inject `toValue` mappings use property injection.

## Creating mappings with property injection.

Targets can define their own mappings by declaring public properties prefixed with `i_` and an initial value set to `null` or `undefined`.

```
injector.map('salutation').toValue({
	target: {
		i_greeting: null,
		greet: function() {
			console.log(this.i_greeting);
		}
	}
});

injector.getMappingFor('salutation').greet();
// 'Hello World'
```

## Type checking mappings.

To ensure the correct interface on a mapping an optional `api` property can be specified in the config object.

```
var IMyInterface = [

	{name: 'myMethod', arity: 1},
    {name: 'myProperty'},
    {name: 'myPrototypeMethod'},
    {name: 'myPrototypeProperty'}
];

injector.map('duckTyped').toType({
	target: function() {},
	api: IMyInterface
});

var duckTyped = injector.getMappingFor('duckTyped');
// Throws an InjectionError

```

## toType mappings.

This mapping method takes a constructor function as a target and returns a new instance with all it's dependencies resolved when requested. 

Target functions passed to the toType method should have the following structure:

```
function MyType(ConstructorDependency) {
	
	this.i_PropertyDependency = null;
	
	this.getProperty = function() {
	
		return this.i_PropertyDependency;
	};
}
```

#### Config options.

__target__ The factory function. __Required.__

__api__ An array describing the factory instance interface.

__isSingleton__ An optional Boolean flag which, when set, will always return the same instance.

__using__ An Array of mapping keys to inject into the factory.

```
injector.map('MyType').toType({
	target: MyType,
	api: [
		{name: 'getProperty'}
	],
	isSingleton: true,
	using: [ConstructorDependency]
});

```

#### Singleton mappings.

Type mappings can be defined as singletons to ensure that the same Object can be used as a dependency everywhere.

```
injector.map('singleton').toType({
	target: function() {},
	isSingleton: true
});

injector.getMappingFor('singleton') === injector.getMappingFor('singleton');
// true

```

#### Retrieving a type instance.

```	
var myType = injector.getMappingFor('MyType');

```

## toValue mappings.
This mapping method maps a value of any type against a key and returns it when requested. If the value is an Object the injector will attempt to resolve any public properties that are marked as injectable.  

toValue mappings are always singletons.

#### Config options.

__target__ The factory function. __Required.__

__api__ An Array describing the value interface.

toFactory mappings are always singletons.

```
injector.map('MyValue').toValue({
	target: {
		i_greeting: null, 
		greet: function() {
			console.log(i_greeting);
		}
	},
	api: [
		{name: 'greet'}
	]
});

```

#### Retrieving a value mapping.

```	
var myValue = injector.getMappingFor('MyValue');

myValue.greet();
// Hello World

// or

injector.map('MyType').toType({
	target: function(MyValue) {},
	using: ['MyValue']
});

```

## toFactory mappings.

This mapping method takes a factory function as a target and creates an Object with a variadic `make()` method. When invoked `make()` will return a new instance from the factroy method with any arguments passed to the instance constructor. 

Target functions passed to the `toFactory` method should have the following structure:

```
function MyFactory(ConstructorDependency) {

	return function MyFactoryInstance(Arg) {
	
		this.i_PropertyDependency = null;
		
		this.getArg = function() {
			return Arg;
		};
	};
}
```

Constructor dependencies will be injected into the Factory constructor which will scope them to the instance. 

Property dependencies should be defined in the instance constructor itself.  

#### Config options.

__target__ The factory function. __Required.__

__api__ An Array describing the factory instance interface.

__using__ An Array of mapping keys to inject into the factory.

toFactory mappings are always singletons.

```
injector.map('MyFactory').toFactory({
	target: MyFactory,
	api: [
		{name: 'getProperty'}
	],
	using: [ConstructorDependency]
});

```

#### Retrieving a factory instance

```	
var myFactoryInstance = injector.getMappingFor('MyFactory').make('Hello');

myFactoryInstance.getArg()
// 'Hello'

```

## Grunt tasks.

`> grunt doc` Generate API YUIDocs in `bin/docs`.

`> grunt test` Run Jasmine tests and generate a coverage report in `bin/coverage`.

`> grunt plato` Generate a code complexity report in `bin/complexity`.

`> grunt dist` Generate a minified file in `dist`


## Known bugs.

Non singleton type mappings injected into a factory will behave as a singleton for all instances created by that factory.


## To do.

#### Automatic constructor injection.

Convert the constructor function to a string and inspect its arguments to derive dependencies.
 
__NOTE:__ This approach will only work for non minified code so tests will need to split into pre / post compile.

#### Nested injection.

Injectors should take an optional parent injector constructor argument. If an injector cannot resolve a dependency it should look to its parental scope. 

#### Circular dependency management.
