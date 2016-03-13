/** @babel */
import semver from 'semver';
import lodash from 'lodash';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
/**
 * check dependencies of package.json and register update watcher
 */
export default class NpmHandler {
  /**
   * initialize npmHandler
   * @param  {string} filePath path to package.json
   * @param  {object} settings  object with all settings
   */
  constructor(filePath, settings) {
    this.settings = settings || {};
    this.filePath = filePath;
    this.npmFolder = path.join(path.dirname(filePath), 'node_modules');

    this.watcher = fs.watch(filePath, lodash.debounce(() => this.check()));

    this.check();
  }
  /**
   * update settings of this handler
   * @param  {object} settings list of all settings
   */
  updateSettings(settings) {
    this.settings = settings;
  }
  /**
   * check package file for outdated dependencies
   * @return {promise} checked dependencies
   */
  check() {
    return this.toJson(this.filePath)
      .then((packageJson) => this.getDependencies(packageJson))
      .then((dependencies) => this.checkVersionLocal(dependencies))
      .then((dependencies) => this.checkVersionNpm(dependencies))
      .then((dependencies) => this.notifyResults(dependencies));
  }

  /**
   * get all dependencies
   * @param  {object} packageJson package file
   * @return {array} array of dependencies
   */
  getDependencies(packageJson) {
    let dependencies = lodash.map(packageJson.dependencies, (versionRange, name) => {
      return {
        name: name,
        versionRange: versionRange,
      };
    });
    if (this.settings.checkDevDependencies) {
      dependencies = dependencies.concat(
        lodash.map(packageJson.devDependencies, (versionRange, name) => {
          return {
            name: name,
            versionRange: versionRange,
            dev: true,
          };
        })
      );
    }
    return dependencies;
  }
  /**
   * check the local installed dependencies against the versionRange in the package file
   * @param  {array} dependencies array of dependencies
   * @return {promise} promise, which resolves to updated dependencies
   */
  checkVersionLocal(dependencies) {
    return Promise.all(lodash.map(dependencies, (dependency) => {
      return this.toJson(path.join(this.npmFolder, dependency.name, 'package.json'))
        .then((localJson) => {
          if (localJson) {
            dependency.localVersion = localJson.version;
            dependency.localOutdated = !semver.satisfies(localJson.version, dependency.versionRange);
          } else {
            dependency.localOutdated = true;
          }
          return dependency;
        });
    }));
  }
  /**
   * check the online available dependencies against the versionRange in the package file
   * @param  {array} dependencies array of dependencies
   * @return {promise} promise, which resolves to updated dependencies
   */
  checkVersionNpm(results) {
    return Promise.all(lodash.map(results, (dependency) => {
      if (dependency && dependency.localVersion) {
        return this.loadNpmRegistry(dependency.name)
          .then((distTags) => {
            if (distTags && distTags.beta) {
              dependency.npmVersionBeta = distTags.beta;
              this.checkDependencyNpm(dependency, distTags.beta);
            }
            if (distTags && distTags.latest) {
              dependency.npmVersionLatest = distTags.latest;
              this.checkDependencyNpm(dependency, distTags.latest);
            }
            return dependency;
          })
          .catch((err) => {
            console.log(err);
            return dependency;
          });
      } else {
        //dependency currently not installed, no online check needed
        return Promise.resolve(dependency);
      }
    }));
  }
  /**
   * check version against current dependency
   * @param  {object} dependency dependency
   * @param  {string} version    online version of dependency
   */
  checkDependencyNpm(dependency, version) {
    if (semver.satisfies(version, dependency.versionRange)) {
      dependency.npmVersion = version;
      dependency.outdated = semver.gt(version, dependency.localVersion);
    } else if (semver.gtr(version, dependency.versionRange)) {
      dependency.npmVersion = version;
      dependency.outdatedNotWanted = true;
    }
  }
  /**
   * load package file from npm registry
   * @param  {string} name name of dependency
   * @return {promise} promise which resolves to distTags
   */
  loadNpmRegistry(name) {
    return fetch(`http://registry.npmjs.org/${name}`)
      .then((response) => response.json())
      .then((json) => {
        if (json) {
          return json['dist-tags'];
        }
        return null;
      });
  }
  /**
   * show notifications for outdated dependencies
	 * @param  {array} dependencies array of dependencies
	 * @return  {array} array of dependencies
   */
  notifyResults(dependencies) {
    const dependenciesLocalOutdated = lodash.filter(dependencies, (dependency) => dependency.localOutdated);
    if (dependenciesLocalOutdated.length > 0) {
      atom.notifications.addWarning(this.filePath, {
        detail: this.createMessage('unresolved dependencies:', dependenciesLocalOutdated, obj => obj.versionRange),
      });
    }
    if (this.settings.notifyOutdated) {
      const dependenciesOutdated = lodash.filter(dependencies, (dependency) => dependency.outdated && !dependency.localOutdated);
      if (dependenciesOutdated.length > 0) {
        atom.notifications.addInfo(this.filePath, {
          detail: this.createMessage('outdated dependencies:', dependenciesOutdated, obj => obj.npmVersion),
        });
      }
    }
    if (this.settings.notifyUpdate) {
      const dependenciesOutdatedNotWanted = lodash.filter(dependencies, (dependency) => dependency.outdatedNotWanted && !dependency.localOutdated);
      if (dependenciesOutdatedNotWanted.length > 0) {
        atom.notifications.addInfo(this.filePath, {
          detail: this.createMessage('outdated dependencies, but not wanted:', dependenciesOutdatedNotWanted, obj => obj.npmVersion),
        });
      }
    }
    return dependencies;
  }
  /**
   * create notification message
   * @param  {string} header       header for message
   * @param  {array} dependencies array of dependencies
   * @param  {function} toVersion    method to get version
   * @return {string}  message for notification
   */
  createMessage(header, dependencies, toVersion) {
    const message = [];
    message.push(header);
    for (let dependency of dependencies) {
      message.push('\n');
      message.push(`${dependency.name}: ${dependency.localVersion || 'not installed'} => ${toVersion(dependency)}`);
    }
    const result = message.join('');
    console.log(result);
    return result;
  }

  /**
   * close file watcher
   */
  dispose() {
    if (this.watcher) {
      this.watcher.close();
    }
    this.watcher = null;
  }

  /**
   * read json from file
   * @param  {string} path filepath of json file
   * @return {object} content of file
   */
  toJson(filepath) {
    return new Promise((resolve) => {
      let result = null;
      if (fs.existsSync(filepath)) {
        fs.readFile(filepath, 'utf8', (err, content) => {
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
}
