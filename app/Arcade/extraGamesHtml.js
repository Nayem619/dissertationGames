/* Extra inline Phaser bundles (CDN). NexusPost for scores where applicable. */

/** Tap to rise; dodge red bars. Score = seconds survived × 10 */
export const PHASER_FLAPPY_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
<style>html,body,#g{margin:0;height:100%;background:#0a2540}</style></head><body><div id="g"></div>
<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"><\/script>
<script>(function(){var W=400,H=640;
function Sc(){Phaser.Scene.call(this,{key:"d"});}Sc.prototype=Object.create(Phaser.Scene.prototype);
Sc.prototype.create=function(){var me=this,y=H*.5,vy=0,t=0,dead=0,b=this.add.circle(W*.25,y,12,16777215),obs=[],st=this.add.text(W*.5,38,"0",{fontSize:22,color:"#dff"}).setOrigin(.5);
this.input.on("pointerdown",function(){if(dead){me.scene.restart();return;}vy=-9});
this.time.addEvent({delay:900,loop:true,callback:function(){if(dead)return;var o=me.add.rectangle(W+30,120+Math.random()*(H-260),18,90,16724736);me.tweens.add({targets:o,x:-40,duration:2600,onComplete:function(){try{o.destroy()}catch(e){}}});obs.push(o)}}});
this.events.on("update",function(){if(dead)return;t+=this.game.loop.delta*.001;vy+=.32;b.y+=vy;if(b.y>H-20||b.y<40){dead=1;var sc=Math.floor(t*10);st.setText("FIN "+sc);try{window.NexusPost&&window.NexusPost({type:"ARCADE_SCORE",game:"flappy",score:sc});}catch(_){}return;}
obs.forEach(function(o){if(!o||!o.active)return;var dx=Math.abs(o.x-b.x)<22,dy=Math.abs(o.y-b.y)<54;if(dx&&dy){dead=1;var sc2=Math.floor(t*10);st.setText("FIN "+sc2);try{window.NexusPost&&window.NexusPost({type:"ARCADE_SCORE",game:"flappy",score:sc2});}catch(__){}}});st.setText(String(Math.floor(t*10)))});};
window.onload=function(){new Phaser.Game({type:Phaser.AUTO,width:W,height:H,parent:"g",scene:Sc,backgroundColor:672384,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});};})();
<\/script></body></html>`;

export const PHASER_SIMON_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
<style>html,body{margin:0;height:100%;background:#1a0528}</style></head><body><div id="g"></div>
<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"><\/script>
<script>(function(){var W=400,H=640,HUE=[11763455,3407871,16766720,16711833];
function St(){Phaser.Scene.call(this,{key:"sim"});}St.prototype=Object.create(Phaser.Scene.prototype);
St.prototype.create=function(){var me=this,seq=[],step=0,play=0,score=0,hud=me.add.text(W*.5,50,"",{fontSize:18,color:"#ddd"}).setOrigin(.5),b=[],i;
function flash(k,cb){b[k].setAlpha(.35);me.time.delayedCall(280,function(){b[k].setAlpha(1);cb&&cb()})}
function runSeq(){play=1;var j=0;(function nxt(){if(j>=seq.length){play=0;return;}flash(seq[j++],function(){me.time.delayedCall(120,nxt)})})();}
function addOne(){seq.push(Phaser.Math.Between(0,3));hud.setText("Level "+seq.length);step=0;me.time.delayedCall(400,runSeq);}
for(i=0;i<4;i++){(function(ix){var bx=80+(ix%2)*240,by=200+Math.floor(ix/2)*200,r=me.add.rectangle(bx,by,130,130,HUE[ix]).setStrokeStyle(4,16777215).setInteractive({useHandCursor:1});
r.on("pointerdown",function(){if(play)return;if(!seq.length)return;if(seq[step]!==ix){hud.setText("OVER "+score+" · TAP");try{window.NexusPost&&window.NexusPost({type:"ARCADE_SCORE",game:"simon",score:score});}catch(_){}seq=[];score=0;return;}
step++;if(step>=seq.length){score++;hud.setText("Score "+score);addOne()}});b[ix]=r})(i)}
hud.setText("Tap after flash");addOne();};
window.onload=function(){new Phaser.Game({type:Phaser.AUTO,width:W,height:H,parent:"g",scene:St,backgroundColor:1704224,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});};})();
<\/script></body></html>`;

