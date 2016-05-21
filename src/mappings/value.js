import {createMapping, validateMapping} from '../utils'


export default (config, injector) => {

    return {

        ...validateMapping(createMapping(config)),

        instance: () => config.target
    }
}
