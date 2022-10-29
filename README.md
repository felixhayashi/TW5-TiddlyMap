TiddlyMap
=====================================================================

<img src="https://cloud.githubusercontent.com/assets/4307137/9981521/384afc1a-5fc0-11e5-92bc-2c2ce5996766.png" width="24%" /> <img src="https://cloud.githubusercontent.com/assets/4307137/9981522/3863033c-5fc0-11e5-9c2d-f27762f51f8b.png" width="24%" /> <img src="https://cloud.githubusercontent.com/assets/4307137/9981524/386d61b0-5fc0-11e5-9485-94f75be5e049.png" width="24%" /> <img src="https://cloud.githubusercontent.com/assets/4307137/9981523/386d00a8-5fc0-11e5-9006-11ed7abce725.png" width="24%" />

TiddlyMap is a TiddlyWiki plugin that turns your favourite personal note taking software in a *wiki-concept-map hybrid*. Yes, you will be able to do both: drawing maps and putting down knowledge in a wiki way. TiddlyMap will allow you to visually link and create wiki topics in order to create *clickable graphs*, e.g. *concept maps* or *dependency graphs*. Moreover it will automatically *visualize your topic structures* so you get an immediate grasp of topics and relations.

Demo
---------------------------------------------------------------------

**WARNING:** The demo site is no longer being maintained. The latest version of TiddlyMap is only available here on git. Look to "Releases" on the right.

A demo with several examples and explanations can be found at the project's website [tiddlymap.org](http://tiddlymap.org). While TiddlyMap also works with mobile devices, it is written for larger screens (>= 1440px width), since concept mapping requires space.

Motivation
---------------------------------------------------------------------

The motivation behind TiddlyMap is to combine the strengths of wikis and concept maps in the realms of personal knowledge management in a single application.

Have you ever created mind- or concept maps and later wished you could turn them into a wiki because they became too complex and too hard to maintain? On the contrary, have you ever worked with a wiki and felt that it is lacking visual means to express your thoughts and to relate your content? – If yes, then TiddlyMap is certainly what you are looking for.

Fundaments
---------------------------------------------------------------------

TiddlyMap is based on two popular open-source projects.

**TiddlyWiki**, a personal wiki software developed by Jeremy Ruston, is used as runtime environment.  TiddlyWiki is a unique non-linear notebook for capturing, organising and sharing complex information. It is a highly interactive application that is stored in a single file.

