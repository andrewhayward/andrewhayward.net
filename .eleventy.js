module.exports = function(config) {
  config.addWatchTarget("./src/site/media");
  config.addPassthroughCopy("./src/site/media");

  config.addLayoutAlias('base', '../layouts/base.njk');
  config.addLayoutAlias('default', '../layouts/default.njk');
  config.addLayoutAlias('index', '../layouts/index.11ty.js');
  config.addLayoutAlias('post', '../layouts/post.njk');

  return {
    dir: {
      data: "../data",
      includes: "../includes",
      input: "./src/site",
      layouts: "../layouts",
      output: "./dist"
    }
  };
};
