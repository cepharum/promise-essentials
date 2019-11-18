# promise-essentials [![Build Status](https://travis-ci.org/cepharum/promise-essentials.svg?branch=master)](https://travis-ci.org/cepharum/promise-essentials)

essential helpers for use with natively supported promises

# License

[MIT](LICENSE)

# About

This packages provides a simple, non-invasive set of methods to support day to day use of natively supported promises. It is simple by means of requiring some certain API instead of trying to deal with several kinds of invocations to limit required code.

# Installation

    npm i promise-essentials

# Usage

This example is iterating over a list of filenames reading each named file looking for the one that's containing a certain string just to print this file's name eventually.

    const File = require( "fs" );
    const PromiseUtil = require( "promise-essentials" );
    
    PromiseUtil.find( [ "file1.txt", null, "file2.txt", "file3.txt" ], fname => {
        if ( !fname ) {
            return false;
        }

        return PromiseUtil.promisify( File.readFile )( fname )
            .catch( error => {
                if ( error.code === "ENOENT" ) {
                    return "";
                }
                
                throw error;
            } )
            .then( content => content.toString().indexOf( "needle" ) > -1 );
    } )
        .then( foundFileName => console.log( foundFileName ) ); 

# Features

Starting with version 0.1.0 all iterating helper functions are capable of handling arrays, array-like collections as well as regular objects and instances of `Map`. For keeping API mostly backward-compatible either kind of collection is resulting in an array by default when filtering or mapping. 

Using supported options it is however possible to get a resulting collection equivalent to provided one by type when providing regular object or an instance of `Map`.

E.g., when mapping an object the result is an array by default:

    PromiseUtil.map( object, mapperCallback ).then( array => ... )

Using option `{ asArray: false }` the result will be an object as well.

    PromiseUtil.map( object, mapperCallback, { asArray: false } ).then( object => ... )


# API

## PromiseUtil.each( collection\<T>, callback, options ) : Promise\<collection\<T>>

Iterates over provided collection of items invoking callback function on every item sequentially. The method returns promise providing _the same_ collection of items given as input when iteration has finished.

Provided callback function is invoked with arguments 

* `item` referring to the currently processed item of collection. If original item is a promise then callback is invoked with the resolution of that promise instead of the promise itself.
* `index` providing the numeric index of item in provided array or the name of provided object's property or provided `Map`'s element.
* `items` referring to the provided collection as a whole.
 
Whenever the callback is returning a promise the iteration is delayed until that promise is resolved. On rejecting that promise the iteration is failing as a whole resulting in a rejection of promise returned by each.

If any item is a promise itself the callback is invoked on result of that promise thus delaying iteration until the promise has resolved. If any such promise is rejected the whole iteration is rejected as well.

This method is a rough counterpart to `Array.forEach()` with support for promises.


## PromiseUtil.some( collection\<T>, callback ) : Promise\<boolean>

This method works basically similar to `PromiseUtil.each()`. It iterates over provided collection of items invoking callback function on every item sequentially. 

The returned promise gets instantly resolved with `true` when an invoked callback function returns `true` or any other _truthy_ value. Otherwise it is resolved with `false` after having iterated over all items in collection.

This method is a rough counterpart to `Array.some()` with support for promises.


## PromiseUtil.every( collection\<T>, callback ) : Promise\<boolean>

This method works basically similar to `PromiseUtil.each()`. It iterates over provided collection of items invoking callback function on every item sequentially. 

The returned promise gets instantly resolved with `false` when an invoked callback function returns `false` or any other _falsy_ value except `null` or `undefined`. Otherwise it is resolved with `true` after having iterated over all items in collection.

This method is a rough counterpart to `Array.every()` with support for promises.


## PromiseUtil.filter( collection\<T>, callback, options ) : Promise\<collection\<T>>

Works similar to `PromiseUtil.each()` but promises a copy of provided collection lacking all those items that got a falsy return value from callback function, either immediately or as result of resolving any promise returned.

This method is a counterpart to `Array.filter()` with support for promises.

The option `{ asArray: false }` may be provided to get a `Map` on providing a `Map` and an object when providing an object. Otherwise the returned collection is always an array.

