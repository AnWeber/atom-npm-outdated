/** @babel */
import semver from 'semver';
import lodash from 'lodash';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';


export default class NpmHandler {
  constructor(packagePath, options) {
    this.options = options || {};
    this.packagePath = packagePath;
    this.npmFolder = path.join(path.dirname(packagePath), 'node_modules');

    this.watcher = fs.watch(packagePath, () => this.check());

    this.check();
  }

  check() {
    this.toJson(this.packagePath)
      .then((packageJson) => {
        this.checkVersion(packageJson);
      });
  }

  toJson(path) {
    return new Promise((resolve) => {
      let result = null;
      if (fs.existsSync(path)) {
        fs.readFile(path, 'utf8', (err, content) => {
          if (err) {
            console.log(err);
          } else if (content && content.length > 0) {
            try {
              result = JSON.parse(content);
            } catch (exception) {
              console.log(exception);
            }
          }
          resolve(result);
        });
      } else {
        resolve(result);
      }
    });

  }

  checkVersion(packageJson) {
    this.getDependencies(packageJson)
      .then((results) => this.checkVersionLocal(results))
      .then((results) => this.checkVersionNpm(results))
      .then((results) => this.notifyResults(results));
  }


  getDependencies(packageJson) {
    let results = lodash.map(packageJson.dependencies, (versionRange, name) => {
      return {
        name: name,
        versionRange: versionRange,
      };
    });
    results = results.concat(
      lodash.map(packageJson.devDependencies, (versionRange, name) => {
        return {
          name: name,
          versionRange: versionRange,
        };
      })
    );
    return Promise.resolve(results);
  }

  checkVersionLocal(results) {
    return Promise.all(lodash.map(results, (handlerResult) => {
      return this.toJson(path.join(this.npmFolder, handlerResult.name, 'package.json'))
        .then((localJson) => {
          if (localJson) {
            handlerResult.localVersion = localJson.version;
            handlerResult.localOutdated = !semver.satisfies(localJson.version, handlerResult.versionRange);
          }
          return handlerResult;
        });
    }));
  }

  checkVersionNpm(results) {
    return Promise.all(lodash.map(results, (handlerResult) => {
      return this.registry(handlerResult.name)
        .then((registryJson) => {
          if (registryJson && registryJson['dist-tags']) {
            const distTags = registryJson['dist-tags'];
            let npmVersion = null;
            if (distTags.latest) {
              handlerResult.npmVersionLatest = distTags.latest;
              if (semver.satisfies(handlerResult.npmVersionLatest, handlerResult.versionRange)) {
                npmVersion = handlerResult.npmVersionLatest;
                npmVersion.wantedAvailable = true;
              } else if (semver.gtr(handlerResult.npmVersionLatest, handlerResult.versionRange)) {
                handlerResult.updateVersion = handlerResult.npmVersionLatest;
                handlerResult.updateAvailable = true;
              }
            }
            if (this.options.useBeta && distTags.beta) {
              handlerResult.npmVersionBeta = distTags.beta;
              if (!npmVersion && semver.satisfies(handlerResult.npmVersionBeta, handlerResult.versionRange)) {
                npmVersion = handlerResult.npmVersionBeta;
                npmVersion.wantedAvailable = true;
              } else if (semver.gtr(handlerResult.npmVersionBeta, handlerResult.versionRange)) {
                handlerResult.updateVersion = handlerResult.npmVersionBeta;
                handlerResult.updateAvailable = true;
              }
            }

            if (npmVersion && handlerResult.localVersion) {
              handlerResult.npmVersion = npmVersion;
              handlerResult.outdated = semver.gt(npmVersion, handlerResult.localVersion);
            }
          }
          return handlerResult;
        })
        .catch((err) => {
          console.log(err);
          return handlerResult;
        });
    }));
  }

  registry(name) {
    return fetch(`http://registry.npmjs.org/${name}`)
      .then((response) => response.json());
  }

  notifyResults(results) {
    let notificationMessage = '';
    let useWarning = false;
    lodash.forEach(results, (handlerResult) => {
      let message = null;
      if (handlerResult.localOutdated) {
        useWarning = true;
        message = `${handlerResult.name} needs update`;
      } else if (handlerResult.outdated) {
        message = `${handlerResult.name} outdated: ${handlerResult.localVersion} => ${handlerResult.npmVersion}`;
      } else if (handlerResult.updateAvailable) {
        message = `${handlerResult.name} updated: ${handlerResult.localVersion} => ${handlerResult.updateVersion}`;
      }
      if (message) {
        if (notificationMessage) {
          notificationMessage += `
${message}`;
        } else {
          notificationMessage = message;
        }
      }
    });

    if (notificationMessage) {
      if (useWarning) {
        atom.notifications.addWarning(this.packagePath, {
          detail: notificationMessage,
        });
      } else {
        atom.notifications.addInfo(this.packagePath, {
          detail: notificationMessage,
        });
      }
    }
  }

  dispose() {
    if (this.watcher) {
      this.watcher.close();
    }
    this.watcher = null;
  }
}
