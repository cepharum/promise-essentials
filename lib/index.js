/**
 * (c) 2017 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2017 cepharum GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @author: cepharum
 */

"use strict";

module.exports = {

	/** @borrows _toolPromiseEach as each */
	each: _toolPromiseEach,

	/** @borrows _toolPromiseFilter as filter */
	filter: _toolPromiseFilter,

	/** @borrows _toolPromiseMap as map */
	map: _toolPromiseMap,

	/** @borrows _toolPromiseMultiMap as multiMap */
	multiMap: _toolPromiseMultiMap,

	/** @borrows _toolPromiseFind as find */
	find: _toolPromiseFind,

	/** @borrows _toolPromiseIndexOf as indexOf */
	indexOf: _toolPromiseIndexOf,

	/** @borrows _toolPromiseDelay as delay */
	delay: _toolPromiseDelay,

	/** @borrows _toolPromiseProcess as process */
	process: _toolPromiseProcess

};

/**
 * Iterates over provided items invoking callback on each item waiting for
 * callback to complete before advancing.
 *
 * @note This method is capable of handling array-like collections, too.
 *
 * @param {Array} items array of items to be traversed
 * @param {function(current:*, index:number, items:Array):(Promise|*)} fn
 * @returns {Promise<Array>} promises completely traversed array of items
 */
function _toolPromiseEach( items, fn ) {
	return new Promise( function( resolve, reject ) {
		step( items, 0, items.length );

		/**
		 * Triggers processing of next available item.
		 *
		 * @param {Array} items
		 * @param {int} index
		 * @param {int} length
		 */
		function step( items, index, length ) {
			if ( index < length ) {
				let item = items[index], promise;

				if ( item && item instanceof Promise ) {
					promise = item.then( item => fn( item, index, items ) );
				} else {
					promise = new Promise( resolve => resolve( fn( item, index, items ) ) );
				}

				promise
					.then( function() {
						step( items, index + 1, length );
					}, reject );
			} else {
				resolve( items );
			}
		}
	} );
}

/**
 * Iterates over array of items invoking provided callback on each item and
 * copying every item with callback returning truthy result into new array which
 * is promised eventually.
 *
 * @note This method is capable of handling array-like collections, too.
 *
 * @param {Array} items array of items to filter
 * @param {function(current:*, index:number, items:Array):(Promise|*)} fn
 * @returns {Promise<Array>} promised array of filtered items
 */
function _toolPromiseFilter( items, fn ) {
	return new Promise( function( resolve, reject ) {
		let length = items.length;

		step( items, 0, length, new Array( length ), 0 );

		/**
		 * Triggers processing of next available item.
		 *
		 * @param {Array} items
		 * @param {int} index
		 * @param {int} length
		 * @param {Array} target
		 * @param {int} writeIndex
		 */
		function step( items, index, length, target, writeIndex ) {
			if ( index < length ) {
				let item = items[index], promise;

				if ( item instanceof Promise ) {
					promise = item.then( item => fn( item, index, items ) );
				} else {
					promise = new Promise( resolve => resolve( fn( item, index, items ) ) );
				}

				promise
					.then( function( result ) {
						if ( result ) {
							target[writeIndex++] = items[index];
						}

						step( items, index + 1, length, target, writeIndex );
					}, reject );
			} else {
				target.splice( writeIndex, length - writeIndex );

				resolve( target );
			}
		}
	} );
}

/**
 * Iterates over array of items invoking provided callback on each item and
 * copying result provided by callback into new array promised eventually.
 *
 * @note This method is capable of handling array-like collections, too.
 *
 * @param {Array} items array of items to filter
 * @param {function(current:*, index:number, items:Array):(Promise|*)} fn
 * @returns {Promise<Array>} promised array of mapped items
 */
function _toolPromiseMap( items, fn ) {
	return new Promise( function( resolve, reject ) {
		let length = items.length;

		step( items, 0, length, new Array( length ) );

		/**
		 * Triggers processing of next available item.
		 *
		 * @param {Array} items
		 * @param {int} index
		 * @param {int} length
		 * @param {Array} target
		 */
		function step( items, index, length, target ) {
			if ( index < length ) {
				let item = items[index], promise;

				if ( item instanceof Promise ) {
					promise = item.then( item => fn( item, index, items ) );
				} else {
					promise = new Promise( resolve => resolve( fn( item, index, items ) ) );
				}

				promise
					.then( function( result ) {
						target[index] = result;

						step( items, index + 1, length, target );
					}, reject );
			} else {
				resolve( target );
			}
		}
	} );
}

/**
 * Maps all provided items onto values provided some callback invoked on every
 * item and returning Promise resolved with all mapped items.
 *
 * This method is processing all mappings simultaneously and waits for all
 * started mappings to complete before promising result.
 *
 * @note This method is capable of handling array-like collections, too.
 *
 * @param {Array} items array of items to filter
 * @param {function(current:*, index:number, items:Array):(Promise|*)} fn
 * @returns {Promise<Array>} promised array of mapped items
 */
function _toolPromiseMultiMap( items, fn ) {
	let length = items.length;
	let result = new Array( length );

	for ( let index = 0; index < length; index++ ) {
		let item = items[index];

		if ( item instanceof Promise ) {
			result[index] = item.then( item => fn( item, index, items ) );
		} else {
			result[index] = new Promise( resolve => resolve( fn( item, index, items ) ) );
		}
	}

	return Promise.all( result );
}

