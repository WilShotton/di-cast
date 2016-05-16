var path = require('path')
var webpack = require('webpack')


var ROOT_PATH = path.resolve(__dirname)

module.exports = {

    entry: [
        path.resolve(ROOT_PATH, 'src/main.js')
    ],

    output: {
        path: 'build',
        filename: 'di-cast.js'
    },

    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                loader: 'babel-loader'
            }
        ],
        preLoaders: [
            {
                test: /\.jsx?$/,
                loader: 'eslint-loader',
                include: path.resolve(ROOT_PATH, 'src')
            }
        ]
    },

    devtool: 'source-map',

    devServer: {
        colors: true,
        contentBase: './build',
        https: false,
        host: '0.0.0.0',
        port: 8888,
        filename: 'main.js',
        hot: false,
        progress: true,
        stats: {
            assets: false,
            colors: true,
            version: false,
            hash: false,
            timings: false,
            chunks: false,
            chunkModules: false,
            children: false
        }
    }
}
