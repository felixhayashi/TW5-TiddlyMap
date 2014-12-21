TW-Taskgraph - Code documentation
---------------------------------------------------------------------

This documentation is automatically generated from code comments via
[JSDoc](http://usejsdoc.org/index.html). So instead of browsing the code
and looking at the code comments, you can use this api docu to get your
information.

Probably most interesting for plugin developers are the two following classes:

* [Adapter](Adapter.html)
* [ViewAbstraction](ViewAbstraction.html)

The Adapter class allows you to insert and retrieve nodes and edges programmatically
as well as manipulating views:

```javascript
// create a new view
var myView = $tw.taskgraph.adapter.createView("My new View");

// insert a node in this view
var node = { label: "I am a node" };
var options = { view: myView };
$tw.taskgraph.adapter.insertNode(node, options);
```

To retrieve view-information or manipulate views, use the ViewAbstraction class:

```javascript
// open an existing view
var myView = $tw.taskgraph.adapter.getView("My existing View");

// some examples...
myView.getNodeFilter("expression");
myView.setNodeFilter("[tags[homework]]");
myView.setNodePosition({ id: 123, x: 4, y: 54});
myView.destroy();
```