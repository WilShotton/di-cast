const expect = require('chai').expect
const Injector = require('../../../src/injector.js')
const ErrorMessages = require('../../../src/error-messages.js')
const Utils = require('../../../src/utils.js')
const FactoryMapping = require('../../../src/mappings/factory.js')


const injector = Injector().mapValue('bar', {target: 'bar'})

const config = {
    key: 'foo',
    target: bar => bar,
    defer: false,
    using: ['bar']
}

/*global describe, xdescribe, it, xit, beforeEach, afterEach, spyOn */
describe('FactoryMapping', () => {

    var mapping

    beforeEach(() => {

        mapping = FactoryMapping(config, injector)
    })

    it('should expose a key property', () => {

        expect(mapping.key).to.equal(config.key)
    })

    it('should expose a target property', () => {

        expect(mapping.target).to.equal(config.target)
    })

    it('should expose a base mapping', () => {

        expect(mapping.defer).to.equal(config.defer)
        expect(mapping.using).to.eql(['bar'])
    })

    it('should expose an instance method', () => {

        expect(typeof mapping.instance).to.equal('function')
    })

    it('should expose an injected mapping instance', () => {

        expect(mapping.instance()).to.equal('bar')
    })

    it('should throw if the target is not a function', () => {

        const conf = Object.assign({}, config, {target:'oops'})
        const msg = Utils.template(ErrorMessages.INVALID_TARGET, conf)

        expect(() => FactoryMapping(conf, injector)).to.throw(TypeError, new RegExp(msg))
    })
})
