import { readFile, readdir, writeFile, stat, unlink } from "fs/promises";
import path from "path";
import Database from "better-sqlite3";
import sharp from "sharp";
import { rgbaToThumbHash } from "thumbhash";
import { ensureDir } from "fs-extra";
import crypto from "crypto";
import readline from "readline";
import { parseMarkdown } from "./parse-markdown.js";

const __dirname = import.meta.dirname;
const dbFile = path.join(__dirname, "database", "data.db");
// Inputs
const markdownDir = path.join(__dirname, "markdown");
const assetsDir = path.join(markdownDir, "_assets");
// Outputs
const postsDir = path.join(__dirname, "templates", "posts");
const imagesDir = path.join(__dirname, "public", "images");

const db = new Database(dbFile);
let rl;

const prompt = (query) => new Promise((resolve) => rl.question(query, resolve));

async function calculateFileHash(filePath) {
  const content = await readFile(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function getFileModificationTime(filePath) {
  const stats = await stat(filePath);
  return stats.mtimeMs;
}

async function processMarkdownFile(file) {
  const filePath = path.join(markdownDir, file);
  const contentHash = await calculateFileHash(filePath);
  const lastModified = await getFileModificationTime(filePath);

  // Check if file has changed
  const existingPost = db
    .prepare("SELECT content_hash, last_modified FROM posts WHERE title = ?")
    .get(file.replace(".md", ""));

  if (
    existingPost &&
    existingPost.content_hash === contentHash &&
    existingPost.last_modified === lastModified
  ) {
    return; // Skip if unchanged
  }

  const data = await readFile(filePath, "utf8");
  const filename = path.parse(filePath).name;
  const document = await parseMarkdown(data);

  // Add any new tags to the DB
  for (const tag of document.metadata.tags) {
    await createTag(tag);
  }

  const outTemplate = `{% extends "post.njk" %}\n{% block postContent %}\n${document.html}{% endblock %}`;

  // Write HTML file
  const outputHtmlPath = path.join(postsDir, `${document.metadata.name}.html`);
  await writeFile(outputHtmlPath, outTemplate);

  // Update database
  upsertPost({
    name: document.metadata.name,
    title: filename,
    created: document.metadata.created.toISOString().slice(0, 10),
    banner: document.metadata.banner?.match(/\[\[(.*?)\.\w+\]\]/)?.[1],
    bannerAlt: document.metadata.bannerAlt,
    tags: document.metadata.tags,
    contentHash,
    lastModified,
  });
}

async function processImage(file) {
  const filePath = path.join(assetsDir, file);
  const fileName = path.parse(filePath).name;
  const fileHash = await calculateFileHash(filePath);
  const lastModified = await getFileModificationTime(filePath);

  const existingAsset = db
    .prepare("SELECT file_hash, last_modified FROM assets WHERE asset_id = ?")
    .get(fileName);

  if (
    existingAsset &&
    existingAsset.file_hash === fileHash &&
    existingAsset.last_modified === lastModified
  ) {
    return; // Skip if unchanged
  }

  const img = sharp(filePath);
  const { width, height } = await img.metadata();

  try {
    // Generate a tiny text string that can be used to draw a blurred
    // version of the image while it loads on the front end
    let buffer = await img
      .clone()
      .raw()
      .ensureAlpha()
      .resize(width > height ? { width: 100 } : { height: 100 })
      .toBuffer({ resolveWithObject: true });
    const thumbhash = rgbaToThumbHash(
      buffer.info.width,
      buffer.info.height,
      new Uint8Array(buffer.data),
    );

    // Upsert asset record
    db.prepare(
      `
      INSERT INTO assets (asset_id, thumbhash, file_hash, last_modified)
      VALUES (@id, @hash, @fileHash, @lastModified)
      ON CONFLICT(asset_id) DO UPDATE SET
        thumbhash = @hash,
        file_hash = @fileHash,
        last_modified = @lastModified
      `,
    ).run({
      id: fileName,
      hash: thumbhash,
      fileHash,
      lastModified,
    });

    // Write the image to a file
    const outputFile = path.join(imagesDir, `${fileName}.png`);
    await img.clone().png({ compressionLevel: 8 }).toFile(outputFile);
  } catch (err) {
    console.error("Error processing image", err);
  }
}

async function createTag(name) {
  const existingTag = db
    .prepare("SELECT tag_id FROM tags WHERE name = ?")
    .pluck()
    .get(name);
  if (!existingTag) {
    const category = (await prompt(`Category for new tag ${name}? `)) || null;
    db.prepare(
      "INSERT OR IGNORE INTO tags (name, category) VALUES (@name, @category)",
    ).run({
      name,
      category,
    });
  }
}

function upsertPost(post) {
  const { name, title, created, banner, bannerAlt, tags, contentHash, lastModified } =
    post;

  db.transaction(() => {
    // Upsert post
    db.prepare(
      `
      INSERT INTO posts (name, title, created, banner_image, banner_alt, content_hash, last_modified)
      VALUES (@name, @title, @created, @banner, @banner_alt, @hash, @modified)
      ON CONFLICT(name) DO UPDATE SET
        title = @title,
        created = @created,
        banner_image = @banner,
        banner_alt = @banner_alt,
        content_hash = @hash,
        last_modified = @modified
    `,
    ).run({
      name,
      title,
      created,
      banner,
      banner_alt: bannerAlt,
      hash: contentHash,
      modified: lastModified,
    });

    // Update tags
    const postId = db
      .prepare("SELECT post_id FROM posts WHERE name = ?")
      .pluck()
      .get(name);

    // Remove old tags
    db.prepare("DELETE FROM post_tags WHERE post_id = ?").run(postId);

    // Add new tags
    const insertTag = db.prepare(`
      INSERT INTO post_tags (post_id, tag_id)
      SELECT ?, tag_id FROM tags WHERE name = ?
    `);

    tags.forEach((tag) => insertTag.run(postId, tag));
  })();
}

async function cleanupDeletedFiles() {
  // Get list of current files
  const markdownFiles = new Set(
    (await readdir(markdownDir))
      .filter((file) => file.endsWith(".md"))
      .map((file) => file.replace(".md", "")),
  );

  const assetFiles = new Set(
    (await readdir(assetsDir))
      .filter((file) =>
        ["png", "jpg", "jpeg"].some((ext) => file.endsWith(ext)),
      )
      .map((file) => path.parse(file).name),
  );

  // Remove posts that no longer exist
  const existingPosts = db.prepare("SELECT title FROM posts").pluck().all();
  for (const postName of existingPosts) {
    if (!markdownFiles.has(postName)) {
      db.prepare("DELETE FROM posts WHERE title = ?").run(postName);
      db.prepare(
        "DELETE FROM post_tags WHERE post_id IN (SELECT post_id FROM posts WHERE title = ?)",
      ).run(postName);
    }
  }

  // Remove tags that no longer exist
  db.prepare(
    "DELETE FROM tags WHERE tag_id NOT IN (SELECT DISTINCT tag_id FROM post_tags);",
  ).run();

  // Remove assets that no longer exist
  const existingAssets = db
    .prepare("SELECT asset_id FROM assets")
    .pluck()
    .all();
  for (const assetId of existingAssets) {
    if (!assetFiles.has(assetId)) {
      db.prepare("DELETE FROM assets WHERE asset_id = ?").run(assetId);
      // Remove the image file
      const imagePath = path.join(imagesDir, `${assetId}.png`);
      if (await fileExists(imagePath)) {
        await unlink(imagePath);
      }
    }
  }
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  try {
    await ensureDir(postsDir);
    await ensureDir(imagesDir);

    // Process assets first
    const assetFiles = (await readdir(assetsDir)).filter((file) =>
      ["png", "jpg", "jpeg"].some((ext) => file.endsWith(ext)),
    );

    for (const file of assetFiles) {
      await processImage(file);
    }

    // Process markdown files
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const markdownFiles = (await readdir(markdownDir)).filter((file) =>
      file.endsWith(".md"),
    );

    for (const file of markdownFiles) {
      await processMarkdownFile(file);
    }
    rl.close();

    // Clean up deleted files
    await cleanupDeletedFiles();

    console.log("Processing complete!");
  } catch (error) {
    console.error("Error during processing:", error);
  }
}

await main();
