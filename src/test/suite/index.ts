import * as path from 'path';
import * as fs from 'fs';
import Mocha = require('mocha');

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'tdd', color: true });
  const testsRoot = __dirname;

  return new Promise((resolve, reject) => {
    const files = fs.readdirSync(testsRoot);
    for (const file of files) {
      if (file.endsWith('.test.js')) {
        mocha.addFile(path.resolve(testsRoot, file));
      }
    }

    try {
      mocha.run((failures) => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}
