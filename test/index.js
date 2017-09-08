"use strict";

const Should = require( "should" );

const PromiseTool = require( "../" );

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

		function fastMapper() {
			return new Promise( resolve => setTimeout( resolve, 20 ) );
		}

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
} );
