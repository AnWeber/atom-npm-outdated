## 0.6.0
* fixed issue with project without package.json

## 0.4.0 - notification redesign
* sorted and grouped dependencies in notification
* notification behaviour can be configured (manual dismiss, automatic dismiss, no notification)
* fixed error in display message, if beta version is outdated
* disable check for beta version config switch

## 0.3.0 - First Release
* check package.json of every project in atom
* show warning notification, if local dependency is missing or not valid to version range in package.json
* show info notification, if one package is outdated
* show info notification, if one package is outdated, but doesn't satisfy version range
