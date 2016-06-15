/**
 * angular-simple-number-mask
 * Simple number mask for AngularJS 1
 * @version v0.1.0
 * @link https://github.com/dimitarnestorov/angular-simple-number-mask
 * @license MIT
 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define([], factory);
	} else if (typeof exports === 'object') {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.
		module.exports = factory();
	} else {
		// Browser globals (root is window)
		root.StringMask = factory();
	}
}(this, function () {
	var tokens = {
		'0': {pattern: /\d/, _default: '0'},
		'9': {pattern: /\d/, optional: true},
		'#': {pattern: /\d/, optional: true, recursive: true},
		'S': {pattern: /[a-zA-Z]/},
		'U': {pattern: /[a-zA-Z]/, transform: function (c) { return c.toLocaleUpperCase(); }},
		'L': {pattern: /[a-zA-Z]/, transform: function (c) { return c.toLocaleLowerCase(); }},
		'$': {escape: true}
	};

	function isEscaped(pattern, pos) {
		var count = 0;
		var i = pos - 1;
		var token = {escape: true};
		while (i >= 0 && token && token.escape) {
			token = tokens[pattern.charAt(i)];
			count += token && token.escape ? 1 : 0;
			i--;
		}
		return count > 0 && count%2 === 1;
	}

	function calcOptionalNumbersToUse(pattern, value) {
		var numbersInP = pattern.replace(/[^0]/g,'').length;
		var numbersInV = value.replace(/[^\d]/g,'').length;
		return numbersInV - numbersInP;
	}

	function concatChar(text, character, options, token) {
		if (token && typeof token.transform === 'function') character = token.transform(character);
		if (options.reverse) return character + text;
		return text + character;
	}

	function hasMoreTokens(pattern, pos, inc) {
		var pc = pattern.charAt(pos);
		var token = tokens[pc];
		if (pc === '') return false;
		return token && !token.escape ? true : hasMoreTokens(pattern, pos + inc, inc);
	}

	function insertChar(text, char, position) {
		var t = text.split('');
		t.splice(position >= 0 ? position: 0, 0, char);
		return t.join('');
	}

	function StringMask(pattern, opt) {
		this.options = opt || {};
		this.options = {
			reverse: this.options.reverse || false,
			usedefaults: this.options.usedefaults || this.options.reverse
		};
		this.pattern = pattern;
	}

	StringMask.prototype.process = function proccess(value) {
		if (!value) return '';
		value = value + '';
		var pattern2 = this.pattern;
		var valid = true;
		var formatted = '';
		var valuePos = this.options.reverse ? value.length - 1 : 0;
		var optionalNumbersToUse = calcOptionalNumbersToUse(pattern2, value);
		var escapeNext = false;
		var recursive = [];
		var inRecursiveMode = false;

		var steps = {
			start: this.options.reverse ? pattern2.length - 1 : 0,
			end: this.options.reverse ? -1 : pattern2.length,
			inc: this.options.reverse ? -1 : 1
		};

		function continueCondition(options) {
			if (!inRecursiveMode && hasMoreTokens(pattern2, i, steps.inc)) {
				return true;
			} else if (!inRecursiveMode) {
				inRecursiveMode = recursive.length > 0;
			}

			if (inRecursiveMode) {
				var pc = recursive.shift();
				recursive.push(pc);
				if (options.reverse && valuePos >= 0) {
					i++;
					pattern2 = insertChar(pattern2, pc, i);
					return true;
				} else if (!options.reverse && valuePos < value.length) {
					pattern2 = insertChar(pattern2, pc, i);
					return true;
				}
			}
			return i < pattern2.length && i >= 0;
		}

		for (var i = steps.start; continueCondition(this.options); i = i + steps.inc) {
			var pc = pattern2.charAt(i);
			var vc = value.charAt(valuePos);
			var token = tokens[pc];
			if (!inRecursiveMode || vc) {
				if (this.options.reverse && isEscaped(pattern2, i)) {
					formatted = concatChar(formatted, pc, this.options, token);
					i = i + steps.inc;
					continue;
				} else if (!this.options.reverse && escapeNext) {
					formatted = concatChar(formatted, pc, this.options, token);
					escapeNext = false;
					continue;
				} else if (!this.options.reverse && token && token.escape) {
					escapeNext = true;
					continue;
				}
			}

			if (!inRecursiveMode && token && token.recursive) {
				recursive.push(pc);
			} else if (inRecursiveMode && !vc) {
				if (!token || !token.recursive) formatted = concatChar(formatted, pc, this.options, token);
				continue;
			} else if (recursive.length > 0 && token && !token.recursive) {
				// Recursive tokens most be the last tokens of the pattern
				valid = false;
				continue;
			} else if (!inRecursiveMode && recursive.length > 0 && !vc) {
				continue;
			}

			if (!token) {
				formatted = concatChar(formatted, pc, this.options, token);
				if (!inRecursiveMode && recursive.length) {
					recursive.push(pc);
				}
			} else if (token.optional) {
				if (token.pattern.test(vc) && optionalNumbersToUse) {
					formatted = concatChar(formatted, vc, this.options, token);
					valuePos = valuePos + steps.inc;
					optionalNumbersToUse--;
				} else if (recursive.length > 0 && vc) {
					valid = false;
					break;
				}
			} else if (token.pattern.test(vc)) {
				formatted = concatChar(formatted, vc, this.options, token);
				valuePos = valuePos + steps.inc;
			} else if (!vc && token._default && this.options.usedefaults) {
				formatted = concatChar(formatted, token._default, this.options, token);
			} else {
				valid = false;
				break;
			}
		}

		return {result: formatted, valid: valid};
	};

	StringMask.prototype.apply = function(value) {
		return this.process(value).result;
	};

	StringMask.prototype.validate = function(value) {
		return this.process(value).valid;
	};

	StringMask.process = function(value, pattern, options) {
		return new StringMask(pattern, options).process(value);
	};

	StringMask.apply = function(value, pattern, options) {
		return new StringMask(pattern, options).apply(value);
	};

	StringMask.validate = function(value, pattern, options) {
		return new StringMask(pattern, options).validate(value);
	};

	return StringMask;
}));

},{}],2:[function(require,module,exports){
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
				string = attrs.addString;
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

},{}],3:[function(require,module,exports){
'use strict';

module.exports = angular.module('numberMask', [
	require('./global')
]).name;

},{"./global":4}],4:[function(require,module,exports){
'use strict';

var m = angular.module('numberMaskGlobal', [
	require('./helpers')
])
.directive('addString', require('./addStringDirective'));

module.exports = m.name;

},{"./addStringDirective":2,"./helpers":5}],5:[function(require,module,exports){
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

},{"string-mask":1}]},{},[3]);
