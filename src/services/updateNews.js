const Parser = require("rss-parser");
const fs = require("fs");
const parser = new Parser();

async function fetchNews(feedUrl) {
  const feed = await parser.parseURL(feedUrl);

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
    "http://rss.cnn.com/rss/edition.rss",
    "https://www.theguardian.com/world/rss"
  ];

  let allArticles = [];

  // Fetch latest from all feeds
  for (const url of feeds) {
    const articles = await fetchNews(url);
    allArticles = [...allArticles, ...articles];
  }

  // Remove duplicates by link
  const uniqueArticles = Array.from(
    new Map(allArticles.map(a => [a.link, a])).values()
  );

  fs.writeFileSync("articles.json", JSON.stringify(uniqueArticles, null, 2));
  console.log(`✅ Saved ${uniqueArticles.length} unique articles to articles.json`);
}

main().catch(console.error);
