export default {
    tags: ['anthologies'],
    layout: "archive.html",
    permalink: function({page: {fileSlug}}) {
        return `writing/${ fileSlug }/index.html`;
    },
    pagination: {
        data: 'collections.posts',
        size: 999,
        generatePageOnEmptyData: true,
        reverse: false,
        before: (results, {page: {fileSlug}}) => (
            results.filter(({data: {anthology}}) => (
                fileSlug === anthology
            ))
        )
    }
}
