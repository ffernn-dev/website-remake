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
