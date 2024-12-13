# Personal website and portfolio PWA
## Installation
Download and enter the repository:  
`git clone https://github.com/ffernn-dev/website-remake`  
`cd website-remake`  
Install dependencies:  
`npm i`  
Ensure the database is up to date:  
`npm run build`  
Run the sever:  
`npm run start`  
## To add content:
Create a markdown file in the `markdown` directory (filename will be the title of the page), add "frontmatter" metadata in the following format
```
---
name: {name, kebab-case preferred}
created: {date, yyyy-mm-dd}
tags:
  - {tag1}
  - {tag2}
  - {etc}
banner: "[[{name of image file in _assets folder}]]"
---
```
Add whatever markdown content you want under the frontmatter.
Build your new content
`npm run build`
## Locations of key features
### JavaScript algorithms that generate SQL queries and send the resulting data to the frontend via JSON:  
Querying posts based on tags and search string  
https://github.com/ffernn-dev/website-remake/blob/17ded9fa9e0f4e3380f2dfdb9fdc995792b0c305/index.js#L43
Sending list of tags  
https://github.com/ffernn-dev/website-remake/blob/17ded9fa9e0f4e3380f2dfdb9fdc995792b0c305/index.js#L120
### HTML and CSS for the frontend
HTML:
https://github.com/ffernn-dev/website-remake/tree/50d88bf0a7a41cfd03a10023dfbc66c116ffee16/templates  
- `main.njk` is the base template for the site, containing a sidebar and content container to be populated with whatever the page is  
- `post.njk` inherits from main.njk and adds some supporting material for the content of a "project page" to be inserted into  
- `projects.html`, the projects page, inherits from main.njk and contains UI and scripts for sending queries to the backend and displaying the results  
- `home.html, about.html, construction.html` are all static pages, pretty self explanatory  
- `posts/xyz.html` are the generated project pages that inherit from `post.njk` and contain the post content.  

CSS:
https://github.com/ffernn-dev/website-remake/tree/50d88bf0a7a41cfd03a10023dfbc66c116ffee16/public/css
### Inserting data into the database  
Various places in build.js. The high-level process of build.js is as follows  
1. Make sure all destination directories are present  
2. Process all the images in the _assets folder, if a new file exists or has changes that haven't been processed yet it will optimise the image, generate a "thumbhash" to display while the image loads, and save the image to the public/images dir  
3. For each markdown document, strip the metadata from the "frontmatter" section and insert that into the database, add any new tags found to the database too and link them many-to-many with the posts (also ask the user for a category to file them under for the UI), and finally convert the document to HTML, saving it as a post file.
4. Remove any entries from the database or files from the image folder if the source material has been deleted.
### Querying your database to confirm the data is present:
[index.js function selfCheck](https://github.com/ffernn-dev/website-remake/blob/761f66ea824b41a5465a1d28941267165ddd53d5/index.js#L156)
