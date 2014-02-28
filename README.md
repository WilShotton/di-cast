# Injector

A JavaScript dependency injector for Node.js and the Browser.

#### Creating an injector instance.

```
var injector = new Injector();

```

#### Creating basic mappings.

```
// Create a mapping	
injector.map('greeting').toValue({
	target: 'Hello World'
});
	
console.log(injector.getMappingFor('greeting'));
// 'Hello World'

```	

#### Creating mappings with constructor injection.

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

#### Creating mappings with property injection.

Targets can define their own mappings by declaring public properties prefixed with `i_` and an initial value set to `null` or `undefined`.

```
injector.map('salutation').toValue({
	target: {
		this.i_greeting: null,
		this.greet: function() {
			console.log(this.i_greeting);
		}
	}
});

injector.getMappingFor('salutation').greet();
// 'Hello World'
```

#### Creating singleton mappings.

Type mappings can be defined as singletons to ensure that the same Object can be used as a dependency everywhere. __Note:__ Value and factory mappings are always singletons.

```
injector.map('singleton').toType({
	target: function() {},
	isSingleton: true
});

injector.getMappingFor('singleton') === injector.getMappingFor('singleton');
// true

```

#### Duck typing mappings.

To ensure the correct interface on a mapping.

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

#### toType mappings

#### toValue mappings

#### toFactory mappings

Maps a Factory function to an Object with a variadic `make()` method. When invoked `make()` will return a new instance from the factroy method with any arguments passed to the constructor. 

Constructor dependencies will be injected into the Factory constructor and then accessable to the instance. 

Property dependencies should be defined in the instance constructor itself.  

```	
function MyFactory() {
	return function MyFactoryInstance() {};
}
	
injector.map('MyFactory').toFactory({
	target: MyFactory
});

var myFactoryInstance = injector.getMappingFor('MyFactory').make();

```

#### Tests



#### To do

- Automatic constructor injection
- Hierachical injection
- Circular dependency management
