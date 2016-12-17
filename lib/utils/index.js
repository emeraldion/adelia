'use strict';

const _ = require('lodash');

const irregular_nouns = {
	'person': 'people',
	'child': 'children',
	'man': 'men',
	'woman': 'women'
};

	// function http_error(code)
	// {
	// 	header(sprintf("Location: http://%s/error/%s.html",
	// 		_SERVER['HTTP_HOST'],
	// 		code));
	// 	exit();
	// }

function pluralize(term) {
	let match = _.findKey(irregular_nouns, function(plural, singular) {
		return _.endsWith(term, singular);
	});
	if (match) {
		return term.substr(0, term.length - match.length) + irregular_nouns[match];
	}
	if (irregular_nouns.hasOwnProperty(term)) {
		return irregular_nouns[term];
	}
	if (_.endsWith(term, 'child')) {
		// WARNING: NOT EXACTLY WHAT WANTED!!
		return term.replace(/child$/, 'children');
	}
	if (_.endsWith(term, 's') ||
		_.endsWith(term, 'x') ||
		(_.endsWith(term, 'o') && !_.endsWith(term, 'oo'))) {
		return term + 'es';
	}
	if (_.endsWith(term, 'y')) {
		return term.substr(0, term.length - 1) + 'ies';
	}
	return term + 's';
}

function singularize(term) {
	let match = _.findKey(irregular_nouns, function(plural, singular) {
		return _.endsWith(term, plural);
	});
	if (match) {
		return term.substr(0, term.length - irregular_nouns[match].length) + match;
	}
	if (!_.isUndefined(irregular_nouns[term])) {
		return _.findKey(irregular_nouns, term);
	}
	if (_.endsWith(term, 'xes') ||
		_.endsWith(term, 'oes')) {
		return term.substr(0, term.length - 2);
	}
	if (_.endsWith(term, 'ies')) {
		return term.substr(0, term.length - 3) + 'y';
	}
	if (_.endsWith(term, 's')) {
		return term.substr(0, term.length - 1);
	}
	return term;
}


function endsWith(term, suffix) {
	return _.endsWith(term, suffix);
}

function class_name_to_table_name(classname) {
	return pluralize(camel_case_to_joined_lower(classname));
}

function table_name_to_class_name(tablename) {
	return joined_lower_to_camel_case(singularize(tablename));
}

function joined_lower(text) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/i, '_');
}

function joined_lower_to_camel_case(text) {
	return text.replace(/(^[a-z])|_([a-z])/g, function (match, p1, p2) {
		return String(p1 || '').concat(String(p2 || '')).toUpperCase();
	});
}

function camel_case_to_joined_lower(text) {
	return _.snakeCase(text);
}

function class_name_to_foreign_key(classname) {
	fkey = camel_case_to_joined_lower(classname);
	fkey += "_id";
	return fkey;
}

function table_name_to_foreign_key(tablename) {
	fkey = singularize(tablename);
	fkey += "_id";
	return fkey;
}

/**
 *	@fn l
 *	@short Shorthand method for the Localization::localize method.
 *	@param str The string to localize
 */
// function l(str) {
// 	return localized(str);
// }

// function localized(str) {
// 	return Localization::localize(str);
// }

// function h(str) {
// 	return htmlentities(str);
// }

// function s(str) {
// 	return addslashes(str);
// }

function limit_3(val, a, b) {
	min = Math.min(a, b);
	max = Math.max(a, b);
	if (_.isNumber(val)) {
		if (min <= val) {
			if (val <= max) {
				return val;
			}
			return max;
		}
		return min;
	}
	return min;
}

module.exports.pluralize = pluralize;
module.exports.singularize = singularize;
module.exports.class_name_to_table_name = class_name_to_table_name;
module.exports.class_name_to_foreign_key = class_name_to_foreign_key;
module.exports.table_name_to_class_name = table_name_to_class_name;
module.exports.table_name_to_foreign_key = table_name_to_foreign_key;
module.exports.camel_case_to_joined_lower = camel_case_to_joined_lower;
module.exports.joined_lower_to_camel_case = joined_lower_to_camel_case;
