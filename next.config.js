const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  distDir: isProduction ? '.next-production' : '.next',
};
