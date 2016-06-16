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

		var cleanValue = value.replace(/^-/,'').replace(/^0*/, '');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9ub2RlX21vZHVsZXMvc3RyaW5nLW1hc2svc3JjL3N0cmluZy1tYXNrLmpzIiwiYWRkU3RyaW5nRGlyZWN0aXZlLmpzIiwiYW5ndWxhci1zaW1wbGUtbnVtYmVyLW1hc2suanMiLCJnbG9iYWwuanMiLCJoZWxwZXJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcblx0aWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuXHRcdC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cblx0XHRkZWZpbmUoW10sIGZhY3RvcnkpO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuXHRcdC8vIE5vZGUuIERvZXMgbm90IHdvcmsgd2l0aCBzdHJpY3QgQ29tbW9uSlMsIGJ1dFxuXHRcdC8vIG9ubHkgQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLFxuXHRcdC8vIGxpa2UgTm9kZS5cblx0XHRtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcblx0fSBlbHNlIHtcblx0XHQvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuXHRcdHJvb3QuU3RyaW5nTWFzayA9IGZhY3RvcnkoKTtcblx0fVxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XG5cdHZhciB0b2tlbnMgPSB7XG5cdFx0JzAnOiB7cGF0dGVybjogL1xcZC8sIF9kZWZhdWx0OiAnMCd9LFxuXHRcdCc5Jzoge3BhdHRlcm46IC9cXGQvLCBvcHRpb25hbDogdHJ1ZX0sXG5cdFx0JyMnOiB7cGF0dGVybjogL1xcZC8sIG9wdGlvbmFsOiB0cnVlLCByZWN1cnNpdmU6IHRydWV9LFxuXHRcdCdTJzoge3BhdHRlcm46IC9bYS16QS1aXS99LFxuXHRcdCdVJzoge3BhdHRlcm46IC9bYS16QS1aXS8sIHRyYW5zZm9ybTogZnVuY3Rpb24gKGMpIHsgcmV0dXJuIGMudG9Mb2NhbGVVcHBlckNhc2UoKTsgfX0sXG5cdFx0J0wnOiB7cGF0dGVybjogL1thLXpBLVpdLywgdHJhbnNmb3JtOiBmdW5jdGlvbiAoYykgeyByZXR1cm4gYy50b0xvY2FsZUxvd2VyQ2FzZSgpOyB9fSxcblx0XHQnJCc6IHtlc2NhcGU6IHRydWV9XG5cdH07XG5cblx0ZnVuY3Rpb24gaXNFc2NhcGVkKHBhdHRlcm4sIHBvcykge1xuXHRcdHZhciBjb3VudCA9IDA7XG5cdFx0dmFyIGkgPSBwb3MgLSAxO1xuXHRcdHZhciB0b2tlbiA9IHtlc2NhcGU6IHRydWV9O1xuXHRcdHdoaWxlIChpID49IDAgJiYgdG9rZW4gJiYgdG9rZW4uZXNjYXBlKSB7XG5cdFx0XHR0b2tlbiA9IHRva2Vuc1twYXR0ZXJuLmNoYXJBdChpKV07XG5cdFx0XHRjb3VudCArPSB0b2tlbiAmJiB0b2tlbi5lc2NhcGUgPyAxIDogMDtcblx0XHRcdGktLTtcblx0XHR9XG5cdFx0cmV0dXJuIGNvdW50ID4gMCAmJiBjb3VudCUyID09PSAxO1xuXHR9XG5cblx0ZnVuY3Rpb24gY2FsY09wdGlvbmFsTnVtYmVyc1RvVXNlKHBhdHRlcm4sIHZhbHVlKSB7XG5cdFx0dmFyIG51bWJlcnNJblAgPSBwYXR0ZXJuLnJlcGxhY2UoL1teMF0vZywnJykubGVuZ3RoO1xuXHRcdHZhciBudW1iZXJzSW5WID0gdmFsdWUucmVwbGFjZSgvW15cXGRdL2csJycpLmxlbmd0aDtcblx0XHRyZXR1cm4gbnVtYmVyc0luViAtIG51bWJlcnNJblA7XG5cdH1cblxuXHRmdW5jdGlvbiBjb25jYXRDaGFyKHRleHQsIGNoYXJhY3Rlciwgb3B0aW9ucywgdG9rZW4pIHtcblx0XHRpZiAodG9rZW4gJiYgdHlwZW9mIHRva2VuLnRyYW5zZm9ybSA9PT0gJ2Z1bmN0aW9uJykgY2hhcmFjdGVyID0gdG9rZW4udHJhbnNmb3JtKGNoYXJhY3Rlcik7XG5cdFx0aWYgKG9wdGlvbnMucmV2ZXJzZSkgcmV0dXJuIGNoYXJhY3RlciArIHRleHQ7XG5cdFx0cmV0dXJuIHRleHQgKyBjaGFyYWN0ZXI7XG5cdH1cblxuXHRmdW5jdGlvbiBoYXNNb3JlVG9rZW5zKHBhdHRlcm4sIHBvcywgaW5jKSB7XG5cdFx0dmFyIHBjID0gcGF0dGVybi5jaGFyQXQocG9zKTtcblx0XHR2YXIgdG9rZW4gPSB0b2tlbnNbcGNdO1xuXHRcdGlmIChwYyA9PT0gJycpIHJldHVybiBmYWxzZTtcblx0XHRyZXR1cm4gdG9rZW4gJiYgIXRva2VuLmVzY2FwZSA/IHRydWUgOiBoYXNNb3JlVG9rZW5zKHBhdHRlcm4sIHBvcyArIGluYywgaW5jKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluc2VydENoYXIodGV4dCwgY2hhciwgcG9zaXRpb24pIHtcblx0XHR2YXIgdCA9IHRleHQuc3BsaXQoJycpO1xuXHRcdHQuc3BsaWNlKHBvc2l0aW9uID49IDAgPyBwb3NpdGlvbjogMCwgMCwgY2hhcik7XG5cdFx0cmV0dXJuIHQuam9pbignJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBTdHJpbmdNYXNrKHBhdHRlcm4sIG9wdCkge1xuXHRcdHRoaXMub3B0aW9ucyA9IG9wdCB8fCB7fTtcblx0XHR0aGlzLm9wdGlvbnMgPSB7XG5cdFx0XHRyZXZlcnNlOiB0aGlzLm9wdGlvbnMucmV2ZXJzZSB8fCBmYWxzZSxcblx0XHRcdHVzZWRlZmF1bHRzOiB0aGlzLm9wdGlvbnMudXNlZGVmYXVsdHMgfHwgdGhpcy5vcHRpb25zLnJldmVyc2Vcblx0XHR9O1xuXHRcdHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG5cdH1cblxuXHRTdHJpbmdNYXNrLnByb3RvdHlwZS5wcm9jZXNzID0gZnVuY3Rpb24gcHJvY2Nlc3ModmFsdWUpIHtcblx0XHRpZiAoIXZhbHVlKSByZXR1cm4gJyc7XG5cdFx0dmFsdWUgPSB2YWx1ZSArICcnO1xuXHRcdHZhciBwYXR0ZXJuMiA9IHRoaXMucGF0dGVybjtcblx0XHR2YXIgdmFsaWQgPSB0cnVlO1xuXHRcdHZhciBmb3JtYXR0ZWQgPSAnJztcblx0XHR2YXIgdmFsdWVQb3MgPSB0aGlzLm9wdGlvbnMucmV2ZXJzZSA/IHZhbHVlLmxlbmd0aCAtIDEgOiAwO1xuXHRcdHZhciBvcHRpb25hbE51bWJlcnNUb1VzZSA9IGNhbGNPcHRpb25hbE51bWJlcnNUb1VzZShwYXR0ZXJuMiwgdmFsdWUpO1xuXHRcdHZhciBlc2NhcGVOZXh0ID0gZmFsc2U7XG5cdFx0dmFyIHJlY3Vyc2l2ZSA9IFtdO1xuXHRcdHZhciBpblJlY3Vyc2l2ZU1vZGUgPSBmYWxzZTtcblxuXHRcdHZhciBzdGVwcyA9IHtcblx0XHRcdHN0YXJ0OiB0aGlzLm9wdGlvbnMucmV2ZXJzZSA/IHBhdHRlcm4yLmxlbmd0aCAtIDEgOiAwLFxuXHRcdFx0ZW5kOiB0aGlzLm9wdGlvbnMucmV2ZXJzZSA/IC0xIDogcGF0dGVybjIubGVuZ3RoLFxuXHRcdFx0aW5jOiB0aGlzLm9wdGlvbnMucmV2ZXJzZSA/IC0xIDogMVxuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBjb250aW51ZUNvbmRpdGlvbihvcHRpb25zKSB7XG5cdFx0XHRpZiAoIWluUmVjdXJzaXZlTW9kZSAmJiBoYXNNb3JlVG9rZW5zKHBhdHRlcm4yLCBpLCBzdGVwcy5pbmMpKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fSBlbHNlIGlmICghaW5SZWN1cnNpdmVNb2RlKSB7XG5cdFx0XHRcdGluUmVjdXJzaXZlTW9kZSA9IHJlY3Vyc2l2ZS5sZW5ndGggPiAwO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoaW5SZWN1cnNpdmVNb2RlKSB7XG5cdFx0XHRcdHZhciBwYyA9IHJlY3Vyc2l2ZS5zaGlmdCgpO1xuXHRcdFx0XHRyZWN1cnNpdmUucHVzaChwYyk7XG5cdFx0XHRcdGlmIChvcHRpb25zLnJldmVyc2UgJiYgdmFsdWVQb3MgPj0gMCkge1xuXHRcdFx0XHRcdGkrKztcblx0XHRcdFx0XHRwYXR0ZXJuMiA9IGluc2VydENoYXIocGF0dGVybjIsIHBjLCBpKTtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fSBlbHNlIGlmICghb3B0aW9ucy5yZXZlcnNlICYmIHZhbHVlUG9zIDwgdmFsdWUubGVuZ3RoKSB7XG5cdFx0XHRcdFx0cGF0dGVybjIgPSBpbnNlcnRDaGFyKHBhdHRlcm4yLCBwYywgaSk7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBpIDwgcGF0dGVybjIubGVuZ3RoICYmIGkgPj0gMDtcblx0XHR9XG5cblx0XHRmb3IgKHZhciBpID0gc3RlcHMuc3RhcnQ7IGNvbnRpbnVlQ29uZGl0aW9uKHRoaXMub3B0aW9ucyk7IGkgPSBpICsgc3RlcHMuaW5jKSB7XG5cdFx0XHR2YXIgcGMgPSBwYXR0ZXJuMi5jaGFyQXQoaSk7XG5cdFx0XHR2YXIgdmMgPSB2YWx1ZS5jaGFyQXQodmFsdWVQb3MpO1xuXHRcdFx0dmFyIHRva2VuID0gdG9rZW5zW3BjXTtcblx0XHRcdGlmICghaW5SZWN1cnNpdmVNb2RlIHx8IHZjKSB7XG5cdFx0XHRcdGlmICh0aGlzLm9wdGlvbnMucmV2ZXJzZSAmJiBpc0VzY2FwZWQocGF0dGVybjIsIGkpKSB7XG5cdFx0XHRcdFx0Zm9ybWF0dGVkID0gY29uY2F0Q2hhcihmb3JtYXR0ZWQsIHBjLCB0aGlzLm9wdGlvbnMsIHRva2VuKTtcblx0XHRcdFx0XHRpID0gaSArIHN0ZXBzLmluYztcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fSBlbHNlIGlmICghdGhpcy5vcHRpb25zLnJldmVyc2UgJiYgZXNjYXBlTmV4dCkge1xuXHRcdFx0XHRcdGZvcm1hdHRlZCA9IGNvbmNhdENoYXIoZm9ybWF0dGVkLCBwYywgdGhpcy5vcHRpb25zLCB0b2tlbik7XG5cdFx0XHRcdFx0ZXNjYXBlTmV4dCA9IGZhbHNlO1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCF0aGlzLm9wdGlvbnMucmV2ZXJzZSAmJiB0b2tlbiAmJiB0b2tlbi5lc2NhcGUpIHtcblx0XHRcdFx0XHRlc2NhcGVOZXh0ID0gdHJ1ZTtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIWluUmVjdXJzaXZlTW9kZSAmJiB0b2tlbiAmJiB0b2tlbi5yZWN1cnNpdmUpIHtcblx0XHRcdFx0cmVjdXJzaXZlLnB1c2gocGMpO1xuXHRcdFx0fSBlbHNlIGlmIChpblJlY3Vyc2l2ZU1vZGUgJiYgIXZjKSB7XG5cdFx0XHRcdGlmICghdG9rZW4gfHwgIXRva2VuLnJlY3Vyc2l2ZSkgZm9ybWF0dGVkID0gY29uY2F0Q2hhcihmb3JtYXR0ZWQsIHBjLCB0aGlzLm9wdGlvbnMsIHRva2VuKTtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9IGVsc2UgaWYgKHJlY3Vyc2l2ZS5sZW5ndGggPiAwICYmIHRva2VuICYmICF0b2tlbi5yZWN1cnNpdmUpIHtcblx0XHRcdFx0Ly8gUmVjdXJzaXZlIHRva2VucyBtb3N0IGJlIHRoZSBsYXN0IHRva2VucyBvZiB0aGUgcGF0dGVyblxuXHRcdFx0XHR2YWxpZCA9IGZhbHNlO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH0gZWxzZSBpZiAoIWluUmVjdXJzaXZlTW9kZSAmJiByZWN1cnNpdmUubGVuZ3RoID4gMCAmJiAhdmMpIHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghdG9rZW4pIHtcblx0XHRcdFx0Zm9ybWF0dGVkID0gY29uY2F0Q2hhcihmb3JtYXR0ZWQsIHBjLCB0aGlzLm9wdGlvbnMsIHRva2VuKTtcblx0XHRcdFx0aWYgKCFpblJlY3Vyc2l2ZU1vZGUgJiYgcmVjdXJzaXZlLmxlbmd0aCkge1xuXHRcdFx0XHRcdHJlY3Vyc2l2ZS5wdXNoKHBjKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmICh0b2tlbi5vcHRpb25hbCkge1xuXHRcdFx0XHRpZiAodG9rZW4ucGF0dGVybi50ZXN0KHZjKSAmJiBvcHRpb25hbE51bWJlcnNUb1VzZSkge1xuXHRcdFx0XHRcdGZvcm1hdHRlZCA9IGNvbmNhdENoYXIoZm9ybWF0dGVkLCB2YywgdGhpcy5vcHRpb25zLCB0b2tlbik7XG5cdFx0XHRcdFx0dmFsdWVQb3MgPSB2YWx1ZVBvcyArIHN0ZXBzLmluYztcblx0XHRcdFx0XHRvcHRpb25hbE51bWJlcnNUb1VzZS0tO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHJlY3Vyc2l2ZS5sZW5ndGggPiAwICYmIHZjKSB7XG5cdFx0XHRcdFx0dmFsaWQgPSBmYWxzZTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmICh0b2tlbi5wYXR0ZXJuLnRlc3QodmMpKSB7XG5cdFx0XHRcdGZvcm1hdHRlZCA9IGNvbmNhdENoYXIoZm9ybWF0dGVkLCB2YywgdGhpcy5vcHRpb25zLCB0b2tlbik7XG5cdFx0XHRcdHZhbHVlUG9zID0gdmFsdWVQb3MgKyBzdGVwcy5pbmM7XG5cdFx0XHR9IGVsc2UgaWYgKCF2YyAmJiB0b2tlbi5fZGVmYXVsdCAmJiB0aGlzLm9wdGlvbnMudXNlZGVmYXVsdHMpIHtcblx0XHRcdFx0Zm9ybWF0dGVkID0gY29uY2F0Q2hhcihmb3JtYXR0ZWQsIHRva2VuLl9kZWZhdWx0LCB0aGlzLm9wdGlvbnMsIHRva2VuKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhbGlkID0gZmFsc2U7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB7cmVzdWx0OiBmb3JtYXR0ZWQsIHZhbGlkOiB2YWxpZH07XG5cdH07XG5cblx0U3RyaW5nTWFzay5wcm90b3R5cGUuYXBwbHkgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdHJldHVybiB0aGlzLnByb2Nlc3ModmFsdWUpLnJlc3VsdDtcblx0fTtcblxuXHRTdHJpbmdNYXNrLnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0cmV0dXJuIHRoaXMucHJvY2Vzcyh2YWx1ZSkudmFsaWQ7XG5cdH07XG5cblx0U3RyaW5nTWFzay5wcm9jZXNzID0gZnVuY3Rpb24odmFsdWUsIHBhdHRlcm4sIG9wdGlvbnMpIHtcblx0XHRyZXR1cm4gbmV3IFN0cmluZ01hc2socGF0dGVybiwgb3B0aW9ucykucHJvY2Vzcyh2YWx1ZSk7XG5cdH07XG5cblx0U3RyaW5nTWFzay5hcHBseSA9IGZ1bmN0aW9uKHZhbHVlLCBwYXR0ZXJuLCBvcHRpb25zKSB7XG5cdFx0cmV0dXJuIG5ldyBTdHJpbmdNYXNrKHBhdHRlcm4sIG9wdGlvbnMpLmFwcGx5KHZhbHVlKTtcblx0fTtcblxuXHRTdHJpbmdNYXNrLnZhbGlkYXRlID0gZnVuY3Rpb24odmFsdWUsIHBhdHRlcm4sIG9wdGlvbnMpIHtcblx0XHRyZXR1cm4gbmV3IFN0cmluZ01hc2socGF0dGVybiwgb3B0aW9ucykudmFsaWRhdGUodmFsdWUpO1xuXHR9O1xuXG5cdHJldHVybiBTdHJpbmdNYXNrO1xufSkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBQZXJjZW50YWdlTWFza0RpcmVjdGl2ZSgkbG9jYWxlLCAkcGFyc2UsIFByZUZvcm1hdHRlcnMsIE51bWJlck1hc2tzKSB7XG5cdGZ1bmN0aW9uIHByZXBhcmVQZXJjZW50YWdlVG9Gb3JtYXR0ZXIodmFsdWUsIGRlY2ltYWxzLCBtb2RlbE11bHRpcGxpZXIpIHtcblx0XHRyZXR1cm4gUHJlRm9ybWF0dGVycy5jbGVhckRlbGltaXRlcnMoKHBhcnNlRmxvYXQodmFsdWUpKm1vZGVsTXVsdGlwbGllcikudG9GaXhlZChkZWNpbWFscykpO1xuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0EnLFxuXHRcdHJlcXVpcmU6ICduZ01vZGVsJyxcblx0XHRsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGN0cmwpIHtcblx0XHRcdHZhciBkZWNpbWFsRGVsaW1pdGVyID0gJGxvY2FsZS5OVU1CRVJfRk9STUFUUy5ERUNJTUFMX1NFUCxcblx0XHRcdFx0dGhvdXNhbmRzRGVsaW1pdGVyID0gJGxvY2FsZS5OVU1CRVJfRk9STUFUUy5HUk9VUF9TRVAsXG5cdFx0XHRcdGRlY2ltYWxzID0gMCxcblx0XHRcdFx0YmFja3NwYWNlUHJlc3NlZCA9IGZhbHNlLFxuXHRcdFx0XHRzdHJpbmc7XG5cblx0XHRcdGlmIChhdHRycy5hZGRTdHJpbmcudHJpbSgpKSB7XG5cdFx0XHRcdHN0cmluZyA9IGF0dHJzLmFkZFN0cmluZztcblx0XHRcdH1lbHNle1xuXHRcdFx0XHR0aHJvdyBcIlN0cmluZyB1bmRlZmluZWRcIjtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0ZWxlbWVudC5iaW5kKCdrZXlkb3duIGtleXByZXNzJywgZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdFx0YmFja3NwYWNlUHJlc3NlZCA9IGV2ZW50LndoaWNoID09PSA4O1xuXHRcdFx0fSk7XG5cblx0XHRcdHZhciBtb2RlbFZhbHVlID0ge1xuXHRcdFx0XHRtdWx0aXBsaWVyIDogMSxcblx0XHRcdFx0ZGVjaW1hbE1hc2s6IDBcblx0XHRcdH07XG5cblx0XHRcdGlmIChhbmd1bGFyLmlzRGVmaW5lZChhdHRycy51aUhpZGVHcm91cFNlcCkpIHtcblx0XHRcdFx0dGhvdXNhbmRzRGVsaW1pdGVyID0gJyc7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBudW1iZXJEZWNpbWFscyA9IGRlY2ltYWxzICsgbW9kZWxWYWx1ZS5kZWNpbWFsTWFzaztcblx0XHRcdHZhciB2aWV3TWFzayA9IE51bWJlck1hc2tzLnZpZXdNYXNrKGRlY2ltYWxzLCBkZWNpbWFsRGVsaW1pdGVyLCB0aG91c2FuZHNEZWxpbWl0ZXIpLFxuXHRcdFx0XHRtb2RlbE1hc2sgPSBOdW1iZXJNYXNrcy5tb2RlbE1hc2sobnVtYmVyRGVjaW1hbHMpO1xuXG5cdFx0XHRmdW5jdGlvbiBmb3JtYXR0ZXIodmFsdWUpIHtcblx0XHRcdFx0aWYgKGN0cmwuJGlzRW1wdHkodmFsdWUpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIHZhbHVlVG9Gb3JtYXQgPSBwcmVwYXJlUGVyY2VudGFnZVRvRm9ybWF0dGVyKHZhbHVlLCBkZWNpbWFscywgbW9kZWxWYWx1ZS5tdWx0aXBsaWVyKTtcblx0XHRcdFx0cmV0dXJuIHZpZXdNYXNrLmFwcGx5KHZhbHVlVG9Gb3JtYXQpICsgc3RyaW5nO1xuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBwYXJzZSh2YWx1ZSkge1xuXHRcdFx0XHRpZiAoY3RybC4kaXNFbXB0eSh2YWx1ZSkpIHtcblx0XHRcdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciB2YWx1ZVRvRm9ybWF0ID0gUHJlRm9ybWF0dGVycy5jbGVhckRlbGltaXRlcnModmFsdWUpIHx8ICcwJztcblx0XHRcdFx0aWYgKHZhbHVlLmxlbmd0aCA+IDEgJiYgdmFsdWUuaW5kZXhPZihzdHJpbmcpID09PSAtMSkge1xuXHRcdFx0XHRcdHZhbHVlVG9Gb3JtYXQgPSB2YWx1ZVRvRm9ybWF0LnNsaWNlKDAsdmFsdWVUb0Zvcm1hdC5sZW5ndGgtMSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGJhY2tzcGFjZVByZXNzZWQgJiYgdmFsdWUubGVuZ3RoID09PSAxICYmIHZhbHVlLmluZGV4T2Yoc3RyaW5nKSA9PT0gLTEpIHtcblx0XHRcdFx0XHR2YWx1ZVRvRm9ybWF0ID0gJzAnO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBmb3JtYXRlZFZhbHVlID0gdmlld01hc2suYXBwbHkodmFsdWVUb0Zvcm1hdCkgKyBzdHJpbmc7XG5cdFx0XHRcdHZhciBhY3R1YWxOdW1iZXIgPSBwYXJzZUZsb2F0KG1vZGVsTWFzay5hcHBseSh2YWx1ZVRvRm9ybWF0KSk7XG5cblx0XHRcdFx0aWYgKGN0cmwuJHZpZXdWYWx1ZSAhPT0gZm9ybWF0ZWRWYWx1ZSkge1xuXHRcdFx0XHRcdGN0cmwuJHNldFZpZXdWYWx1ZShmb3JtYXRlZFZhbHVlKTtcblx0XHRcdFx0XHRjdHJsLiRyZW5kZXIoKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiBhY3R1YWxOdW1iZXI7XG5cdFx0XHR9XG5cblx0XHRcdGN0cmwuJGZvcm1hdHRlcnMucHVzaChmb3JtYXR0ZXIpO1xuXHRcdFx0Y3RybC4kcGFyc2Vycy5wdXNoKHBhcnNlKTtcblxuXHRcdFx0aWYgKGF0dHJzLm1pbikge1xuXHRcdFx0XHR2YXIgbWluVmFsO1xuXG5cdFx0XHRcdGN0cmwuJHZhbGlkYXRvcnMubWluID0gZnVuY3Rpb24obW9kZWxWYWx1ZSkge1xuXHRcdFx0XHRcdHZhciBtaW4gPSBwYXJzZUZsb2F0KG1pblZhbCwgMTApO1xuXHRcdFx0XHRcdHJldHVybiBjdHJsLiRpc0VtcHR5KG1vZGVsVmFsdWUpIHx8IGlzTmFOKG1pbikgfHwgbW9kZWxWYWx1ZSA+PSBtaW47XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0c2NvcGUuJHdhdGNoKGF0dHJzLm1pbiwgZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0XHRtaW5WYWwgPSB2YWx1ZTtcblx0XHRcdFx0XHRjdHJsLiR2YWxpZGF0ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGF0dHJzLm1heCkge1xuXHRcdFx0XHR2YXIgbWF4VmFsO1xuXG5cdFx0XHRcdGN0cmwuJHZhbGlkYXRvcnMubWF4ID0gZnVuY3Rpb24obW9kZWxWYWx1ZSkge1xuXHRcdFx0XHRcdHZhciBtYXggPSBwYXJzZUZsb2F0KG1heFZhbCwgMTApO1xuXHRcdFx0XHRcdHJldHVybiBjdHJsLiRpc0VtcHR5KG1vZGVsVmFsdWUpIHx8IGlzTmFOKG1heCkgfHwgbW9kZWxWYWx1ZSA8PSBtYXg7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0c2NvcGUuJHdhdGNoKGF0dHJzLm1heCwgZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0XHRtYXhWYWwgPSB2YWx1ZTtcblx0XHRcdFx0XHRjdHJsLiR2YWxpZGF0ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG59XG5QZXJjZW50YWdlTWFza0RpcmVjdGl2ZS4kaW5qZWN0ID0gWyckbG9jYWxlJywgJyRwYXJzZScsICdQcmVGb3JtYXR0ZXJzJywgJ051bWJlck1hc2tzJ107XG5cbm1vZHVsZS5leHBvcnRzID0gUGVyY2VudGFnZU1hc2tEaXJlY3RpdmU7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gYW5ndWxhci5tb2R1bGUoJ251bWJlck1hc2snLCBbXG5cdHJlcXVpcmUoJy4vZ2xvYmFsJylcbl0pLm5hbWU7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBtID0gYW5ndWxhci5tb2R1bGUoJ251bWJlck1hc2tHbG9iYWwnLCBbXG5cdHJlcXVpcmUoJy4vaGVscGVycycpXG5dKVxuLmRpcmVjdGl2ZSgnYWRkU3RyaW5nJywgcmVxdWlyZSgnLi9hZGRTdHJpbmdEaXJlY3RpdmUnKSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbS5uYW1lO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgU3RyaW5nTWFzayA9IHJlcXVpcmUoJ3N0cmluZy1tYXNrJyk7XG5cbnZhciBtID0gYW5ndWxhci5tb2R1bGUoJ251bWJlck1hc2tIZWxwZXJzJywgW10pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG0ubmFtZTtcblxubS5mYWN0b3J5KCdQcmVGb3JtYXR0ZXJzJywgW2Z1bmN0aW9uKCkge1xuXHRmdW5jdGlvbiBjbGVhckRlbGltaXRlcnModmFsdWUpIHtcblx0XHRpZiAodmFsdWUgPT09ICcwJykge1xuXHRcdFx0cmV0dXJuICcwJztcblx0XHR9XG5cblx0XHR2YXIgY2xlYW5WYWx1ZSA9IHZhbHVlLnJlcGxhY2UoL14tLywnJykucmVwbGFjZSgvXjAqLywgJycpO1xuXHRcdHJldHVybiBjbGVhblZhbHVlLnJlcGxhY2UoL1teMC05XS9nLCAnJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBwcmVwYXJlTnVtYmVyVG9Gb3JtYXR0ZXIodmFsdWUsIGRlY2ltYWxzKSB7XG5cdFx0cmV0dXJuIGNsZWFyRGVsaW1pdGVycygocGFyc2VGbG9hdCh2YWx1ZSkpLnRvRml4ZWQoZGVjaW1hbHMpKTtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0Y2xlYXJEZWxpbWl0ZXJzOiBjbGVhckRlbGltaXRlcnMsXG5cdFx0cHJlcGFyZU51bWJlclRvRm9ybWF0dGVyOiBwcmVwYXJlTnVtYmVyVG9Gb3JtYXR0ZXJcblx0fTtcbn1dKVxuLmZhY3RvcnkoJ051bWJlck1hc2tzJywgW2Z1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHZpZXdNYXNrOiBmdW5jdGlvbihkZWNpbWFscywgZGVjaW1hbERlbGltaXRlciwgdGhvdXNhbmRzRGVsaW1pdGVyKSB7XG5cdFx0XHR2YXIgbWFzayA9ICcjJyArIHRob3VzYW5kc0RlbGltaXRlciArICcjIzAnO1xuXG5cdFx0XHRpZiAoZGVjaW1hbHMgPiAwKSB7XG5cdFx0XHRcdG1hc2sgKz0gZGVjaW1hbERlbGltaXRlcjtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkZWNpbWFsczsgaSsrKSB7XG5cdFx0XHRcdFx0bWFzayArPSAnMCc7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIG5ldyBTdHJpbmdNYXNrKG1hc2ssIHtcblx0XHRcdFx0cmV2ZXJzZTogdHJ1ZVxuXHRcdFx0fSk7XG5cdFx0fSxcblx0XHRtb2RlbE1hc2s6IGZ1bmN0aW9uKGRlY2ltYWxzKSB7XG5cdFx0XHR2YXIgbWFzayA9ICcjIyMwJztcblxuXHRcdFx0aWYgKGRlY2ltYWxzID4gMCkge1xuXHRcdFx0XHRtYXNrICs9ICcuJztcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkZWNpbWFsczsgaSsrKSB7XG5cdFx0XHRcdFx0bWFzayArPSAnMCc7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIG5ldyBTdHJpbmdNYXNrKG1hc2ssIHtcblx0XHRcdFx0cmV2ZXJzZTogdHJ1ZVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xufV0pO1xuIl19
