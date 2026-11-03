const isProduction = process.env.NODE_ENV === 'production';
const isVercel = Boolean(process.env.VERCEL);

module.exports = {
  // Vercel requires the default ".next" output directory.
  distDir: isProduction && !isVercel ? '.next-production' : '.next',
};
