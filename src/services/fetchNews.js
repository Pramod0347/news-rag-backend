const Parser = require("rss-parser");
const fs = require("fs");
const parser = new Parser();

async function fetchNews(feedUrl) {
  const feed = await parser.parseURL(feedUrl);

  // Convert feed items to our format
  return feed.items.map(item => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    content: item.contentSnippet || item.content,
  }));
}

async function main() {
  const feeds = [
    "http://feeds.bbci.co.uk/news/rss.xml",
    "http://rss.cnn.com/rss/edition.rss"
  ];

  let allArticles = [];

  // Load existing articles if file exists
  if (fs.existsSync("articles.json")) {
    allArticles = JSON.parse(fs.readFileSync("articles.json", "utf8"));
  }

  // Fetch new feeds and merge
  for (const url of feeds) {
    const articles = await fetchNews(url);
    allArticles = [...allArticles, ...articles];
  }

  // Save merged list
  fs.writeFileSync("articles.json", JSON.stringify(allArticles, null, 2));
  console.log(`✅ Saved ${allArticles.length} articles to articles.json`);
}

main().catch(console.error);
