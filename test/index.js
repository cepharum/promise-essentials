"use strict";

const Stream = require( "stream" );

const { describe, beforeEach, it } = require( "mocha" );
const Should = require( "should" );

const PromiseUtil = require( ".." );

// ----------------------------------------------------------------------------

describe( "PromiseUtil", function() {
	let sortedList;
	let object;
	let map;

	beforeEach( function() {
		sortedList = [
			"*", "-",
			new Promise( function( resolve ) { setTimeout( resolve, 20, "+" ); } ),
			"#", "=", "%", ":"
		];

		object = {
			key1: "one",
			key2: new Promise( resolve => setTimeout( resolve, 10, "two" ) ),
			key3: "three",
		};

		map = new Map( [
			[ "first", "one" ],
			[ "second", new Promise( resolve => setTimeout( resolve, 10, "two" ) ) ],
			[ "third", "three" ],
		] );
	} );

	describe( ".each()", () => {
		it( "supports sequential, probably delayed iteration over array", function() {
			const output = [];

			return PromiseUtil
				.each( sortedList, function( value, index, items ) {
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
				.then( result => {
					// each() is passing initially provided array
					result.should.be.Array();
					result.should.have.length( 7 );
					result.should.be.eql( sortedList );

					// each() is awaiting delayed results of callback
					output.join( "," ).should.be.eql( ",-,++,###,====,%%%%%,::::::" );
				} );
		} );

		it( "supports sequential, probably delayed iteration over object", function() {
			const output = [];

			return PromiseUtil
				.each( object, ( value, index, items ) => {
					index.should.be.String().and.match( /^key[1-3]$/ );
					items.should.be.Object().which.has.size( 3 );

					if ( index !== "key1" ) {
						// return instantly
						return output.push( value );
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => output.push( value ) );
				} )
				.then( result => {
					// each() is passing initially provided array
					result.should.be.Object().which.has.size( 3 ).and.is.equal( object );

					// each() is awaiting delayed results of callback
					output.should
						.containEql( "one" ).and
						.containEql( "two" ).and
						.containEql( "three" ).and
						.have.length( 3 );
				} );
		} );

		it( "supports sequential, probably delayed iteration over Map", function() {
			const output = [];

			return PromiseUtil
				.each( map, ( value, index, items ) => {
					index.should.be.String().and.match( /^(first|second|third)$/ );
					items.should.be.instanceOf( Map ).and.have.size( 3 );

					if ( index !== "first" ) {
						// return instantly
						return output.push( value );
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => output.push( value ) );
				} )
				.then( result => {
					// each() is passing initially provided array
					result.should.be.instanceOf( Map ).and.have.size( 3 ).and.is.equal( map );

					// each() is awaiting delayed results of callback
					output.join( "," ).should.equal( "one,two,three" );
				} );
		} );
	} );

	describe( ".some()", () => {
		it( "detects if at least one item of array satisfies provided callback", function() {
			return PromiseUtil
				.some( sortedList, function( value, index, items ) {
					Should( index ).be.within( 0, 6 );
					items.should.be.Array();
					items.should.have.length( 7 );

					return index === 3;
				} )
				.then( result => {
					result.should.be.true();

					return PromiseUtil.some( sortedList, v => v === "=" );
				} )
				.then( result => {
					result.should.be.true();

					return PromiseUtil.some( sortedList, v => v === "missing" );
				} )
				.then( result => {
					result.should.be.false();

					return PromiseUtil.some( sortedList, v => v === "+" );
				} )
				.then( result => {
					result.should.be.true();
				} );
		} );

		it( "detects if at least one own property of object has a value satisfying provided callback", function() {
			return PromiseUtil
				.some( object, ( value, index, items ) => {
					index.should.be.String().and.match( /^key[1-3]$/ );
					items.should.be.Object().which.has.size( 3 );

					return index === "key1";
				} )
				.then( result => {
					result.should.be.true();

					return PromiseUtil.some( object, v => v === "three" );
				} )
				.then( result => {
					result.should.be.true();

					return PromiseUtil.some( object, v => v === "missing" );
				} )
				.then( result => {
					result.should.be.false();

					return PromiseUtil.some( object, v => v === "two" );
				} )
				.then( result => {
					result.should.be.true();
				} );
		} );

		it( "detects if at least one element of Map has a value satisfying provided callback", function() {
			return PromiseUtil
				.some( map, ( value, index, items ) => {
					index.should.be.String().and.match( /^(first|second|third)$/ );
					items.should.be.Object().which.has.size( 3 );

					return index === "first";
				} )
				.then( result => {
					result.should.be.true();

					return PromiseUtil.some( map, v => v === "three" );
				} )
				.then( result => {
					result.should.be.true();

					return PromiseUtil.some( map, v => v === "missing" );
				} )
				.then( result => {
					result.should.be.false();

					return PromiseUtil.some( map, v => v === "two" );
				} )
				.then( result => {
					result.should.be.true();
				} );
		} );
	} );

	describe( ".every()", () => {
		it( "detects if all items of array satisfy provided callback", function() {
			return PromiseUtil
				.every( sortedList, function( value, index, items ) {
					items.should.be.Array();
					items.should.have.length( 7 );

					return index > -1 && index < 7;
				} )
				.then( result => {
					result.should.be.true();

					return PromiseUtil.every( sortedList, v => typeof v === "string" );
				} )
				.then( result => {
					result.should.be.true();

					return PromiseUtil.every( sortedList, v => v !== ":" );
				} )
				.then( result => {
					result.should.be.false();

					return PromiseUtil.every( sortedList, v => v !== "+" );
				} )
				.then( result => {
					result.should.be.false();
				} );
		} );

		it( "detects if all own properties of object have a value satisfying provided callback", function() {
			return PromiseUtil
				.every( object, ( value, index, items ) => {
					index.should.be.String();
					items.should.be.Object().which.has.size( 3 );

					return index.match( /^key\d$/ );
				} )
				.then( result => {
					result.should.be.true();

					return PromiseUtil.every( object, v => typeof v === "string" );
				} )
				.then( result => {
					result.should.be.true();

					return PromiseUtil.every( object, v => v !== "three" );
				} )
				.then( result => {
					result.should.be.false();

					return PromiseUtil.every( object, v => v !== "two" );
				} )
				.then( result => {
					result.should.be.false();
				} );
		} );

		it( "detects if at least one element of Map has a value satisfying provided callback", function() {
			return PromiseUtil
				.every( map, ( value, index, items ) => {
					index.should.be.String();
					items.should.be.Object().which.has.size( 3 );

					return index.match( /^(first|second|third)$/ );
				} )
				.then( result => {
					result.should.be.true();

					return PromiseUtil.every( map, v => typeof v === "string" );
				} )
				.then( result => {
					result.should.be.true();

					return PromiseUtil.every( map, v => v !== "three" );
				} )
				.then( result => {
					result.should.be.false();

					return PromiseUtil.every( map, v => v !== "two" );
				} )
				.then( result => {
					result.should.be.false();
				} );
		} );
	} );

	describe( ".filter()", () => {
		it( "supports sequential, probably delayed filtering of array into array", function() {
			return PromiseUtil
				.filter( sortedList, ( value, index, items ) => {
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
				.then( result => {
					// filter() is providing reduced set of input values
					result.should.be.Array();
					result.should.have.length( 4 );
					result.should.not.be.eql( sortedList );

					// filter() is keeping original order of items
					result[0].should.be.eql( "-" );
					result[1].should.be.instanceof( Promise );
					result[2].should.be.eql( "=" );
					result[3].should.be.eql( "%" );
				} );
		} );

		it( "supports sequential, probably delayed filtering of object into array", function() {
			return PromiseUtil
				.filter( object, ( value, index, items ) => {
					index.should.be.String().and.match( /^key[1-3]$/ );
					items.should.be.Object().which.has.size( 3 );

					if ( index !== "key1" ) {
						// return instantly
						return true;
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => false );
				} )
				.then( result => {
					// filter() is providing reduced set of input values
					result.should.be.Array().which.has.length( 2 );
					result.filter( v => v === "three" ).should.have.length( 1 );
					return Promise.all( result.filter( v => v instanceof Promise ) ).should.be.resolvedWith( ["two"] );
				} );
		} );

		it( "supports sequential, probably delayed filtering of object into object", function() {
			return PromiseUtil
				.filter( object, ( value, index, items ) => {
					index.should.be.String().and.match( /^key[1-3]$/ );
					items.should.be.Object().which.has.size( 3 );

					if ( index !== "key1" ) {
						// return instantly
						return true;
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => false );
				}, { asArray: false } )
				.then( result => {
					// filter() is providing reduced set of input values
					result.should.be.Object().which.has.size( 2 );
					result.key3.should.be.equal( "three" );
					return result.key2.should.be.resolvedWith( "two" );
				} );
		} );

		it( "supports sequential, probably delayed filtering of Map into array", function() {
			return PromiseUtil
				.filter( map, ( value, index, items ) => {
					index.should.be.String().and.match( /^(first|second|third)$/ );
					items.should.be.instanceOf( Map ).and.have.size( 3 );

					if ( index !== "first" ) {
						// return instantly
						return true;
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => false );
				} )
				.then( result => {
					// filter() is providing reduced set of input values
					result.should.be.Array().which.has.length( 2 );
					result[1].should.be.equal( "three" );
					return result[0].should.be.resolvedWith( "two" );
				} );
		} );

		it( "supports sequential, probably delayed filtering of Map into Map", function() {
			return PromiseUtil
				.filter( map, ( value, index, items ) => {
					index.should.be.String().and.match( /^(first|second|third)$/ );
					items.should.be.instanceOf( Map ).and.have.size( 3 );

					if ( index !== "first" ) {
						// return instantly
						return true;
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => false );
				}, { asArray: false } )
				.then( result => {
					// filter() is providing reduced set of input values
					result.should.be.instanceOf( Map ).which.has.size( 2 );
					result.get( "third" ).should.be.equal( "three" );
					return result.get( "second" ).should.be.resolvedWith( "two" );
				} );
		} );
	} );

	describe( ".map()", () => {
		it( "supports sequential, probably delayed mapping of array into array", function() {
			return PromiseUtil
				.map( sortedList, function( value, index, items ) {
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
					result.should.not.be.eql( sortedList );

					// map() is keeping original order of items
					result.should.be.eql( [ "", "-", "++", "###", "====", "%%%%%", "::::::" ] );
				} );
		} );

		it( "supports sequential, probably delayed mapping of object into array", function() {
			return PromiseUtil
				.map( object, ( value, index, items ) => {
					index.should.be.String().and.match( /^key[1-3]$/ );
					items.should.be.Object().which.has.size( 3 );

					if ( index !== "key1" ) {
						// return instantly
						return value;
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value );
				} )
				.then( result => {
					// map() is providing set of values different from input though matching its size
					result.should.be.Array().which.containDeep( [ "one", "two", "three" ] ).and.has.length( 3 );
				} );
		} );

		it( "supports sequential, probably delayed mapping of object into object", function() {
			return PromiseUtil
				.map( object, ( value, index, items ) => {
					index.should.be.String().and.match( /^key[1-3]$/ );
					items.should.be.Object().which.has.size( 3 );

					if ( index !== "key1" ) {
						// return instantly
						return value;
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value );
				}, { asArray: false } )
				.then( result => {
					// map() is providing set of values different from input though matching its size
					result.should.be.Object().which.is.deepEqual( {
						key1: "one",
						key2: "two",
						key3: "three",
					} );
				} );
		} );

		it( "supports sequential, probably delayed mapping of Map into array", function() {
			return PromiseUtil
				.map( map, ( value, index, items ) => {
					index.should.be.String().and.match( /^(first|second|third)$/ );
					items.should.be.instanceOf( Map ).and.have.size( 3 );

					if ( index !== "first" ) {
						// return instantly
						return value;
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value );
				} )
				.then( result => {
					// map() is providing set of values different from input though matching its size
					result.should.be.Array().which.is.deepEqual( [ "one", "two", "three" ] );
				} );
		} );

		it( "supports sequential, probably delayed mapping of Map into Map", function() {
			return PromiseUtil
				.map( map, ( value, index, items ) => {
					index.should.be.String().and.match( /^(first|second|third)$/ );
					items.should.be.instanceOf( Map ).and.have.size( 3 );

					if ( index !== "first" ) {
						// return instantly
						return value;
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value );
				}, { asArray: false } )
				.then( result => {
					// map() is providing set of values different from input though matching its size
					result.should.be.instanceOf( Map ).which.has.size( 3 );
					result.get( "first" ).should.be.equal( "one" );
					result.get( "second" ).should.be.equal( "two" );
					result.get( "third" ).should.be.equal( "three" );
				} );
		} );
	} );

	describe( ".multiMap()", () => {
		it( "supports sequential, probably delayed mapping of array into array", function() {
			return PromiseUtil
				.multiMap( sortedList, function( value, index, items ) {
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
					result.should.not.be.eql( sortedList );

					// map() is keeping original order of items
					result.should.be.eql( [ "", "-", "++", "###", "====", "%%%%%", "::::::" ] );
				} );
		} );

		it( "supports sequential, probably delayed mapping of object into array", function() {
			return PromiseUtil
				.multiMap( object, ( value, index, items ) => {
					index.should.be.String().and.match( /^key[1-3]$/ );
					items.should.be.Object().which.has.size( 3 );

					if ( index !== "key1" ) {
						// return instantly
						return value;
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value );
				} )
				.then( result => {
					// map() is providing set of values different from input though matching its size
					result.should.be.Array().which.containDeep( [ "one", "two", "three" ] ).and.has.length( 3 );
				} );
		} );

		it( "supports sequential, probably delayed mapping of object into object", function() {
			return PromiseUtil
				.multiMap( object, ( value, index, items ) => {
					index.should.be.String().and.match( /^key[1-3]$/ );
					items.should.be.Object().which.has.size( 3 );

					if ( index !== "key1" ) {
						// return instantly
						return value;
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value );
				}, { asArray: false } )
				.then( result => {
					// map() is providing set of values different from input though matching its size
					result.should.be.Object().which.has.size( 3 ).and.deepEqual( {
						key1: "one",
						key2: "two",
						key3: "three",
					} );
				} );
		} );

		it( "supports sequential, probably delayed mapping of Map into array", function() {
			return PromiseUtil
				.multiMap( map, ( value, index, items ) => {
					index.should.be.String().and.match( /^(first|second|third)$/ );
					items.should.be.instanceOf( Map ).and.have.size( 3 );

					if ( index !== "first" ) {
						// return instantly
						return value;
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value );
				} )
				.then( result => {
					// map() is providing set of values different from input though matching its size
					result.should.be.Array().and.deepEqual( [ "one", "two", "three" ] );
				} );
		} );

		it( "supports sequential, probably delayed mapping of Map into Map", function() {
			return PromiseUtil
				.multiMap( map, ( value, index, items ) => {
					index.should.be.String().and.match( /^(first|second|third)$/ );
					items.should.be.instanceOf( Map ).and.have.size( 3 );

					if ( index !== "first" ) {
						// return instantly
						return value;
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value );
				}, { asArray: false } )
				.then( result => {
					// map() is providing set of values different from input though matching its size
					result.should.be.instanceOf( Map ).which.has.size( 3 );
					result.get( "first" ).should.be.equal( "one" );
					result.get( "second" ).should.be.equal( "two" );
					result.get( "third" ).should.be.equal( "three" );
				} );
		} );

		it( "is faster than map() on mapping array", function() {
			let rank = 1;

			return Promise.all( [
				PromiseUtil.map( sortedList, fastMapper ).then( () => rank++ ),
				PromiseUtil.multiMap( sortedList, slowMapper ).then( () => rank++ )
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

		it( "is faster than map() on mapping object into array", function() {
			let rank = 1;

			return Promise.all( [
				PromiseUtil.map( object, fastMapper ).then( () => rank++ ),
				PromiseUtil.multiMap( object, slowMapper ).then( () => rank++ )
			] )
				.then( ( [ mapped, multiMapped ] ) => {
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

		it( "is faster than map() on mapping object into object", function() {
			let rank = 1;

			return Promise.all( [
				PromiseUtil.map( object, fastMapper, { asArray: false } ).then( () => rank++ ),
				PromiseUtil.multiMap( object, slowMapper, { asArray: false } ).then( () => rank++ )
			] )
				.then( ( [ mapped, multiMapped ] ) => {
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

		it( "is faster than map() on mapping Map into array", function() {
			let rank = 1;

			return Promise.all( [
				PromiseUtil.map( map, fastMapper ).then( () => rank++ ),
				PromiseUtil.multiMap( map, slowMapper ).then( () => rank++ )
			] )
				.then( ( [ mapped, multiMapped ] ) => {
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

		it( "is faster than map() on mapping Map into Map", function() {
			let rank = 1;

			return Promise.all( [
				PromiseUtil.map( map, fastMapper, { asArray: false } ).then( () => rank++ ),
				PromiseUtil.multiMap( map, slowMapper, { asArray: false } ).then( () => rank++ )
			] )
				.then( ( [ mapped, multiMapped ] ) => {
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
	} );

	describe( ".find()", () => {
		it( "supports sequential, probably delayed search for value in array", function() {
			let sum = 0;

			return PromiseUtil
				.find( sortedList, ( value, index, items ) => {
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
				.then( result => {
					// find() is providing found value
					result.should.be.String().and.be.equal( "%" );
					Should( sum ).be.equal( 15 );
				} );
		} );

		it( "supports sequential, probably delayed search for value in object", function() {
			return PromiseUtil
				.find( object, ( value, index, items ) => {
					index.should.be.String().and.match( /^key[1-3]$/ );
					items.should.be.Object().which.has.size( 3 );

					if ( index !== "key1" ) {
						// return instantly
						return value === "three";
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value === "three" );
				} )
				.then( result => {
					// find() is providing found value
					result.should.be.String().and.be.equal( "three" );
				} );
		} );

		it( "supports sequential, probably delayed search for value in Map", function() {
			let sum = 0;

			return PromiseUtil
				.find( map, ( value, index, items ) => {
					index.should.be.String().and.match( /^(first|second|third)$/ );
					items.should.be.instanceOf( Map ).and.have.size( 3 );

					sum++;

					if ( index !== "first" ) {
						// return instantly
						return value === "three";
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value === "three" );
				} )
				.then( result => {
					// find() is providing found value
					result.should.be.String().and.be.equal( "three" );
					Should( sum ).be.equal( 3 );
				} );
		} );

		it( "supports sequential, probably delayed search IN REVERSE ORDER for value in array", function() {
			let sum = 0;

			return PromiseUtil
				.find( sortedList, ( value, index, items ) => {
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
				}, { getLast: true } )
				.then( result => {
					// find() is providing found value
					result.should.be.String().and.be.equal( "%" );
					Should( sum ).be.equal( 11 );
				} );
		} );

		it( "supports sequential, probably delayed search IN REVERSE ORDER for value in object", function() {
			return PromiseUtil
				.find( object, ( value, index, items ) => {
					index.should.be.String().and.match( /^key[1-3]$/ );
					items.should.be.Object().which.has.size( 3 );

					if ( index !== "key1" ) {
						// return instantly
						return value === "one";
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value === "one" );
				}, true )
				.then( result => {
					// find() is providing found value
					result.should.be.String().and.be.equal( "one" );
				} );
		} );

		it( "supports sequential, probably delayed search IN REVERSE ORDER for value in Map", function() {
			let sum = 0;

			return PromiseUtil
				.find( map, ( value, index, items ) => {
					index.should.be.String().and.match( /^(first|second|third)$/ );
					items.should.be.instanceOf( Map ).and.have.size( 3 );

					sum++;

					if ( index !== "first" ) {
						// return instantly
						return value === "one";
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value === "one" );
				}, { getLast: true } )
				.then( result => {
					// find() is providing found value
					result.should.be.String().and.be.equal( "one" );
					Should( sum ).be.equal( 3 );
				} );
		} );

		it( "provides `undefined` on failed sequential, probably delayed search for value in array", function() {
			let sum = 0;

			return PromiseUtil
				.find( sortedList, ( value, index, items ) => {
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
				.then( result => {
					// find() is providing found value
					Should( result ).be.undefined();
					Should( sum ).be.equal( 21 );
				} );
		} );

		it( "provides `undefined` on failed sequential, probably delayed search for value in object", function() {
			let sum = 0;

			return PromiseUtil
				.find( object, ( value, index, items ) => {
					index.should.be.String().and.match( /^key[1-3]$/ );
					items.should.be.Object().which.has.size( 3 );

					sum++;

					if ( index !== "key1" ) {
						// return instantly
						return value === "something missing";
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value === "something missing" );
				} )
				.then( result => {
					// find() is providing found value
					Should( result ).be.undefined();
					Should( sum ).be.equal( 3 );
				} );
		} );

		it( "provides `undefined` on failed sequential, probably delayed search for value in Map", function() {
			let sum = 0;

			return PromiseUtil
				.find( map, ( value, index, items ) => {
					index.should.be.String().and.match( /^(first|second|third)$/ );
					items.should.be.instanceOf( Map ).and.have.size( 3 );

					sum++;

					if ( index !== "first" ) {
						// return instantly
						return value === "something missing";
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value === "something missing" );
				} )
				.then( result => {
					// find() is providing found value
					Should( result ).be.undefined();
					Should( sum ).be.equal( 3 );
				} );
		} );

		it( "provides `undefined` on failed sequential, probably delayed search IN REVERSE ORDER for value in array", function() {
			let sum = 0;

			return PromiseUtil
				.find( sortedList, ( value, index, items ) => {
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
				.then( result => {
					// find() is providing found value
					Should( result ).be.undefined();
					Should( sum ).be.equal( 21 );
				} );
		} );

		it( "provides `undefined` on failed sequential, probably delayed search IN REVERSE ORDER for value in object", function() {
			let sum = 0;

			return PromiseUtil
				.find( object, ( value, index, items ) => {
					index.should.be.String().and.match( /^key[1-3]$/ );
					items.should.be.Object().which.has.size( 3 );

					sum++;

					if ( index !== "key1" ) {
						// return instantly
						return value === "something missing";
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value === "something missing" );
				}, true )
				.then( result => {
					// find() is providing found value
					Should( result ).be.undefined();
					Should( sum ).be.equal( 3 );
				} );
		} );

		it( "provides `undefined` on failed sequential, probably delayed search IN REVERSE ORDER for value in Map", function() {
			let sum = 0;

			return PromiseUtil
				.find( map, ( value, index, items ) => {
					index.should.be.String().and.match( /^(first|second|third)$/ );
					items.should.be.instanceOf( Map ).and.have.size( 3 );

					sum++;

					if ( index !== "first" ) {
						// return instantly
						return value === "something missing";
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value === "something missing" );
				}, true )
				.then( result => {
					// find() is providing found value
					Should( result ).be.undefined();
					Should( sum ).be.equal( 3 );
				} );
		} );
	} );

	describe( ".indexOf()", () => {
		it( "supports sequential, probably delayed search for index of a value in array", function() {
			let sum = 0;

			return PromiseUtil
				.indexOf( sortedList, ( value, index, items ) => {
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
				.then( result => {
					// find() is providing found value
					result.should.be.Number().and.be.equal( 5 );
					Should( sum ).be.equal( 15 );
				} );
		} );

		it( "supports sequential, probably delayed search for name of an object's own property", function() {
			return PromiseUtil
				.indexOf( object, ( value, index, items ) => {
					index.should.be.String().and.match( /^key[1-3]$/ );
					items.should.be.Object().which.has.size( 3 );

					if ( index !== "key1" ) {
						// return instantly
						return value === "three";
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value === "three" );
				} )
				.then( result => {
					// find() is providing found value
					result.should.equal( "key3" );
				} );
		} );

		it( "supports sequential, probably delayed search for key of a Map's element", function() {
			let sum = 0;

			return PromiseUtil
				.indexOf( map, ( value, index, items ) => {
					index.should.be.String().and.match( /^(first|second|third)$/ );
					items.should.be.instanceOf( Map ).and.have.size( 3 );

					sum++;

					if ( index !== "first" ) {
						// return instantly
						return value === "three";
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value === "three" );
				} )
				.then( result => {
					// find() is providing found value
					result.should.equal( "third" );
					Should( sum ).be.equal( 3 );
				} );
		} );

		it( "supports sequential, probably delayed search IN REVERSE ORDER for index of a value in array", function() {
			let sum = 0;

			return PromiseUtil
				.indexOf( sortedList, ( value, index, items ) => {
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
				}, { getLast: true } )
				.then( result => {
					// find() is providing found value
					result.should.be.Number().and.be.equal( 5 );
					Should( sum ).be.equal( 11 );
				} );
		} );

		it( "supports sequential, probably delayed search IN REVERSE ORDER for name of an object's own property", function() {
			return PromiseUtil
				.indexOf( object, ( value, index, items ) => {
					index.should.be.String().and.match( /^key[1-3]$/ );
					items.should.be.Object().which.has.size( 3 );

					if ( index !== "key1" ) {
						// return instantly
						return value === "one";
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value === "one" );
				}, { getLast: true } )
				.then( result => {
					// find() is providing found value
					result.should.equal( "key1" );
				} );
		} );

		it( "supports sequential, probably delayed search IN REVERSE ORDER for key of a Map's element", function() {
			let sum = 0;

			return PromiseUtil
				.indexOf( map, ( value, index, items ) => {
					index.should.be.String().and.match( /^(first|second|third)$/ );
					items.should.be.instanceOf( Map ).and.have.size( 3 );

					sum++;

					if ( index !== "first" ) {
						// return instantly
						return value === "one";
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value === "one" );
				}, { getLast: true } )
				.then( result => {
					// find() is providing found value
					result.should.equal( "first" );
					Should( sum ).be.equal( 3 );
				} );
		} );

		it( "provides -1 on failed sequential, probably delayed search for index of a value in array", function() {
			let sum = 0;

			return PromiseUtil
				.indexOf( sortedList, ( value, index, items ) => {
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
				.then( result => {
					// find() is providing found value
					Should( result ).be.Number().and.be.equal( -1 );
					Should( sum ).be.equal( 21 );
				} );
		} );

		it( "provides `undefined` on failed sequential, probably delayed search for name of an object's own property", function() {
			let sum = 0;

			return PromiseUtil
				.indexOf( object, ( value, index, items ) => {
					index.should.be.String().and.match( /^key[1-3]$/ );
					items.should.be.Object().which.has.size( 3 );

					sum++;

					if ( index !== "key1" ) {
						// return instantly
						return value === "something missing";
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value === "something missing" );
				} )
				.then( result => {
					// find() is providing found value
					Should( result ).be.undefined();
					Should( sum ).be.equal( 3 );
				} );
		} );

		it( "provides `undefined` on failed sequential, probably delayed search for key of a Map's element", function() {
			let sum = 0;

			return PromiseUtil
				.indexOf( map, ( value, index, items ) => {
					index.should.be.String().and.match( /^(first|second|third)$/ );
					items.should.be.instanceOf( Map ).and.have.size( 3 );

					sum++;

					if ( index !== "first" ) {
						// return instantly
						return value === "something missing";
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value === "something missing" );
				} )
				.then( result => {
					// find() is providing found value
					Should( result ).be.undefined();
					Should( sum ).be.equal( 3 );
				} );
		} );

		it( "provides -1 on failed sequential, probably delayed search IN REVERSE ORDER for index of a value in array", function() {
			let sum = 0;

			return PromiseUtil
				.indexOf( sortedList, function( value, index, items ) {
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

		it( "provides `undefined` on failed sequential, probably delayed search IN REVERSE ORDER for name of an object's own property", function() {
			let sum = 0;

			return PromiseUtil
				.indexOf( object, ( value, index, items ) => {
					index.should.be.String().and.match( /^key[1-3]$/ );
					items.should.be.Object().which.has.size( 3 );

					sum++;

					if ( index !== "key1" ) {
						// return instantly
						return value === "something missing";
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value === "something missing" );
				}, true )
				.then( result => {
					// find() is providing found value
					Should( result ).be.undefined();
					Should( sum ).be.equal( 3 );
				} );
		} );

		it( "provides `undefined` on failed sequential, probably delayed search IN REVERSE ORDER for key of a Map's element", function() {
			let sum = 0;

			return PromiseUtil
				.indexOf( map, ( value, index, items ) => {
					index.should.be.String().and.match( /^(first|second|third)$/ );
					items.should.be.instanceOf( Map ).and.have.size( 3 );

					sum++;

					if ( index !== "first" ) {
						// return instantly
						return value === "something missing";
					}

					// return after some delay
					return new Promise( resolve => setTimeout( resolve, 20 ) )
						.then( () => value === "something missing" );
				}, true )
				.then( result => {
					// find() is providing found value
					Should( result ).be.undefined();
					Should( sum ).be.equal( 3 );
				} );
		} );
	} );

	describe( ".delay()", () => {
		it( "creates promise to roughly delay processing by a given number of milliseconds", function() {
			const start = Date.now();

			return PromiseUtil.delay( 100 )
				.then( function() {
					const stop = Date.now();

					// find() is providing found value
					Should( stop - start ).be.approximately( 100, 30 );
				} );
		} );
	} );

	describe( ".process()", () => {
		it( "resolves on processing no items read from empty stream", function() {
			return PromiseUtil.process( _getStreamFromArray(), () => {
				throw new Error( "process() invoked callback on empty string" );
			} );
		} );

		it( "resolves on processing item read from single-item object stream", function() {
			const stream = _getStreamFromArray( { items: [{ foo: 1 }] } );

			return PromiseUtil.process( stream, ( item, index, streamRef ) => {
				item.should.be.Object()
					.and.have.size( 1 )
					.and.have.property( "foo" )
					.and.equal( 1 );
				index.should.be.Number()
					.and.equal( 0 );
				streamRef.should.equal( stream );
			} );
		} );

		it( "pauses stream while processing asynchronously", function() {
			let factor = 1;

			const stream = _getStreamFromArray( { items: [ 1, 2, 6, 8, 5 ] } );

			return PromiseUtil.process( stream, function( digit, index ) {
				return new Promise( resolve => {
					setTimeout( () => {
						this.number = ( this.number || 0 ) + ( digit * factor );
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

		it( "processes non-object streams", function() {
			const stream = _getStreamFromArray( {
				objectMode: false,
				items: [
					Buffer.from( "Hello", "utf8" ),
					Buffer.from( " ", "utf8" ),
					Buffer.from( "World", "utf8" ),
					Buffer.from( "!", "utf8" )
				]
			} );

			return PromiseUtil.process( stream, function( chunk, index ) {
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

		it( "collects chunks/objects on processing w/o custom processor", function() {
			const stream = _getStreamFromArray( {
				objectMode: false,
				items: [
					Buffer.from( "Hello", "utf8" ),
					Buffer.from( " ", "utf8" ),
					Buffer.from( "World", "utf8" ),
					Buffer.from( "!", "utf8" )
				]
			} );

			return PromiseUtil.process( stream )
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

		it( "stops processing on stream error", function() {
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

			return PromiseUtil.process( stream, function( chunk, index ) {
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
	} );

	describe( ".promisify()", () => {
		it( "promisifies function of NodeJS library", function() {
			const { stat } = require( "fs" );

			stat.should.be.Function();

			const promisifiedStat = PromiseUtil.promisify( stat );

			promisifiedStat.should.be.Function();

			const promise = promisifiedStat( __dirname );

			return promise.should.be.Promise().which.is.fulfilled();
		} );

		it( "returns rejected promise on calling promisified function of NodeJS library expected to fail", function() {
			const { stat } = require( "fs" );

			const promisifiedStat = PromiseUtil.promisify( stat );

			const promise = promisifiedStat( require( "path" ).join( __dirname, "lots.of.nonsense.name.garbage" ) );

			return promise.should.be.Promise().which.is.rejected();
		} );

		it( "supports context object for binding promisified function to", function() {
			/**
			 * Implements some test function accepting NodeJS-style callback.
			 *
			 * @param {function(Error,*)} cb NodeJS-style callback
			 */
			function theFunction( cb ) {
				setTimeout( cb, 100, null, ( this || {} ).theValue || "not found" );
			}

			const context = { theValue: "found" };

			const promisifiedUnboundFunction = PromiseUtil.promisify( theFunction );
			const promisifiedBoundFunction = PromiseUtil.promisify( theFunction, context );

			const unboundPromise = promisifiedUnboundFunction();
			const boundPromise = promisifiedBoundFunction();

			return Promise.all( [ unboundPromise, boundPromise ] )
				.should.be.fulfilledWith( [ "not found", "found" ] );
		} );
	} );
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
