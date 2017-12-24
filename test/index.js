"use strict";

const Stream = require( "stream" );

const Should = require( "should" );

const PromiseTool = require( ".." );

// ----------------------------------------------------------------------------

suite( "Tools.Promise", function() {
	let input;

	setup( function() {
		input = [
			"*", "-",
			new Promise( function( resolve ) { setTimeout( resolve, 20, "+" ); } ),
			"#", "=", "%", ":"
		];
	} );

	test( "supports sequential, probably delayed iteration using each()", function() {
		let output = [];

		return PromiseTool
			.each( input, function( value, index, items ) {
				Should( index ).be.within( 0, 6 );
				items.should.be.Array();
				items.should.have.length( 7 );

				if ( index % 2 === 0 ) {
					// return instantly
					return output.push( value.repeat( index ) );
				}

				// return after some delay
				return new Promise( resolve => setTimeout( resolve, 20 ) )
					.then( () => output.push( value.repeat( index ) ) );
			} )
			.then( function( result ) {
				// each() is passing initially provided array
				result.should.be.Array();
				result.should.have.length( 7 );
				result.should.be.eql( input );

				// each() is awaiting delayed results of callback
				output.join( "," ).should.be.eql( ",-,++,###,====,%%%%%,::::::" );
			} );
	} );

	test( "supports sequential, probably delayed filtering of array using filter()", function() {
		return PromiseTool
			.filter( input, function( value, index, items ) {
				Should( index ).be.within( 0, 6 );
				items.should.be.Array();
				items.should.have.length( 7 );

				if ( index % 2 === 0 ) {
					// return instantly
					return index % 3 !== 0;
				}

				// return after some delay
				return new Promise( resolve => setTimeout( resolve, 20 ) )
					.then( () => index % 3 !== 0 );
			} )
			.then( function( result ) {
				// filter() is providing reduced set of input values
				result.should.be.Array();
				result.should.have.length( 4 );
				result.should.not.be.eql( input );

				// filter() is keeping original order of items
				result[0].should.be.eql( "-" );
				result[1].should.be.instanceof( Promise );
				result[2].should.be.eql( "=" );
				result[3].should.be.eql( "%" );
			} );
	} );

	test( "supports sequential, probably delayed mapping of array using map()", function() {
		return PromiseTool
			.map( input, function( value, index, items ) {
				Should( index ).be.within( 0, 6 );
				items.should.be.Array();
				items.should.have.length( 7 );

				if ( index % 2 === 0 ) {
					// return instantly
					return value.repeat( index );
				}

				// return after some delay
				return new Promise( resolve => setTimeout( resolve, 20 ) )
					.then( () => value.repeat( index ) );
			} )
			.then( function( result ) {
				// map() is providing set of values different from input though matching its size
				result.should.be.Array();
				result.should.have.length( 7 );
				result.should.not.be.eql( input );

				// map() is keeping original order of items
				result.should.be.eql( [ "", "-", "++", "###", "====", "%%%%%", "::::::" ] );
			} );
	} );

	test( "supports sequential, probably delayed mapping of array using multiMap()", function() {
		return PromiseTool
			.multiMap( input, function( value, index, items ) {
				Should( index ).be.within( 0, 6 );
				items.should.be.Array();
				items.should.have.length( 7 );

				if ( index % 2 === 0 ) {
					// return instantly
					return value.repeat( index );
				}

				// return after some delay
				return new Promise( resolve => setTimeout( resolve, 20 ) )
					.then( () => value.repeat( index ) );
			} )
			.then( function( result ) {
				// map() is providing set of values different from input though matching its size
				result.should.be.Array();
				result.should.have.length( 7 );
				result.should.not.be.eql( input );

				// map() is keeping original order of items
				result.should.be.eql( [ "", "-", "++", "###", "====", "%%%%%", "::::::" ] );
			} );
	} );

	test( "maps faster on using multiMap() than on using map()", function() {
		let rank = 1;

		return Promise.all( [
			PromiseTool.map( input, fastMapper ).then( () => rank++ ),
			PromiseTool.multiMap( input, slowMapper ).then( () => rank++ )
		] )
			.then( function( [ mapped, multiMapped ] ) {
				Should( mapped ).be.exactly( 2 );
				Should( multiMapped ).be.exactly( 1 );
			} );

		/**
		 * Returns promise resolved after 20 milliseconds.
		 *
		 * @returns {Promise}
		 */
		function fastMapper() {
			return new Promise( resolve => setTimeout( resolve, 20 ) );
		}

		/**
		 * Returns promise resolved after 40 milliseconds.
		 *
		 * @returns {Promise}
		 */
		function slowMapper() {
			return new Promise( resolve => setTimeout( resolve, 40 ) );
		}
	} );

	test( "supports sequential, probably delayed search for value", function() {
		let sum = 0;

		return PromiseTool
			.find( input, function( value, index, items ) {
				Should( index ).be.within( 0, 6 );
				items.should.be.Array();
				items.should.have.length( 7 );

				sum += index;

				if ( index % 2 === 0 ) {
					// return instantly
					return value === "%";
				}

				// return after some delay
				return new Promise( resolve => setTimeout( resolve, 20 ) )
					.then( () => value === "%" );
			} )
			.then( function( result ) {
				// find() is providing found value
				result.should.be.String().and.be.equal( "%" );
				Should( sum ).be.equal( 15 );
			} );
	} );

	test( "supports sequential, probably delayed search for value in reverse order", function() {
		let sum = 0;

		return PromiseTool
			.find( input, function( value, index, items ) {
				Should( index ).be.within( 0, 6 );
				items.should.be.Array();
				items.should.have.length( 7 );

				sum += index;

				if ( index % 2 === 0 ) {
					// return instantly
					return value === "%";
				}

				// return after some delay
				return new Promise( resolve => setTimeout( resolve, 20 ) )
					.then( () => value === "%" );
			}, true )
			.then( function( result ) {
				// find() is providing found value
				result.should.be.String().and.be.equal( "%" );
				Should( sum ).be.equal( 11 );
			} );
	} );

	test( "provides null on failed sequential, probably delayed search for value", function() {
		let sum = 0;

		return PromiseTool
			.find( input, function( value, index, items ) {
				Should( index ).be.within( 0, 6 );
				items.should.be.Array();
				items.should.have.length( 7 );

				sum += index;

				if ( index % 2 === 0 ) {
					// return instantly
					return value === "something missing";
				}

				// return after some delay
				return new Promise( resolve => setTimeout( resolve, 20 ) )
					.then( () => value === "something missing" );
			} )
			.then( function( result ) {
				// find() is providing found value
				Should( result ).be.null();
				Should( sum ).be.equal( 21 );
			} );
	} );

	test( "provides null on failed sequential, probably delayed search for value in reverse order", function() {
		let sum = 0;

		return PromiseTool
			.find( input, function( value, index, items ) {
				Should( index ).be.within( 0, 6 );
				items.should.be.Array();
				items.should.have.length( 7 );

				sum += index;

				if ( index % 2 === 0 ) {
					// return instantly
					return value === "something missing";
				}

				// return after some delay
				return new Promise( resolve => setTimeout( resolve, 20 ) )
					.then( () => value === "something missing" );
			}, true )
			.then( function( result ) {
				// find() is providing found value
				Should( result ).be.null();
				Should( sum ).be.equal( 21 );
			} );
	} );

	test( "supports sequential, probably delayed search for index of a value", function() {
		let sum = 0;

		return PromiseTool
			.indexOf( input, function( value, index, items ) {
				Should( index ).be.within( 0, 6 );
				items.should.be.Array();
				items.should.have.length( 7 );

				sum += index;

				if ( index % 2 === 0 ) {
					// return instantly
					return value === "%";
				}

				// return after some delay
				return new Promise( resolve => setTimeout( resolve, 20 ) )
					.then( () => value === "%" );
			} )
			.then( function( result ) {
				// find() is providing found value
				result.should.be.Number().and.be.equal( 5 );
				Should( sum ).be.equal( 15 );
			} );
	} );

	test( "supports sequential, probably delayed search for index of a value in reverse order", function() {
		let sum = 0;

		return PromiseTool
			.indexOf( input, function( value, index, items ) {
				Should( index ).be.within( 0, 6 );
				items.should.be.Array();
				items.should.have.length( 7 );

				sum += index;

				if ( index % 2 === 0 ) {
					// return instantly
					return value === "%";
				}

				// return after some delay
				return new Promise( resolve => setTimeout( resolve, 20 ) )
					.then( () => value === "%" );
			}, true )
			.then( function( result ) {
				// find() is providing found value
				result.should.be.Number().and.be.equal( 5 );
				Should( sum ).be.equal( 11 );
			} );
	} );

	test( "provides -1 on failed sequential, probably delayed search for index of a value", function() {
		let sum = 0;

		return PromiseTool
			.indexOf( input, function( value, index, items ) {
				Should( index ).be.within( 0, 6 );
				items.should.be.Array();
				items.should.have.length( 7 );

				sum += index;

				if ( index % 2 === 0 ) {
					// return instantly
					return value === "something missing";
				}

				// return after some delay
				return new Promise( resolve => setTimeout( resolve, 20 ) )
					.then( () => value === "something missing" );
			} )
			.then( function( result ) {
				// find() is providing found value
				Should( result ).be.Number().and.be.equal( -1 );
				Should( sum ).be.equal( 21 );
			} );
	} );

	test( "provides null on failed sequential, probably delayed search for index of a value in reverse order", function() {
		let sum = 0;

		return PromiseTool
			.indexOf( input, function( value, index, items ) {
				Should( index ).be.within( 0, 6 );
				items.should.be.Array();
				items.should.have.length( 7 );

				sum += index;

				if ( index % 2 === 0 ) {
					// return instantly
					return value === "something missing";
				}

				// return after some delay
				return new Promise( resolve => setTimeout( resolve, 20 ) )
					.then( () => value === "something missing" );
			}, true )
			.then( function( result ) {
				// find() is providing found value
				Should( result ).be.Number().and.be.equal( -1 );
				Should( sum ).be.equal( 21 );
			} );
	} );

	test( "creates promise to conveniently delay processing", function() {
		let start = Date.now();

		return PromiseTool.delay( 100 )
			.then( function() {
				let stop = Date.now();

				// find() is providing found value
				Should( stop - start ).be.approximately( 100, 30 );
			} );
	} );

	test( "resolves on processing no items read from empty stream", function() {
		return PromiseTool.process( _getStreamFromArray(), () => {
			throw new Error( "process() invoked callback on empty string" );
		} );
	} );

	test( "resolves on processing item read from single-item object stream", function() {
		const stream = _getStreamFromArray( { items: [{ foo: 1 }] } );

		return PromiseTool.process( stream, ( item, index, streamRef ) => {
			item.should.be.Object()
				.and.have.size( 1 )
				.and.have.property( "foo" )
				.and.equal( 1 );
			index.should.be.Number()
				.and.equal( 0 );
			streamRef.should.equal( stream );
		} );
	} );

	test( "pauses stream while processing asynchronously", function() {
		let factor = 1;

		const stream = _getStreamFromArray( { items: [ 1, 2, 6, 8, 5 ] } );

		return PromiseTool.process( stream, function( digit, index ) {
			return new Promise( resolve => {
				setTimeout( () => {
					this.number = ( this.number || 0 ) + digit * factor;
					factor *= 10;

					resolve();
				}, ( 6 - index ) * 10 );
			} );
		} )
			.then( result => {
				result.should.be.Object()
					.and.have.size( 1 )
					.and.have.property( "number" )
					.and.equal( 58621 );
			} );
	} );

	test( "processes non-object streams", function() {
		const stream = _getStreamFromArray( {
			objectMode: false,
			items: [
				Buffer.from( "Hello", "utf8" ),
				Buffer.from( " ", "utf8" ),
				Buffer.from( "World", "utf8" ),
				Buffer.from( "!", "utf8" )
			]
		} );

		return PromiseTool.process( stream, function( chunk, index ) {
			return new Promise( resolve => {
				setTimeout( () => {
					this.chunks = ( this.chunks || [] ).concat( [chunk] );

					resolve();
				}, ( 5 - index ) * 10 );
			} );
		} )
			.then( result => {
				result.should.be.Object()
					.and.have.size( 1 )
					.and.have.property( "chunks" )
					.and.be.Array()
					.and.have.size( 4 );

				Buffer.concat( result.chunks ).toString( "utf8" ).should.be.String()
					.and.equal( "Hello World!" );
			} );
	} );

	test( "collects chunks/objects on processing w/o custom processor", function() {
		const stream = _getStreamFromArray( {
			objectMode: false,
			items: [
				Buffer.from( "Hello", "utf8" ),
				Buffer.from( " ", "utf8" ),
				Buffer.from( "World", "utf8" ),
				Buffer.from( "!", "utf8" )
			]
		} );

		return PromiseTool.process( stream )
			.then( result => {
				result.should.be.Object()
					.and.have.size( 1 )
					.and.have.property( "collected" )
					.and.be.Array()
					.and.have.size( 4 );

				Buffer.concat( result.collected ).toString( "utf8" ).should.be.String()
					.and.equal( "Hello World!" );
			} );
	} );

	test( "stops processing on stream error", function() {
		const stream = _getStreamFromArray( {
			objectMode: false,
			items: [
				Buffer.from( "Hello", "utf8" ),
				Buffer.from( " ", "utf8" ),
				Buffer.from( "World", "utf8" ),
				Buffer.from( "!", "utf8" )
			],
			failOnReadingIndex: 2
		} );

		let processed = null;

		return PromiseTool.process( stream, function( chunk, index ) {
			return new Promise( resolve => {
				setTimeout( () => {
					this.chunks = processed = ( this.chunks || [] ).concat( [chunk] );

					resolve();
				}, ( 5 - index ) * 10 );
			} );
		} )
			.then( () => {
				throw new Error( "processing stream should not succeed" );
			}, error => {
				error.should.be.Object().and.have.property( "code" ).and.equal( "EDESIRED" );

				Buffer.concat( processed ).toString( "utf8" ).should.be.String()
					.and.equal( "Hello " );
			} );
	} );

	test( "promisifies function of NodeJS library", function() {
		const { stat } = require( "fs" );

		stat.should.be.Function();

		const promisifiedStat = PromiseTool.promisify( stat );

		promisifiedStat.should.be.Function();

		const promise = promisifiedStat( __dirname );

		return promise.should.be.Promise().which.is.fulfilled();
	} );

	test( "returns rejected promise on calling promisified function of NodeJS library expected to fail", function() {
		const { stat } = require( "fs" );

		const promisifiedStat = PromiseTool.promisify( stat );

		const promise = promisifiedStat( require( "path" ).join( __dirname, "lots.of.nonsense.name.garbage" ) );

		return promise.should.be.Promise().which.is.rejected();
	} );

	test( "supports context object for binding promisified function to", function() {
		/**
		 * Implements some test function accepting NodeJS-style callback.
		 *
		 * @param {function(Error,*)} cb NodeJS-style callback
		 */
		function theFunction( cb ) {
			setTimeout( cb, 100, null, ( this || {} ).theValue || "not found" );
		}

		const context = { theValue: "found" };

		const promisifiedUnboundFunction = PromiseTool.promisify( theFunction );
		const promisifiedBoundFunction = PromiseTool.promisify( theFunction, context );

		const unboundPromise = promisifiedUnboundFunction();
		const boundPromise = promisifiedBoundFunction();

		return Promise.all( [ unboundPromise, boundPromise ] )
			.should.be.fulfilledWith( [ "not found", "found" ] );
	} );

	/**
	 * Returns readable stream for reading from optionally provided array of
	 * items.
	 *
	 * @param {boolean} objectMode true to get object stream
	 * @param {int} highWaterMark number of objects of bytes (in non-object stream) to prefetch
	 * @param {Array} items set of objects or buffers to feed stream
	 * @param {int} failOnReadingIndex index of item in `items` that shouldn't be readable, for simulating stream error
	 * @returns {Readable}
	 * @private
	 */
	function _getStreamFromArray( { objectMode = true, highWaterMark = 1, items = [], failOnReadingIndex = null } = {} ) {
		let readIndex = 0;

		return new Stream.Readable( {
			objectMode,
			highWaterMark,

			read: function() {
				if ( readIndex === failOnReadingIndex ) {
					process.nextTick( () => this.emit( "error", Object.assign( new Error( "failed on reading" ), { code: "EDESIRED" } ) ) );
					return;
				}

				if ( readIndex === items.length ) {
					this.push( null );
				} else {
					this.push( items[readIndex++] );
				}
			}
		} );
	}
} );
