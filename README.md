TiddlyMap
=====================================================================

<img src="https://cloud.githubusercontent.com/assets/4307137/9981521/384afc1a-5fc0-11e5-92bc-2c2ce5996766.png" width="24%" />
<img src="https://cloud.githubusercontent.com/assets/4307137/9981522/3863033c-5fc0-11e5-9c2d-f27762f51f8b.png" width="24%" />
<img src="https://cloud.githubusercontent.com/assets/4307137/9981524/386d61b0-5fc0-11e5-9485-94f75be5e049.png" width="24%" />
<img src="https://cloud.githubusercontent.com/assets/4307137/9981523/386d00a8-5fc0-11e5-9006-11ed7abce725.png" width="24%" />

TiddlyMap is a TiddlyWiki plugin that turns your favourite personal note taking software in a *wiki-concept-map hybrid*! Yes, you will be able to do both: drawing maps and putting down knowledge in a wiki way.

TiddlyMap will allow you to visually link and create wiki topics in order to create *clickable graphs*.

* **Create concept maps** to visually express and structure your knowledge.
* **Create dependency graphs** to e.g. organize and describe your tasks.
* **Visualize your topic structures** to get an immediate grasp of topics and relations.

Demo
---------------------------------------------------------------------

A demo with several examples and explanations can be found at the project's website http://tiddlymap.org. While TiddlyMap also works with mobile devices, it is written for larger screens (>= 1440px width), since concept mapping requires space.

Motivation
---------------------------------------------------------------------

The motivation behind TiddlyMap is to combine the strengths of wikis and concept maps in the realms of personal knowledge management in a single application.

Have you ever created mind- or concept maps and later wished you could turn them into a wiki because they became too complex and too hard to maintain? On the contrary, have you ever worked with a wiki and felt that it is lacking visual means to express your thoughts and to relate your content? – If yes, then TiddlyMap is certainly what you are looking for.

How it works
---------------------------------------------------------------------

TiddlyMap is based on two popular open-source projects.

##### The TiddlyWiki project

> [TiddlyWiki](http://tiddlywiki.com/) has bought unprecedented freedom to people to keep their precious information under their own control.
> – [tiddlywiki.com]([http://tiddlywiki.com]/#TiddlyWiki)

The TiddlyWiki project is a flourishing community project under the lead of its original inventor Jeremy Ruston. Put in simple words, TiddlyWiki is a highly interactive wiki stored in a single file that can be used for:

* Personal note taking
* Project documentation and management
* To create whole encyclopedias

The building blocks of TiddlyWiki are small pieces of information called "tiddlers":

> "Tiddlers" are fundamental units of information. Tiddlers work best when they are as small as possible so that they can be reused by weaving them together in different ways. The TiddlyWiki project aspires to provide a concise way of expressing and exploring the relationships between these small pieces of information.
> –  Adapted from [Philosophy of Tiddlers](http://tiddlywiki.com/#Philosophy%20of%20Tiddlers) and [Tiddlers](http://tiddlywiki.com/#
Tiddlers)

##### The Vis.js project

For graph visualization and manipulation, TiddlyMap draws upon the popular open-source [vis.js](http://visjs.org/) library - *a dynamic, browser based visualization library* actively developed and maintained by a team of enthusiastic developers working at [Almende B.V](|http://almende.com).

> The library is designed to be easy to use, handle large amounts of dynamic data, and enable manipulation of the data
> – [visjs.org](|http://visjs.org/)

License
---------------------------------------------------------------------

TiddlyMap is distributed under the [BSD 2-Clause License](http://opensource.org/licenses/BSD-2-Clause).
By using this plugin you agree to the product's [License Terms](https://github.com/felixhayashi/TW5-TiddlyMap/blob/master/LICENSE).

Installation
---------------------------------------------------------------------

There are two ways to install TiddlyMap and TiddlyWiki. If you are a
beginner or not a techie person, you should probably go with the
standalone installation.

### Installation when using TiddlyWiki in standalone

Please follow the instructions given [here](http://tiddlymap.org/#Installation).
Maybe this [introductory video](https://youtu.be/dmeIxuN0L5w) also helps.

### Installation when running TiddlyWiki in Nodejs

For general information on how to set up TiddlyWiki5 with Nodejs visit [tiddlywiki.com](http://tiddlywiki.com). The instructions here are for installing plugins on the node.js server.  This way, the same plugin can be served to many TiddlyWikis.  Multiple wikis will all use the same plugin instance.  You can also install via the standard drag-and-drop method (see below) in a single wiki being served on node.js, but the plugin will only be installed for that wiki. The process, including all updates, will have to be repeated for all other wikis if you plan on serving more than one.

1. Download a copy of the plugins below by either cloning each repository or by clicking "Download ZIP" and unzipping it:

    * [TiddlyMap](https://github.com/felixhayashi/TW5-TiddlyMap)
    * [TW5-Vis.js](https://github.com/felixhayashi/TW5-Vis.js)
    * [TW5-HotZone](https://github.com/felixhayashi/TW5-HotZone)
    * [TW5-TopStoryView](https://github.com/felixhayashi/TW5-TopStoryView)

2. For each plugin, Copy the folder that resides directly below `dist/felixhayashi/` and move it into the `TiddlyWiki5/plugins/` folder (varies with OS. For example in Linux your TW might have been installed into: `/usr/lib/node_modules/tiddlywiki/plugins`).
3. Update the plugin section of your wiki's `tddlywiki.info` file (resides in the root of your wiki) to contain the following:

        {
          "plugins": [
            
            ...
            
            "felixhayashi/tiddlymap",
            "felixhayashi/vis",
            "felixhayashi/hotzone",
            "felixhayashi/topstoryview"
            
          ]
        }
        
4. The TW5-TopStoryView may not be needed in some cases (please see: [Live View plugin dependencies](http://tiddlymap.org/#Working%20with%20the%20live%20view))
5. Restart your wiki server via the command line.


