
const BASE_MAPPING = {
    target: null,
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
 * Simple template function
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
 * @param {String} key
 * @param {Object} config
 * @param mappings
 */
const validateMapping = (key, config, mappings) => {

    const ctx = {key}

    if (!is(key, 'String')) {
        throw new TypeError(ErrorMessages.INVALID_KEY)
    }

    if (key.length === 0) {
        throw new Error(ErrorMessages.INVALID_KEY)
    }

    if (!is(config, 'Object')) {
        throw new Error(template(ErrorMessages.INVALID_CONFIG, ctx))
    }

    if (!config.hasOwnProperty('target')) {
        throw new Error(template(ErrorMessages.MISSING_TARGET), ctx);
    }

    if (mappings.hasOwnProperty(key)) {
        throw new Error(template(ErrorMessages.MAPPING_EXISTS, ctx))
    }
}

export default {
    createMapping,
    is,
    template,
    validateMapping
}
