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

			if (angular.isDefined(attrs.uiString)) {
				string = attrs.uiString;
			}else{
				throw "ui-string undefined";
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

},{"string-mask":1}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9ub2RlX21vZHVsZXMvc3RyaW5nLW1hc2svc3JjL3N0cmluZy1tYXNrLmpzIiwiYWRkU3RyaW5nRGlyZWN0aXZlLmpzIiwiYW5ndWxhci1zaW1wbGUtbnVtYmVyLW1hc2suanMiLCJnbG9iYWwuanMiLCJoZWxwZXJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcblx0aWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuXHRcdC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cblx0XHRkZWZpbmUoW10sIGZhY3RvcnkpO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuXHRcdC8vIE5vZGUuIERvZXMgbm90IHdvcmsgd2l0aCBzdHJpY3QgQ29tbW9uSlMsIGJ1dFxuXHRcdC8vIG9ubHkgQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLFxuXHRcdC8vIGxpa2UgTm9kZS5cblx0XHRtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcblx0fSBlbHNlIHtcblx0XHQvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuXHRcdHJvb3QuU3RyaW5nTWFzayA9IGZhY3RvcnkoKTtcblx0fVxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XG5cdHZhciB0b2tlbnMgPSB7XG5cdFx0JzAnOiB7cGF0dGVybjogL1xcZC8sIF9kZWZhdWx0OiAnMCd9LFxuXHRcdCc5Jzoge3BhdHRlcm46IC9cXGQvLCBvcHRpb25hbDogdHJ1ZX0sXG5cdFx0JyMnOiB7cGF0dGVybjogL1xcZC8sIG9wdGlvbmFsOiB0cnVlLCByZWN1cnNpdmU6IHRydWV9LFxuXHRcdCdTJzoge3BhdHRlcm46IC9bYS16QS1aXS99LFxuXHRcdCdVJzoge3BhdHRlcm46IC9bYS16QS1aXS8sIHRyYW5zZm9ybTogZnVuY3Rpb24gKGMpIHsgcmV0dXJuIGMudG9Mb2NhbGVVcHBlckNhc2UoKTsgfX0sXG5cdFx0J0wnOiB7cGF0dGVybjogL1thLXpBLVpdLywgdHJhbnNmb3JtOiBmdW5jdGlvbiAoYykgeyByZXR1cm4gYy50b0xvY2FsZUxvd2VyQ2FzZSgpOyB9fSxcblx0XHQnJCc6IHtlc2NhcGU6IHRydWV9XG5cdH07XG5cblx0ZnVuY3Rpb24gaXNFc2NhcGVkKHBhdHRlcm4sIHBvcykge1xuXHRcdHZhciBjb3VudCA9IDA7XG5cdFx0dmFyIGkgPSBwb3MgLSAxO1xuXHRcdHZhciB0b2tlbiA9IHtlc2NhcGU6IHRydWV9O1xuXHRcdHdoaWxlIChpID49IDAgJiYgdG9rZW4gJiYgdG9rZW4uZXNjYXBlKSB7XG5cdFx0XHR0b2tlbiA9IHRva2Vuc1twYXR0ZXJuLmNoYXJBdChpKV07XG5cdFx0XHRjb3VudCArPSB0b2tlbiAmJiB0b2tlbi5lc2NhcGUgPyAxIDogMDtcblx0XHRcdGktLTtcblx0XHR9XG5cdFx0cmV0dXJuIGNvdW50ID4gMCAmJiBjb3VudCUyID09PSAxO1xuXHR9XG5cblx0ZnVuY3Rpb24gY2FsY09wdGlvbmFsTnVtYmVyc1RvVXNlKHBhdHRlcm4sIHZhbHVlKSB7XG5cdFx0dmFyIG51bWJlcnNJblAgPSBwYXR0ZXJuLnJlcGxhY2UoL1teMF0vZywnJykubGVuZ3RoO1xuXHRcdHZhciBudW1iZXJzSW5WID0gdmFsdWUucmVwbGFjZSgvW15cXGRdL2csJycpLmxlbmd0aDtcblx0XHRyZXR1cm4gbnVtYmVyc0luViAtIG51bWJlcnNJblA7XG5cdH1cblxuXHRmdW5jdGlvbiBjb25jYXRDaGFyKHRleHQsIGNoYXJhY3Rlciwgb3B0aW9ucywgdG9rZW4pIHtcblx0XHRpZiAodG9rZW4gJiYgdHlwZW9mIHRva2VuLnRyYW5zZm9ybSA9PT0gJ2Z1bmN0aW9uJykgY2hhcmFjdGVyID0gdG9rZW4udHJhbnNmb3JtKGNoYXJhY3Rlcik7XG5cdFx0aWYgKG9wdGlvbnMucmV2ZXJzZSkgcmV0dXJuIGNoYXJhY3RlciArIHRleHQ7XG5cdFx0cmV0dXJuIHRleHQgKyBjaGFyYWN0ZXI7XG5cdH1cblxuXHRmdW5jdGlvbiBoYXNNb3JlVG9rZW5zKHBhdHRlcm4sIHBvcywgaW5jKSB7XG5cdFx0dmFyIHBjID0gcGF0dGVybi5jaGFyQXQocG9zKTtcblx0XHR2YXIgdG9rZW4gPSB0b2tlbnNbcGNdO1xuXHRcdGlmIChwYyA9PT0gJycpIHJldHVybiBmYWxzZTtcblx0XHRyZXR1cm4gdG9rZW4gJiYgIXRva2VuLmVzY2FwZSA/IHRydWUgOiBoYXNNb3JlVG9rZW5zKHBhdHRlcm4sIHBvcyArIGluYywgaW5jKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluc2VydENoYXIodGV4dCwgY2hhciwgcG9zaXRpb24pIHtcblx0XHR2YXIgdCA9IHRleHQuc3BsaXQoJycpO1xuXHRcdHQuc3BsaWNlKHBvc2l0aW9uID49IDAgPyBwb3NpdGlvbjogMCwgMCwgY2hhcik7XG5cdFx0cmV0dXJuIHQuam9pbignJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBTdHJpbmdNYXNrKHBhdHRlcm4sIG9wdCkge1xuXHRcdHRoaXMub3B0aW9ucyA9IG9wdCB8fCB7fTtcblx0XHR0aGlzLm9wdGlvbnMgPSB7XG5cdFx0XHRyZXZlcnNlOiB0aGlzLm9wdGlvbnMucmV2ZXJzZSB8fCBmYWxzZSxcblx0XHRcdHVzZWRlZmF1bHRzOiB0aGlzLm9wdGlvbnMudXNlZGVmYXVsdHMgfHwgdGhpcy5vcHRpb25zLnJldmVyc2Vcblx0XHR9O1xuXHRcdHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG5cdH1cblxuXHRTdHJpbmdNYXNrLnByb3RvdHlwZS5wcm9jZXNzID0gZnVuY3Rpb24gcHJvY2Nlc3ModmFsdWUpIHtcblx0XHRpZiAoIXZhbHVlKSByZXR1cm4gJyc7XG5cdFx0dmFsdWUgPSB2YWx1ZSArICcnO1xuXHRcdHZhciBwYXR0ZXJuMiA9IHRoaXMucGF0dGVybjtcblx0XHR2YXIgdmFsaWQgPSB0cnVlO1xuXHRcdHZhciBmb3JtYXR0ZWQgPSAnJztcblx0XHR2YXIgdmFsdWVQb3MgPSB0aGlzLm9wdGlvbnMucmV2ZXJzZSA/IHZhbHVlLmxlbmd0aCAtIDEgOiAwO1xuXHRcdHZhciBvcHRpb25hbE51bWJlcnNUb1VzZSA9IGNhbGNPcHRpb25hbE51bWJlcnNUb1VzZShwYXR0ZXJuMiwgdmFsdWUpO1xuXHRcdHZhciBlc2NhcGVOZXh0ID0gZmFsc2U7XG5cdFx0dmFyIHJlY3Vyc2l2ZSA9IFtdO1xuXHRcdHZhciBpblJlY3Vyc2l2ZU1vZGUgPSBmYWxzZTtcblxuXHRcdHZhciBzdGVwcyA9IHtcblx0XHRcdHN0YXJ0OiB0aGlzLm9wdGlvbnMucmV2ZXJzZSA/IHBhdHRlcm4yLmxlbmd0aCAtIDEgOiAwLFxuXHRcdFx0ZW5kOiB0aGlzLm9wdGlvbnMucmV2ZXJzZSA/IC0xIDogcGF0dGVybjIubGVuZ3RoLFxuXHRcdFx0aW5jOiB0aGlzLm9wdGlvbnMucmV2ZXJzZSA/IC0xIDogMVxuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBjb250aW51ZUNvbmRpdGlvbihvcHRpb25zKSB7XG5cdFx0XHRpZiAoIWluUmVjdXJzaXZlTW9kZSAmJiBoYXNNb3JlVG9rZW5zKHBhdHRlcm4yLCBpLCBzdGVwcy5pbmMpKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fSBlbHNlIGlmICghaW5SZWN1cnNpdmVNb2RlKSB7XG5cdFx0XHRcdGluUmVjdXJzaXZlTW9kZSA9IHJlY3Vyc2l2ZS5sZW5ndGggPiAwO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoaW5SZWN1cnNpdmVNb2RlKSB7XG5cdFx0XHRcdHZhciBwYyA9IHJlY3Vyc2l2ZS5zaGlmdCgpO1xuXHRcdFx0XHRyZWN1cnNpdmUucHVzaChwYyk7XG5cdFx0XHRcdGlmIChvcHRpb25zLnJldmVyc2UgJiYgdmFsdWVQb3MgPj0gMCkge1xuXHRcdFx0XHRcdGkrKztcblx0XHRcdFx0XHRwYXR0ZXJuMiA9IGluc2VydENoYXIocGF0dGVybjIsIHBjLCBpKTtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fSBlbHNlIGlmICghb3B0aW9ucy5yZXZlcnNlICYmIHZhbHVlUG9zIDwgdmFsdWUubGVuZ3RoKSB7XG5cdFx0XHRcdFx0cGF0dGVybjIgPSBpbnNlcnRDaGFyKHBhdHRlcm4yLCBwYywgaSk7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBpIDwgcGF0dGVybjIubGVuZ3RoICYmIGkgPj0gMDtcblx0XHR9XG5cblx0XHRmb3IgKHZhciBpID0gc3RlcHMuc3RhcnQ7IGNvbnRpbnVlQ29uZGl0aW9uKHRoaXMub3B0aW9ucyk7IGkgPSBpICsgc3RlcHMuaW5jKSB7XG5cdFx0XHR2YXIgcGMgPSBwYXR0ZXJuMi5jaGFyQXQoaSk7XG5cdFx0XHR2YXIgdmMgPSB2YWx1ZS5jaGFyQXQodmFsdWVQb3MpO1xuXHRcdFx0dmFyIHRva2VuID0gdG9rZW5zW3BjXTtcblx0XHRcdGlmICghaW5SZWN1cnNpdmVNb2RlIHx8IHZjKSB7XG5cdFx0XHRcdGlmICh0aGlzLm9wdGlvbnMucmV2ZXJzZSAmJiBpc0VzY2FwZWQocGF0dGVybjIsIGkpKSB7XG5cdFx0XHRcdFx0Zm9ybWF0dGVkID0gY29uY2F0Q2hhcihmb3JtYXR0ZWQsIHBjLCB0aGlzLm9wdGlvbnMsIHRva2VuKTtcblx0XHRcdFx0XHRpID0gaSArIHN0ZXBzLmluYztcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fSBlbHNlIGlmICghdGhpcy5vcHRpb25zLnJldmVyc2UgJiYgZXNjYXBlTmV4dCkge1xuXHRcdFx0XHRcdGZvcm1hdHRlZCA9IGNvbmNhdENoYXIoZm9ybWF0dGVkLCBwYywgdGhpcy5vcHRpb25zLCB0b2tlbik7XG5cdFx0XHRcdFx0ZXNjYXBlTmV4dCA9IGZhbHNlO1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCF0aGlzLm9wdGlvbnMucmV2ZXJzZSAmJiB0b2tlbiAmJiB0b2tlbi5lc2NhcGUpIHtcblx0XHRcdFx0XHRlc2NhcGVOZXh0ID0gdHJ1ZTtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIWluUmVjdXJzaXZlTW9kZSAmJiB0b2tlbiAmJiB0b2tlbi5yZWN1cnNpdmUpIHtcblx0XHRcdFx0cmVjdXJzaXZlLnB1c2gocGMpO1xuXHRcdFx0fSBlbHNlIGlmIChpblJlY3Vyc2l2ZU1vZGUgJiYgIXZjKSB7XG5cdFx0XHRcdGlmICghdG9rZW4gfHwgIXRva2VuLnJlY3Vyc2l2ZSkgZm9ybWF0dGVkID0gY29uY2F0Q2hhcihmb3JtYXR0ZWQsIHBjLCB0aGlzLm9wdGlvbnMsIHRva2VuKTtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9IGVsc2UgaWYgKHJlY3Vyc2l2ZS5sZW5ndGggPiAwICYmIHRva2VuICYmICF0b2tlbi5yZWN1cnNpdmUpIHtcblx0XHRcdFx0Ly8gUmVjdXJzaXZlIHRva2VucyBtb3N0IGJlIHRoZSBsYXN0IHRva2VucyBvZiB0aGUgcGF0dGVyblxuXHRcdFx0XHR2YWxpZCA9IGZhbHNlO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH0gZWxzZSBpZiAoIWluUmVjdXJzaXZlTW9kZSAmJiByZWN1cnNpdmUubGVuZ3RoID4gMCAmJiAhdmMpIHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghdG9rZW4pIHtcblx0XHRcdFx0Zm9ybWF0dGVkID0gY29uY2F0Q2hhcihmb3JtYXR0ZWQsIHBjLCB0aGlzLm9wdGlvbnMsIHRva2VuKTtcblx0XHRcdFx0aWYgKCFpblJlY3Vyc2l2ZU1vZGUgJiYgcmVjdXJzaXZlLmxlbmd0aCkge1xuXHRcdFx0XHRcdHJlY3Vyc2l2ZS5wdXNoKHBjKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmICh0b2tlbi5vcHRpb25hbCkge1xuXHRcdFx0XHRpZiAodG9rZW4ucGF0dGVybi50ZXN0KHZjKSAmJiBvcHRpb25hbE51bWJlcnNUb1VzZSkge1xuXHRcdFx0XHRcdGZvcm1hdHRlZCA9IGNvbmNhdENoYXIoZm9ybWF0dGVkLCB2YywgdGhpcy5vcHRpb25zLCB0b2tlbik7XG5cdFx0XHRcdFx0dmFsdWVQb3MgPSB2YWx1ZVBvcyArIHN0ZXBzLmluYztcblx0XHRcdFx0XHRvcHRpb25hbE51bWJlcnNUb1VzZS0tO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHJlY3Vyc2l2ZS5sZW5ndGggPiAwICYmIHZjKSB7XG5cdFx0XHRcdFx0dmFsaWQgPSBmYWxzZTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmICh0b2tlbi5wYXR0ZXJuLnRlc3QodmMpKSB7XG5cdFx0XHRcdGZvcm1hdHRlZCA9IGNvbmNhdENoYXIoZm9ybWF0dGVkLCB2YywgdGhpcy5vcHRpb25zLCB0b2tlbik7XG5cdFx0XHRcdHZhbHVlUG9zID0gdmFsdWVQb3MgKyBzdGVwcy5pbmM7XG5cdFx0XHR9IGVsc2UgaWYgKCF2YyAmJiB0b2tlbi5fZGVmYXVsdCAmJiB0aGlzLm9wdGlvbnMudXNlZGVmYXVsdHMpIHtcblx0XHRcdFx0Zm9ybWF0dGVkID0gY29uY2F0Q2hhcihmb3JtYXR0ZWQsIHRva2VuLl9kZWZhdWx0LCB0aGlzLm9wdGlvbnMsIHRva2VuKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhbGlkID0gZmFsc2U7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB7cmVzdWx0OiBmb3JtYXR0ZWQsIHZhbGlkOiB2YWxpZH07XG5cdH07XG5cblx0U3RyaW5nTWFzay5wcm90b3R5cGUuYXBwbHkgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdHJldHVybiB0aGlzLnByb2Nlc3ModmFsdWUpLnJlc3VsdDtcblx0fTtcblxuXHRTdHJpbmdNYXNrLnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0cmV0dXJuIHRoaXMucHJvY2Vzcyh2YWx1ZSkudmFsaWQ7XG5cdH07XG5cblx0U3RyaW5nTWFzay5wcm9jZXNzID0gZnVuY3Rpb24odmFsdWUsIHBhdHRlcm4sIG9wdGlvbnMpIHtcblx0XHRyZXR1cm4gbmV3IFN0cmluZ01hc2socGF0dGVybiwgb3B0aW9ucykucHJvY2Vzcyh2YWx1ZSk7XG5cdH07XG5cblx0U3RyaW5nTWFzay5hcHBseSA9IGZ1bmN0aW9uKHZhbHVlLCBwYXR0ZXJuLCBvcHRpb25zKSB7XG5cdFx0cmV0dXJuIG5ldyBTdHJpbmdNYXNrKHBhdHRlcm4sIG9wdGlvbnMpLmFwcGx5KHZhbHVlKTtcblx0fTtcblxuXHRTdHJpbmdNYXNrLnZhbGlkYXRlID0gZnVuY3Rpb24odmFsdWUsIHBhdHRlcm4sIG9wdGlvbnMpIHtcblx0XHRyZXR1cm4gbmV3IFN0cmluZ01hc2socGF0dGVybiwgb3B0aW9ucykudmFsaWRhdGUodmFsdWUpO1xuXHR9O1xuXG5cdHJldHVybiBTdHJpbmdNYXNrO1xufSkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBQZXJjZW50YWdlTWFza0RpcmVjdGl2ZSgkbG9jYWxlLCAkcGFyc2UsIFByZUZvcm1hdHRlcnMsIE51bWJlck1hc2tzKSB7XG5cdGZ1bmN0aW9uIHByZXBhcmVQZXJjZW50YWdlVG9Gb3JtYXR0ZXIodmFsdWUsIGRlY2ltYWxzLCBtb2RlbE11bHRpcGxpZXIpIHtcblx0XHRyZXR1cm4gUHJlRm9ybWF0dGVycy5jbGVhckRlbGltaXRlcnMoKHBhcnNlRmxvYXQodmFsdWUpKm1vZGVsTXVsdGlwbGllcikudG9GaXhlZChkZWNpbWFscykpO1xuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0EnLFxuXHRcdHJlcXVpcmU6ICduZ01vZGVsJyxcblx0XHRsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGN0cmwpIHtcblx0XHRcdHZhciBkZWNpbWFsRGVsaW1pdGVyID0gJGxvY2FsZS5OVU1CRVJfRk9STUFUUy5ERUNJTUFMX1NFUCxcblx0XHRcdFx0dGhvdXNhbmRzRGVsaW1pdGVyID0gJGxvY2FsZS5OVU1CRVJfRk9STUFUUy5HUk9VUF9TRVAsXG5cdFx0XHRcdGRlY2ltYWxzID0gMCxcblx0XHRcdFx0YmFja3NwYWNlUHJlc3NlZCA9IGZhbHNlLFxuXHRcdFx0XHRzdHJpbmc7XG5cblx0XHRcdGlmIChhbmd1bGFyLmlzRGVmaW5lZChhdHRycy51aVN0cmluZykpIHtcblx0XHRcdFx0c3RyaW5nID0gYXR0cnMudWlTdHJpbmc7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0dGhyb3cgXCJ1aS1zdHJpbmcgdW5kZWZpbmVkXCI7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGVsZW1lbnQuYmluZCgna2V5ZG93biBrZXlwcmVzcycsIGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHRcdGJhY2tzcGFjZVByZXNzZWQgPSBldmVudC53aGljaCA9PT0gODtcblx0XHRcdH0pO1xuXG5cdFx0XHR2YXIgbW9kZWxWYWx1ZSA9IHtcblx0XHRcdFx0bXVsdGlwbGllciA6IDEsXG5cdFx0XHRcdGRlY2ltYWxNYXNrOiAwXG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAoYW5ndWxhci5pc0RlZmluZWQoYXR0cnMudWlIaWRlR3JvdXBTZXApKSB7XG5cdFx0XHRcdHRob3VzYW5kc0RlbGltaXRlciA9ICcnO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgbnVtYmVyRGVjaW1hbHMgPSBkZWNpbWFscyArIG1vZGVsVmFsdWUuZGVjaW1hbE1hc2s7XG5cdFx0XHR2YXIgdmlld01hc2sgPSBOdW1iZXJNYXNrcy52aWV3TWFzayhkZWNpbWFscywgZGVjaW1hbERlbGltaXRlciwgdGhvdXNhbmRzRGVsaW1pdGVyKSxcblx0XHRcdFx0bW9kZWxNYXNrID0gTnVtYmVyTWFza3MubW9kZWxNYXNrKG51bWJlckRlY2ltYWxzKTtcblxuXHRcdFx0ZnVuY3Rpb24gZm9ybWF0dGVyKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChjdHJsLiRpc0VtcHR5KHZhbHVlKSkge1xuXHRcdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciB2YWx1ZVRvRm9ybWF0ID0gcHJlcGFyZVBlcmNlbnRhZ2VUb0Zvcm1hdHRlcih2YWx1ZSwgZGVjaW1hbHMsIG1vZGVsVmFsdWUubXVsdGlwbGllcik7XG5cdFx0XHRcdHJldHVybiB2aWV3TWFzay5hcHBseSh2YWx1ZVRvRm9ybWF0KSArIHN0cmluZztcblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gcGFyc2UodmFsdWUpIHtcblx0XHRcdFx0aWYgKGN0cmwuJGlzRW1wdHkodmFsdWUpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR2YXIgdmFsdWVUb0Zvcm1hdCA9IFByZUZvcm1hdHRlcnMuY2xlYXJEZWxpbWl0ZXJzKHZhbHVlKSB8fCAnMCc7XG5cdFx0XHRcdGlmICh2YWx1ZS5sZW5ndGggPiAxICYmIHZhbHVlLmluZGV4T2Yoc3RyaW5nKSA9PT0gLTEpIHtcblx0XHRcdFx0XHR2YWx1ZVRvRm9ybWF0ID0gdmFsdWVUb0Zvcm1hdC5zbGljZSgwLHZhbHVlVG9Gb3JtYXQubGVuZ3RoLTEpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChiYWNrc3BhY2VQcmVzc2VkICYmIHZhbHVlLmxlbmd0aCA9PT0gMSAmJiB2YWx1ZS5pbmRleE9mKHN0cmluZykgPT09IC0xKSB7XG5cdFx0XHRcdFx0dmFsdWVUb0Zvcm1hdCA9ICcwJztcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgZm9ybWF0ZWRWYWx1ZSA9IHZpZXdNYXNrLmFwcGx5KHZhbHVlVG9Gb3JtYXQpICsgc3RyaW5nO1xuXHRcdFx0XHR2YXIgYWN0dWFsTnVtYmVyID0gcGFyc2VGbG9hdChtb2RlbE1hc2suYXBwbHkodmFsdWVUb0Zvcm1hdCkpO1xuXG5cdFx0XHRcdGlmIChjdHJsLiR2aWV3VmFsdWUgIT09IGZvcm1hdGVkVmFsdWUpIHtcblx0XHRcdFx0XHRjdHJsLiRzZXRWaWV3VmFsdWUoZm9ybWF0ZWRWYWx1ZSk7XG5cdFx0XHRcdFx0Y3RybC4kcmVuZGVyKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gYWN0dWFsTnVtYmVyO1xuXHRcdFx0fVxuXG5cdFx0XHRjdHJsLiRmb3JtYXR0ZXJzLnB1c2goZm9ybWF0dGVyKTtcblx0XHRcdGN0cmwuJHBhcnNlcnMucHVzaChwYXJzZSk7XG5cblx0XHRcdGlmIChhdHRycy5taW4pIHtcblx0XHRcdFx0dmFyIG1pblZhbDtcblxuXHRcdFx0XHRjdHJsLiR2YWxpZGF0b3JzLm1pbiA9IGZ1bmN0aW9uKG1vZGVsVmFsdWUpIHtcblx0XHRcdFx0XHR2YXIgbWluID0gcGFyc2VGbG9hdChtaW5WYWwsIDEwKTtcblx0XHRcdFx0XHRyZXR1cm4gY3RybC4kaXNFbXB0eShtb2RlbFZhbHVlKSB8fCBpc05hTihtaW4pIHx8IG1vZGVsVmFsdWUgPj0gbWluO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHNjb3BlLiR3YXRjaChhdHRycy5taW4sIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdFx0bWluVmFsID0gdmFsdWU7XG5cdFx0XHRcdFx0Y3RybC4kdmFsaWRhdGUoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChhdHRycy5tYXgpIHtcblx0XHRcdFx0dmFyIG1heFZhbDtcblxuXHRcdFx0XHRjdHJsLiR2YWxpZGF0b3JzLm1heCA9IGZ1bmN0aW9uKG1vZGVsVmFsdWUpIHtcblx0XHRcdFx0XHR2YXIgbWF4ID0gcGFyc2VGbG9hdChtYXhWYWwsIDEwKTtcblx0XHRcdFx0XHRyZXR1cm4gY3RybC4kaXNFbXB0eShtb2RlbFZhbHVlKSB8fCBpc05hTihtYXgpIHx8IG1vZGVsVmFsdWUgPD0gbWF4O1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHNjb3BlLiR3YXRjaChhdHRycy5tYXgsIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdFx0bWF4VmFsID0gdmFsdWU7XG5cdFx0XHRcdFx0Y3RybC4kdmFsaWRhdGUoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xufVxuUGVyY2VudGFnZU1hc2tEaXJlY3RpdmUuJGluamVjdCA9IFsnJGxvY2FsZScsICckcGFyc2UnLCAnUHJlRm9ybWF0dGVycycsICdOdW1iZXJNYXNrcyddO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBlcmNlbnRhZ2VNYXNrRGlyZWN0aXZlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFuZ3VsYXIubW9kdWxlKCdudW1iZXJNYXNrJywgW1xuXHRyZXF1aXJlKCcuL2dsb2JhbCcpXG5dKS5uYW1lO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbSA9IGFuZ3VsYXIubW9kdWxlKCdudW1iZXJNYXNrR2xvYmFsJywgW1xuXHRyZXF1aXJlKCcuL2hlbHBlcnMnKVxuXSlcbi5kaXJlY3RpdmUoJ2FkZFN0cmluZycsIHJlcXVpcmUoJy4vYWRkU3RyaW5nRGlyZWN0aXZlJykpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG0ubmFtZTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFN0cmluZ01hc2sgPSByZXF1aXJlKCdzdHJpbmctbWFzaycpO1xuXG52YXIgbSA9IGFuZ3VsYXIubW9kdWxlKCdudW1iZXJNYXNrSGVscGVycycsIFtdKTtcblxubW9kdWxlLmV4cG9ydHMgPSBtLm5hbWU7XG5cbm0uZmFjdG9yeSgnUHJlRm9ybWF0dGVycycsIFtmdW5jdGlvbigpIHtcblx0ZnVuY3Rpb24gY2xlYXJEZWxpbWl0ZXJzKHZhbHVlKSB7XG5cdFx0aWYgKHZhbHVlID09PSAnMCcpIHtcblx0XHRcdHJldHVybiAnMCc7XG5cdFx0fVxuXG5cdFx0dmFyIGNsZWFuVmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9eLS8sJycpO1xuXHRcdHJldHVybiBjbGVhblZhbHVlLnJlcGxhY2UoL1teMC05XS9nLCAnJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBwcmVwYXJlTnVtYmVyVG9Gb3JtYXR0ZXIodmFsdWUsIGRlY2ltYWxzKSB7XG5cdFx0cmV0dXJuIGNsZWFyRGVsaW1pdGVycygocGFyc2VGbG9hdCh2YWx1ZSkpLnRvRml4ZWQoZGVjaW1hbHMpKTtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0Y2xlYXJEZWxpbWl0ZXJzOiBjbGVhckRlbGltaXRlcnMsXG5cdFx0cHJlcGFyZU51bWJlclRvRm9ybWF0dGVyOiBwcmVwYXJlTnVtYmVyVG9Gb3JtYXR0ZXJcblx0fTtcbn1dKVxuLmZhY3RvcnkoJ051bWJlck1hc2tzJywgW2Z1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHZpZXdNYXNrOiBmdW5jdGlvbihkZWNpbWFscywgZGVjaW1hbERlbGltaXRlciwgdGhvdXNhbmRzRGVsaW1pdGVyKSB7XG5cdFx0XHR2YXIgbWFzayA9ICcjJyArIHRob3VzYW5kc0RlbGltaXRlciArICcjIzAnO1xuXG5cdFx0XHRpZiAoZGVjaW1hbHMgPiAwKSB7XG5cdFx0XHRcdG1hc2sgKz0gZGVjaW1hbERlbGltaXRlcjtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkZWNpbWFsczsgaSsrKSB7XG5cdFx0XHRcdFx0bWFzayArPSAnMCc7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIG5ldyBTdHJpbmdNYXNrKG1hc2ssIHtcblx0XHRcdFx0cmV2ZXJzZTogdHJ1ZVxuXHRcdFx0fSk7XG5cdFx0fSxcblx0XHRtb2RlbE1hc2s6IGZ1bmN0aW9uKGRlY2ltYWxzKSB7XG5cdFx0XHR2YXIgbWFzayA9ICcjIyMwJztcblxuXHRcdFx0aWYgKGRlY2ltYWxzID4gMCkge1xuXHRcdFx0XHRtYXNrICs9ICcuJztcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkZWNpbWFsczsgaSsrKSB7XG5cdFx0XHRcdFx0bWFzayArPSAnMCc7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIG5ldyBTdHJpbmdNYXNrKG1hc2ssIHtcblx0XHRcdFx0cmV2ZXJzZTogdHJ1ZVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xufV0pO1xuIl19
