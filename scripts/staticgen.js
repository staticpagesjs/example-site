import { staticPages, read } from '@static-pages/starter/node';
import { twig, raw } from '@static-pages/twig';
import { posix as posixPath } from 'node:path';
import { stringify } from 'yaml';

const startTime = new Date();

// translations (i18n) bags
const messages = {};
for await (const bag of read({ cwd: 'messages' })) {
	// .url inherits the filename if property not present
	// it is how read()'s default parse() function works
	messages[bag.url] = bag;
	delete bag.url;
}

// json/yaml stringify replacer to be compatible with twig context
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
	controller(doc) {
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
					return raw(stringify(subject, replacer, { lineWidth: Number.POSITIVE_INFINITY }));
				},
			},
			functions: {
				relative({ context }, url) {
					if (url.startsWith('/')) {
						const { join, relative, dirname, basename } = posixPath;
						const selfUrl = join('/', context.get('url'));
						const relativeBase = relative(dirname(selfUrl), dirname(url));
						return join(relativeBase, basename(url));
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
	}
);
