# StaticPages JS sample repository

This project is a quick demo setup to present some of the basic concepts behind the [StaticPages](https://staticpagesjs.github.io) project.

## Directory structure

- `bin` various scripts for common tasks using the `staticpages/cli` docker image.
- `dist` contains the output HTML pages.
- `pages` contains the source materials for the HTML pages.
- `views` is where template files resides.
- `messages` holds the i18n translation bags.
- `public` groups all the assets and static files of the page.
- `generate.js` is the entrypoing of the static site generation task.

## Building the samples

1. If you have docker installed, you can exec `./bin/docker-build`.
   This will download the `staticpages/cli` image with all required npm packages preinstalled.

2. Or alternatively run `npm install` then `npm run build`.
