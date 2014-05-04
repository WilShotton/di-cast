# Di-Cast
A JavaScript dependency injector for Node.js and the Browser.

## Set up.
Di-Cast can be used in AMD, Browser and CommonJS environments.

##### AMD

```
require(['path/to/di-cast'], function(DiCast) {

	var injector = new DiCast();
});

// or

define('Module', ['path/to/di-cast'], function(DiCast) {

	var injector = new DiCast();
});

```

##### Browser

	<script src="path/to/di-cast"></script>

	<script>
	
		var injector = new DiCast();
		
	</script>

##### CommonJS

```
var Injector = require('path/to/injector.js).DiCast;

var injector = new DiCast();

```

## Basic mappings.
Mappings are created by calling the Injector's `map` method.

A mapping is defines the properties the injector uses to describe an injection. The injector stores each mapping against a key. 

At the very least a mapping must have a `target` property which is the value to be injected when the mapping is requested.

```
// Create a basic mapping
injector.map('greeting').toValue({

	target: 'Hello World'
});
```

Mappings can be retrieved using the `get` method.

```
// Retrieve the mapping
var greeting = injector.get('greeting');

console.log(greeting);
// 'Hello World'
```

Mappings can also be retrieved by defining them as dependencies of other mappings.

```
injector.map('MyType').toType({

	target: function(greeting) {
		this.sayHello = function() {
			return greeting;
		};
	},

	using: ['greeting']
});
```

There are three different kinds of mapping available.


## toValue mappings.
Returns the `target` value when requested. The `target` can be any type value.

The injector will return the value unchanged unless the `target` is an Object with public properties that are marked as injectable using the `'{I}'` token. In this case, the injector will attempt to resolve the property as a dependency using the property name as the mapping key.

```
injector.map('MyValue').toValue({

	target: {
		greeting: '{I}',
		greet: function() {
			console.log(this.greeting);
		}
	},

	api: [{name: 'greet'}]
});

```

##### Config options.

__target__ The value to be returned. It can be anything. __Required.__

__api__ An Array describing the value interface.


## toType mappings.

Returns a new instance from the `target' constructor function when requested.

```
injector.map('MyType').toType({

	target: function MyType(MyDependency) {
	
		this.MyDependency = MyDependency;
	},
	
	api: [{name: 'getProperty'}],
	
	isSingleton: true,

	using: ['MyDependency']
});

```

##### Config options.

__target__ The factory constructor function. __Required.__

__api__ An array describing the factory instance interface.

__isSingleton__ An optional Boolean flag which, when set, will always return the same instance.

__using__ An Array of mapping keys to inject into the factory as constructor arguments when it is instantiated. Dependencies will be resolved and injected lazily.


## toFactory mappings.

Similar to `toType` mappings but it returns the result of invoking the `target` factory function when requested.

If a `toFactory` target function does not return a value an `InjectonError` will be thrown.

```
injector.map('MyFactory').toFactory({

	target: function MyFactory(MyDependency) {

		return {
			myDependency: MyDependency
		};
	},

	api: [{name: 'myDependency'}],

	isSingleton: true,

	using: ['MyDependency']
});

```

##### Config options.

__target__ The factory function. __Required.__

__api__ An Array describing the factory instance interface.

__isSingleton__ An optional Boolean flag which, when set, will always return the same result.

__using__ An Array of mapping keys to inject into the factory.


## Singleton mappings.

`toFactory` and `toType` mappings can be defined as singletons in the config options to ensure that the same value is always returned.

```
injector.map('singleton').toType({
	target: function() {},
	isSingleton: true
});

injector.get('singleton') === injector.get('singleton');
// true

```

## Type checking mappings.

To ensure the correct interface is set on a mapping an optional `api` property can be specified in the config options.

The `api` property expects an Array of definition objects. Each definition must have a `name` property which is the name of a property required on the `target`. Each definition can also have an optional `arity` property which sets the number of arguments a required function should have. 

```
var IMyInterface = [

	{name: 'myMethod', arity: 1},
    {name: 'myProperty'}
];

// A valid mapping
injector.map('typed').toType({

	target: function() {
		this.myMethod = function(myArg) {};
		this.myProperty = 'myProperty';
	},

	api: IMyInterface
});

injector.get('typed');

// An invalid mapping
injector.map('notTyped').toType({

	target: function() {},

	api: IMyInterface
});

injector.get('notTyped');
// Throws an InjectionError

```

## Nested injection.
Di-Cast instances can take an optional parent injector constructor argument. If an injector with a parent cannot resolve a dependency in it's local scope it will look in the parental scope before throwing an error.

Dependencies with the same name as a dependency in the parental scope will overwrite in the local scope but will not affect the parent scope.


## Injection errors.
Di-Cast has a custom error type with the following properties:

__stack__ The stack trace for the error.

__message__ Basic error information.

__info__ A context specific description of the error.


## Grunt tasks.

`> grunt doc` Generate API YUIDocs in `bin/docs`.

`> grunt test` Run Jasmine tests and generate a coverage report in `bin/coverage`.

`> grunt plato` Generate a code complexity report in `bin/complexity`.

`> grunt dist` Generate a minified file in `dist`
