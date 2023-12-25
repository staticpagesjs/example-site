const { staticPages } = require('@static-pages/core');
const { twig, raw } = require('@static-pages/twig');

const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const startTime = new Date();

// this will read language specific values
const messages = {};
const bags = fs.readdirSync('messages', { recursive: true, withFileTypes: false, encoding: 'utf8' });
for (const bag of bags) {
	const stat = fs.statSync(path.join('messages', bag));
	if (stat.isFile() && bag.endsWith('.yaml')) {
		const lang = '.' === path.dirname(bag) // when not in subdirectory
			? bag.replace(/\.[^.]+$/, '') // use filename as language id
			: bag.replace(/^([^\\|\/]+)(?:\\|\/).*/, '') // use first subdir name

		messages[lang] = YAML.parse(fs.readFileSync(`messages/${bag}`, 'utf-8'));
	}
}

const replacer = (key, value) => {
	if (!Array.isArray(value) && typeof value?.entries === 'function') {
		return Object.fromEntries(value.entries());
	}
	return value;
};

staticPages({
	from: {
		cwd: 'pages',
	},
	controller: doc => {
		const { title, url, lang } = doc;
		console.log('Generate', url);

		// attach translations (messages) to the document
		doc._t = messages[lang ?? 'en'];

		// generate some breadcrumbs
		doc.breadcrumbs = ['Home', ...url.split('/')];
		// replace filename with title
		doc.breadcrumbs.splice(-1, 1, title);

		// when returning undefined the content is not rendered.
		// it is possible to return an array, in that case multiple pages are rendered.
		return doc;
	},
	to: {
		render: twig({
			viewsDir: 'views',
			filters: {
				json(_context, subject) {
					return raw(JSON.stringify(subject, replacer, '\t'));
				},
				yaml(_context, subject) {
					return raw(YAML.stringify(subject, replacer, { lineWidth: Number.POSITIVE_INFINITY }));
				},
			},
			functions: {
				relative({ context }, url) {
					if (url.startsWith('/')) {
						const { join, relative, dirname } = path.posix;
						const selfUrl = join('/', context.get('url'));
						const pathToRoot = relative(dirname(selfUrl), '/');
						return join(pathToRoot, url);
					}
					return url;
				},
			},
		}),
	}
}).then(
	() => console.log('Render took ' + (new Date() - startTime) / 1000 + ' seconds'),
	err => {
		console.error(err?.message ?? err);
		process.exit(1);
	});
