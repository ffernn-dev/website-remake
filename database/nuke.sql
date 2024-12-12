-- database: ./data.db

delete from post_tags;
delete from assets;
delete from posts;
delete from tags;
delete from sqlite_sequence where name='posts';
delete from sqlite_sequence where name='tags';