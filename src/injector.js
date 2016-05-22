import FactoryMapping from './mappings/factory.js'
import ValueMapping from './mappings/value.js'
import ErrorMessages from './error-messages.js'
import {createMapping, is, template, validateMapping} from './utils.js'


const nullInjector = {has: key => false}

export default function Injector(

    parent = nullInjector

) {

    if (!(this instanceof Injector)) {
        return new Injector(parent)
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

        injector: createMapping({
            key: 'injector',
            instance: () => this,
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

        if (!is(key, 'String')) {
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
     * @param {String} keys
     * @return {*}
     */
    this.get = keys => {
    
        const path = keys.split('.')
    
        const key = path[0]
    
        const getInstance = () => {
    
            if (mappings.hasOwnProperty(key)) {
                return mappings[key].defer && parent.has(key)
                    ? parent.get(key)
                    : mappings[key].instance()
            }
    
            return parent.get(key)
        }
    
        if (!this.has(key)) {
            throw new Error(template(ErrorMessages.NO_MAPPING, {key}))
        }
    
        if (resolving.indexOf(key) !== -1) {
            resolving.push(key)
            throw new Error(template(ErrorMessages.CIRCULAR_DEPENDENCY, {key}))
        }
    
        resolving.push(key)
    
        const instance = getInstance()
    
        resolving.pop()
    
        return path.slice(1).reduce(
            (acc, property) => {

                const child = acc[property]
                
                if (child == null) {
                    throw new Error(template(ErrorMessages.NO_MAPPING, {key: keys}))
                }
                
                return child
            },
            instance
        )
    }

    // @TODO: Temporary map implementations - mappings should be registered

    /**
     * Add the mapping to the injector
     * 
     * @method map
     * @private
     * @param {String} key
     * @param {Object} mapping
     * @returns {Injector}
     */
    const map = (key, mapping) => {

        if (mappings.hasOwnProperty(key)) {
            throw new Error(template(ErrorMessages.MAPPING_EXISTS, {key}))
        }

        mappings[key] = validateMapping(mapping)

        return this
    }

    /**
     * Add a FactoryMapping to the injector
     *
     * @method mapFactory
     * @param {String} key
     * @param {Object} config
     * @returns {Injector}
     */
    this.mapFactory = (key, config) => {

        return map(key, FactoryMapping(createMapping({...config, key}), this))
    }

    /**
     * Add a ValueMapping to the injector
     *
     * @method mapValue
     * @param {String} key
     * @param {Object} config
     * @returns {Injector}
     */
    this.mapValue = (key, config) => {

        return map(key, ValueMapping(createMapping({...config, key})))
    }
}
