class IndexPage {
  data() {
    return {
      layout: "default"
    };
  }

  render({ collection, collections, page }) {
    const list = (collections[collection] || []).filter((item) => (
      item && item.data && item.data.content
    ));

    return `<ul>
      ${list.map((item) => (
        `<li><a href="${ item.url }">${ item.data.title }</a></li>`
      )).join("\n")}
    </ul>`;
  }
}

module.exports = IndexPage;
