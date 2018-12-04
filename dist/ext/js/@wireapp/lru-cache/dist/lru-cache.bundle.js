/*! @wireapp/lru-cache v3.0.11 */
var LRUCache=function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(r,o,function(t){return e[t]}.bind(null,o));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=0)}([function(e,t,n){"use strict";var r=this&&this.__generator||function(e,t){var n,r,o,i,u={label:0,sent:function(){if(1&o[0])throw o[1];return o[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(i){return function(a){return function(i){if(n)throw new TypeError("Generator is already executing.");for(;u;)try{if(n=1,r&&(o=2&i[0]?r.return:i[0]?r.throw||((o=r.return)&&o.call(r),0):r.next)&&!(o=o.call(r,i[1])).done)return o;switch(r=0,o&&(i=[2&i[0],o.value]),i[0]){case 0:case 1:o=i;break;case 4:return u.label++,{value:i[1],done:!1};case 5:u.label++,r=i[1],i=[0];continue;case 7:i=u.ops.pop(),u.trys.pop();continue;default:if(!(o=(o=u.trys).length>0&&o[o.length-1])&&(6===i[0]||2===i[0])){u=0;continue}if(3===i[0]&&(!o||i[1]>o[0]&&i[1]<o[3])){u.label=i[1];break}if(6===i[0]&&u.label<o[1]){u.label=o[1],o=i;break}if(o&&u.label<o[2]){u.label=o[2],u.ops.push(i);break}o[2]&&u.ops.pop(),u.trys.pop();continue}i=t.call(e,u)}catch(e){i=[6,e],r=0}finally{n=o=0}if(5&i[0])throw i[1];return{value:i[0]?i[1]:void 0,done:!0}}([i,a])}}};Object.defineProperty(t,"__esModule",{value:!0});var o=function(){function e(e){void 0===e&&(e=100),this.capacity=e,this.map={},this.head=null,this.end=null}return e.prototype.delete=function(e){var t=this.map[e];return!!t&&(this.remove(t),delete this.map[t.key],!0)},e.prototype.deleteAll=function(){this.map={},this.head=null,this.end=null},e.prototype.get=function(e){var t=this.map[e];if(t)return this.remove(t),this.setHead(t),t.value},e.prototype.getAll=function(){var e=this;return Object.keys(this.map).reduce(function(t,n){var r=e.map[n];return t[n]=r.value,t},{})},e.prototype.keys=function(){for(var e=[],t=this.head;t;)e.push(t.key),t=t.next;return e},e.prototype.latest=function(){return this.head?this.head.value:null},e.prototype.oldest=function(){return this.end?this.end.value:null},e.prototype.remove=function(e){return e.previous?e.previous.next=e.next:this.head=e.next,null!==e.next?e.next.previous=e.previous:this.end=e.previous,e},e.prototype.set=function(e,t){var n,r=this.map[e];if(r){var o=r.value;return r.value=t,this.remove(r),this.setHead(r),o}var i={key:e,next:null,previous:null,value:t};if(this.size()>=this.capacity&&this.end&&(delete this.map[this.end.key],n=this.remove(this.end)),this.capacity>0&&(this.setHead(i),this.map[e]=i),n)return n.value},e.prototype.setHead=function(e){e.next=this.head,e.previous=null,this.head&&(this.head.previous=e),this.head=e,this.end||(this.end=this.head)},e.prototype.size=function(){return Object.keys(this.map).length},e.prototype.toString=function(){for(var e="(newest) ",t=this.head;t;)e+=String(t.key)+":"+t.value,(t=t.next)&&(e+=" > ");return e+" (oldest)"},e.prototype[Symbol.iterator]=function(){var e;return r(this,function(t){switch(t.label){case 0:e=this.head,t.label=1;case 1:return e?[4,e.value]:[3,3];case 2:return t.sent(),e=e.next,[3,1];case 3:return[2]}})},e}();t.LRUCache=o}]);
//# sourceMappingURL=lru-cache.bundle.js.map