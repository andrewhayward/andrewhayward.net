import path from 'node:path';
import { fileURLToPath } from 'url';

import { InputPathToUrlTransformPlugin } from '@11ty/eleventy';
import Image, { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

import readingTime from 'eleventy-plugin-reading-time';
import markdownIt from 'markdown-it';
import strftime from 'strftime';

import collections from './src/config/collections.js';

export default function (config) {
    const md = new markdownIt({
        html: true,
    });

    Object.entries(collections).forEach(([collection, callback]) => {
        config.addCollection(collection, callback);
    })

    config.addPlugin(InputPathToUrlTransformPlugin);
    // config.addPlugin(eleventyImageTransformPlugin);
    config.addPlugin(readingTime);

    config.addFilter('markdown', (content = '', inline = false) => {
        const method = inline ? 'renderInline' : 'render';
        return md[method](content);
    });
    config.addFilter('strftime', (datetime, format) => (
        strftime(format, datetime)
    ));
    config.addFilter('pluralize', (singular, number, plural) => {
        if (!plural) {
            plural = singular + 's';
        }
        return number === 1 ? singular : plural;
    });

    const fonts = path.relative(
        path.dirname(fileURLToPath(import.meta.url)),
        fileURLToPath(import.meta.resolve("@fontsource/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-*.woff*")),
    );

    config.addPassthroughCopy('src/site/assets');
    config.addPassthroughCopy({[fonts]: 'assets/fonts'});
    config.addWatchTarget('src/site/assets/*.css');

    // config.on('afterBuild', processOG);
    // config.on('afterBuild', async () => {
    //     const inputDir = './dist/assets/images/social-previews';
    //     for await (const file of glob(`${inputDir}/*.svg`)) {
    //         Image(file, {
    //             formats: ["jpeg"],
    //             outputDir: inputDir,
    //             filenameFormat: (id, src, width, format, options) => (
    //                 file.replace(/^.*\/([^.]+)\.[^.]+$/, `$1.${format}`)
    //             )
    //         });
    //     }
    // });

    return {
		templateFormats: ['md', 'njk', 'html', 'liquid'],
		htmlTemplateEngine: 'njk',
		passthroughFileCopy: true,
		dir: {
			input: 'src/site',
			output: 'dist',
			includes: '../layouts/includes',
			layouts: '../layouts',
			data: '../data'
		}
	}
}