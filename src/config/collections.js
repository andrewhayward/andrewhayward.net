export default {
    featured: async (api) => {
        const posts = api.getFilteredByTag('posts');
        const featured = posts.filter(({data}) => (
            !!data.featuredWeight
        ));
        featured.sort((a, b) => (
            a.featuredWeight - b.featuredWeight
        ));
        return featured;
    },
    latest: async (api) => (
        api.getFilteredByTag('posts').reverse().slice(0, 6)
    ),
    home: async (api) => {
        const posts = api.getFilteredByTag('posts').reverse();
        let maxFeaturedWeight = 0;
        let featuredIndex = -1;
        posts.forEach(({data: {featuredWeight = -1}}, index) => {
            if (featuredWeight >= maxFeaturedWeight) {
                maxFeaturedWeight = featuredWeight;
                featuredIndex = index;
            }
        });
        if (featuredIndex >= 0) {
            const featured = posts.splice(featuredIndex, 1);
            posts.unshift(...featured);
        }
        return posts.slice(0, 7);
    }
}