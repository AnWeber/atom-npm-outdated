# npm-outdated

notifies about outdated dependencies in package.json for every project in atom


## Install

```
$ apm install npm-outdated
```

## Usage

the package automatically watches every project in atom. If the project uses a package.json in the root of the project folder, then this package.json is checked. Changes on the package.json file invokes a new check.

* dependency in package.json, but not installed in node_modules or not valid to version range of package.json
> show warning notification with invalid dependencies
* local installed version is outdated to version in npm registry (latest, beta)
> show info notification with outdated dependencies
* local installed version is outdated to version in npm registry (latest, beta), but not wanted by version range in package.json
> show info notification with outdated dependencies

## Commands

* npm-outdated
> perform a manual check
* npm-outdated:disable
> disable this package for all active projects. e.g this package will generate a notification for every change in package.json. If you want to edit the package.json, all these notifications can distract.
* npm-outdated:enable
> enable this package for all active projects

## Settings

* notify outdated packages
> show info notification, if one package is outdated
* notify outdated packages, but not wanted
> show info notification, if one package is outdated, but doesn't satisfy version range
* check dev dependencies
> enable/disable check of dev dependencies

## License

MIT © Andreas Weber
