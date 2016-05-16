var path = require('path')
var webpackConfig = require('./webpack.config.js')


var ROOT_PATH = path.resolve(__dirname)

webpackConfig.cache = true

webpackConfig.module.preLoaders = [{
    test: /\.jsx?$/,
    loaders: ['isparta-loader', 'eslint-loader'],
    include: path.resolve(ROOT_PATH, 'src')
}]

webpackConfig.node = {
    fs: 'empty'
}

module.exports = function(config) {

    config.set({

        browsers: ['Chrome'],

        files: ['test/spec/**/*.spec.jsx'],

        frameworks: ['mocha'],

        preprocessors: {
            'test/spec/**/*.spec.jsx': ['webpack']
        },

        reporters: ['mocha', 'coverage'],

        coverageReporter: {
            reporters: [
                {
                    type: 'text-summary'
                }, {
                    type: 'html',
                    dir: 'docs/coverage'
                }
            ]
        },

        singleRun: false,

        webpack: webpackConfig,

        webpackMiddleware: {
            noInfo: true
        }
    })
}
