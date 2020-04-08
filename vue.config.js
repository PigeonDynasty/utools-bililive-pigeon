const CompressionWebpackPlugin = require("compression-webpack-plugin")
module.exports = {
  publicPath: "",
  productionSourceMap: false,
  configureWebpack: config => {
    if (process.env.NODE_ENV === 'production') {
      return {
        plugins: [
          new CompressionWebpackPlugin({
            filename: '[path].gz[query]',
            algorithm: 'gzip',
            test: /\.js$|\.html$|\.json$|\.css/,
            threshold: 10240, // 只有大小大于该值的资源会被处理
            minRatio: 0.8, // 只有压缩率小于这个值的资源才会被处理
            // deleteOriginalAssets: true // 删除原文件
          })
        ],
      }
    }
  }

}