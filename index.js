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

/**
 * @typedef {function( item:*, index:(number|string), collection:object):(Promise<*>|*)} IterationCallbackAny
 */

/**
 * @typedef {function( item:*, index:(number|string), collection:object):(Promise<boolean>|boolean)} IterationCallbackBoolean
 */

/**
 * Implements promise-related utility functions.
 */
class PromiseUtil {
	/**
	 * Iterates over provided items invoking callback on each item waiting for
	 * callback to complete before advancing.
	 *
	 * @note This method is capable of handling array-like collections, too.
	 *
	 * @param {object} items collection of items to be traversed
	 * @param {IterationCallbackAny} fn callback invoked per item of collection
	 * @param {boolean} stopOnReturn set true or false to have iteration stop early on truthy/falsy return from callback
	 * @returns {Promise<object|boolean>} promises provided collection after its traversal, true on stopped early, false on stopping early enabled w/o occurring
	 */
	static each( items, fn, { stopOnReturn = null } = {} ) {
		const { indexes, length, useGet } = prepareIteration( items );

		return new Promise( function( resolve, reject ) {
			step( items, indexes, 0, length );

			/**
			 * Triggers processing of next available item.
			 *
			 * @param {object} collection collection to process
			 * @param {Array} keys list of indexes addressing items of collection
			 * @param {int} current index into list of indexes addressing current item
			 * @param {int} stopAt number of items in collection
			 * @returns {void}
			 */
			function step( collection, keys, current, stopAt ) {
				if ( current < stopAt ) {
					const key = keys ? keys[current] : current;
					const item = useGet ? collection.get( key ) : collection[key];
					let promise;

					if ( item && item instanceof Promise ) {
						promise = item.then( i => fn( i, key, collection ) );
					} else {
						promise = new Promise( done => done( fn( item, key, collection ) ) );
					}

					promise
						.then( value => {
							if ( stopOnReturn != null && value != null && Boolean( value ) === stopOnReturn ) {
								resolve( true );
							} else {
								process.nextTick( step, collection, keys, current + 1, stopAt );
							}
						} )
						.catch( reject );
				} else {
					resolve( stopOnReturn ? false : collection );
				}
			}
		} );
	}

	/**
	 * Iterates over collection looking for at least one item satisfying given
	 * callback by means of causing it to return truthy value.
	 *
	 * @param {object} items collection of items to traverse
	 * @param {IterationCallbackBoolean} fn callback invoked per item, returns truthy value if item is satisfying
	 * @returns {Promise<boolean>} promises true if at least one item of collection was satisfying callback, false otherwise
	 */
	static some( items, fn ) {
		return this.each( items, fn, { stopOnReturn: true } );
	}

	/**
	 * Iterates over collection checking if every item is satisfying provided
	 * callback by means of causing it to return truthy value on every item.
	 *
	 * @param {object} items collection of items to traverse
	 * @param {IterationCallbackBoolean} fn callback invoked per item, returns truthy value if item is satisfying
	 * @returns {Promise<boolean>} promises true if every item of collection was satisfying callback, false otherwise
	 */
	static every( items, fn ) {
		return this.each( items, fn, { stopOnReturn: true } )
			.then( result => !result );
	}

