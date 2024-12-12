-- database: data.db
CREATE TABLE IF NOT EXISTS posts (
    post_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT UNIQUE NOT NULL,
    title TEXT,
    created TEXT,
    banner_image TEXT,
    content_hash TEXT,
    last_modified INTEGER
);

CREATE TABLE IF NOT EXISTS tags (
    tag_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT UNIQUE NOT NULL,
    category TEXT
);

CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER,
    tag_id INTEGER,
    FOREIGN KEY (post_id) REFERENCES posts(post_id),
    FOREIGN KEY (tag_id) REFERENCES tags(tag_id),
    UNIQUE(post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS assets (
    asset_id TEXT PRIMARY KEY NOT NULL,
    thumbhash TEXT,
    file_hash TEXT,
    last_modified INTEGER
);