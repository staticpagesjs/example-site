import { execSync } from 'child_process';
import { watch } from 'chokidar';

watch([
	'messages/**/*',
	'pages/**/*',
	'views/**/*',
	'scripts/staticgen.js',
], { ignoreInitial: false })
	.addListener('all', () => execSync(
		'node scripts/staticgen.js',
		{ stdio: 'inherit' }
	));
