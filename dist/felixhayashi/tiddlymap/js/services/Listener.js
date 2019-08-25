"use strict";Object.defineProperty(exports,"__esModule",{value:true});exports.startup=exports.synchronous=exports.before=exports.after=exports.platforms=exports.name=undefined;var _NodeType=require("$:/plugins/felixhayashi/tiddlymap/js/NodeType");var _NodeType2=_interopRequireDefault(_NodeType);var _EdgeType=require("$:/plugins/felixhayashi/tiddlymap/js/EdgeType");var _EdgeType2=_interopRequireDefault(_EdgeType);var _Edge=require("$:/plugins/felixhayashi/tiddlymap/js/Edge");var _Edge2=_interopRequireDefault(_Edge);var _utils=require("$:/plugins/felixhayashi/tiddlymap/js/utils");var _utils2=_interopRequireDefault(_utils);var _vis=require("$:/plugins/felixhayashi/tiddlymap/js/config/vis");var _vis2=_interopRequireDefault(_vis);function _interopRequireDefault(e){return e&&e.__esModule?e:{default:e}}var handleCancelDialog=function e(t){var a=t.param;_utils2.default.setField(a,"text","")};
/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/startup/listener
type: application/javascript
module-type: startup

@preserve

\*/
/* @preserve TW-Guard */var handleClearTiddler=function e(){var t=arguments.length>0&&arguments[0]!==undefined?arguments[0]:{},a=t.paramObject;var r=a.title,d=a.keep;if(!r)return;var i=_utils2.default.getTiddler(r);var l=i?i.fields:{};var s=d?d.split():[];var n={title:r,text:""};for(var p=s.length;p--;){var o=s[p];n[o]=l[o]}$tw.wiki.deleteTiddler(r);$tw.wiki.addTiddler(new $tw.Tiddler(n))};var handleMixTiddlers=function e(t){var a=t.paramObject,r=a===undefined?{}:a;var d=r.tiddlers,i=r.output;if(!d||!i)return;var l=$tw.utils.parseStringArray(d);var s=_utils2.default.getMergedTiddlers(l,i);$tw.wiki.addTiddler(s)};var handleConfirmDialog=function e(t){var a=t.param;_utils2.default.setField(a,"text","1")};var handleSuppressDialog=function e(t){var a=t.paramObject;var r=a.dialog,d=a.suppress;if(_utils2.default.isTrue(d,false)){_utils2.default.setEntry($tm.ref.sysUserConf,"suppressedDialogs."+r,true)}};var handleDownloadGraph=function e(t){var a=t.paramObject;var r=a.view;var d=$tm.adapter.getGraph({view:r});d.nodes=_utils2.default.convert(d.nodes,"array");d.edges=_utils2.default.convert(d.edges,"array");var i="$:/temp/tmap/export";_utils2.default.setField(i,"text",JSON.stringify(d,null,2));$tw.rootWidget.dispatchEvent({type:"tm-download-file",param:i,paramObject:{filename:r+".json"}})};var handleConfigureSystem=function e(){var t=_utils2.default.getMatches($tm.selector.allPotentialNodes);var a=$tm.adapter.getEdgesForSet(t);var r=$tw.wiki.getTiddler($tm.path.pluginRoot).fields;var d=$tw.wiki.getTiddlerData($tm.ref.sysMeta);var i=_utils2.default.getTiddler($tm.ref.liveTab).hasTag("$:/tags/SideBar");var l={numberOfNodes:""+t.length,numberOfEdges:""+Object.keys(a).length,pluginVersion:"v"+r.version,dataStructureVersion:"v"+d.dataStructureState,dialog:{preselects:{liveTab:""+i,"vis-inherited":JSON.stringify(_vis2.default),"config.vis":_utils2.default.getText($tm.ref.visUserConf),"config.sys":$tm.config.sys}}};$tm.dialogManager.open("globalConfig",l,function(e,t){if(!e)return;var a=_utils2.default.getPropertiesByPrefix(t.fields,"config.sys.",true);$tw.wiki.setTiddlerData($tm.ref.sysUserConf,a);if(_utils2.default.isTrue(t.fields.liveTab,false)){_utils2.default.setField($tm.ref.liveTab,"tags","$:/tags/SideBar")}else{$tw.wiki.deleteTiddler($tm.ref.liveTab)}_utils2.default.setField($tm.ref.visUserConf,"text",t.fields["config.vis"])})};var handleGenerateWidget=function e(t){var a=t.paramObject,r=a===undefined?{}:a;var d={dialog:{preselects:{"var.view":r.view||$tm.misc.defaultViewLabel}}};$tm.dialogManager.open("widgetCodeGenerator",d)};var handleRemoveEdge=function e(t){var a=t.paramObject;$tm.adapter.deleteEdge(a)};var handleCreateEdge=function e(t){var a=t.paramObject;var r=a.from,d=a.to,i=a.force;if(!r||!d)return;if(_utils2.default.tiddlerExists(r)&&_utils2.default.tiddlerExists(d)||i){_utils2.default.addTiddler(d);_utils2.default.addTiddler(r);var l=new _Edge2.default($tm.adapter.makeNode(r).id,$tm.adapter.makeNode(d).id,a.label,a.id);$tm.adapter.insertEdge(l);$tm.notify("Edge inserted")}};var handleOpenTypeManager=function e(t){var a=t.type,r=t.paramObject,d=r===undefined?{}:r;var i=a.match(/tmap:tm-(.*)/)[1];if(i==="manage-edge-types"){var l="Edge-Type Manager";var s=$tm.selector.allEdgeTypes;var n=$tm.path.edgeTypes}else{var l="Node-Type Manager";var s=$tm.selector.allNodeTypes;var n=$tm.path.nodeTypes}var p={mode:i,topic:l,searchSelector:s,typeRootPath:n};var o=$tm.dialogManager.open("MapElementTypeManager",p);if(d.type){handleLoadTypeForm({paramObject:{mode:i,id:d.type,output:o.fields["output"]}})}};var handleLoadTypeForm=function e(t){var a=t.paramObject,r=a.mode,d=a.id,i=a.output;var l=i;var s=r==="manage-edge-types"?_EdgeType2.default.getInstance(d):_NodeType2.default.getInstance(d);s.save(l,true);if(r==="manage-edge-types"){var n=$tm.adapter.selectEdgesByType(s);var p=Object.keys(n).length;_utils2.default.setField(l,"temp.usageCount",p)}$tw.wiki.addTiddler(new $tw.Tiddler(_utils2.default.getTiddler(l),{typeTRef:s.fullPath,"temp.idImmutable":s.isShipped?"true":"","temp.newId":s.id,"vis-inherited":JSON.stringify($tm.config.vis)}));_utils2.default.deleteByPrefix("$:/state/tabs/MapElementTypeManager")};var handleSaveTypeForm=function e(t){var a=t.paramObject;var r=_utils2.default.getTiddler(a.output);if(!r)return;var d=r.fields.id;var i=a.mode;if(_utils2.default.isTrue(r.fields["temp.deleteType"],false)){deleteType(i,d,r)}else{saveType(i,d,r)}};var deleteType=function e(t,a,r){var d=t==="manage-edge-types"?_EdgeType2.default.getInstance(a):_NodeType2.default.getInstance(a);$tm.logger("debug","Deleting type",d);if(t==="manage-edge-types"){$tm.adapter._processEdgesWithType(d,{action:"delete"})}else{$tm.adapter.removeNodeType(d)}$tw.wiki.addTiddler(new $tw.Tiddler({title:_utils2.default.getTiddlerRef(r)}));$tm.notify("Deleted type")};var saveType=function e(t,a,r){var d=_utils2.default.getTiddler(r);var i=t==="manage-edge-types"?_EdgeType2.default:_NodeType2.default;var l=new i(a,d);l.save();var s=d.fields["temp.newId"];if(s&&s!==d.fields["id"]){if(t==="manage-edge-types"){$tm.adapter._processEdgesWithType(l,{action:"rename",newName:s})}else{new _NodeType2.default(s,l).save();$tw.wiki.deleteTiddler(l.fullPath)}_utils2.default.setField(d,"id",s)}$tm.notify("Saved type data")};var handleCreateType=function e(t){var a=t.paramObject,r=a.mode,d=a.id,i=d===undefined?"New type":d,l=a.output;var s=r==="manage-edge-types"?new _EdgeType2.default(i):new _NodeType2.default(i);s.save();handleLoadTypeForm({paramObject:{id:s.id,mode:r,output:l}})};var name=exports.name="tmap.listener";var platforms=exports.platforms=["browser"];var after=exports.after=["rootwidget","tmap.caretaker"];var before=exports.before=["story"];var synchronous=exports.synchronous=true;var startup=exports.startup=function e(){_utils2.default.addTWlisteners({"tmap:tm-remove-edge":handleRemoveEdge,"tmap:tm-load-type-form":handleLoadTypeForm,"tmap:tm-save-type-form":handleSaveTypeForm,"tmap:tm-create-type":handleCreateType,"tmap:tm-create-edge":handleCreateEdge,"tmap:tm-suppress-dialog":handleSuppressDialog,"tmap:tm-generate-widget":handleGenerateWidget,"tmap:tm-download-graph":handleDownloadGraph,"tmap:tm-configure-system":handleConfigureSystem,"tmap:tm-manage-edge-types":handleOpenTypeManager,"tmap:tm-manage-node-types":handleOpenTypeManager,"tmap:tm-cancel-dialog":handleCancelDialog,"tmap:tm-clear-tiddler":handleClearTiddler,"tmap:tm-merge-tiddlers":handleMixTiddlers,"tmap:tm-confirm-dialog":handleConfirmDialog},$tw.rootWidget,undefined)};
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/services/Listener.js.map
