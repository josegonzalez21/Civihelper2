// babel.config.js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Si usas alias "@/src", descomenta esto:
      // [
      //   'module-resolver',
      //   {
      //     root: ['./'],
      //     alias: { '@': './', '@/src': './src' },
      //     extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      //   },
      // ],

      // 👇 SIEMPRE al final
      'react-native-reanimated/plugin',
    ],
  }
}