	/**
	 * Iterates over array of items invoking provided callback on each item and
	 * copying every item with callback returning truthy result into new array which
	 * is promised eventually.
	 *
	 * @note This method is capable of handling array-like collections, too.
	 *
	 * @param {object} items collection of items to filter
	 * @param {IterationCallbackAny} fn callback invoked per item of collection
	 * @param {boolean} asArray set true to always fetch an array of kept items, set false to get collection matching provided one by type
	 * @returns {Promise<object>} promised collection of filtered items
	 */
	static filter( items, fn, { asArray = true } = {} ) {
		const { indexes, length, useGet, collector } = prepareIteration( items, { createCollector: true, asArray } );

		return new Promise( function( resolve, reject ) {
			step( items, indexes, 0, length, collector, 0 );

			/**
			 * Triggers processing of next available item.
			 *
			 * @param {object} collection collection of items
			 * @param {Array} keys list of indexes addressing items of collection
			 * @param {int} current offset of index addressing current item
			 * @param {int} numItems number of items in collection
			 * @param {object} result collector for items to keep
			 * @param {int} writeIndex next item in a sequential collector to write
			 * @returns {void}
			 */
			function step( collection, keys, current, numItems, result, writeIndex ) {
				if ( current < numItems ) {
					const key = keys ? keys[current] : current;
					const item = useGet ? collection.get( key ) : collection[key];
					let promise;

					if ( item instanceof Promise ) {
						promise = item.then( i => fn( i, key, collection ) );
					} else {
						promise = new Promise( done => done( fn( item, key, collection ) ) );
					}

					promise
						.then( keep => {
							let _writeIndex = writeIndex;

							if ( keep ) {
								if ( result instanceof Map ) {
									result.set( key, item );
								} else if ( Array.isArray( result ) ) {
									result[_writeIndex++] = item;
								} else {
									result[key] = item;
								}
							}

							process.nextTick( step, collection, keys, current + 1, numItems, result, _writeIndex );
						} )
						.catch( reject );
				} else {
					if ( Array.isArray( result ) ) {
						result.splice( writeIndex, numItems - writeIndex );
					}

					resolve( result );
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
	 * @param {object} items collection of items to map
	 * @param {IterationCallbackAny} fn callback invoked per item for provided mapped value
	 * @param {boolean} asArray set true to always fetch an array of kept items, set false to get collection matching provided one by type
	 * @returns {Promise<object>} promised collection of mapped items
	 */
	static map( items, fn, { asArray = true } = {} ) {
		const { indexes, length, useGet, collector } = prepareIteration( items, { createCollector: true, asArray } );

		return new Promise( function( resolve, reject ) {
			step( items, indexes, 0, length, collector );

			/**
			 * Triggers processing of next available item.
			 *
			 * @param {object} collection collection of items to process
			 * @param {string[]} keys lists keys of items in collection
			 * @param {int} current index into list of keys addressing current item to process
			 * @param {int} numItems number of items in collection
			 * @param {object} result separate instance matching collection by type, fed with mapped value per item
			 * @returns {void}
			 */
			function step( collection, keys, current, numItems, result ) {
				if ( current < numItems ) {
					const key = keys ? keys[current] : current;
					const item = useGet ? collection.get( key ) : collection[key];
					let promise;

					if ( item instanceof Promise ) {
						promise = item.then( value => fn( value, key, collection ) );
					} else {
						promise = new Promise( done => done( fn( item, key, collection ) ) );
					}

					promise
						.then( mappedValue => {
							if ( result instanceof Map ) {
								result.set( key, mappedValue );
							} else if ( Array.isArray( result ) ) {
								result[current] = mappedValue;
							} else {
								result[key] = mappedValue;
							}

							process.nextTick( step, collection, keys, current + 1, numItems, result );
						} )
						.catch( reject );
				} else {
					resolve( result );
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
	 * @param {object} items collection of items to map
	 * @param {IterationCallbackAny} fn callback invoked per item
	 * @param {boolean} asArray set true to always fetch an array of kept items, set false to get collection matching provided one by type
	 * @returns {Promise<object>} promised collection of mapped items
	 */
	static multiMap( items, fn, { asArray = true } = {} ) {
		const { indexes, length, useGet, collector } = prepareIteration( items, { createCollector: true, asArray } );
		const mapping = new Array( length );

		for ( let index = 0; index < length; index++ ) {
			const key = indexes ? indexes[index] : index;
			const item = useGet ? items.get( key ) : items[key];

			( ( _item, _key, _index ) => {
				if ( _item instanceof Promise ) {
					mapping[_index] = _item.then( i => fn( i, _key, items ) );
				} else {
					mapping[_index] = new Promise( resolve => resolve( fn( _item, _key, items ) ) );
				}
			} )( item, key, index );
		}

		return Promise.all( mapping )
			.then( mappedValues => {
				if ( Array.isArray( collector ) ) {
					return mappedValues;
				}

				if ( collector instanceof Map ) {
					for ( let i = 0; i < length; i++ ) {
						collector.set( indexes[i], mappedValues[i] );
					}
				} else {
					for ( let i = 0; i < length; i++ ) {
						collector[indexes[i]] = mappedValues[i];
					}
				}

				return collector;
			} );
	}

	/**
	 * Iterates over array of items invoking provided callback on each item stopping
	 * iteration on first item callback is returning truthy value.
	 *
	 * @note This method is capable of handling array-like collections, too.
	 *
	 * @param {object} items collection of items to search
	 * @param {IterationCallbackBoolean} fn callback invoked per item to identify the one to be found
	 * @param {boolean} getLast set true to get last match instead of first one
	 * @returns {Promise<*>} promises first element callback returned truthy on or
	 *          undefined if no item satisfies this
	 */
	static find( items, fn, getLast = false ) {
		return this.indexOf( items, fn, getLast )
			.then( index => {
				if ( Array.isArray( items ) ) {
					return index > -1 ? items[index] : undefined;
				}

				if ( index === undefined ) {
					return undefined;
				}

				return items instanceof Map ? items.get( index ) : items[index];
			} );
	}

	/**
	 * Iterates over collection of items invoking provided callback on each item
	 * stopping iteration on first item callback is returning truthy value.
	 *
	 * @note This method is capable of handling array-like collections, too.
	 *
	 * @param {Array} items array of items to filter
	 * @param {IterationCallbackBoolean} fn callback invoked per item to test if it's searched one
	 * @param {boolean} getLast set true to get index of last match instead of first one
	 * @returns {Promise<number>} promises index of first element callback returned
	 *          truthy on or -1 if no item satisfies this
	 */
	static indexOf( items, fn, getLast = false ) {
		const { indexes, length, useGet } = prepareIteration( items );

		return new Promise( function( resolve, reject ) {
			step( items, indexes, getLast ? length - 1 : 0, getLast ? -1 : length, getLast ? -1 : +1 );

			/**
			 * Triggers processing of next available item.
			 *
			 * @param {Array} collection collection of items
			 * @param {Array} keys list of keys addressing items of collection
			 * @param {int} current index into list of keys selecting current item's keys
			 * @param {int} numItems number of items in collection
			 * @param {int} advanceBy control direction of iteration: +1 to iterate forwardly, -1 otherwise
			 * @returns {void}
			 */
			function step( collection, keys, current, numItems, advanceBy ) {
				if ( current === numItems ) {
					resolve( keys ? undefined : -1 );
				} else {
					const key = keys ? keys[current] : current;
					const item = useGet ? collection.get( key ) : collection[key];
					let promise;

					if ( item instanceof Promise ) {
						promise = item.then( i => fn( i, key, collection ) );
					} else {
						promise = new Promise( done => done( fn( item, key, collection ) ) );
					}

					promise
						.then( result => {
							if ( result ) {
								resolve( key );
							} else {
								process.nextTick( step, collection, keys, current + advanceBy, numItems, advanceBy );
							}
						} )
						.catch( reject );
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
	static delay( delay, payload ) {
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
	static process( stream, fn = defaultProcessor ) {
		return new Promise( ( resolve, reject ) => {
			let counter = 0;
			const target = {};
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
			 * @param {Buffer|object} item or chunk item to be processed
			 * @returns {void}
			 */
			function step( item ) {
				try {
					const result = fn.call( target, item, counter++, stream );
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
							} )
							.catch( reject );
					}
				} catch ( exception ) {
					stream.pause();

					reject( exception );
				}
			}
		} );
	}

	/**
	 * Wraps asynchronous function accepting node-style callback in a promise.
	 *
	 * @param {function} fn function to be promisified
	 * @param {object} bindTo context for binding given function to on invocation
	 * @returns {function():Promise} returns provided function returning Promise instead of using node-style callback
	 */
	static promisify( fn, bindTo = undefined ) {
		return function( ...args ) {
			const length = args.length;
			const copy = new Array( length + 1 );

			for ( let i = 0; i < length; i++ ) {
				copy[i] = args[i];
			}

			return new Promise( ( resolve, reject ) => {
				copy[length] = ( error, result ) => {
					if ( error ) {
						reject( error );
					} else {
						resolve( result );
					}
				};

				fn.apply( bindTo === undefined ? this : bindTo, copy );
			} );
		};
	}
}

module.exports = PromiseUtil;

/**
 * Prepares sequential list of keys for successively iterating over elements of
 * a given collection.
 *
 * @param {object} items collection to be iterated
 * @param {boolean} createCollector set true to get an empty collector
 * @param {boolean} asArray set true to always array as collector, otherwise it's an empty collector matching provided set of items by type
 * @returns {{indexes: (?Array<string>), length:int, useGet:boolean, collector:object}} prepared iteration context and parameters
 */
function prepareIteration( items, { createCollector = false, asArray = false } = {} ) {
	let indexes, length, useGet = false, collector = null;

	if ( items instanceof Map ) {
		useGet = true;

		length = items.size;
		indexes = new Array( length );

		let index = 0;
		for ( const key of items.keys() ) {
			indexes[index++] = key;
		}

		if ( createCollector ) {
			collector = asArray ? new Array( length ) : new Map();
		}
	} else if ( Array.isArray( items ) || ( items.length > -1 && parseInt( items.length ) === parseFloat( items.length ) ) ) {
		// prepare for iterating over indexes of array or array-like collection
		length = items.length;
		indexes = null;

		if ( createCollector ) {
			collector = new Array( length );
		}
	} else if ( typeof items === "object" ) {
		// prepare for iterating over properties of object
		indexes = Object.keys( items );
		length = indexes.length;

		if ( createCollector ) {
			collector = asArray ? new Array( length ) : {};
		}
	} else {
		throw new TypeError( "non-iterable collection rejected" );
	}

	return { indexes, length, useGet, collector };
}

/**
 * Collects another item in array optionally created at `this.collected`.
 *
 * @param {object|Buffer} item some item/chunk read from stream to be processed
 * @returns {void}
 */
function defaultProcessor( item ) {
	if ( !this.collected ) {
		this.collected = [];
	}

	this.collected.push( item );
}
