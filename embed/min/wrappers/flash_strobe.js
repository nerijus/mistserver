mistplayers.flash_strobe={name:"Strobe Flash media playback",mimes:["flash/10","flash/11","flash/7"],priority:MistUtil.object.keys(mistplayers).length+1,isMimeSupported:function(t){return this.mimes.indexOf(t)==-1?false:true},isBrowserSupported:function(t,e,i){if(MistUtil.http.url.split(e.url).protocol.slice(0,4)=="http"&&location.protocol!=MistUtil.http.url.split(e.url).protocol){i.log("HTTP/HTTPS mismatch for this source");return false}var r=0;try{var a=navigator.mimeTypes["application/x-shockwave-flash"].enabledPlugin;if(a.version){r=a.version.split(".")[0]}else{r=a.description.replace(/([^0-9\.])/g,"").split(".")[0]}}catch(t){}try{r=new ActiveXObject("ShockwaveFlash.ShockwaveFlash").GetVariable("$version").replace(/([^0-9\,])/g,"").split(",")[0]}catch(t){}if(!r){return false}var l=t.split("/");return Number(r)>=Number(l[l.length-1])},player:function(){this.onreadylist=[]}};var p=mistplayers.flash_strobe.player;p.prototype=new MistPlayer;p.prototype.build=function(t,e){var i=document.createElement("object");var r=document.createElement("embed");i.appendChild(r);function a(e){var a=t.options;function l(t,e){var i=document.createElement("param");i.setAttribute("name",t);i.setAttribute("value",e);return i}MistUtil.empty(i);i.appendChild(l("movie",t.urlappend(a.host+t.source.player_url)));var o="src="+encodeURIComponent(e)+"&controlBarMode="+(a.controls?"floating":"none")+"&initialBufferTime=0.5&expandedBufferTime=5&minContinuousPlaybackTime=3"+(a.live?"&streamType=live":"")+(a.autoplay?"&autoPlay=true":"")+(a.loop?"&loop=true":"")+(a.poster?"&poster="+a.poster:"")+(a.muted?"&muted=true":"");i.appendChild(l("flashvars",o));i.appendChild(l("allowFullScreen","true"));i.appendChild(l("wmode","direct"));if(a.autoplay){i.appendChild(l("autoPlay","true"))}if(a.loop){i.appendChild(l("loop","true"))}if(a.poster){i.appendChild(l("poster",a.poster))}if(a.muted){i.appendChild(l("muted","true"))}r.setAttribute("src",t.urlappend(t.source.player_url));r.setAttribute("type","application/x-shockwave-flash");r.setAttribute("allowfullscreen","true");r.setAttribute("flashvars",o)}a(t.source.url);this.api={};this.setSize=function(t){i.setAttribute("width",t.width);i.setAttribute("height",t.height);r.setAttribute("width",t.width);r.setAttribute("height",t.height)};this.setSize(t.calcSize());this.onready(function(){if(t.container){t.container.removeAttribute("data-loading")}});this.api.setSource=function(t){a(t)};t.log("Built html");e(i)};