import Utils from '../utils'


function ValueMapping(injector, config) {

    if (!(this instanceof ValueMapping)) {
        return new ValueMapping(injector, config)
    }

    this._config = Utils.createMapping(config)
}

ValueMapping.prototype = {

    get defer() {

        return this._config.defer
    },

    get instance() {

        if (!this._config.hasOwnProperty('instance')) {
            this._config.instance = this._config.target
        }

        return this._config.instance
    },

    get target() {

        return this._config.target
    },

    get using() {

        return this._config.using
    }
}

export default ValueMapping
