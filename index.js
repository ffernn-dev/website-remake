import express from "express";
import path from "path";
import nunjucks from "nunjucks";
import Database from "better-sqlite3";
const __dirname = import.meta.dirname;

const app = express();
const db = new Database(path.join(__dirname, "database", "data.db"));
app.use(express.static(path.join(__dirname, "public"), { index: false }));
selfCheck()

nunjucks.configure("templates", {
  autoescape: false,
  express: app,
});

function parseURLArray(input) {
  return JSON.parse("[" + input.replace(/\(/g, "[").replace(/\)/g, "]") + "]");
}

// Creating routes for each page by inserting the relevant HTML into the main template
app.get("/", function (req, res) {
  res.render("home.html", { page: "home", title: "Home" });
});
app.get("/about", function (req, res) {
  res.render("about.html", { page: "about", title: "About Me" });
});
app.get("/socials", function (req, res) {
  res.render("construction.html", { page: "socials", title: "Social Links" });
});
app.get("/projects", function (req, res) {
  res.render("projects.html", {
    page: "projects",
    title: "Project Portfolio",
  });
});
app.get("/blog", function (req, res) {
  res.render("construction.html", { page: "blog" });
});

// TODO: Tidy this function so that the flow of generating a query is cleaner
// i.e. make the "WHERE" section only exist if there's a user-defined query
// and give it only the relevant queries in a tidier way
app.get("/api/projects", function (req, res) {
  // Why is an empty object like {} considered "true" in js???
  if (Object.keys(req.query).length === 0 && req.query.constructor === Object) {
    const rows = db
      .prepare(
        `SELECT 
        posts.*, 
        GROUP_CONCAT(tags.tag_id, ',') AS tags,
        GROUP_CONCAT(tags.name, ', ') AS tagNames,
        assets.thumbhash AS thumbhash
      FROM 
        posts
      JOIN 
        post_tags ON posts.post_id = post_tags.post_id
      JOIN 
        tags ON tags.tag_id = post_tags.tag_id
      LEFT JOIN 
        assets ON assets.asset_id = posts.banner_image
      GROUP BY 
        posts.post_id
      ORDER BY
        posts.created DESC;`,
      )
      .all();
    res.json(rows);
    return;
  }
  const search = req.query;
  let SQLTagList = "";
  let tags;
  if (search.tags) {
    tags = parseURLArray(search.tags);
    SQLTagList = JSON.stringify(tags.flat())
      .replace("[", "(")
      .replace("]", ")");
  }
  const query = search.q;

  const SQLTextSearch = `AND posts.name LIKE '%${query}%'`;

  // Get all the posts that match ANY of the given tags
  let rows = db
    .prepare(
      `SELECT 
        posts.*, 
        GROUP_CONCAT(tags.tag_id, ',') AS tags,
        assets.thumbhash AS thumbhash
      FROM 
        posts
      JOIN 
        post_tags ON posts.post_id = post_tags.post_id
      JOIN 
        tags ON tags.tag_id = post_tags.tag_id
      LEFT JOIN 
        assets ON assets.asset_id = posts.banner_image
      WHERE 
        ${SQLTagList ? "tags.tag_id IN" + SQLTagList : "TRUE"}
        ${query ? SQLTextSearch : ""}
      GROUP BY 
        posts.post_id
      ORDER BY
        posts.created DESC;`,
    )
    .all();

  // Filter them so that at least one tag from each category is present.
  if (search.tags) {
    const tagGroups = tags.map((tag) => (Array.isArray(tag) ? tag : [tag]));

    rows = rows.filter((item) => {
      item.tags = JSON.parse("[" + item.tags + "]"); // Parse tags as an array
      return tagGroups.every((tagGroup) =>
        tagGroup.some((tag) => item.tags.includes(tag)),
      );
    });
  }
  res.json(rows);
});
app.get("/api/tags", function (req, res) {
  const rows = db
    .prepare("SELECT * FROM tags ORDER BY tags.category DESC")
    .all();
  res.json(rows);
});
app.get("/post/:post", function (req, res) {
  const postName = req.params.post;
  const postFile = `posts/${postName}.html`;
  const postData = db
    .prepare("SELECT * from posts WHERE posts.name = ?")
    .get(postName);
  const banner = postData.banner_image
    ? `/images/${postData.banner_image}.png`
    : null;
  const bannerAlt = postData.banner_alt
  // TODO: format date

  res.render(postFile, {
    page: "",
    banner: banner,
    bannerAlt: bannerAlt,
    embedImage: banner,
    date: postData.created,
    postTitle: postData.title,
    title: postData.title,
  });
});
app.listen(8080, () =>
  console.log(
    "Server is running on Port 8080, visit http://localhost:8080/ or http://127.0.0.1:8080 to access your website",
  ),
);

function selfCheck() {
  const numPosts = db.prepare("SELECT COUNT(1) FROM posts;").pluck().get();
  const numTags = db.prepare("SELECT COUNT(1) FROM tags;").pluck().get();
  const numAssets = db.prepare("SELECT COUNT(1) FROM assets;").pluck().get();

  console.log(`Loaded ${numPosts} posts containing ${numTags} unique tags, and ${numAssets} assets from the database`)
}
