var path = require('path');
const webpack = require('webpack');
const MiniExtractPlugin = require('mini-css-extract-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
	mode: 'development',
	entry: ['./src/js/main.js'],
	context: __dirname,	
	devtool: 'inline-source-map',
	output: {
	  filename: 'js/[name].js',
	  path: path.resolve(__dirname, 'public'),
	  publicPath: '/js/'	  
	},
	optimization: {
		splitChunks: {
		  cacheGroups: {
				styles: {
					name: 'styles',
					test: /\.css$/,
					chunks: 'all',
					enforce: true
				}
		  }
		},
		minimizer: [
				new TerserPlugin({
					terserOptions: {
						output: {
							comments: false,
							beautify: false
						},
						compress: {
							drop_console: true
						}
					},
					sourceMap: false
				})
			],
			noEmitOnErrors: true
	
	},
	resolve: {
		alias: {
			handlebars: 'handlebars/dist/handlebars.min.js'
		},
		modules: [
			'src/js/modules/',
			'node_modules/'
		]
	},	
	module: {
		rules: [{
			test: /\.(scss|css)$/,
            use: [
                {
					loader: MiniExtractPlugin.loader,// creates style nodes from JS strings
					options: { 
						publicPath: '/css'
					}					
				},{
					loader: 'css-loader', // translates CSS into CommonJS
					options: { 
						sourceMap: true, importLoaders: 1 
					}
				},{
					loader: "sass-loader", // compiles Sass to CSS, using Node Sass by default
					options: {
						implementation: require("sass")
					}
				}                
			]			
		}]
	},
	plugins: [
		new MiniExtractPlugin({
			filename: 'css/main.css'
		}),
		new CompressionPlugin({
			test: /\.js(\?.*)?$/i
		}),
		new webpack.ProvidePlugin({
			'$': 'jquery',
			'Handlebars': 'handlebars'
		})		
	]
  };