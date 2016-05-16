var assert = require('assert')
const expect = require('chai').expect
const DiCast = require('../../src/main.js')
const ErrorMessages = require('../../src/error-messages.js')


/*global describe, xdescribe, it, xit, beforeEach, afterEach, spyOn */
describe('DiCast', () => {

    xdescribe('test', () => {

        it('should pass', () => {

            chai.expect(1).to.equal(1)
            assert.equal(1, 1)
        })
    })

    var injector

    beforeEach(() => {

        injector = new DiCast()
    })

    describe('instantiation', () => {

        it('should instantiate with or without new', () => {

            expect(() => new DiCast()).to.not.throw(Error)
            expect(() => DiCast()).to.not.throw(Error)
        })

        it('should accept a DiCast instance as a parent injector', () => {

            expect(() => new DiCast(injector)).to.not.throw(Error)
        })

        it('should throw for an invalid parent injector', () => {

            expect(() => new DiCast(null)).to.throw(Error, new RegExp(ErrorMessages.INVALID_PARENT))
            expect(() => new DiCast({})).to.throw(Error, new RegExp(ErrorMessages.INVALID_PARENT))
        })
    })

    describe('has', () => {

        it('should throw if the key is not a String', () => {

            expect(() => injector.has(['MyValue'])).to.throw(Error, new RegExp(ErrorMessages.INVALID_KEY_TYPE))
        })

        it('should return false for an unmapped key', () => {

            expect(injector.has('MyValue')).to.equal(false)
        })

        xit('should return true for a mapped key', () => {

            injector.mapValue('MyValue', {target: 'value'})

            expect(injector.has('MyValue')).to.equal(true)
            // assert(injector.has('MyValue'), true)
        })

        xit('should return true for a key mapped in the parent', () => {

            injector.mapValue('MyValue', {target: 'value'})
            const child = new DiCast(injector)

            expect(child.has('MyValue')).to.equal(true)
            // assert(child.has('MyValue'), false)
        })
    })
})
