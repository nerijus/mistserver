mistplayers.html5={name:"HTML5 video player",mimes:["html5/application/vnd.apple.mpegurl","html5/video/mp4","html5/video/ogg","html5/video/webm","html5/audio/mp3","html5/audio/webm","html5/audio/ogg","html5/audio/wav"],priority:MistUtil.object.keys(mistplayers).length+1,isMimeSupported:function(t){return MistUtil.array.indexOf(this.mimes,t)==-1?false:true},isBrowserSupported:function(t,e,i){if(location.protocol!=MistUtil.http.url.split(e.url).protocol){if(location.protocol=="file:"&&MistUtil.http.url.split(e.url).protocol=="http:"){i.log("This page was loaded over file://, the player might not behave as intended.")}else{i.log("HTTP/HTTPS mismatch for this source");return false}}var r=false;var a=t.split("/");a.shift();try{a=a.join("/");function n(t){var e=document.createElement("video");if(e&&e.canPlayType(t)!=""){r=e.canPlayType(t)}return r}if(a=="video/mp4"){function o(t){function e(e){return("0"+t.init.charCodeAt(e).toString(16)).slice(-2)}switch(t.codec){case"AAC":return"mp4a.40.2";case"MP3":return"mp3";case"AC3":return"ec-3";case"H264":return"avc1."+e(1)+e(2)+e(3);case"HEVC":return"hev1."+e(1)+e(6)+e(7)+e(8)+e(9)+e(10)+e(11)+e(12);default:return t.codec.toLowerCase()}}var s={};for(var l in i.info.meta.tracks){if(i.info.meta.tracks[l].type!="meta"){s[o(i.info.meta.tracks[l])]=1}}s=MistUtil.object.keys(s);if(s.length){if(s.length>e.simul_tracks){var p=0;for(var l in s){var u=n(a+';codecs="'+s[l]+'"');if(u){p++}}return p>=e.simul_tracks}a+=';codecs="'+s.join(",")+'"'}}r=n(a)}catch(t){}return r},player:function(){this.onreadylist=[]},mistControls:true};var p=mistplayers.html5.player;p.prototype=new MistPlayer;p.prototype.build=function(t,e){var i=t.source.type.split("/");i.shift();var r=document.createElement("video");r.setAttribute("crossorigin","anonymous");var a=document.createElement("source");a.setAttribute("src",t.source.url);r.source=a;r.appendChild(a);a.type=i.join("/");var n=["autoplay","loop","poster"];for(var o in n){var s=n[o];if(t.options[s]){r.setAttribute(s,t.options[s]===true?"":t.options[s])}}if(t.options.muted){r.muted=true}if(t.options.controls=="stock"){r.setAttribute("controls","")}if(t.info.type=="live"){r.loop=false}if("Proxy"in window&&"Reflect"in window){var l={get:{},set:{}};t.player.api=new Proxy(r,{get:function(t,e,i){if(e in l.get){return l.get[e].apply(t,arguments)}var r=t[e];if(typeof r==="function"){return function(){return r.apply(t,arguments)}}return r},set:function(t,e,i){if(e in l.set){return l.set[e].call(t,i)}return t[e]=i}});if(t.source.type=="html5/audio/mp3"){l.set.currentTime=function(){t.log("Seek attempted, but MistServer does not currently support seeking in MP3.");return false}}if(t.info.type=="live"){l.get.duration=function(){var e=0;if(this.buffered.length){e=this.buffered.end(this.buffered.length-1)}var i=((new Date).getTime()-t.player.api.lastProgress.getTime())*.001;return e+i-t.player.api.liveOffset};l.set.currentTime=function(e){var i=e-t.player.api.duration;if(i>0){i=0}t.player.api.liveOffset=i;t.log("Seeking to "+MistUtil.format.time(e)+" ("+Math.round(i*-10)/10+"s from live)");var r={startunix:i};if(i==0){r={}}t.player.api.setSource(MistUtil.http.url.addParam(t.source.url,r))};MistUtil.event.addListener(r,"progress",function(){t.player.api.lastProgress=new Date});t.player.api.lastProgress=new Date;t.player.api.liveOffset=0;MistUtil.event.addListener(r,"pause",function(){t.player.api.pausedAt=new Date});l.get.play=function(){return function(){if(t.player.api.paused&&t.player.api.pausedAt&&new Date-t.player.api.pausedAt>5e3){r.load();t.log("Reloading source..")}return r.play.apply(r,arguments)}};if(t.source.type=="html5/video/mp4"){l.get.currentTime=function(){return this.currentTime-t.player.api.liveOffset+t.info.lastms*.001}}}else{if(!isFinite(r.duration)){var p=0;for(var o in t.info.meta.tracks){p=Math.max(p,t.info.meta.tracks[o].lastms)}l.get.duration=function(){if(isFinite(this.duration)){return this.duration}return p*.001}}}}else{t.player.api=r}t.player.api.setSource=function(t){if(t!=this.source.src){this.source.src=t;this.load()}};t.player.api.setSubtitle=function(t){var e=r.getElementsByTagName("track");for(var i=e.length-1;i>=0;i--){r.removeChild(e[i])}if(t){var a=document.createElement("track");r.appendChild(a);a.kind="subtitles";a.label=t.label;a.srclang=t.lang;a.src=t.src;a.setAttribute("default","")}};t.player.setSize=function(t){this.api.style.width=t.width+"px";this.api.style.height=t.height+"px"};e(r)};