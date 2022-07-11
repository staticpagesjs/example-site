// This example script uses the static-pages API with
// markdown-reader and twig-writer to generate the pages.
//
// Functionality written below are:
//   1. generate breadcrumbs based on the page url
//   2. get git commit hash and git root dir when git found
//   3. build navigation tree from the pages
//   4. provide a 'json' filter to twig to encode object in json
//   5. provide a 'yaml' filter to twig to encode object to yaml
//   6. provide a 'getUrl' function which retrieves the current resource url
//   7. load twig globals from a globals.yaml file
//   8. provide basic translations with a 'T()' function that returns the
//      language specific messages from the messages directory

const startTime = new Date();

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { staticPages } = require('@static-pages/core');
const { markdownReader } = require('@static-pages/markdown-reader');
const { twigWriter } = require('@static-pages/twig-writer');

// primitive utility to get the latest git commit hash (without git installed)
let commitHash = '';
if (fs.existsSync('.git/HEAD')) {
	const ref = fs.readFileSync('.git/HEAD', 'utf-8').match(/^(?:ref: )?(.*)/)[1];
	commitHash = fs.existsSync(`.git/${ref}`) ? fs.readFileSync(`.git/${ref}`, 'utf-8').trim() : ref;
}

// this will hold language specific values
const messages = {};
for (const file of fs.readdirSync('messages')) {
	if (file.endsWith('.yaml')) {
		messages[path.basename(file, path.extname(file))] =
			yaml.load(fs.readFileSync(`messages/${file}`, 'utf-8'));
	}
}

// converts twig internal 'Map' types to plain object
const replacer = (key, value) => {
	if (!Array.isArray(value) && typeof value?.entries === 'function') {
		return Object.fromEntries(value.entries());
	}
	return value;
};

// makes an url for the provided page as the twig-writer default outFile() would do.
const urlFromContext = context => {
	const page = replacer(null, context); // converts twig context to plain object using the json/yaml replacer
	return page?.url?.concat?.('.html')
		?? page?.header?.path
			?.replace?.(/\\/g, '/')
			.substring(0, page.header.path.length - path.extname(page.header.path).length)
			.concat('.html')
		?? ''; // fallback to empty string
};

// usually this should be at the 'from' section of the config
// we moved it here to pre-process navigation data before the rendering
const pages = [...markdownReader()]; // [...x] converts iterable to array

// pre-process navigation data
const navigation = [];
for (const page of pages) {
	navigation.push({
		text: page.title || page.header.basename,
		url: urlFromContext(page)
	});
}

staticPages({
	from: pages,
	controller: d => {
		console.log('Render', d?.header?.path);

		// generate some breadcrumbs
		d.breadcrumbs = ['Home', ...urlFromContext(d).split('/')];
		// replace filename (last item) with title
		d.breadcrumbs.splice(-1, 1, d.title || d.header.basename);

		// when returning undefined the content is not rendered.
		// it is possible to return an array, in that case multiple pages are rendered.
		return d;
	},
	to: twigWriter({
		globals: {
			...yaml.load(fs.readFileSync('globals.yaml', 'utf-8')),
			navigation,
			commitHash,
		},
		filters: {
			json: [x => JSON.stringify(x, replacer, 4), { is_safe: ['html'] }],
			yaml: [x => yaml.dump(x, { replacer }), { is_safe: ['html'] }],
		},
		functions: {
			getBase: [ // USAGE: {{ getBase() }}
				context => path.relative(path.dirname(urlFromContext(context)), '.')
					.replace(/\\/g, '/'),
				{ needs_context: true }
			],
			getUrl: [ // USAGE: {{ getUrl() }} or {{ getUrl(_context) }}
				(context, userContext) => {
					const url = urlFromContext(userContext ?? context);
					return url.substring(0, url.length - path.extname(url).length);
				},
				{ needs_context: true }
			],
			T: [ // USAGE: {{ T().prop }} or {{ T(lang).prop }} or {{ T().prop ?? 'default text' }}
				(context, lang) => messages[lang ?? context.get('lang') ?? 'en'],
				{ needs_context: true }
			],
		},
	}),
}).then(
	() => console.log('Total build time ' + (new Date() - startTime) / 1000 + ' seconds'),
	err => {
		console.error(err?.message ?? err);
		process.exit(1);
	});
