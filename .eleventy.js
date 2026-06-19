import { glob, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { platform } from 'node:os'

import { fileURLToPath } from 'url';
import { toSfnt } from 'woff-tools';
import qrcode from 'qrcode';

let fontsConf;
let fontsDir;

if (platform() !== 'darwin') {
    fontsConf = fileURLToPath(import.meta.resolve("./fonts/fonts.conf"));
    fontsDir = path.dirname(fontsConf);
    process.env.FONTCONFIG_FILE = fontsConf;
    process.env.FONTCONFIG_PATH = fontsDir;
    process.env.PANGOCAIRO_BACKEND = "fontconfig";
}

import { IdAttributePlugin, InputPathToUrlTransformPlugin } from '@11ty/eleventy';
import Image, { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

import readingTime from 'eleventy-plugin-reading-time';
import markdownIt from 'markdown-it';
import strftime from 'strftime';

import collections from './src/config/collections.js';

async function setupFonts(...fonts) {
    try {
        await mkdir(fontsDir);
    } catch (err) {
        // no-op
    }

    const requiredFonts = new Set(fonts);
    const installedFonts = new Set(
        (await Array.fromAsync(glob(`${fontsDir}/*`, {withFileTypes: true})))
            .filter(dirent => dirent.isDirectory() && dirent.parentPath === fontsDir)
            .map(dirent => dirent.name)
    );
    const newFonts = requiredFonts.difference(installedFonts);

    await Promise.all(newFonts.values().map(async (family) => {
        const inFolder = path.dirname(fileURLToPath(import.meta.resolve(`@fontsource/${family}/files/file`)));
        const outFolder = `${fontsDir}/${family}`;
        await mkdir(outFolder);

        const inFiles = await Array.fromAsync(glob(`${inFolder}/*-latin-*.woff`));
        return Promise.all(inFiles.map(async (inFile) => {
            const font = path.basename(inFile, '.woff');
            const outFile = fileURLToPath(import.meta.resolve(`${fontsDir}/${family}/${font}.ttf`));
            const woff = await readFile(inFile);
            const ttf = toSfnt(woff);
            return writeFile(outFile, ttf);
        }));
    }));

    await writeFile(fontsConf,
        `<?xml version="1.0"?>
        <!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
        <fontconfig>
            ${ Array.from(requiredFonts.values()).map((family) => (
                `<dir>${fontsDir}/${family}</dir>`
            )).join('\n') }
            <cachedir>${ fontsDir }/_cache</cachedir>
            <config></config>
        </fontconfig>`
    );
}

export default async function (config) {
    if (platform() !== 'darwin') {
        await setupFonts('ibm-plex-sans-condensed');
    }

    const md = new markdownIt({
        html: true,
    });

    Object.entries(collections).forEach(([collection, callback]) => {
        config.addCollection(collection, callback);
    })

    config.addPlugin(IdAttributePlugin);
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

    function flatten(token) {
        if (!token) return null;
        return flatten(token.children) ?? token;
    }

    config.addFilter('break', (text, space, size) => {
        const parsed = md.parseInline(text);
        const tokens = parsed.flatMap(flatten);
        const lines = [];
        const count = space / (size * 6.5);
        let tags = [];
        let chars = '';
        let line = [];

        tokens.forEach((token) => {
            if (token.type === 'text') {
                const words = token.content.split(/\b/);
                words.forEach((word) => {
                    const wordToken = {type: 'text', content: word};
                    const newChars = chars + word;
                    if (newChars.length > count) {
                        lines.push(line);
                        chars = word;
                        line = [...tags, wordToken];
                    } else {
                        chars = newChars;
                        line.push(wordToken);
                    }
                })
            } else if (token.tag) {
                const type = token.type.replace(/^.*_([^_]+)/, '$1');
                const tagToken = {type, tag: token.tag, content: token.markup};
                line.push(tagToken);
                tags.push(tagToken);
            }
        });
        lines.push(line);

        return lines.map((line) => {
            const tags = [];
            let lastType;
            const words = line.reduce((tokens, token) => {
                if (token.type === 'text') {
                    tokens.push(token.content);
                } else if (token.type === 'open') {
                    tags.push(token.tag);
                    tokens.push(`<tspan class="${token.tag}">`);
                } else if (token.type === 'close') {
                    if (tags.at(-1) === token.tag) {
                        tags.pop();
                        if (lastType === 'open') {
                            tokens.pop();
                        } else {
                            tokens.push('</tspan>');
                        }
                    }
                }
                lastType = token.type;

                return tokens;
            }, []);

            tags.forEach(() => words.push('</tspan>'));
            return words.join('').trim().replace(/\s+(<\/tspan>)/, '$1');
        });
    });

    const dataURIcache = new Map();
    config.addAsyncFilter('dataURI', async (filepath, mimeType) => {
        const key = `${filepath}::${mimeType}`;
        if (!dataURIcache.has(key)) {
            const encoded = await readFile(path.join('./src/site', filepath), 'base64');
            dataURIcache.set(key, `data:${mimeType};base64,${encoded}`);
        }
        return dataURIcache.get(key);;
    });
    config.addAsyncFilter('qrcode', async (data) => {
        const key = `@QRCODE:${data}`;
        if (!dataURIcache.has(key)) {
            dataURIcache.set(key, await qrcode.toDataURL(data, { errorCorrectionLevel: 'L' }));
        }
        return dataURIcache.get(key);
    });


    const fonts = path.relative(
        path.dirname(fileURLToPath(import.meta.url)),
        fileURLToPath(import.meta.resolve("@fontsource/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-*.woff*")),
    );

    config.addPassthroughCopy('src/site/.well-known');
    config.addPassthroughCopy('src/site/assets');
    config.addPassthroughCopy({[fonts]: 'assets/fonts'});
    config.addWatchTarget('src/site/assets/*.css');

    config.on('afterBuild', async () => {
        const inputDir = './dist/assets/images/og';
        console.group('Post processing:');
        for await (const inputPath of glob(`${inputDir}/*.svg`)) {
            try {
                const {webp: results} = await Image(inputPath, {
                    formats: ["webp"],
                    outputDir: inputDir,
                    filenameFormat: (id, src, width, format, options) => (
                        inputPath.replace(/^.*\/([^.]+)\.[^.]+$/, `$1.${format}`)
                    ),
                    sharpWebpOptions: {
                        quality: 80,
                    },
                });
                const [{outputPath}] = results;
                console.log(`${inputPath}\n✅ ${outputPath}`);
            } catch(err) {
                console.error(`${inputPath}\n❌ ${err}`);
            }
        }
        console.groupEnd();
    });

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