const path = require('path');
const fs = require('fs-extra');
const { serializeJson, parseJson } = require('@nx/devkit');

const rootDir = path.resolve(path.join(__dirname, '..', '..'));

const cmdArgs = process.argv.slice(2);
const packageName = cmdArgs[0];
const publish = cmdArgs[1] === 'publish';

const packagePath = path.join('packages', packageName, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath));
const npmPackageName = packageJson.name;
console.log(`Building ${npmPackageName}...${publish ? 'and publishing.' : ''}`);

function cleanPackage() {
  // helps remove unwanted properties which may be added by other tooling
  const packageJsonPath = path.resolve(rootDir, 'dist', 'packages', packageName, 'package.json');
  const contents = fs.readFileSync(packageJsonPath, { encoding: 'utf-8' });
  if (contents) {
    const parsed = parseJson(contents);
    // we don't need module or type properties at the moment
    delete parsed['module'];
    delete parsed['type'];
    fs.writeFileSync(packageJsonPath, serializeJson(parsed));
  }
}

function finishPreparation() {
  fs.copy(path.join('tools', 'assets', 'publishing'), path.join('dist', 'packages', packageName))
    .then(() => {
      cleanPackage();
      console.log(`${npmPackageName} ready to publish.`);
    })
    .catch((err) => console.error(err));
}

finishPreparation();
