---
title: Ruminations
lede: One might call it the intersection of inclusive design, digital accessibility, and the evolving nature of the open web. One might also be wrong!
permalink: /writing/{% if pagination.pageNumber > 0 %}page-{{ pagination.pageNumber | plus:1 }}/{% endif %}index.html
eleventyExcludeFromCollections: true
layout: archive.html
pagination:
  data: collections.posts
  size: 20
  reverse: true
  generatePageOnEmptyData: true
---
