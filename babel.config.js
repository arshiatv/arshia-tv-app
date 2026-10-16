module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            'services': './services',
            'src': './src',
            'components': './components',
            'context': './context',
            'data': './data',
            'theme': './theme',
            'locales': './locales'
          },
        },
      ],
    ],
  };
};
