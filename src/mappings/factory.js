import ErrorMessages from '../error-messages.js'
import Utils from '../utils.js'
import base from './base.js'


function FactoryMapping(injector, key, config) {

    if (!(this instanceof FactoryMapping)) {
        return new FactoryMapping(injector, config)
    }

    this._injector = injector
    this._key = key
    this._config = Utils.createMapping(config)
}

FactoryMapping.prototype = base

FactoryMapping.prototype.instance = function() {

    const injector = this._injector
    const key = this._key
    const config = this._config

    if (!config.hasOwnProperty('instance') || !config.isSingleton) {

        config.instance = config.target.apply(null, config.using.map(key => injector.get(key)))

        if (config.instance == null) {
            throw new Error(Utils.template(ErrorMessages.INVALID_FACTORY, {key}))
        }
    }

    return config.instance
}

FactoryMapping.prototype.constructor = FactoryMapping

export default FactoryMapping
