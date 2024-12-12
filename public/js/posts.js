const urlParams = new URLSearchParams(window.location.search);
const tags = urlParams.get("tags");
const query = urlParams.get("q");
const container = document.getElementById("posts-list");
let currentPosts = new Map();
let allTags = [];

// I need to extend the colcade library to create a "remove item" function
// sighhh
Colcade.prototype.remove = function (elem) {
  if (!elem) {
    return;
  }

  var index = this.items.indexOf(elem);
  if (index !== -1) {
    this.items.splice(index, 1);
  }

  if (elem.parentNode) {
    elem.parentNode.removeChild(elem);
  }

  this._layout();
};

const masonry = new Colcade(container, {
  columns: ".posts-col",
  items: ".post-card",
});

const createSearchUI = async () => {
  const searchText = document.getElementById("search-text");
  searchText.value = query;
  const searchButton = document.getElementById("search-submit");
  fetch("/icons/ui/magnifying-glass.svg")
    .then((response) => response.text())
    .then((svg) => {
      searchButton.innerHTML = svg;
    });

  const caretUp = await (await fetch("/icons/ui/caret-up.svg")).text();
  const caretDown = await (await fetch("/icons/ui/caret-down.svg")).text();

  const response = await fetch(`/api/tags`);
  allTags = await response.json();
  const filterForm = document.getElementById("filters");
  let categories = [];
  // Check the URL for what checkboxes to already enable
  const checkedTags = tags ? tags.split(/[(),]+/) : [];

  for (const tag of allTags) {
    if (tag.category == null) {
      tag.category = "tags";
    }
    if (!categories.includes(tag.category)) {
      categories.push(tag.category);
      const newSeparator = document.createElement("div");
      const separator = `
      <div class="filter-separator">
        <svg class="collapse-icon up">${caretUp}</svg>
        <svg class="collapse-icon down">${caretDown}</svg>
        <p>${tag.category}</p>
        <hr class="bottom-line">
      </div>
      <ul id="filter-group-${tag.category}" class="filter-group">
      </ul>
      `;
      newSeparator.innerHTML = separator;
      // Add dropdown functionality
      newSeparator.firstElementChild.addEventListener("click", function () {
        this.classList.toggle("active");
        var content = this.nextElementSibling;
        if (content.style.maxHeight) {
          content.style.maxHeight = null;
        } else {
          content.style.maxHeight = content.scrollHeight + "px";
        }
      });
      filterForm.appendChild(newSeparator);
    }

    const newToggle = document.createElement("li");
    const isChecked = checkedTags.includes(String(tag.tag_id));

    const toggleID = tag.category + "_" + tag.tag_id.toString();
    const toggle = `
    <input type="checkbox" id="${toggleID}" name="${toggleID}" class="filter-checkbox" onChange="applyFilters();" ${isChecked ? "checked" : ""}>
    <label for="${toggleID}">${tag.name}</label><br>
    `;
    newToggle.innerHTML = toggle;
    newToggle.classList.add("filter-toggle");

    toggleParent = document.getElementById("filter-group-" + tag.category);
    toggleParent.appendChild(newToggle);
  }
  masonry.layout();
};

function lazyLoadImage(target, imageUrl) {
  const image = new Image();
  image.onload = function () {
    // Switch the src of the <img> to the new image URL once its loaded
    target.src = image.src;
  };
  // Set the source of the new image (triggering the load process)
  image.src = imageUrl;
}

const loadPosts = async () => {
  const response = await fetch(`/api/projects${window.location.search}`);
  const posts = await response.json();

  currentPosts.forEach((card) => {
    masonry.remove(card);
  });
  posts.forEach((post) => {
    const newCard = document.createElement("a");
    const image = post.thumbhash ? thumbHashToDataURL(post.thumbhash.data) : "";

    // Create the card by filling in the data from the server
    const card = `
    ${image ? "<img src=" + image + "></img>" : ""}
    <section class="card-text">
      <h2>${post.title}</h2>
      <p>${post.name}</p>
    </section>
    `;
    newCard.classList.add("box", "post-card");
    newCard.href = `post/${post.name}`;
    newCard.innerHTML = card;
    masonry.append(newCard);
    currentPosts.set(post.name, newCard);

    if (image) {
      // Queue the loading of the image to replace the blur placeholder
      cardImage = newCard.querySelector("img");
      lazyLoadImage(cardImage, `/images/${post.banner_image}.png`);
    }
  });
};

createSearchUI();
loadPosts();

function tidyURL(url) {
  return new URL(url.toString().replaceAll("%2C", ","));
}

window.addEventListener("popstate", function () {
  // Load posts when the user navigates back/forward
  loadPosts();
});
document
  .getElementById("search-bar")
  .addEventListener("submit", function (event) {
    event.preventDefault();
    const searchText = document.getElementById("search-text").value;

    const url = new URL(window.location);
    url.searchParams.set("q", searchText);
    history.pushState(null, "", tidyURL(url));
    loadPosts();
  });

function applyFilters() {
  const filters = document.getElementsByClassName("filter-checkbox");
  const filterQuery = [];

  let lastCategory = "";
  let categoryGroup = [];

  // Iterate through checkboxes
  for (let i = 0; i < filters.length; i++) {
    const filter = filters.item(i);
    const data = filter.id.split("_");

    // Check if we're in a new category in order to create a new grouping
    if (data[0] != lastCategory) {
      if (categoryGroup.length > 0) {
        filterQuery.push(categoryGroup);
        categoryGroup = [];
      }
    }

    // Add the tagID to the group if it's checked
    if (filter.checked) {
      categoryGroup.push(parseInt(data[1]));
    }

    lastCategory = data[0];
  }
  // Add the last category
  if (categoryGroup.length > 0) {
    filterQuery.push(categoryGroup);
  }

  const tagString = JSON.stringify(filterQuery)
    .slice(1, -1)
    .replace(/\[/g, "(")
    .replace(/\]/g, ")");

  const url = new URL(window.location);
  url.searchParams.set("tags", tagString);
  history.pushState(null, "", tidyURL(url));
  loadPosts();
}
