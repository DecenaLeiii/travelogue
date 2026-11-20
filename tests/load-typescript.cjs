const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

module.exports = function loadTypeScript(file, mocks = {}) {
  const filename = path.join(__dirname, '..', file);
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    return require(name);
  };
  vm.runInThisContext(`(function(exports, require, module) { ${compiled}\n})`, { filename })(module.exports, localRequire, module);
  return module.exports;
};
