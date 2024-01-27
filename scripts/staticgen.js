import { staticPages } from '@static-pages/starter/node';
import { twig } from '@static-pages/twig';
import { url, html_url, json, readDirContents } from './cookbook.js';

const startTime = new Date();

// translations (i18n) bags
const messages = await readDirContents('messages');

staticPages({
	from: {
		cwd: 'pages',
	},
	controller(doc) {
		const { title, url, lang } = doc;
		console.log('staticgen', url);

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
				json,
				html_url,
			},
			functions: {
				url,
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
