import ErrorMessages from './error-messages.js'


const BASE_MAPPING = {
    // target: null,
    defer: false,
    using: []
}

/**
 * Create a DiCast mapping object by merging a 
 * config into the base mapping
 * 
 * @method createMapping
 * @param {Object} config
 * @returns {Object}
 */
const createMapping = config => ({
    
    ...BASE_MAPPING,
    ...config
})

/**
 * Check the type of a value and return Boolean
 *
 * @method is
 * @param {*} value
 * @param {String} type
 * @returns {Boolean}
 */
const is = (value, type) => Object.prototype
    .toString
    .call(value)
    .split(' ')[1]
    .toLowerCase()
    .indexOf(type.toLowerCase()) !== -1

/**
 * Simple template function pattern matches for {{str}}
 * in the msg and replaces any matches with the corresponding
 * value in the context Object
 * 
 * @method template
 * @param {String} msg
 * @param {Object} context
 * @returns {String}
 */
const template = (msg, context) => msg.replace(
    /\{\{(\w+)\}\}/g,
    (_, match) => context[match]
)

/**
 * Validate a mapping config
 * 
 * @method validateMapping
 * @param {Object} mapping
 * @returns {Object}
 */
const validateMapping = mapping => {

    if (!is(mapping, 'Object')) {
        throw new Error(template(ErrorMessages.INVALID_CONFIG))
    }
    
    if (!is(mapping.key, 'String')) {
        throw new TypeError(ErrorMessages.INVALID_KEY)
    }

    if (mapping.key.length === 0) {
        throw new Error(ErrorMessages.INVALID_KEY)
    }

    if (!mapping.hasOwnProperty('target')) {
        throw new Error(template(ErrorMessages.MISSING_TARGET, mapping));
    }
    
    if (!is(mapping.defer, 'Boolean')) {
        throw new Error(template(ErrorMessages.INVALID_DEFER, mapping))
    }
    
    if (!is(mapping.using, 'Array')) {
        throw new Error(template(ErrorMessages.INVALID_USING, mapping))
    }
    
    return mapping
}

export default {
    BASE_MAPPING,
    createMapping,
    is,
    template,
    validateMapping
}
