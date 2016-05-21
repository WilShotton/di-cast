import ErrorMessages from '../error-messages.js'
import {createMapping, is, template, validateMapping} from '../utils'


const validateTarget = mapping => {

    if (!is(mapping.target, 'Function')) {
        throw new TypeError(template(ErrorMessages.INVALID_TARGET, mapping))
    }

    return mapping
}

export default (config, injector) => {

    return {

        ...validateMapping(validateTarget(createMapping(config))),

        instance: () => {

            if (!config.hasOwnProperty('instance') || !config.isSingleton) {

                config.instance = config.target.apply(null, config.using.map(key => injector.get(key)))
            }

            return config.instance
        }
    }
}
