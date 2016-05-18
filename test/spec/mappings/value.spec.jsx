const expect = require('chai').expect
const ValueMapping = require('../../../src/mappings/value.js')


/*global describe, xdescribe, it, xit, beforeEach, afterEach, spyOn */
describe('ValueMapping', () => {

    describe('instantiation', () => {

        it('should instantiate with or without new', () => {

            expect(() => new ValueMapping()).to.not.throw(Error)
            expect(() => ValueMapping()).to.not.throw(Error)
        })

        it('should return a base mapping by default', () => {

            const vo = ValueMapping()

            expect(vo.defer).to.equal(false)
            expect(vo.target).to.equal(null)
            expect(vo.using).to.eql([])
        })

        it('should map the instance property to the target property', () => {

            const vo = ValueMapping({}, {target:''})

            expect(vo.instance).to.equal(vo.target)
        })
    })
})
