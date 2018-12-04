/*! @wireapp/cbor v3.0.96 */
var CBOR=function(t){var e={};function r(n){if(e[n])return e[n].exports;var i=e[n]={i:n,l:!1,exports:{}};return t[n].call(i.exports,i,i.exports,r),i.l=!0,i.exports}return r.m=t,r.c=e,r.d=function(t,e,n){r.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n})},r.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},r.t=function(t,e){if(1&e&&(t=r(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var i in t)r.d(n,i,function(e){return t[e]}.bind(null,i));return n},r.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return r.d(e,"a",e),e},r.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},r.p="",r(r.s=3)}([function(t,e,r){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=function(){function t(){}return t.major=function(e){switch(e){case t.ARRAY:return 4;case t.BOOL:case t.BREAK:return 7;case t.BYTES:return 2;case t.FLOAT16:case t.FLOAT32:case t.FLOAT64:return 7;case t.UINT8:case t.UINT16:case t.UINT32:case t.UINT64:return 0;case t.INT8:case t.INT16:case t.INT32:case t.INT64:return 1;case t.NULL:return 7;case t.OBJECT:return 5;case t.TAGGED:return 6;case t.TEXT:return 3;case t.UNDEFINED:return 7;default:throw new TypeError("Invalid CBOR type")}},t.ARRAY=1,t.BOOL=2,t.BREAK=3,t.BYTES=4,t.FLOAT16=5,t.FLOAT32=6,t.FLOAT64=7,t.UINT8=8,t.UINT16=9,t.UINT32=10,t.UINT64=11,t.INT8=12,t.INT16=13,t.INT32=14,t.INT64=15,t.NULL=16,t.OBJECT=17,t.TAGGED=18,t.TEXT=19,t.UNDEFINED=20,t}();e.default=n},function(t,e,r){"use strict";var n=this&&this.__extends||function(){var t=function(e,r){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var r in e)e.hasOwnProperty(r)&&(t[r]=e[r])})(e,r)};return function(e,r){function n(){this.constructor=e}t(e,r),e.prototype=null===r?Object.create(r):(n.prototype=r.prototype,new n)}}();Object.defineProperty(e,"__esModule",{value:!0});var i=function(t){function e(r){var n=t.call(this,r)||this;return n.message=r,Object.setPrototypeOf(n,e.prototype),n.message=r,n.name=n.constructor.name,n}return n(e,t),e}(Error);e.default=i},function(t,e,r){"use strict";var n=this&&this.__extends||function(){var t=function(e,r){return(t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var r in e)e.hasOwnProperty(r)&&(t[r]=e[r])})(e,r)};return function(e,r){function n(){this.constructor=e}t(e,r),e.prototype=null===r?Object.create(r):(n.prototype=r.prototype,new n)}}();Object.defineProperty(e,"__esModule",{value:!0});var i=function(t){function e(r,n){var i=t.call(this,r)||this;return i.message=r,i.extra=n,Object.setPrototypeOf(i,e.prototype),i.extra=n,i}return n(e,t),e.INT_OVERFLOW="Integer overflow",e.INVALID_TYPE="Invalid type",e.TOO_LONG="Field too long",e.TOO_NESTED="Object nested too deep",e.UNEXPECTED_EOF="Unexpected end-of-buffer",e.UNEXPECTED_TYPE="Unexpected type",e}(r(1).default);e.default=i},function(t,e,r){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=r(1);e.BaseError=n.default;var i=r(2);e.DecodeError=i.default;var u=r(4);e.Decoder=u.default;var a=r(5);e.Encoder=a.default;var s=r(0);e.Type=s.default},function(t,e,r){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=r(2),i=r(0),u={max_array_length:1e3,max_bytes_length:5242880,max_nesting:16,max_object_size:1e3,max_text_length:5242880},a=function(){function t(t,e){void 0===e&&(e=u),this.buffer=t,this.config=e,this.view=new DataView(this.buffer)}return t._check_overflow=function(t,e){if(t>e)throw new n.default(n.default.INT_OVERFLOW);return t},t.prototype._advance=function(t){this.view=new DataView(this.buffer,this.view.byteOffset+t)},Object.defineProperty(t.prototype,"_available",{get:function(){return this.view.byteLength},enumerable:!0,configurable:!0}),t.prototype._read=function(t,e){if(this._available<t)throw new n.default(n.default.UNEXPECTED_EOF);var r=e();return this._advance(t),r},t.prototype._u8=function(){var t=this;return this._read(1,function(){return t.view.getUint8(0)})},t.prototype._u16=function(){var t=this;return this._read(2,function(){return t.view.getUint16(0)})},t.prototype._u32=function(){var t=this;return this._read(4,function(){return t.view.getUint32(0)})},t.prototype._u64=function(){var t=this;return this._read(8,function(){return t.view.getUint32(0)*Math.pow(2,32)+t.view.getUint32(4)})},t.prototype._f32=function(){var t=this;return this._read(4,function(){return t.view.getFloat32(0)})},t.prototype._f64=function(){var t=this;return this._read(8,function(){return t.view.getFloat64(0)})},t.prototype._read_length=function(e){if(0<=e&&e<=23)return e;switch(e){case 24:return this._u8();case 25:return this._u16();case 26:return this._u32();case 27:return t._check_overflow(this._u64(),Number.MAX_SAFE_INTEGER)}throw new n.default(n.default.UNEXPECTED_TYPE)},t.prototype._bytes=function(t,e){var r=this,i=this._read_length(t);if(i>e)throw new n.default(n.default.TOO_LONG);return this._read(i,function(){return r.buffer.slice(r.view.byteOffset,r.view.byteOffset+i)})},t.prototype._read_type_info=function(){var t=this._u8(),e=31&t;switch((224&t)>>5){case 0:if(0<=e&&e<=24)return[i.default.UINT8,e];switch(e){case 25:return[i.default.UINT16,e];case 26:return[i.default.UINT32,e];case 27:return[i.default.UINT64,e];default:throw new n.default(n.default.INVALID_TYPE)}case 1:if(0<=e&&e<=24)return[i.default.INT8,e];switch(e){case 25:return[i.default.INT16,e];case 26:return[i.default.INT32,e];case 27:return[i.default.INT64,e];default:throw new n.default(n.default.INVALID_TYPE)}case 2:return[i.default.BYTES,e];case 3:return[i.default.TEXT,e];case 4:return[i.default.ARRAY,e];case 5:return[i.default.OBJECT,e];case 7:switch(e){case 20:case 21:return[i.default.BOOL,e];case 22:return[i.default.NULL,e];case 23:return[i.default.UNDEFINED,e];case 25:return[i.default.FLOAT16,e];case 26:return[i.default.FLOAT32,e];case 27:return[i.default.FLOAT64,e];case 31:return[i.default.BREAK,e]}}throw new n.default(n.default.INVALID_TYPE)},t.prototype._type_info_with_assert=function(t){var e=this._read_type_info(),r=e[0],i=e[1];if(Array.isArray(t)||(t=[t]),!t.some(function(t){return r===t}))throw new n.default(n.default.UNEXPECTED_TYPE,[r,i]);return[r,i]},t.prototype._read_unsigned=function(t,e){switch(t){case i.default.UINT8:return e<=23?e:this._u8();case i.default.UINT16:return this._u16();case i.default.UINT32:return this._u32();case i.default.UINT64:return this._u64()}throw new n.default(n.default.UNEXPECTED_TYPE,[t,e])},t.prototype._read_signed=function(e,r,u){switch(r){case i.default.INT8:return u<=23?-1-u:-1-t._check_overflow(this._u8(),e);case i.default.INT16:return-1-t._check_overflow(this._u16(),e);case i.default.INT32:return-1-t._check_overflow(this._u32(),e);case i.default.INT64:return-1-t._check_overflow(this._u64(),e);case i.default.UINT8:case i.default.UINT16:case i.default.UINT32:case i.default.UINT64:return t._check_overflow(this._read_unsigned(r,u),e)}throw new n.default(n.default.UNEXPECTED_TYPE,[r,u])},t.prototype._skip_until_break=function(t){for(;;){var e=this._read_type_info(),r=e[0],u=e[1];if(r===i.default.BREAK)return;if(r!==t||31===u)throw new n.default(n.default.UNEXPECTED_TYPE);var a=this._read_length(u);this._advance(a)}},t.prototype._skip_value=function(t){if(0===t)throw new n.default(n.default.TOO_NESTED);var e,r=this._read_type_info(),u=r[0],a=r[1];switch(u){case i.default.UINT8:case i.default.UINT16:case i.default.UINT32:case i.default.UINT64:case i.default.INT8:case i.default.INT16:case i.default.INT32:case i.default.INT64:return this._read_length(a),!0;case i.default.BOOL:case i.default.NULL:case i.default.UNDEFINED:return!0;case i.default.BREAK:return!1;case i.default.FLOAT16:return this._advance(2),!0;case i.default.FLOAT32:return this._advance(4),!0;case i.default.FLOAT64:return this._advance(8),!0;case i.default.BYTES:case i.default.TEXT:return 31===a?(this._skip_until_break(u),!0):(e=this._read_length(a),this._advance(e),!0);case i.default.ARRAY:case i.default.OBJECT:if(31===a){for(;this._skip_value(t-1););return!0}for(e=this._read_length(a);e--;)this._skip_value(t-1);return!0;default:return!1}},t.prototype.u8=function(){var t=this._type_info_with_assert([i.default.UINT8]),e=t[0],r=t[1];return this._read_unsigned(e,r)},t.prototype.u16=function(){var t=this._type_info_with_assert([i.default.UINT8,i.default.UINT16]),e=t[0],r=t[1];return this._read_unsigned(e,r)},t.prototype.u32=function(){var t=this._type_info_with_assert([i.default.UINT8,i.default.UINT16,i.default.UINT32]),e=t[0],r=t[1];return this._read_unsigned(e,r)},t.prototype.u64=function(){var t=this._type_info_with_assert([i.default.UINT8,i.default.UINT16,i.default.UINT32,i.default.UINT64]),e=t[0],r=t[1];return this._read_unsigned(e,r)},t.prototype.i8=function(){var t=this._type_info_with_assert([i.default.INT8,i.default.UINT8]),e=t[0],r=t[1];return this._read_signed(127,e,r)},t.prototype.i16=function(){var t=this._type_info_with_assert([i.default.INT8,i.default.INT16,i.default.UINT8,i.default.UINT16]),e=t[0],r=t[1];return this._read_signed(32767,e,r)},t.prototype.i32=function(){var t=this._type_info_with_assert([i.default.INT8,i.default.INT16,i.default.INT32,i.default.UINT8,i.default.UINT16,i.default.UINT32]),e=t[0],r=t[1];return this._read_signed(2147483647,e,r)},t.prototype.i64=function(){var t=this._type_info_with_assert([i.default.INT8,i.default.INT16,i.default.INT32,i.default.INT64,i.default.UINT8,i.default.UINT16,i.default.UINT32,i.default.UINT64]),e=t[0],r=t[1];return this._read_signed(Number.MAX_SAFE_INTEGER,e,r)},t.prototype.unsigned=function(){return this.u64()},t.prototype.int=function(){return this.i64()},t.prototype.f16=function(){this._type_info_with_assert(i.default.FLOAT16);var t,e=this._u16(),r=e>>10&31,n=1023&e,u=function(t,e){return t*Math.pow(2,e)};switch(r){case 0:t=u(n,-24);break;case 31:t=0===n?Number.POSITIVE_INFINITY:Number.NaN;break;default:t=u(n+1024,r-25)}return 32768&e?-t:t},t.prototype.f32=function(){return this._type_info_with_assert(i.default.FLOAT32),this._f32()},t.prototype.f64=function(){return this._type_info_with_assert(i.default.FLOAT64),this._f64()},t.prototype.bool=function(){switch(this._type_info_with_assert(i.default.BOOL)[1]){case 20:return!1;case 21:return!0;default:throw new n.default(n.default.UNEXPECTED_TYPE)}},t.prototype.bytes=function(){var t=this._type_info_with_assert(i.default.BYTES)[1];if(31===t)throw new n.default(n.default.UNEXPECTED_TYPE);return this._bytes(t,this.config.max_bytes_length)},t.prototype.text=function(){var t=this._type_info_with_assert(i.default.TEXT)[1];if(31===t)throw new n.default(n.default.UNEXPECTED_TYPE);var e=new Uint8Array(this._bytes(t,this.config.max_text_length)).reduce(function(t,e){return t+String.fromCharCode(e)},"");return decodeURIComponent(escape(e))},t.prototype.optional=function(t){try{return t()}catch(t){if(t instanceof n.default&&t.extra){var e=t.extra[0];if(e===i.default.NULL)return null;if(e===i.default.UNDEFINED)return}throw t}},t.prototype.array=function(){var t=this._type_info_with_assert(i.default.ARRAY)[1];if(31===t)throw new n.default(n.default.UNEXPECTED_TYPE);var e=this._read_length(t);if(e>this.config.max_array_length)throw new n.default(n.default.TOO_LONG);return e},t.prototype.object=function(){var t=this._type_info_with_assert(i.default.OBJECT)[1];if(31===t)throw new n.default(n.default.UNEXPECTED_TYPE);var e=this._read_length(t);if(e>this.config.max_object_size)throw new n.default(n.default.TOO_LONG);return e},t.prototype.skip=function(){return this._skip_value(this.config.max_nesting)},t}();e.default=a},function(t,e,r){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=r(0),i=function(){function t(){this.buffer=new ArrayBuffer(4),this.view=new DataView(this.buffer)}return t.prototype.get_buffer=function(){return this.buffer.slice(0,this.view.byteOffset)},t.prototype._new_buffer_length=function(t){return~~Math.max(1.5*this.buffer.byteLength,this.buffer.byteLength+t)},t.prototype._grow_buffer=function(t){var e=this._new_buffer_length(t),r=new ArrayBuffer(e);new Uint8Array(r).set(new Uint8Array(this.buffer)),this.buffer=r,this.view=new DataView(this.buffer,this.view.byteOffset)},t.prototype._ensure=function(t){if(this.view.byteLength<t)return this._grow_buffer(t)},t.prototype._advance=function(t){this.view=new DataView(this.buffer,this.view.byteOffset+t)},t.prototype._write=function(t,e){return this._ensure(t),e(),this._advance(t)},t.prototype._write_type_and_len=function(t,e){var r=n.default.major(t)<<5;if(0<=e&&e<=23)return this._u8(r|e);if(24<=e&&e<=255)return this._u8(24|r),this._u8(e);if(256<=e&&e<=65535)return this._u8(25|r),this._u16(e);if(65536<=e&&e<=4294967295)return this._u8(26|r),this._u32(e);if(e<=Number.MAX_SAFE_INTEGER)return this._u8(27|r),this._u64(e);throw new RangeError("Invalid size for CBOR object")},t.prototype._u8=function(t){var e=this;return this._write(1,function(){return e.view.setUint8(0,t)})},t.prototype._u16=function(t){var e=this;return this._write(2,function(){return e.view.setUint16(0,t)})},t.prototype._u32=function(t){var e=this;return this._write(4,function(){return e.view.setUint32(0,t)})},t.prototype._u64=function(t){var e=this,r=t%Math.pow(2,32),n=(t-r)/Math.pow(2,32);return this._write(8,function(){return e.view.setUint32(0,n),e.view.setUint32(4,r)})},t.prototype._f32=function(t){var e=this;return this._write(4,function(){return e.view.setFloat32(0,t)})},t.prototype._f64=function(t){var e=this;return this._write(8,function(){return e.view.setFloat64(0,t)})},t.prototype._bytes=function(t){var e=t.byteLength;return this._ensure(e),new Uint8Array(this.buffer,this.view.byteOffset).set(t),this._advance(e)},t.prototype.u8=function(t){if(0<=t&&t<=23)this._u8(t);else{if(!(24<=t&&t<=255))throw new RangeError("Invalid u8");this._u8(24),this._u8(t)}return this},t.prototype.u16=function(t){if(0<=t&&t<=23)this._u8(t);else if(24<=t&&t<=255)this._u8(24),this._u8(t);else{if(!(256<=t&&t<=65535))throw new RangeError("Invalid u16");this._u8(25),this._u16(t)}return this},t.prototype.u32=function(t){if(0<=t&&t<=23)this._u8(t);else if(24<=t&&t<=255)this._u8(24),this._u8(t);else if(256<=t&&t<=65535)this._u8(25),this._u16(t);else{if(!(65536<=t&&t<=4294967295))throw new RangeError("Invalid u32");this._u8(26),this._u32(t)}return this},t.prototype.u64=function(t){if(0<=t&&t<=23)this._u8(t);else if(24<=t&&t<=255)this._u8(24),this._u8(t);else if(256<=t&&t<=65535)this._u8(25),this._u16(t);else if(65536<=t&&t<=4294967295)this._u8(26),this._u32(t);else{if(!(t<=Number.MAX_SAFE_INTEGER))throw new RangeError("Invalid unsigned integer");this._u8(27),this._u64(t)}return this},t.prototype.i8=function(t){if(t>=0)return this._u8(t),this;if(0<=(t=-1-t)&&t<=23)this._u8(32|t);else{if(!(24<=t&&t<=255))throw new RangeError("Invalid i8");this._u8(56),this._u8(t)}return this},t.prototype.i16=function(t){if(t>=0)return this._u16(t),this;if(0<=(t=-1-t)&&t<=23)this._u8(32|t);else if(24<=t&&t<=255)this._u8(56),this._u8(t);else{if(!(256<=t&&t<=65535))throw new RangeError("Invalid i16");this._u8(57),this._u16(t)}return this},t.prototype.i32=function(t){if(t>=0)return this._u32(t),this;if(0<=(t=-1-t)&&t<=23)this._u8(32|t);else if(24<=t&&t<=255)this._u8(56),this._u8(t);else if(256<=t&&t<=65535)this._u8(57),this._u16(t);else{if(!(65536<=t&&t<=4294967295))throw new RangeError("Invalid i32");this._u8(58),this._u32(t)}return this},t.prototype.i64=function(t){if(t>=0)return this._u64(t),this;if(0<=(t=-1-t)&&t<=23)this._u8(32|t);else if(24<=t&&t<=255)this._u8(56),this._u8(t);else if(256<=t&&t<=65535)this._u8(57),this._u16(t);else if(65536<=t&&t<=4294967295)this._u8(58),this._u32(t);else{if(!(t<=Number.MAX_SAFE_INTEGER))throw new RangeError("Invalid i64");this._u8(59),this._u64(t)}return this},t.prototype.f32=function(t){return this._u8(250),this._f32(t),this},t.prototype.f64=function(t){return this._u8(251),this._f64(t),this},t.prototype.bool=function(t){return this._u8(224|(t?21:20)),this},t.prototype.bytes=function(t){return this._write_type_and_len(n.default.BYTES,t.byteLength),this._bytes(t),this},t.prototype.text=function(t){var e=unescape(encodeURIComponent(t));return this._write_type_and_len(n.default.TEXT,e.length),this._bytes(new Uint8Array(e.split("").map(function(t){return t.charCodeAt(0)}))),this},t.prototype.null=function(){return this._u8(246),this},t.prototype.undefined=function(){return this._u8(247),this},t.prototype.array=function(t){return this._write_type_and_len(n.default.ARRAY,t),this},t.prototype.array_begin=function(){return this._u8(159),this},t.prototype.array_end=function(){return this._u8(255),this},t.prototype.object=function(t){return this._write_type_and_len(n.default.OBJECT,t),this},t.prototype.object_begin=function(){return this._u8(191),this},t.prototype.object_end=function(){return this._u8(255),this},t}();e.default=i}]);
//# sourceMappingURL=cbor.bundle.js.map