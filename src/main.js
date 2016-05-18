import ValueMapping from './mappings/value'
import ErrorMessages from './error-messages.js'
import Utils from './utils.js'


const nullInjector = {has: key => false}

export default function DiCast(

    parent = nullInjector

) {

    if (!(this instanceof DiCast)) {
        return new DiCast(parent)
    }

    if (
        parent == null ||
        parent &&
        parent !== nullInjector &&
        parent.constructor !== this.constructor
    ) {
        throw new Error(ErrorMessages.INVALID_PARENT)
    }

    const resolving = []

    const mappings = {

        injector: Utils.createMapping({
            resolve: () => this,
            instance: this,
            target: this
        })
    }

    /**
     * Check to see if the injector has a mapping for a given key.
     *
     * If no mapping exists in the current injector and there is a parent 
     * then the resolution is deferred to the parent.
     *
     * @method has
     * @param {String} key
     * @param {Boolean} local
     * @return {Boolean}
     */
    this.has = (key, local=false) => {
        
        if (!Utils.is(key, 'String')) {
            throw new Error(ErrorMessages.INVALID_KEY)
        }

        if (local) {
            return mappings.hasOwnProperty(key)
        }
        
        return mappings.hasOwnProperty(key) || parent.has(key)
    }

    /**
     * Returns a fully resolved target for the given key as described by the mapping options.
     *
     * If no mapping is found an Injection Error is thrown.
     *
     * @method get
     * @param {Array} keys
     * @return {*}
     */
    this.get = keys => {

        const path = keys.split('.')

        const key = path[0]

        const getInstance = () => {

            if (mappings.hasOwnProperty(key)) {
                return mappings[key].defer && parent.has(key)
                    ? parent.get(key)
                    : mappings[key].instance
            }

            return parent.get(key)
        }

        if (!this.has(key)) {
            throw new Error(Utils.template(ErrorMessages.NO_MAPPING, {key}))
        }

        if (resolving.indexOf(key) !== -1) {
            resolving.push(key)
            throw new Error(Utils.template(ErrorMessages.CIRCULAR_DEPENDENCY, {key}))
        }

        resolving.push(key)

        const instance = getInstance()

        resolving.pop()

        return path
            .slice(1)
            .reduce(
                (acc, property) => acc[property],
                instance
            )
    }

    // @TODO: Temporary implementation - mappings should be registered
    this.mapValue = (key, config) => {
        Utils.validateMapping(key, config, mappings)
        mappings[key] = ValueMapping(this, config)
        return this
    }
}
