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
    
    const mappings = {

        injector: Utils.createMapping({
            resolve: () => this,
            instance: this,
            target: this
        })
    }
    
    this.has = key => {
        
        if (!Utils.is(key, 'String')) {
            throw new Error(ErrorMessages.INVALID_KEY)
        }
        
        return mappings.hasOwnProperty(key) || parent.has(key)
    }

    // @TODO: Temporary implementation - mappings should be registered
    this.mapValue = (key, config) => {
        Utils.validateMapping(key, config, mappings)
        mappings[key] = ValueMapping(this, config)
        return this
    }
}
