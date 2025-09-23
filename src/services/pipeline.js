const { updateNews } = require("./updateNews");
const { generateEmbeddings } = require("./generateEmbeddings");
const { pushToQdrant } = require("./pushToQdrant");

async function runPipeline() {
  console.log("⏳ Updating news...");
  await updateNews();

  console.log("⏳ Generating embeddings...");
  await generateEmbeddings();

  console.log("⏳ Pushing to Qdrant...");
  await pushToQdrant();

  console.log("✅ Pipeline complete!");
}

runPipeline().catch(console.error);
