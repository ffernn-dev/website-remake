import { readFile, readdir, writeFile } from "fs/promises";
import path from "path";
import fsExtra from "fs-extra/esm";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import remarkCallout from "remark-callout";
import fm from "front-matter";
import { createObjectCsvWriter } from "csv-writer";
import Database from "better-sqlite3";
import sharp from "sharp";
import { encode, isBlurhashValid } from "blurhash";

const __dirname = import.meta.dirname;
const markdownDir = path.join(__dirname, "markdown");
const assetsDir = path.join(markdownDir, "_assets");
const buildDir = path.join(__dirname, "build");

let blurHashes = {};

fsExtra.ensureDirSync(buildDir);

const csvFilePath = path.join(__dirname, "data.csv");
const db = new Database(".database/data.db", { verbose: console.log });
const writer = createObjectCsvWriter({
  path: csvFilePath,
  header: [
    { id: "name", title: "name" },
    { id: "created", title: "created" },
    { id: "tags", title: "tags" },
    { id: "banner", title: "banner" },
  ],
});

// Function to process each Markdown file
async function processMarkdownFile(file) {
  const filePath = path.join(markdownDir, file);
  const data = await readFile(filePath, "utf8");
  const filename = path.parse(filePath).name;

  const content = fm(data);

  content.attributes.tags.forEach((tagName) => {
    createTag(tagName);
  });
  // writer.writeRecords([
  //   {
  //     name: filename,
  //     created: content.attributes.created.toISOString().split("T")[0],
  //     tags: content.attributes.tags,
  //     banner: content.attributes.banner,
  //   },
  // ]);

  const out = await unified()
    .use(remarkParse)
    .use(remarkCallout)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(content.body);

  const outputHtmlPath = path.join(buildDir, `${filename}.html`);
  await writeFile(outputHtmlPath, out.toString());
}

function createTag(name) {
  const row = db.prepare("SELECT id FROM tags WHERE name = ?").get(name);
  if (!row) {
    // Only insert the tag if it doesn't already exist
    db.prepare("INSERT INTO tags (name) VALUES (?)").run(name);
  }
}

function createPost(post) {
  const row = db
    .prepare("SELECT post_id FROM posts WHERE name = ?")
    .get(post.name);

  if (!row) {
    db.prepare("INSERT INTO TAGS (@name, @created, @banner, @blurhash)");
  }
}

async function processImage(file) {
  const filePath = path.join(assetsDir, file);
  const img = sharp(filePath);
  const { width, height } = await img.metadata();

  try {
    const buffer = await img.raw().ensureAlpha().toBuffer();
    const blurhash = encode(new Uint8ClampedArray(buffer), width, height, 6, 6);

    if (isBlurhashValid(blurhash)) {
      console.log(blurhash);
      blurHashes[file] = blurhash;
    } else {
      console.error("Blurhashing failed");
      blurHashes[file] = 0;
    }
  } catch (err) {
    console.error("Error processing image", err);
  }
  //sharp(file).png({ compressionLevel: 4 });
}

async function processAssets() {
  try {
    const files = await readdir(assetsDir);
    const assetFiles = files.filter((file) =>
      ["png", "jpg", "jpeg"].some((ext) => file.endsWith(ext))
    );

    for (const file of assetFiles) {
      console.log(file);
      await processImage(file);
    }
    console.log("Asset processing complete!");
  } catch (error) {
    console.error("Error processing assets:", error);
  }
}

async function processFiles() {
  try {
    const files = await readdir(markdownDir);
    const markdownFiles = files.filter((file) => file.endsWith(".md"));

    for (const file of markdownFiles) {
      await processMarkdownFile(file);
    }

    console.log("Markdown processing complete!");
  } catch (error) {
    console.error("Error processing files:", error);
  }
}

// Run the script
await processAssets();
console.log(blurHashes);
processFiles();
