/**
 * angular-simple-number-mask
 * Simple number mask for AngularJS 1
 * @version v0.1.0
 * @link https://github.com/dimitarnestorov/angular-simple-number-mask
 * @license MIT
 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

function PercentageMaskDirective($locale, $parse, PreFormatters, NumberMasks) {
	function preparePercentageToFormatter(value, decimals, modelMultiplier) {
		return PreFormatters.clearDelimiters((parseFloat(value)*modelMultiplier).toFixed(decimals));
	}

	return {
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, element, attrs, ctrl) {
			var decimalDelimiter = $locale.NUMBER_FORMATS.DECIMAL_SEP,
				thousandsDelimiter = $locale.NUMBER_FORMATS.GROUP_SEP,
				decimals = 0,
				backspacePressed = false,
				string;

			if (attrs.addString.trim()) {
				string = attrs.uiString;
			}else{
				throw "String undefined";
			}
			
			element.bind('keydown keypress', function(event) {
				backspacePressed = event.which === 8;
			});

			var modelValue = {
				multiplier : 1,
				decimalMask: 0
			};

			if (angular.isDefined(attrs.uiHideGroupSep)) {
				thousandsDelimiter = '';
			}

			var numberDecimals = decimals + modelValue.decimalMask;
			var viewMask = NumberMasks.viewMask(decimals, decimalDelimiter, thousandsDelimiter),
				modelMask = NumberMasks.modelMask(numberDecimals);

			function formatter(value) {
				if (ctrl.$isEmpty(value)) {
					return value;
				}

				var valueToFormat = preparePercentageToFormatter(value, decimals, modelValue.multiplier);
				return viewMask.apply(valueToFormat) + string;
			}

			function parse(value) {
				if (ctrl.$isEmpty(value)) {
					return null;
				}

				var valueToFormat = PreFormatters.clearDelimiters(value) || '0';
				if (value.length > 1 && value.indexOf(string) === -1) {
					valueToFormat = valueToFormat.slice(0,valueToFormat.length-1);
				}
				if (backspacePressed && value.length === 1 && value.indexOf(string) === -1) {
					valueToFormat = '0';
				}
				var formatedValue = viewMask.apply(valueToFormat) + string;
				var actualNumber = parseFloat(modelMask.apply(valueToFormat));

				if (ctrl.$viewValue !== formatedValue) {
					ctrl.$setViewValue(formatedValue);
					ctrl.$render();
				}

				return actualNumber;
			}

			ctrl.$formatters.push(formatter);
			ctrl.$parsers.push(parse);

			if (attrs.min) {
				var minVal;

				ctrl.$validators.min = function(modelValue) {
					var min = parseFloat(minVal, 10);
					return ctrl.$isEmpty(modelValue) || isNaN(min) || modelValue >= min;
				};

				scope.$watch(attrs.min, function(value) {
					minVal = value;
					ctrl.$validate();
				});
			}

			if (attrs.max) {
				var maxVal;

				ctrl.$validators.max = function(modelValue) {
					var max = parseFloat(maxVal, 10);
					return ctrl.$isEmpty(modelValue) || isNaN(max) || modelValue <= max;
				};

				scope.$watch(attrs.max, function(value) {
					maxVal = value;
					ctrl.$validate();
				});
			}
		}
	};
}
PercentageMaskDirective.$inject = ['$locale', '$parse', 'PreFormatters', 'NumberMasks'];

module.exports = PercentageMaskDirective;

},{}],2:[function(require,module,exports){
'use strict';

module.exports = angular.module('numberMask', [
	require('./global')
]).name;

},{"./global":3}],3:[function(require,module,exports){
'use strict';

var m = angular.module('numberMaskGlobal', [
	require('./helpers')
])
.directive('addString', require('./addStringDirective'));

module.exports = m.name;

},{"./addStringDirective":1,"./helpers":4}],4:[function(require,module,exports){
'use strict';

var StringMask = require('string-mask');

var m = angular.module('numberMaskHelpers', []);

module.exports = m.name;

m.factory('PreFormatters', [function() {
	function clearDelimiters(value) {
		if (value === '0') {
			return '0';
		}

		var cleanValue = value.replace(/^-/,'');
		return cleanValue.replace(/[^0-9]/g, '');
	}

	function prepareNumberToFormatter(value, decimals) {
		return clearDelimiters((parseFloat(value)).toFixed(decimals));
	}

	return {
		clearDelimiters: clearDelimiters,
		prepareNumberToFormatter: prepareNumberToFormatter
	};
}])
.factory('NumberMasks', [function() {
	return {
		viewMask: function(decimals, decimalDelimiter, thousandsDelimiter) {
			var mask = '#' + thousandsDelimiter + '##0';

			if (decimals > 0) {
				mask += decimalDelimiter;
				for (var i = 0; i < decimals; i++) {
					mask += '0';
				}
			}

			return new StringMask(mask, {
				reverse: true
			});
		},
		modelMask: function(decimals) {
			var mask = '###0';

			if (decimals > 0) {
				mask += '.';
				for (var i = 0; i < decimals; i++) {
					mask += '0';
				}
			}

			return new StringMask(mask, {
				reverse: true
			});
		}
	};
}]);

},{"string-mask":undefined}]},{},[2]);
