
Using the "webhints" firefox extension, I was able to identify and resolve two accessiblity issues:
1. My banner images did not have alt texts, meaning that screen readers would not be able to read them out. I added a field into the database for this and updated the frontend to add the text to the image.
2. My previous method for highlighting active sidebar pages (green background on the list entry) created poor contrast between the text and the background, making it difficult to read for visually impaired people (and not reaching the AA guidelines). I fixed this by changing the indicator to an underline instead.

Using Chrome Lighthouse, I identified 3 further issues:
1. The touch target for the search button was too small (making it unable to be pressed), so I increased the size to 24x24px
2. I needed to add an "aria-label" attribute to the search button, as it had no text and just an icon. This helps screen readers state what the button does
3. Similarly to the first one, the sidebar URLs (home, about etc.) were not large enough and did not have enough spacing between eachother, meaning that the touch targets were too small. I increased the hight and spaced them better, fixing the issue.

I realised when testing tab navigation that the filter category dropdowns weren't selectable/toggleable with tab, thus making the whole filter section unusable to keyboard navigation. To remedy this, I changed them from \<div\> elements to \<button\> with all their default styles cleared, and added an outline on focus for visual feedback.
Finally, on the last day I added headers above the various parts of the sidebar to indicate what they are

Some other considerations made during the design stages:
- Using a high contrast text/background colour combination
- Adding icons on the filter dropdowns to show that they can be dropped down, and indicate their current state
- Using relative font sizes in all my css, rather than pixel values 

Unfortunately I was unable to use online accessibility checkers, due to them requiring the site be accessible on the public web.