const expect = require('chai').expect
const Utils = require('../../src/utils.js')
const ErrorMessages = require('../../src/error-messages.js')


/*global describe, xdescribe, it, xit, beforeEach, afterEach, spyOn */
describe('Utils', () => {

    describe('createMapping', () => {

        it('should create a base mapping', () => {

            expect(Utils.createMapping()).to.eql(Utils.BASE_MAPPING)
        })

        it('should override base mapping properties', () => {

            expect(Utils.createMapping({target: 'foo'})).to.eql({
                target: 'foo',
                defer: false,
                using: []
            })
        })

        it('should add new mapping properties', () => {

            expect(Utils.createMapping({foo: 'foo'})).to.eql({
                target: null,
                defer: false,
                using: [],
                foo: 'foo'
            })
        })
    })

    describe('is', () => {

        it('should check basic types', () => {

            expect(Utils.is('foo', 'String')).to.equal(true)
            expect(Utils.is(12, 'Number')).to.equal(true)
            expect(Utils.is({}, 'Object')).to.equal(true)
            expect(Utils.is([], 'Array')).to.equal(true)
            expect(Utils.is(null, 'Null')).to.equal(true)
            expect(Utils.is(undefined, 'Undefined')).to.equal(true)
            expect(Utils.is(() => {}, 'Function')).to.equal(true)
        })

        it('should be case insensitive', () => {

            expect(Utils.is('foo', 'string')).to.equal(true)
        })
    })
    
    describe('template', () => {

        it('should replace tokens with supplied values', () => {

            expect(Utils.template('Hello {{name}}', {name: 'Dave'})).to.equal('Hello Dave')
        })
    })
    
    describe('validateMapping', () => {

        it('should throw if the key is not a string', () => {

            const msg = new RegExp(ErrorMessages.INVALID_KEY)
            expect(() => Utils.validateMapping({}, {target: 'foo'}, {})).to.throw(TypeError, msg)
        })

        it('should throw if the key is an empty string', () => {

            const msg = new RegExp(ErrorMessages.INVALID_KEY)
            expect(() => Utils.validateMapping('', {target: 'foo'}, {})).to.throw(Error, msg)
        })

        it('should throw if the config is not an Object', () => {

            const key = 'foo'
            const msg = new RegExp(Utils.template(ErrorMessages.INVALID_CONFIG, {key}))
            expect(() => Utils.validateMapping(key, '', {})).to.throw(Error, msg)
        })

        it('should throw if the config target property is missing', () => {

            const key = 'foo'
            const msg = new RegExp(Utils.template(ErrorMessages.MISSING_TARGET, {key}))
            expect(() => Utils.validateMapping(key, {}, {})).to.throw(Error, msg)
        })

        it('should throw if a mapping for the given key already exists', () => {

            const mappings = {foo: 'foo'}
            const key = 'foo'
            const msg = new RegExp(Utils.template(ErrorMessages.MAPPING_EXISTS, {key}))
            expect(() => Utils.validateMapping(key, {target: 'foo'}, mappings)).to.throw(Error, msg)
        })
    })
})
