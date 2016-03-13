/** @babel */

import lodash from 'lodash';
import path from 'path';
import fs from 'fs';
import npmHandler from './npmHandler';
import configJson from './config.json';
import { CompositeDisposable } from 'atom';

/**
 * check each project in atom for outdated dependencies in package.json
 */
class NpmOutdated {

  /**
   * init the package
   */
  constructor() {
    /**
     * all possible options
     * @type {Object}
     */
    this.config = configJson;
    /**
     * map of created npm handler
     * @type {Object}
     */
    this.npmHandlers = {};
  }
  /**
   * activate npmHandler for each project in atom
   */
  activate() {
    this.disposables = new CompositeDisposable();

    this.disposables.add(
      atom.config.observe('npm-outdated', (value) => {
        this.settings = value;
        for (let npmHandler of this.npmHandlers) {
          npmHandler.updateSettings(this.settings);
        }
      })
    );

    this.handleProjectPaths(atom.project.getPaths());
    this.disposables.add(atom.project.onDidChangePaths((projectPaths) => this.handleProjectPaths(projectPaths)));

    this.disposables.add(
      atom.commands.add('atom-workspace',
        'npm-outdated',
        () => this.checkNpmHandlers()
      )
    );
    this.disposables.add(
      atom.commands.add('atom-workspace',
        'npm-outdated:disable',
        () => this.disposeNpmHandlers()
      )
    );
    this.disposables.add(
      atom.commands.add('atom-workspace',
        'npm-outdated:enable',
        () => this.handleProjectPaths(atom.project.getPaths())
      )
    );
  }

  /**
   * iterate the list of project paths and attach watcher to new project paths
   * @param  {array} projectPaths array of project paths
   */
  handleProjectPaths(projectPaths) {
    for (let projectPath of projectPaths) {
      if (!this.npmHandlers[projectPath]) {
        this.npmHandlers[projectPath] = this.createWatcher(projectPath);
      }
      lodash.pull(this.prevProjectPaths, projectPath);
    }

    for (let projectPath of this.prevProjectPaths) {
      const npmHandler = this.npmHandlers[projectPath];
      if (npmHandler) {
        npmHandler.dispose();
        delete this.npmHandlers[projectPath];
      }
    }

    this.prevProjectPaths = projectPaths;
  }

  /**
   * search for package.json in project path and attach file watcher
   * @param  {string} projectPath project path
	 * @returns {npmHandler} create handler for file
   */
  createWatcher(projectPath) {
    const packagePath = path.join(projectPath, 'package.json');

    if (fs.existsSync(packagePath)) {
      return new npmHandler(packagePath, this.settings);
    }
    return null;
  }

  /**
   * check all npm handlers
   */
  checkNpmHandlers() {
    for (let npmHandler of this.npmHandlers) {
      npmHandler.check();
    }
  }

  /**
   * dispose npm handlers
   */
  disposeNpmHandlers() {
    for (let npmHandler of this.npmHandlers) {
      npmHandler.dispose();
    }
    this.npmHandlers = {};
  }

  /**
   * deactivate all file watcher
   */
  deactivate() {
    this.disposeNpmHandlers();
    this.disposables.clear();
  }
}

/**
 * attach to atom
 */
export default new NpmOutdated();