> TiddlyWiki has bought unprecedented freedom to people to keep their precious information under their own control.
> – [tiddlywiki.com](http://tiddlywiki.com/#TiddlyWiki)

**Vis.js** is used for graph visualization and manipulation. Vis.js is *a dynamic, browser based visualization library* actively developed and maintained by a team of great developers working at [Almende B.V](http://almende.com).

> The library is designed to be easy to use, handle large amounts of dynamic data, and enable manipulation of the data
> – [visjs.org](http://visjs.org/)

License
---------------------------------------------------------------------

TiddlyMap is distributed under the [BSD 2-Clause License](http://opensource.org/licenses/BSD-2-Clause).
By using this plugin you agree to the product's [License Terms](https://github.com/felixhayashi/TW5-TiddlyMap/blob/master/LICENSE).

Installation
---------------------------------------------------------------------

There are two ways to install TiddlyMap and TiddlyWiki. If you are a beginner or not a techie person, you should probably go with the standalone installation.

**Option 1 – Drag & drop installation of the plugin**

This is the most simply and common method, especially when using TiddlyWiki in standalone. You can also use this method when TiddlyWiki is run under [Node.js](https://nodejs.org/en). Please follow the instructions given [here](http://tiddlymap.org/#Installation). Maybe this [introductory video](https://youtu.be/dmeIxuN0L5w) also helps.

**Option 2 – Include the plugin in the TiddlyWiki plugin-folder**

This method requires you to have TiddlyWiki running as server using [Node.js](https://nodejs.org/en). For general information on how to set up TiddlyWiki5 with Node.js visit [tiddlywiki.com](http://tiddlywiki.com). Installing TiddlyMap this way has the benefit that the same TiddlyMap plugin can be included in several wikis served by Node.js.

1. On your computer, go to the place where TiddlyWiki is installed. The place may vary, e.g. in linux the path is `/usr/lib/node_modules/tiddlywiki/` in case you installed TiddlyWiki globally using `npm -g tiddlywiki`. Make sure the folder `tiddlywiki/plugins/` has write access.

1. For each link below, visit the GitHub repositories it points to and click "Download ZIP". 

  * [TiddlyMap](https://github.com/felixhayashi/TW5-TiddlyMap)
    * This is the core TiddlyMap plugin.
  * [tw5-vis-network](https://github.com/flibbles/tw5-vis-network)
    * This plugin will install vis-network which is required for the graph's rendering.
  * [TW5-HotZone](https://github.com/felixhayashi/TW5-HotZone)
    * This plugin is necessary when you want to use the live view.
  * [TW5-TopStoryView](https://github.com/felixhayashi/TW5-TopStoryView)
    * Unless you are using the zoomin or stacked story view, install this plugin to achieve a better live view experience.

1. For every zip file, open the file and copy everything that lies in the zip's `dist/` path (or `plugins/` path for vis-network) into `tiddlywiki/plugins/` (or create symlinks).

Now in every wiki you want TiddlyMap to appear in, you need to update the plugin section of your wiki's `tiddlywiki.info` file, which resides in the root of your wiki, to contain the following:

```javascript
{
  "plugins": [
    "felixhayashi/tiddlymap",
    "felixhayashi/hotzone",
    "felixhayashi/topstoryview",
    "flibbles/vis-network"
  ]
}
```

[Make sure](http://jsonlint.com/) your `tiddlywiki.info` file is correctly formated and contains valid JSON and always remember to restart your tiddlywiki server to reflect the changes.

Build
---------------------------------------------------------------------

If you want to compile your own TiddlyMap plugin from source, follow the steps below.

**Note:** In case you want to contribute code to the project, make sure you read [Contributing to TiddlyMap](https://github.com/felixhayashi/TW5-TiddlyMap/blob/master/CONTRIBUTING.md) and signed the CLA before creating a pull request.

First, make sure you have [Node.js](https://nodejs.org/en) and its package manager (npm) installed. Now, start a terminal and clone the repository using the command below. This may take a while, so relax or make yourself a tea…

    git clone git://github.com/felixhayashi/TW5-TiddlyMap.git

Open the root directory of the just cloned repository…

    cd TW5-TiddlyMap

…and execute the command below. Again, this may take a minute or two. So instead of looking at the screen, maybe do [some exercises](https://www.google.de/search?q=office+desk+exercises) in between (please notice the rhyme here, it took me a while to develop it).

    npm install

Now use one of the following commands:

    # build for production (compressing files)
    gulp --production
    
    # build for testing (without compression)
    gulp
    
    # build and automatically rebuild on changes
    gulp watch

The build produces a few folders, i.e. `docs`, `bundle`, `dist`, in the local repository's root. To test the compiled plugin, follow the installation instructions given in the previous section.

**Some tips:**

* For a quick test of the build result drag & drop the `tiddlymap.json` file residing in the `bundle` folder into one of your wikis to install the compiled plugin. Of course you *need to make sure(!)* that this wiki also has all the plugins installed TiddlyMap depends on (most importantly [tw5-vis-network](https://github.com/flibbles/tw5-vis-network)). So for testing purposes, you could drag your compiled plugin into http://tiddlymap.org, which satisfies all dependencies already.
* If you need to build and test TiddlyMap often, it makes sense to consider setting up "Option 2" (see installation instructions) using symlinks. So in your `tiddlywiki/plugins/` directory create symlinks to your local repository's dist folder.
* To have the source code documentation displayed as website, open the `index.html` inside the `docs` folder. Please note: docs may be outdated or incomplete.