/**
 * Iterates over array of items invoking provided callback on each item stopping
 * iteration on first item callback is returning truthy value.
 *
 * @note This method is capable of handling array-like collections, too.
 *
 * @param {Array} items array of items to filter
 * @param {function(current:*, index:number, items:Array):(Promise|*)} fn
 * @param {boolean} getLast set true to get last match instead of first one
 * @returns {Promise<*>} promises first element callback returned truthy on or
 *          null if no item satisfies this
 */
function _toolPromiseFind( items, fn, getLast = false ) {
	return new Promise( function( resolve, reject ) {
		let length = items.length;

		step( items, getLast ? length - 1 : 0, getLast ? -1 : items.length, getLast ? -1 : +1 );

		/**
		 * Triggers processing of next available item.
		 *
		 * @param {Array} items
		 * @param {int} index
		 * @param {int} stopAt
		 * @param {int} advanceBy
		 */
		function step( items, index, stopAt, advanceBy ) {
			if ( index !== stopAt ) {
				let item = items[index], promise;

				if ( item instanceof Promise ) {
					promise = item.then( item => fn( item, index, items ) );
				} else {
					promise = new Promise( resolve => resolve( fn( item, index, items ) ) );
				}

				promise
					.then( function( result ) {
						if ( result ) {
							resolve( item );
						} else {
							step( items, index + advanceBy, stopAt, advanceBy );
						}
					}, reject );
			} else {
				resolve( null );
			}
		}
	} );
}

/**
 * Iterates over array of items invoking provided callback on each item stopping
 * iteration on first item callback is returning truthy value.
 *
 * @note This method is capable of handling array-like collections, too.
 *
 * @param {Array} items array of items to filter
 * @param {function(current:*, index:number, items:Array):(Promise|*)} fn
 * @param {boolean} getLast set true to get index of last match instead of first one
 * @returns {Promise<number>} promises index of first element callback returned
 *          truthy on or -1 if no item satisfies this
 */
function _toolPromiseIndexOf( items, fn, getLast = false ) {
	return new Promise( function( resolve, reject ) {
		let length = items.length;

		step( items, getLast ? length - 1 : 0, getLast ? -1 : length, getLast ? -1 : +1 );

		/**
		 * Triggers processing of next available item.
		 *
		 * @param {Array} items
		 * @param {int} index
		 * @param {int} stopAt
		 * @param {int} advanceBy
		 */
		function step( items, index, stopAt, advanceBy ) {
			if ( index !== stopAt ) {
				let item = items[index], promise;

				if ( item instanceof Promise ) {
					promise = item.then( item => fn( item, index, items ) );
				} else {
					promise = new Promise( resolve => resolve( fn( item, index, items ) ) );
				}

				promise
					.then( function( result ) {
						if ( result ) {
							resolve( index );
						} else {
							step( items, index + advanceBy, stopAt, advanceBy );
						}
					}, reject );
			} else {
				resolve( -1 );
			}
		}
	} );
}

/**
 * Conveniently creates promise resolved with value after some delay.
 *
 * @param {number} delay desired delay in milliseconds
 * @param {*=} payload value promise is fulfilled with
 * @returns {Promise<*>} promised delay
 */
function _toolPromiseDelay( delay, payload ) {
	return new Promise( resolve => setTimeout( resolve, delay, payload ) );
}

/**
 * Asynchronously processes objects or chunks read from provided stream.
 *
 * @note This method is invoking provided function on every chunk or object read
 *       from stream. If provided function is throwing exception or returning
 *       eventually rejected promise the whole processing is aborted rejecting
 *       promise returned here as well.
 *
 * @note Stream is resumed initially and paused/resumed when invoked function
 *       has returned promise. **The stream is kept paused on processing item
 *       failed.**
 *
 * @param {Readable} stream stream to read objects or chunks from
 * @param {function(this:object, current:*, index:number, stream:Readable):(Promise|*)} fn worker invoked to process every read chunk/object
 * @returns {Promise<object>} promises object provided as `this` on invoking function per chunk/object read from stream
 */
function _toolPromiseProcess( stream, fn ) {
	return new Promise( ( resolve, reject ) => {
		let counter = 0;
		let target = {};
		let finished = false;
		let failure = null;

		stream
			.on( "data", step )
			.on( "error", error => {
				failure = error;

				// don't immediately reject promise when callback is still
				// processing item
				if ( !stream.isPaused() ) {
					reject( error );
				}
			} )
			.on( "end", () => {
				finished = true;

				// don't immediately resolve promise when callback is still
				// processing item
				if ( !stream.isPaused() ) {
					resolve( target );
				}
			} );

		stream.resume();

		/**
		 * Processes next available item.
		 *
		 * @node This method is pausing stream to ensure elements are processed
		 *       sequentially.
		 *
		 * @param {Buffer|object} item
		 */
		function step( item ) {
			try {
				let result = fn.call( target, item, counter++, stream );
				if ( result instanceof Promise ) {
					stream.pause();

					result
						.then( () => {
							stream.resume();

							if ( finished ) {
								resolve( target );
							} else if ( failure ) {
								reject( failure );
							}
						}, reject );
				}
			} catch ( exception ) {
				stream.pause();

				reject( exception );
			}
		}
	} );
}
