import {createMapping, validateMapping} from '../utils'


export default config => {

    return {

        ...validateMapping(createMapping(config)),

        instance: () => config.target
    }
}
