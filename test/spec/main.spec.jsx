var assert = require('assert')
const expect = require('chai').expect
const DiCast = require('../../src/main.js')
const ErrorMessages = require('../../src/error-messages.js')
const Utils = require('../../src/utils.js')


/*global describe, xdescribe, it, xit, beforeEach, afterEach, spyOn */
describe('DiCast', () => {

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

        it('should return true for a mapped key', () => {

            expect(injector.has('injector')).to.equal(true)
        })

        it('should return true for a key mapped in the parent', () => {

            injector.mapValue('MyValue', {target: 'value'})
            const child = new DiCast(injector)

            expect(child.has('MyValue')).to.equal(true)
        })

        it('should only look in the local scope if the local flag is set', () => {

            injector.mapValue('MyValue', {target: 'value'})
            const child = new DiCast(injector)

            expect(child.has('MyValue', true)).to.equal(false)
        })
    })

    describe('get', () => {

        it('should get a dependency in the local scope', () => {

            const foo = 'foo'

            injector.mapValue('foo', {target: foo})

            expect(injector.get('foo')).to.equal('foo')
        })

        it('should get a dependency from the parent scope when it is not mapped in the local scope', () => {

            const foo = 'foo'

            injector.mapValue('foo', {target: foo})

            const child = new DiCast(injector)

            expect(child.has('foo', true)).to.equal(false)
            expect(child.get('foo')).to.equal('foo')
        })

        it('should get a dependency from the parent scope if the defer flag is true', () => {

            injector.mapValue('foo', {target: 'parent'})

            const child = new DiCast(injector)
            child.mapValue('foo', {target: 'child', defer: true})

            expect(child.has('foo', true)).to.equal(true)
            expect(child.get('foo')).to.equal('parent')
        })

        it('should throw for a missing mapping', () => {

            const key = 'foo'
            const msg = Utils.template(ErrorMessages.NO_MAPPING, {key})

            expect(() => injector.get(key)).to.throw(Error, new RegExp(msg))
        })

        xit('should throw for a circular dependency', () => {

        })
    })
})
