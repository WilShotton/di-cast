const expect = require('chai').expect
const FactoryMapping = require('../../../src/mappings/factory.js')


/*global describe, xdescribe, it, xit, beforeEach, afterEach, spyOn */
xdescribe('FactoryMapping', () => {

    describe('instantiation', () => {

        it('should instantiate with or without new', () => {

            expect(() => new FactoryMapping()).to.not.throw(Error)
            expect(() => FactoryMapping()).to.not.throw(Error)
        })

        it('should return a base mapping by default', () => {

            const vo = FactoryMapping()
            expect(vo.defer).to.equal(false)
            expect(vo.target).to.equal(null)
            expect(vo.using).to.eql([])
        })

        it('should throw if the target is not a function', () => {

            const msg = Utils.template(ErrorMessages.NO_MAPPING, {key})
            expect(() => FactoryMapping({}, {target:''})).to.throw(Error, new RegExp(msg))
        })

        it('should map the instance property to the target property', () => {

            const mapping = FactoryMapping({}, {target:() => ''})

            expect(mapping.instance()).to.equal(mapping.target())
        })
    })
})
