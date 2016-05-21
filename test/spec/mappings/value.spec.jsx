const expect = require('chai').expect
const ValueMapping = require('../../../src/mappings/value.js')


const config = {
    key:'foo',
    target:'bar',
    defer: false
}

/*global describe, xdescribe, it, xit, beforeEach, afterEach, spyOn */
describe('ValueMapping', () => {

    describe('instantiation', () => {

        var mapping

        beforeEach(() => {

            mapping = ValueMapping(config)
        })

        it('should expose a key property', () => {

            expect(mapping.key).to.equal(config.key)
        })

        it('should expose a target property', () => {

            expect(mapping.target).to.equal(config.target)
        })

        it('should expose a base mapping', () => {

            expect(mapping.defer).to.equal(config.defer)
            expect(mapping.using).to.eql([])
        })

        it('should expose an instance method', () => {

            expect(typeof mapping.instance).to.equal('function')
        })

        it('should return the target property from instance', () => {

            expect(mapping.instance()).to.equal(mapping.target)
            expect(mapping.instance()).to.equal(config.target)
        })
    })
})
