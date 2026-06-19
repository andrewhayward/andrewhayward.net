import crypto from 'crypto';
import {toString} from 'nlcst-to-string';
import {retext} from 'retext';
import retextKeywords from 'retext-keywords';
import retextPos from 'retext-pos';
import {VFile} from 'vfile';

function createHash(title, date, len = 8) {
    return crypto.createHash('md5')
            .update(title)
            .update(date?.toISOString() ?? '')
            .digest("hex")
            .slice(0, len);
}

function urlSlug({page: {date: timestamp, fileSlug}}) {
    const date = new Date(Date.UTC(
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate()
    ));
    const hash = createHash(fileSlug, date);
    return `${ fileSlug }-${ hash }`;
}

function extractWords(keywords, threshold = 0.2) {
    return new Set(keywords.filter(({score}) => score >= threshold).flatMap(({variants}) => variants.map(variant => variant.toLowerCase())));
}

const relatedMap = new Map();
const retextMap = new Map();
const processor = retext()
    .use(retextPos)
    .use(retextKeywords, {maximum: 15});

export default {
    layout: "article.html",
    permalink: (meta) => `writing/${ urlSlug(meta) }/index.html`,
    tags: ['posts'],
    eleventyComputed: {
        atproto: ({atpId, meta}) => {
            if (atpId) {
                return {
                    type: 'site.standard.document',
                    uri: `at://${ meta.atproto.did}/site.standard.document/${ atpId }`,
                }
            }
        },
        urlSlug,
        color: ({title, date}) => createHash(title, date, 6),
        retext: async ({page: {inputPath: path, rawInput: value}}) => {
            if (!retextMap.has(path)) {
                const file = new VFile({ path, value });
                const {data} = await processor.process(file);
                const keywords = data.keywords?.map(({matches, score, stem}) => {
                    const variants = matches.map(({node}) => toString(node));
                    return {score, stem, variants};
                }) ?? [];
                const keyphrases = data.keyphrases?.map(({matches, score, stems, weight}) => {
                    const variants = matches.map(({nodes}) => toString(nodes));
                    return {variants, score, stems, weight};
                });
                retextMap.set(path, {keywords, keyphrases});
            }
            return retextMap.get(path);
        },
        related: ({anthology: anthologySlug, retext: {keywords: _keywords}, page: {rawInput, inputPath: path}}) => (posts) => {
            if (!relatedMap.has(path)) {
                const _words = extractWords(_keywords);
                const relatedContent = [];
                let anthology;
                posts.forEach((post) => {
                    if (post.data?.tags?.includes('anthologies')) {
                        if (post.fileSlug === anthologySlug) {
                            anthology = post;
                        }
                    } else if (_words.size && post.data?.tags?.includes('posts')) {
                        const {data: {retext: {keywords}}, inputPath: postPath} = post;
                        if (postPath !== path) {
                            const words = extractWords(keywords);
                            const intersection = _words.intersection(words);
                            const union = _words.union(words);
                            const ratio = intersection.size / union.size;
                            if (ratio > 0.1) {
                                relatedContent.push({post, ratio});
                            }
                        }
                    }
                });
                relatedContent.sort((a, b) => b.ratio - a.ratio);
                if (anthology) {
                    relatedContent.unshift({post: anthology});
                }
                relatedMap.set(path, relatedContent.map(({post}) => post));
            }
            return relatedMap.get(path);
        }
    }
}
