# promise-essentials [![Build Status](https://travis-ci.org/cepharum/promise-essentials.svg?branch=master)](https://travis-ci.org/cepharum/promise-essentials)

essential helpers for use with natively supported promises

# About

This packages provides a simple, non-invasive set of methods to support day to day use of natively supported promises. It is simple by means of requiring some certain API instead of trying to deal with several kinds of invocations to limit required code.

This tool set has been extracted from [hitchy framework](https://hitchyjs.github.io/) to be used in packages less tightly bound to hitchy framework.

# Installation

    npm i -S promise-essentials

# Usage

    const File = require( "fs" );
    const PromiseTools = require( "promise-essentials" );
    
    PromiseTools.find( [ "file1.txt", null, "file2.txt", "file3.txt" ], fname => {
        if ( !fname ) {
            return false;
        }

        return new Promise( ( resolve, reject ) => {
            File.readFile( fname, ( error, content ) => {
                if ( error ) {
                    error.code === "ENOENT" ? resolve() : reject( error );
                } else {
                    resolve( content.toString().indexOf( "needle" ) > -1 );
                }
            } );
        } );
    } )
        .then( foundFileName => console.log( foundFileName ) ); 

# API

## PromiseTools.each( Array\<T>, callback ) : Promise\<Array\<T>>

Iterates over provided array of items invoking callback function on every item sequentially. The method returns promise providing the same array of items given as input when iteration has finished.

Provided callback function is invoked with arguments 

* `item` referring to the currently processed item of array. If item is a promise then callback is invoked with the result of that promise instead of the promise itself.
* `index` providing the numeric index of item in provided array.
* `items` referring to the provided array as a whole.
 
On callback returning promise iteration is delayed until that promise is resolved. On rejecting promise iteration is cancelled resulting in a rejection of returned promise.

If any item is a promise itself the callback is invoked on result of that promise thus delaying iteration until the promise has resolved. If any such promise is rejected the whole iteration is rejected as well.

This method is a rough counterpart to `Array.forEach()` with support for promises.

## PromiseTools.filter( Array\<T>, callback ) : Promise\<Array\<T>>

Works similar to `PromiseTools.each()` but promises a copy of provided array lacking all those items that got a falsy return value from callback function, either immediately or as result of resolved promise returned.

This method is a counterpart to `Array.filter()` with support for promises.

## PromiseTools.map( Array\<T>, callback ) : Promise\<Array\<T>>

Works similar to `PromiseTools.each()` but promises a copy of provided array with results returned from callback invoked on every item in original array.

This method is a counterpart to `Array.map()` with support for promises.

## PromiseTools.multiMap( Array\<T>, callback ) : Promise\<Array\<T>>

Works similar to `PromiseTools.map()` but invokes callback on all provided array elements simultaneously waiting for results using `Promise.all()` instead of iterating over array sequentially.

> This method does not support slicing to limit number of simultaneously processed items and thus might have a significant impact on resource consumption probably resulting in a deadlock  e.g. on reading massive amount of files or reading from high number of sockets in parallel.

## PromiseTools.find( Array\<T>, callback ) : Promise\<T|null>

Works similar to `PromiseTools.each()` but promises first item of array provided callback function has returned truthy value for. If callback did not return truthy result on any item the returned promise is resolved with `null`.

This method is a counterpart to `Array.find()` with support for promises.

## PromiseTools.find( Array\<T>, callback ) : Promise\<int>

Works similar to `PromiseTools.each()` but promises index of first item of array provided callback function has returned truthy value for. If callback did not return truthy result on any item the returned promise is resolved with `-1`.

This method is a counterpart to `Array.indexOf()` with support for promises.

## PromiseTools.delay( int, T ) : Promise\<T>

This method is a promisified version of `setTimeout()` resolving returned promise after some delay given in milli seconds with value provided as second argument.

    PromiseTools.delay( 5000, "Hello World!" ).then( msg => console.log( msg ) );

This example will output `Hello World!` on stdout after a rough delay of 5 seconds.

## PromiseTools.process( Readable, callback ) : Promise\<object>

This method takes a readable stream for reading data from stream and passing it to provided callback for processing. On meeting end of stream the promise is resolved with single object passed as `this` to all invocations of given callback. Callback is considered to provide any arbitrary result in custom properties of that object.

Provided callback may return promise to delay processing of further data read from stream. In that case stream is paused until promise is resolved.

On stream emitting `error` event the promise is rejected. Same applies to callback throwing exception or returning eventually rejected promise. **In either case the stream gets paused.**

```javascript
    const PromiseTools = require( "promise-essentials" );
    
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

## PromiseTools.promisify( fn, [ bindObject ] ) : fn:Promise

_Promisification_ is the process of converting the signature of some existing asynchronous function so it is returning a promise instead of using some different way of handling asynchronous processing. 

This particular method is converting functions accepting NodeJS-style callback as last argument into function returning promise instead. Returned function is wrapping the provided one. The latter one is invoked internally with custom NodeJS-style callback appended as argument used to resolve or reject returned promise.

    const { stat } = require( "fs" );
    const promisifiedStat = PromiseTools.promisify( stat );
    
    promisifiedStat( __dirname ).then( info => console.log( info.isDirectory() ) );

Optionally, wrapped function can be bound to additionally provided object on invoking internally. This might be required to promisifying instance methods of objects required to access that instance.

    const promisified = PromiseTools.promisify( someInstance.method, someInstance );
    
    promisified().then( result => console.log( result ) );

# License

[MIT](LICENSE)
