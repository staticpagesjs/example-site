import { read } from '@static-pages/starter/node';
import { raw } from '@static-pages/twig';
import posixPath from 'node:path/posix';

/**
 * Loads files from a directory.
 * Filenames becomes object keys.
 */
export async function readDirContents(dir) {
	const root = {};
	for await (const item of read({ cwd: dir })) {
		// .url inherits the filename if property not present
		// it is how read()'s default parse() function works
		root[item.url] = item;
		delete item.url;
	}
	return root;
}

/**
 * Converts `/absolute/url` to `../relative/url` based on the page url
 */
export function url({ context }, url) {
	if (typeof url !== 'string') return url;
	if (url.startsWith('/')) {
		const { join, relative, dirname, basename } = posixPath;
		const selfUrl = join('/', context.get('url'));
		const relativeBase = relative(dirname(selfUrl), dirname(url));
		return join(relativeBase, basename(url));
	}
	return url;
}

/**
 * Pretty print JSON
 */
export function json(_context, subject) {
	return raw(JSON.stringify(
		subject,
		(key, value) => {
			if (!Array.isArray(value) && typeof value?.entries === 'function') {
				return Object.fromEntries(value.entries());
			}
			return value;
		},
		'\t'
	));
}

/**
 * Converts `/absolute/url` to `../relative/url` based on the page url in a complete HTML text
 * Urls extracted from HTML attributes like <img src="...">
 */
export function html_url({ context }, html) {
	const { join, relative, dirname, basename } = posixPath;
	const selfUrl = join('/', context.get('url'));
	const rewriteUrl = (url) => {
		const relativeBase = relative(dirname(selfUrl), dirname(url));
		return join(relativeBase, basename(url));
	};
	return raw(('' + html)
		.replace(
			/(<(?:(?:a|link)\s[^>]*href|(?:img|script|audio|embed|source|track)\s[^>]*src|form\s[^>]*action|object\s[^>]*data|use\s[^>]*xlink:href)=")(\/[^"]*)("[^>]*>)/g,
			(_, prefix, url, suffix) => prefix + rewriteUrl(url) + suffix
		)
		.replace(
			/(<(?:img|source)\s[^>]*srcset=")(\/[^"]*)("[^>]*>)/g,
			(_, prefix, srcset, suffix) => {
				let result = srcset;
				for (const url of srcset.split(/ [^\s,]*(?:,\s*|$)/).filter(x => x.startsWith('/'))) {
					result = result.replaceAll(url, rewriteUrl(url));
				}
				return prefix + result + suffix;
			}
		));
}
