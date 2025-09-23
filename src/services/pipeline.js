import { updateNews } from "./updateNews.js";
import { generateEmbeddings } from "./generateEmbeddings.js";
import { pushToQdrant } from "./pushToQdrant.js";

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
