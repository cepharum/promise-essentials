declare module "promise-essentials" {
    import { Readable } from "stream";

    // @ts-ignore
    type Iterable = Array<any> | object | string | Buffer | Map<any,any>;

    /** Processes provided item. */
    type IterationHandler = ( item: any, index: number, iterable: Iterable ) => ( any | Promise<any> );

    /** Tests provided item for matching some criteria returning test result as boolean. */
    type IterationDecisionHandler = ( item: any, index: number, iterable: Iterable ) => ( boolean | Promise<boolean> );

    interface EachOptions {
        /** Controls whether to prematurely stop iteration on truthy or falsy return from IterationHandler. [default: nevet stop prematurely] */
        stopOnReturn?: boolean;
    }

    /**
     * Iterates over provided items invoking callback on every item waiting for
     * callback to complete before advancing.
     *
     * @note This method is capable of handling array-like collections, too.
     * @note Items are processed sequentially.
     * @note Unless setting option `stopOnReturn` any result of invoked callback
     *       other than a promise for deferred delivery of result is ignored.
     *
     * @param iterable collection of items to be enumerated
     * @param callback handler invoked per enumerated item of collection
     * @param options behaviour customizations
     * @returns promises provided iterable or boolean information on whether iteration has been stopped prematurely or not
     */
    function each( iterable: Iterable, callback: IterationHandler, options: EachOptions ): Promise<Iterable | boolean>;

    /**
     * Tests if at least one item exists in provided iterable matching criteria
     * tested in a given callback.
     *
     * @note This method is using each() internally.
     *
     * @param iterable collection of items to be enumerated
     * @param callback handler invoked per enumerated item of collection to decide whether item is matching some criteria
     * @returns promises true if item exists in collection matching criteria tested in callback
     */
    function some( iterable: Iterable, callback: IterationDecisionHandler ): Promise<boolean>;

    /**
     * Tests if all items of provided iterable are matching criteria tested in a
     * given callback.
     *
     * @note This method is using each() internally.
     *
     * @param iterable collection of items to be enumerated
     * @param callback handler invoked per enumerated item of collection to decide whether item is matching some criteria
     * @returns promises true iff all items of provided iterable pass test implemented in given callback
     */
    function every( iterable: Iterable, callback: IterationDecisionHandler ): Promise<boolean>;

    interface FilterOptions {
        /** Controls whether resulting collection is provided as array instead of matching provided one by type as good as possible. [default: false] */
        asArray?: boolean;
    }

    /**
     * Extracts subset of items in provided iterable matching criteria
     * implemented in a given callback invoked per item.
     *
     * @note Items are processed sequentially.
     *
     * @param iterable collection of items to be enumerated
     * @param callback handler invoked per enumerated item of collection to decide whether item is included with resulting collection or not
     * @param options behaviour customizations
     * @returns promises subset of provided collection consisting of items matching criteria tested in callback, only
     */
    function filter( iterable: Iterable, callback: IterationDecisionHandler, options?: FilterOptions ): Promise<Iterable | Array<any>>;

    interface MapOptions {
        /** Controls whether resulting collection is provided as array instead of matching provided one by type as good as possible. [default: false] */
        asArray?: boolean;
    }

    /**
     * Maps every item of provided iterable onto different item provided by
     * callback.
     *
     * @note Items are processed sequentially.
     *
     * @param iterable collection of items to be enumerated
     * @param callback handler invoked per enumerated item of collection to deliver item replacing provided one in resulting collection
     * @param options behaviour customizations
     * @returns promises collection of items as returned by invoked callback
     */
    function map( iterable: Iterable, callback: IterationHandler, options?: MapOptions ): Promise<Iterable | Array<any>>;

    /**
     * Maps every item of provided iterable onto different item provided by
     * callback.
     *
     * @note In opposition to map() all items are processed in parallel. Thus,
     *       you should use this method with smaller collections, only.
     *
     * @param iterable collection of items to be enumerated
     * @param callback handler invoked per enumerated item of collection to deliver item replacing provided one in resulting collection
     * @param options behaviour customizations
     * @returns promises collection of items as returned by invoked callback
     */
    function multiMap( iterable: Iterable, callback: IterationHandler, options?: MapOptions ): Promise<Iterable | Array<any>>;

    interface FindOptions {
        /** Controls whether enumerating collection in reverse order to find last item instead of first one or not. [default: false] */
        getLast?: boolean;
    }

    /**
     * Searches iterable collection for first occurrence of item satisfying test
     * implemented in provided callback returning that occurrence's index into
     * the collection.
     *
     * @note Items are processed sequentially.
     *
     * @param iterable collection of items to be enumerated
     * @param callback handler invoked per enumerated item of collection to decide whether item is searched one or not
     * @param options behaviour customizations
     * @returns promises index into collection of first (last) item found or -1 if no item was found
     */
    function indexOf( iterable: Iterable, callback: IterationDecisionHandler, options?: FindOptions ): Promise<number>;

    /**
     * Searches iterable collection for first occurrence of item satisfying test
     * implemented in provided callback returning that item.
     *
     * @note Items are processed sequentially.
     *
     * @param iterable collection of items to be enumerated
     * @param callback handler invoked per enumerated item of collection to decide whether item is searched one or not
     * @param options behaviour customizations
     * @returns promises found item of collection or undefined if no item was found
     */
    function find( iterable: Iterable, callback: IterationDecisionHandler, options?: FindOptions ): Promise<any>;

    /**
     * Provides promise resolved with given payload after provided number of
     * milliseconds.
     *
     * @param delayMs number of milliseconds to defer promise's resolution
     * @param payload resolution value of promise
     * @returns promise for payload
     */
    function delay( delayMs: number, payload: any ): Promise<any>;

    /** Context shared by all invocations of callback provided to process(). */
    interface ProcessContext {}

    type ProcessCallback = ( this: ProcessContext, item: Buffer | object, index: number, stream: Readable ) => ( void | Promise<void> );

    /**
     * Reads chunks/objects from provided stream invoking provided callback on
     * every read chunk/object for further processing. Stream gets paused while
     * running callback which might return promise to keep delaying stream.
     *
     * @param stream stream to read chunks/objects from
     * @param callback invoked per read chunk/object for processing
     * @returns promise for context shared by invocations of processing callback after stream has been processed completely
     */
    function process( stream: Readable, callback: ProcessCallback ): Promise<any>;

    type NonPromisifiedFunction = ( ...args: any ) => any;
    type PromisifiedFunction = ( ...args: any ) => Promise<any>;

    /**
     * Wraps Node.js-callback style function to provide promise instead.
     *
     * @param nodeStyleFunction function to be wrapped
     * @param context custom `this` in wrapped function
     * @returns provided function returning promise instead of accepting callback in last argument
     */
    function promisify( nodeStyleFunction: NonPromisifiedFunction, context?: object ): PromisifiedFunction;
}