export const PHASER_CONNECT4_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
<style>html,body{margin:0;height:100%;background:#03180e}</style></head><body><div id="g"></div>
<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"><\/script>
<script>(function(){var C=7,R=6,SZ=48,W=C*SZ,H=R*SZ+72,grid=[],cur=1,over=0;
function line4(){var x,y,dx,dy,k,s,nx,ny,c;for(y=0;y<R;y++)for(x=0;x<C;x++){s=grid[y][x];if(!s)continue;for(dx=-1;dx<=1;dx++)for(dy=-1;dy<=1;dy++){if(!dx&&!dy)continue;c=1;for(k=1;k<4;k++){nx=x+dx*k;ny=y+dy*k;if(ny<0||ny>=R||nx<0||nx>=C||grid[ny][nx]!==s)break;c++}if(c>=4)return s}}var f=0;for(y=0;y<R;y++)for(x=0;x<C;x++)if(!grid[y][x])f=1;return f?0:-1;}
function Mn(){Phaser.Scene.call(this,{key:"c4"});}Mn.prototype=Object.create(Phaser.Scene.prototype);
Mn.prototype.create=function(){var sc=this,g=sc.add.graphics(),lab=sc.add.text(W*.5,12,"P1 YELLOW · P2 RED · tap column",{fontSize:13,color:"#cfe"}).setOrigin(.5),yy,xx;for(yy=0;yy<R;yy++){grid[yy]=[];for(xx=0;xx<C;xx++)grid[yy][xx]=0;}
function draw(){g.clear();g.fillStyle(2368548,1);g.fillRect(0,40,W,H-40);for(yy=0;yy<R;yy++)for(xx=0;xx<C;xx++){var cx=xx*SZ+SZ*.5,cy=yy*SZ+SZ*.5+40;g.lineStyle(2,11184810);g.strokeCircle(cx,cy,SZ*.4);var v=grid[yy][xx];if(v===1){g.fillStyle(16776960,1);g.fillCircle(cx,cy,SZ*.35)}else if(v===2){g.fillStyle(16711680,.95);g.fillCircle(cx,cy,SZ*.35)}}}
draw();sc.input.on("pointerdown",function(p){if(over)return;var col=Math.floor(p.worldX/SZ);if(col<0||col>=C)return;var row=R-1;while(row>=0&&grid[row][col])row--;if(row<0)return;grid[row][col]=cur;var w=line4();draw();if(w===1||w===2){over=1;lab.setText(w===1?"YELLOW WINS":"RED WINS");try{window.NexusPost&&window.NexusPost({type:"ARCADE_SCORE",game:"connect4",score:100});}catch(_){};return;}if(w===-1){over=1;lab.setText("DRAW");try{window.NexusPost&&window.NexusPost({type:"ARCADE_SCORE",game:"connect4",score:40});}catch(_){};return;}cur=(cur===1)?2:1});};
window.onload=function(){new Phaser.Game({type:Phaser.AUTO,width:W,height:H,parent:"g",scene:Mn,backgroundColor:200960,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});};})();
<\/script></body></html>`;

/** Circular track, two counters, capture, need 6 to enter — hot-seat (not synced online). Inspired by classic Ludo. */
export const PHASER_LUDO_LITE_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
<style>html,body{margin:0;height:100%;background:#1f0f18}</style></head><body><div id="g"></div>
<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"><\/script>
<script>(function(){var W=400,H=668,N=40,E0=0,E1=20,G=48;
function XY(i){var t=i/N*Math.PI*2-Math.PI*.5,R=118;return{x:W*.5+R*Math.cos(t),y:H*.4+R*Math.sin(t)};}
function Ud(){Phaser.Scene.call(this,{key:"ludo"});}
Ud.prototype=Object.create(Phaser.Scene.prototype);
Ud.prototype.constructor=Ud;
Ud.prototype.create=function(){var a=-1,b=-1,ta=0,tb=0,tu=0,fi=0,me=this,Gk=me.add.graphics(),
h=me.add.text(W*.5,24,"LUDO LITE (Phaser) · Orange vs Cyan",{fontSize:13,color:"#ffd3ff"}).setOrigin(.5),
sx=me.add.text(W*.5,42,"",{fontSize:11,color:"#aa90aa"}).setOrigin(.5),
ga=me.add.circle(-20,-20,12,16753920),gb=me.add.circle(-20,-20,12,34695);
function ln(){Gk.clear();var k,p,q;for(k=0;k<N;k++){p=XY(k);q=XY((k+1)%N);Gk.lineStyle(2,11184810,.8);Gk.beginPath();Gk.moveTo(p.x,p.y);Gk.lineTo(q.x,q.y);Gk.strokePath();}}
function tk(){ln();var A=a<0?{x:92,y:H*.35}:XY(a),B=b<0?{x:W-92,y:H*.35}:XY(b);ga.setPosition(A.x,A.y);gb.setPosition(B.x,B.y);}
function dn(w){fi=1;h.setText("P"+w+" wins!");sx.setText("Tap bar to replay");tk();}
tk();me.add.rectangle(W*.5,H-72,172,46,11634687).setInteractive({useHandCursor:1}).on("pointerdown",function(){if(fi){fi=0;a=-1;b=-1;ta=0;tb=0;tu=0;h.setText("LUDO LITE");sx.setText("tap purple ROLL");tk();return;}
var d=1+Math.floor(6*Math.random());sx.setText((tu?"P2":"P1")+" rolled "+d);
if(!tu){if(a<0){if(d===6)a=E0;}else{a=(a+d)%N;if(a===b)b=-1;ta+=d;if(ta>=G)return dn(1);}}else{if(b<0){if(d===6)b=E1;}else{b=(b+d)%N;if(b===a)a=-1;tb+=d;if(tb>=G)return dn(2);}}
tu=!tu;h.setText((tu?"P2 cyan":"P1 orange")+" · purple ROLL");tk();});};
window.onload=function(){new Phaser.Game({type:Phaser.AUTO,width:W,height:H,parent:"g",scene:Ud,backgroundColor:2039594,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});};})();
<\/script></body></html>`;