## PromiseUtil.map( collection\<T>, callback, options ) : Promise\<collection\<T>>

Works similar to `PromiseUtil.each()` but promises a copy of provided collection with results returned from callback invoked on every item in original array.

This method is a counterpart to `Array.map()` with support for promises.

The option `{ asArray: false }` may be provided to get a `Map` on providing a `Map` and an object when providing an object. Otherwise the returned collection is always an array.

## PromiseUtil.multiMap( collection\<T>, callback, options ) : Promise\<collection\<T>>

Works similar to `PromiseUtil.map()` but invokes callback on all provided array elements simultaneously waiting for results using `Promise.all()` instead of iterating over array sequentially.

> This method does not support slicing to limit number of simultaneously processed items and thus might have a significant impact on resource consumption probably resulting in a deadlock  e.g. on reading massive amount of files or reading from high number of sockets in parallel.

The option `{ asArray: false }` may be provided to get a `Map` on providing a `Map` and an object when providing an object. Otherwise the returned collection is always an array.

## PromiseUtil.find( collection\<T>, callback ) : Promise\<T|undefined>

Works similar to `PromiseUtil.each()` but promises first item of collection provided callback function has returned truthy value for. If callback did not return truthy result on any item the returned promise is resolved with `null`.

This method is a counterpart to `Array.find()` with support for promises.

## PromiseUtil.indexOf( collection\<T>, callback ) : Promise\<int>

Works similar to `PromiseUtil.each()` but promises index of first item of array provided callback function has returned truthy value for. If callback did not return truthy result on any item the returned promise is resolved with `-1`.

This method is a counterpart to `Array.indexOf()` with support for promises.

## PromiseUtil.delay( int, T ) : Promise\<T>

This method is a promisified version of `setTimeout()` resolving returned promise after some delay given in milli seconds with value provided as second argument.

    PromiseUtil.delay( 5000, "Hello World!" ).then( msg => console.log( msg ) );

This example will output `Hello World!` on stdout after a rough delay of 5 seconds.

## PromiseUtil.process( Readable, callback ) : Promise\<object>

This method takes a readable stream for reading data from stream and passing it to provided callback for processing. On meeting end of stream the promise is resolved with single object passed as `this` to all invocations of given callback. Callback is considered to provide any arbitrary result in custom properties of that object.

Provided callback may return promise to delay processing of further data read from stream. In that case stream is paused until promise is resolved.

On stream emitting `error` event the promise is rejected. Same applies to callback throwing exception or returning eventually rejected promise. **In either case the stream gets paused.**

```javascript
    const PromiseUtil = require( "promise-essentials" );
    
    function _someHandler( req, res, next ) {
        PromiseTool.process( req, chunk => {
            this.collected = ( this.collected || [] ).concat( [ chunk ] );
        } )
            .then( ( { collected } ) => {
                const reqBody = Buffer.concat( collected ).toString( "utf8" );

                res
                    .status( 200 )
                    .end( reqBody.length > 1024 ? "quite a lot request data" : "send more!" );
            }, error => res.status( 400 ).end() );
    }
```

As of 0.0.3 there is a default processor collecting all read objects/chunks in property `collected` as illustrated in example above so this example may be reduced to read `PromiseTool.process( req ).then( ... )`, only.

## PromiseUtil.promisify( fn, [ bindObject ] ) : fn:Promise

_Promisification_ is the process of converting the signature of some existing asynchronous function so it is returning a promise instead of using some different way of handling asynchronous processing. 

This particular method is converting functions accepting NodeJS-style callback as last argument into function returning promise instead. Returned function is wrapping the provided one. The latter one is invoked internally with custom NodeJS-style callback appended as argument used to resolve or reject returned promise.

    const { stat } = require( "fs" );
    const promisifiedStat = PromiseUtil.promisify( stat );
    
    promisifiedStat( __dirname ).then( info => console.log( info.isDirectory() ) );

Optionally, wrapped function can be bound to additionally provided object on invoking internally. This might be required to promisifying instance methods of objects required to access that instance.

    const promisified = PromiseUtil.promisify( someInstance.method, someInstance );
    
    promisified().then( result => console.log( result ) );

