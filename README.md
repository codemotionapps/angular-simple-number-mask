# angular-simple-number-mask

## Configuration

### With bower or npm (without browserify):

1. Import the ```angular-simple-number-mask-standalone.min.js``` script in your page. For example:

```
<script src="angular-simple-number-mask-standalone.min.js"></script>
```

Obs: for npm the build scripts are available inside ```build``` folder.

2. Include the module name ```number-mask``` in your angular app. For example:

```
angular.module('app', ['numberMask']);
```

### With npm and browserify:

```
angular.module('demo', [require('numberMask')]);
```

## How to use

```html
<input type="text" name="field" data-ng-model="hours" data-add-string="stringToAdd">
```

- Support to the ```min``` and ```max``` attributes.

- Internationalized: Uses the decimal separator and thousands separator defined in the client browser configuration.

## Other ways to use

If you are using bower or npm (without browserify):

- angular-simple-number-mask-dependencies.js: provides all external dependencies (string-mask, br-validations)
- angular-simple-number-mask.js: provides all directives, and does not include external dependencies (string-mask, br-validations)

If you are using npm with browserify:

- ```require('angular-simple-number-mask')```

## Build

```
npm install
gulp build
```
