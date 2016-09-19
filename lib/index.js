var each = require('async').each;
var fs = require('fs');
var path = require('path');
var Twig = require('twig');
var twig = Twig.twig;

var commonmark = require('commonmark');

var commonmarkReader = new commonmark.Parser();
var commonmarkWriter = new commonmark.HtmlRenderer();

function commonmarkConvert(plainText, nl2br) {
	const _plainText = (nl2br) ? plainText.trim().replace(/\n/g, '<br />') : plainText.trim();
	return commonmarkWriter.render(commonmarkReader.parse(_plainText));
}


/**
 * Expose `plugin`
 */

module.exports = plugin;

/**
 * Settings
 */

function plugin(opts = {}) {
	var dir = opts.directory || 'components';
	var global = opts.global || {};
	var cache = (opts.cache === false) || true;
	var partials = {};

	Twig.cache(cache);

	Twig.cache(opts.cache || false);


	// Save template markups
	Object.keys(opts.fractalHandles).forEach((handle) => {
		partials[handle] = fs.readFileSync(path.resolve(dir, opts.fractalHandles[handle]), 'utf8');
	});


	/**
	 * Custom loader for `@component` reference handles
	 * Reference: https://github.com/twigjs/twig.js/pull/301
	 * TODO: Check if this would be a better solution: https://github.com/twigjs/twig.js/issues/398
	 */
	Twig.extend((TwigExtend) => {
		TwigExtend.Templates.registerLoader('fractal', (name, params) => {
			params.data = partials[params.id];
			return new TwigExtend.Template(params);
		});
	});

	return function(files, metalsmith, done) {
		var metadata = metalsmith.metadata();

		each(Object.keys(files), (file, done) => {

			var context = files[file];
			var template;

			if (!opts.fractalHandles) {
				return done();
			}

			context.metadata = metadata;
			context.site = metadata.site;
			context.collections = metadata.collections;
			context.global = global;

			template = twig({
				method: 'fractal',
				name: context.template || '@default',
				allowInlineIncludes: true,
				async: false
			});

			context.contents = new Buffer(template.render(context), 'utf8');

			done();

		}, done);
	};
}
