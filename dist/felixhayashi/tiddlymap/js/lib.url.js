/*\

title: $:/plugins/felixhayashi/tiddlymap/js/URL
type: application/javascript
module-type: library

@preserve

\*/
"use strict";module.exports=Url;/**
 * <<<
 * Lightweight URL manipulation with JavaScript. This library is 
 * independent of any other libraries and has pretty simple interface
 * and lightweight code-base. Some ideas of query string parsing 
 * had been taken from Jan Wolter."
 * 
 * @see http://unixpapa.com/js/querystring.html
 * @license MIT
 * @author Mykhailo Stadnyk <mikhus@gmail.com>
 * <<< https://github.com/Mikhus/jsurl
 * 
 * @class
 * @param {string} url
 */
function Url(t){this.paths=function(t){var e="",r=0,o;if(t&&t.length&&t+""!==t){if(this.isAbsolute()){e="/"}for(o=t.length;r<o;r++){t[r]=encode(t[r])}this.path=e+t.join("/")}t=(this.path.charAt(0)==="/"?this.path.slice(1):this.path).split("/");for(r=0,o=t.length;r<o;r++){t[r]=decode(t[r])}return t};this.encode=encode;this.decode=decode;this.isAbsolute=function(){return this.protocol||this.path.charAt(0)==="/"};this.toString=function(){return(this.protocol&&this.protocol+"://")+(this.user&&encode(this.user)+(this.pass&&":"+encode(this.pass))+"@")+(this.host&&this.host)+(this.port&&":"+this.port)+(this.path&&this.path)+(this.query.toString()&&"?"+this.query)+(this.hash&&"#"+encode(this.hash))};parse(this,t)}var map={protocol:"protocol",host:"hostname",port:"port",path:"pathname",query:"search",hash:"hash"},defaultPorts={ftp:21,gopher:70,http:80,https:443,ws:80,wss:443},parse=function(t,e){var r=document,o=r.createElement("a"),e=e||r.location.href,s=e.match(/\/\/(.*?)(?::(.*?))?@/)||[],i;o.href=e;for(i in map){t[i]=o[map[i]]||""}t.protocol=t.protocol.replace(/:$/,"");t.query=t.query.replace(/^\?/,"");t.hash=decode(t.hash.replace(/^#/,""));t.user=decode(s[1]||"");t.pass=decode(s[2]||"");t.port=defaultPorts[t.protocol]==t.port||t.port==0?"":t.port;if(!t.protocol&&!/^([a-z]+:)?\/\//.test(e)){var h=new Url(r.location.href.match(/(.*\/)/)[0]),n=h.path.split("/"),a=t.path.split("/"),c=["protocol","user","pass","host","port"],p=c.length;n.pop();for(i=0;i<p;i++){t[c[i]]=h[c[i]]}while(a[0]==".."){n.pop();a.shift()}t.path=(e.charAt(0)!="/"?n.join("/"):"")+"/"+a.join("/")}else{t.path=t.path.replace(/^\/?/,"/")}t.paths((t.path.charAt(0)=="/"?t.path.slice(1):t.path).split("/"));parseQs(t)},encode=function(t){return encodeURIComponent(t).replace(/'/g,"%27")},decode=function(t){t=t.replace(/\+/g," ");t=t.replace(/%([ef][0-9a-f])%([89ab][0-9a-f])%([89ab][0-9a-f])/gi,function(t,e,r,o){var s=parseInt(e,16)-224,i=parseInt(r,16)-128;if(s==0&&i<32){return t}var h=parseInt(o,16)-128,n=(s<<12)+(i<<6)+h;if(n>65535){return t}return String.fromCharCode(n)});t=t.replace(/%([cd][0-9a-f])%([89ab][0-9a-f])/gi,function(t,e,r){var o=parseInt(e,16)-192;if(o<2){return t}var s=parseInt(r,16)-128;return String.fromCharCode((o<<6)+s)});t=t.replace(/%([0-7][0-9a-f])/gi,function(t,e){return String.fromCharCode(parseInt(e,16))});return t},parseQs=function(t){var e=t.query;t.query=new function(t){var e=/([^=&]+)(=([^&]*))?/g,r;while(r=e.exec(t)){var o=decodeURIComponent(r[1].replace(/\+/g," ")),s=r[3]?decode(r[3]):"";if(this[o]!=null){if(!(this[o]instanceof Array)){this[o]=[this[o]]}this[o].push(s)}else{this[o]=s}}this.clear=function(){for(var t in this){if(!(this[t]instanceof Function)){delete this[t]}}};this.count=function(){var t=0,e;for(e in this){if(!(this[e]instanceof Function)){t++}}return t};this.isEmpty=function(){return this.count()===0};this.toString=function(){var t="",e=encode,r,o;for(r in this){if(this[r]instanceof Function){continue}if(this[r]instanceof Array){var s=this[r].length;if(s){for(o=0;o<s;o++){t+=t?"&":"";t+=e(r)+"="+e(this[r][o])}}else{t+=(t?"&":"")+e(r)+"="}}else{t+=t?"&":"";t+=e(r)+"="+e(this[r])}}return t}}(e)};