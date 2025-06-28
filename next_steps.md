Please read this document and read the codebase as necessary to make a plan on implementation.

Some next steps to continue to improve the site are detailed below. Feel free to use tools in the repo and to search the internet for documentation. Any links that I have given below are ok to access.

This is a big set of tasks so please take your time thinking through them. First read the entire file and then come up with a plan for ordering these steps in order to make everything work as smoothly as possible. You may also spawn sub agents to paralellize this research and implementation. But if you do that please make sure to use git in order to prevent conflicts.

## Important larger features

These may involve significant design work. When work on these features be sure to make use of git to track changes and make sure that we do not accidentally lose functionality. Also remember to run the tests and to add tests as new features are added

### Data Loading

- Support loading multiple files at once, or choosing a folder
  - Easy to use UI to move through many files in a folder
  - Optional display of additional information if provided by a CSV or similar file in the folder. e.g. transcriptions of a sentence or phrase
  - Optional but very nice:
    - Accepts URLs leading to publicly accessible folders e.g. google drive/S3
    - Allows users to paste a google drive link and give the site access (only implement if it does not add signficant complexity. This website must always work without a server running and without requiring log in.)

For investigations please use the internet to do research and put any findings and conclusions into a markdown design document. If possilbe also consider adding a test page with potential implementation(s)

- investigate if we can automatically integrate sites like taoteba, wikitionary, rhinospike or forvo to automatically provide target audio to the user
  - this must not require us registering an API key, the website must work as a static site without a server
  - can also consider any other free online sources of audio
  - will absolutely require the ability to filter by langauge and potentially by region code
- investigate the possibility of receiving audio from Anki via AnkiConnect (<https://git.sr.ht/~foosoft/anki-connect/>)
  - We would define a card format e.g. must have an "audio" field
  - Request the next review or learning card from Anki and use that for the target audio
  - Provide the ability for a user to rate a card as again, hard, good, or easy and send that information back to anki
- investigate adding the ability for the user to supply a URL (e.g. youtube) and the app automatically downloads the relevant audio and then splits the audio into sentences using VAD and related tools then uses the same infrastructure built for the folder to serve to user

### audio processing

Sometimes when a user records, especially when using a lower quality microphone, the audio can sound harsh. We can add dynamic range compression using the web audio API to make it nicer to listen to. If we do this we need to make sure to apply similar effects to the target and the user audio. We also cannot process too much as that would make it more confusing for the user to adjust their speech in order to adjust their accent. There will need to be settings for the parameters in the settings panel. They should default to reasonable values for human speech.

### accessibility

- Make sure that the site is accessible to screen reader
- Meets other accessiblity guidelines e.g. text contrast

### investigate similarity metrics

We always have target audio, so a metric that compares the user speech to the target speech could be a powerful tool. This is a very complicated thing to implement well so please think very hard about this and do extensive research on best strategies. Including searching for existing libraries that we might be able to use to implement a scoring metric for comparing the audio.

If you find a solution please build a small version in a test page, making sure to leverage as much of the existing infrastructure as possible to make it easy.

### Statistics

Seeing usage statistics and history can be motivating to a learner

Using localstore or indexdb (or syncing to google drive if easy) keep track of usage statistics and built a nice statistics page so users can be motivated by their progress.

## Small Improvements

- Keybinding support
- Incorporate Simple Analytics Tracking (domain: ianhuntisaak.com)
  - They have a vue integration: simple-analytics-vue
- Add an about page
  - Mentions motivation and use case
  - Explains open source tools used to build this site and acknowledges their licenses
  - Links back to ianhuntisaak.com/language-learning-tools
- Add a page with instructions on finding audio
  - suggest taoteba, rhinospike, commonvoice from mozilla
- Light and dark mode implemented
- User can toggle between light and dark mode
- Add a "demo audio" so that anyone coming to site can try it out without
- Assess the overall UI and make improvements where possible
  - Take screenshots before and after using playwright and save them into a markdown document describing what changes were made
- Make sure we are using the name "AccentShadow" everywhere, including in package.json we are no longer using echolingo
- Add acknowledgement of claude code to the about page
- Add a spot for a kofi donation link (this should be noticeable, but unobtrusive)
- Make it clear that this website is FOSS, and link to the github page
- Expand the readme
- Add a link to report issues on github to the site

## Mobile Support

After implementing everything above we need to ensure that the main app works on mobile                     a

Finally a very important step is to build the mobile version of the site based on the mock ups and design documents we have written. However we need to do this after implementing everything else.
