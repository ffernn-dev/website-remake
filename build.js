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
import { customAlphabet } from "nanoid";
import { encode, isBlurhashValid } from "blurhash";

const __dirname = import.meta.dirname;
const markdownDir = path.join(__dirname, "markdown");
const assetsDir = path.join(markdownDir, "_assets");
const postsDir = path.join(__dirname, "public", "posts");
const imagesDir = path.join(__dirname, "public", "images");

const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 8);

fsExtra.ensureDirSync(postsDir);

const csvFilePath = path.join(__dirname, "data.csv");
const db = new Database(".database/data.db");

// Function to process each Markdown file
async function processMarkdownFile(file) {
  const filePath = path.join(markdownDir, file);
  const data = await readFile(filePath, "utf8");
  const filename = path.parse(filePath).name;

  const content = fm(data);

  content.attributes.tags.forEach((tagName) => {
    createTag(tagName);
  });

  const out = await unified()
    .use(remarkParse)
    .use(remarkCallout)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(content.body);

  const outputHtmlPath = path.join(postsDir, `${filename}.html`);
  await writeFile(outputHtmlPath, out.toString());

  const attr = content.attributes;
  createPost({
    name: attr.name,
    created: attr.created.toISOString().slice(0, 10),
    banner: attr.banner ? attr.banner.replace(/\[\[(.*?)\]\]/, "$1") : null,
    tags: attr.tags,
  });
}

function createTag(name) {
  const row = db.prepare("SELECT tag_id FROM tags WHERE name = ?").get(name);
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
    // TODO: Also compare hashed contents here to allow for edits to files
    const banner_image_id = db
      .prepare("SELECT asset_id FROM assets WHERE original_name = ?")
      .pluck()
      .get(post.banner);

    console.log(post.name);
    db.prepare(
      "INSERT INTO posts (name, created, banner_image) VALUES (@name, @created, @banner)"
    ).run({ name: post.name, created: post.created, banner: banner_image_id });

    // TODO: This is janky and I should change it once I finish the assessment task and migrate to bun + an ORM
    const placeholders = post.tags.map((_, i) => `@tag${i}`).join(",");
    const statement = db.prepare(
      `INSERT INTO post_tags (post_id, tag_id) SELECT (SELECT post_id FROM posts WHERE name = @name), tag_id FROM tags WHERE name IN (${placeholders});`
    );
    const params = { name: post.name };
    post.tags.forEach((tag, i) => {
      params[`tag${i}`] = tag;
    });
    const rows = statement.run(params);
    console.log(rows);
  }
}

async function processImage(file) {
  const row = db
    .prepare("SELECT original_name FROM assets WHERE original_name = ?")
    .get(file);

  if (!row) {
    const filePath = path.join(assetsDir, file);
    const img = sharp(filePath);
    const { width, height } = await img.metadata();
    const id = nanoid();

    try {
      const buffer = await img.raw().ensureAlpha().toBuffer();
      const blurhash = encode(
        new Uint8ClampedArray(buffer),
        width,
        height,
        9,
        6
      );

      if (isBlurhashValid(blurhash)) {
        db.prepare(
          "INSERT INTO assets (asset_id, original_name, blurhash, width, height) VALUES (@id, @name, @hash, @w, @h)"
        ).run({
          id: id,
          name: file,
          hash: blurhash,
          w: width,
          h: height,
        });
      } else {
        db.prepare(
          "INSERT INTO assets (asset_id, original_name, width, height) VALUES (@id, @name, @w, @h)"
        ).run({
          id: id,
          name: file,
          w: width,
          h: height,
        });
      }
    } catch (err) {
      console.error("Error processing image", err);
    }

    const outputFile = path.join(imagesDir, `${id}.png`);
    img.png({ compressionLevel: 8 }).toFile(outputFile);
  }
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
processFiles();
