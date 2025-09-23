const Parser = require("rss-parser");
const fs = require("fs");
const path = require("path");

const parser = new Parser();

async function updateNews() {
  const feeds = [
    "http://feeds.bbci.co.uk/news/rss.xml",
    "http://rss.cnn.com/rss/edition.rss",
    "https://www.theguardian.com/world/rss"
  ];

  let allArticles = [];

  for (const url of feeds) {
    const feed = await parser.parseURL(url);
    const articles = feed.items.map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      content: item.contentSnippet || item.content,
    }));
    allArticles = [...allArticles, ...articles];
  }

  const uniqueArticles = Array.from(
    new Map(allArticles.map(a => [a.link, a])).values()
  );

  const filePath = path.join(__dirname, "articles.json");
  fs.writeFileSync(filePath, JSON.stringify(uniqueArticles, null, 2));

  console.log(`✅ Saved ${uniqueArticles.length} unique articles to ${filePath}`);
}

module.exports = { updateNews };
