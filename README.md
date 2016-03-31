# npm-outdated

notifies an atom user about outdated dependencies in project package.json


## Install

```
$ apm install npm-outdated
```

## Usage

the package automatically watches every project in atom. If the project uses a package.json in the root of the project folder, then this package.json is checked. Changes on the package.json file invokes a new check.

* dependency in package.json, but not installed in node_modules or not valid to version range of package.json
  * triggers **warning** notification
  * **use case:** Team member installs new required dependency. After svn update, this package triggers automatically warning notification to update dependencies
* local installed version is outdated to version in npm registry (latest, beta)
  * triggers **info** notification
  * **use case:** External dependency release new version, to fix an issue. This package triggers automatically info notification about available update.

* local installed version is outdated to version in npm registry (latest, beta), but not wanted by version range in package.json
  * triggers **info** notification
  * **use case:** External dependency is pinned to a certain version in package.json (e.g. incompatability to own code). This package triggers info notification, about new version, which resolves the incompatibility

## Commands

* npm-outdated
  * perform a manual check
* npm-outdated:disable
  * disable this package for all active projects till next atom start.
  * **use case:** this package will generate a notification for every save of package.json. If you want to edit package.json, these notifications can distract you.
* npm-outdated:enable
  * enable this package for all active projects

## Settings

* notify outdated packages
  * show info notification, if one package is outdated
* notify outdated packages, but not wanted
  * show info notification, if one package is outdated, but doesn't satisfy version range
* check dev dependencies
  * enable/disable check of dev dependencies
* check beta version
	* enable check for beta property of npm.distTags
## License

MIT © Andreas Weber
