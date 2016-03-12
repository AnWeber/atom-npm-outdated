/** @babel */

import lodash from 'lodash';
import path from 'path';
import fs from 'fs';
import npmHandler from './npmHandler';
import configJson from './config.json';
import { CompositeDisposable } from 'atom';

class NpmOutdated {

  constructor() {
    this.config = configJson;
    this.npmHandlers = {};
    this.disposables = new CompositeDisposable();
  }
  activate() {
    this.handleProjectPaths(atom.project.getPaths());
    this.disposables.add(atom.project.onDidChangePaths((projectPaths) => this.handleProjectPaths(projectPaths)));

    this.disposables.add(atom.commands.add('atom-workspace', 'npm-outdated', () => {
      lodash.forEach(this.npmHandlers, (npmHandler) => npmHandler.check());
    }));
  }

  /**
   * iterate the list of project paths and attach watcher to new project paths
   * @param  {array} projectPaths array of project paths
   */
  handleProjectPaths(projectPaths) {
    lodash.forEach(projectPaths, (projectPath) => {
      if (!this.npmHandlers[projectPath]) {
        this.npmHandlers[projectPath] = this.createWatcher(projectPath);
      }
      lodash.pull(this.prevProjectPaths, projectPath);
    });

    lodash.forEach(this.prevProjectPaths, (projectPath) => {
      const npmHandler = this.npmHandlers[projectPath];
      if (npmHandler) {
        npmHandler.destroy();
        delete this.npmHandlers[projectPath];
      }
    });
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
      return new npmHandler(packagePath);
    }
    return null;
  }

  deactivate() {
    lodash.forEach(this.npmHandlers, (npmHandler) => npmHandler.dipose());
    this.npmHandlers = {};
    this.disposables.clear();
  }
}

/**
 * attach to atom events
 */
export default new NpmOutdated();
