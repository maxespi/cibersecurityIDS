const path = require('path');

module.exports = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: process.env.NODE_ENV === 'development' ? 'source-map' : false,
    entry: {
        app: './src/renderer/App.tsx',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].bundle.js',
        library: '[name]',
        libraryTarget: 'var',
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            '@babel/preset-react',
                            '@babel/preset-typescript'
                        ]
                    }
                }
            },
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-react']
                    }
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader', 'postcss-loader']
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@components': path.resolve(__dirname, 'src/renderer/components'),
            '@hooks': path.resolve(__dirname, 'src/renderer/hooks'),
            '@types': path.resolve(__dirname, 'src/renderer/types'),
            '@utils': path.resolve(__dirname, 'src/renderer/utils')
        }
    },
    externals: {
        'electron': 'require("electron")',
        'react': 'React',
        'react-dom': 'ReactDOM'
    },
    target: 'electron-renderer'
};