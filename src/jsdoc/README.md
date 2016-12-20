TiddlyMap - Code documentation
---------------------------------------------------------------------

This documentation is automatically generated from code comments via
[JSDoc](http://usejsdoc.org/index.html). So instead of browsing the code
and looking at the code comments, you can use this api docu to get your
information. The documentation is also available online. Please visit http://bit.ly/tiddlymap_api.

Probably most interesting for plugin developers are the two following classes:

* [Adapter](module-TiddlyMap-Adapter.html)
* [ViewAbstraction](module-TiddlyMap-ViewAbstraction.html)

The Adapter class allows you to insert and retrieve nodes and edges programmatically
as well as manipulating views:

```javascript
// create a new view
var myView = new $tm.ViewAbstraction("My View", { isCreate: true });

// insert a node in this view
var options = { view: myView };
var node = $tm.adapter.insertNode({ label: "I am a node" }, myView)

// some examples...
myView.getNodeFilter();
myView.saveNodePosition({ id: node.id, x: 4, y: 54});
//myView.destroy();
```
