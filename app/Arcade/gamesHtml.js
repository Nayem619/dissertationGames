
/** Inline Phaser 3 games (+ chess.js for chess). CDN scripts load at runtime. */

export const PHASER_CHESS_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>*{box-sizing:border-box}html,body{height:100%;margin:0;background:#0a0f14}
body{display:flex;flex-direction:column;font-family:system-ui,sans-serif}
#bar{flex:0 0 auto;padding:12px;font-size:13px;color:#bfffe0;text-align:center;background:#121826;border-bottom:1px solid rgba(0,255,136,0.2)}
#g{flex:1;min-height:0}</style></head><body>
<div id="bar"><span id="msg">White moves first · tap your piece · tap a green circle</span></div>
<div id="g"></div>
<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js"><\/script>
<script>(function(){var SZ=44,W=SZ*8,H=SZ*8,F="abcdefgh";
function chars(c,t){var W={k:"\\u2654",q:"\\u2655",r:"\\u2656",b:"\\u2657",n:"\\u2658",p:"\\u2659"};
var B={k:"\\u265A",q:"\\u265B",r:"\\u265C",b:"\\u265D",n:"\\u265E",p:"\\u265F"};return(c==="w"?W:B)[t]||"?"};
function TL(sq){var col=sq.charCodeAt(0)-97;var rk=+sq.charAt(1);return{x:col*SZ,y:(8-rk)*SZ}};
function XY(x,y){var c=(x/SZ)|0,r=(y/SZ)|0;if(c<0||c>7||r<0||r>7)return null;return F.charAt(c)+(8-r)};
function Main(){Phaser.Scene.call(this,{key:"chs"});}
Main.prototype=Object.create(Phaser.Scene.prototype);
Main.prototype.create=function(){
var game=new Chess(),me=this;this.sel=null;this.g0=this.add.graphics();this.gl=this.add.graphics();this.hs=[];var hud=document.getElementById("msg");
function line(){if(game.game_over()){hud.textContent=game.in_checkmate()?"Checkmate · tap to reset":game.in_draw()?"Draw":"Over · tap";return;}
hud.textContent=(game.turn()==="w"?"White":"Black")+(game.in_check()?" · CHECK":" · go")};line();
me.go=function(){me.g0.clear();me.gl.clear();me.hs.forEach(function(z){try{z.destroy()}catch(e){}});me.hs=[];
var r,c,u;for(r=0;r<8;r++)for(c=0;c<8;c++){u=(r+c)%2===0;me.g0.fillStyle(u?0xf0d9b5:0xb58863,1);me.g0.fillRect(c*SZ,r*SZ,SZ,SZ);}
if(me.sel){var p=TL(me.sel);me.gl.fillStyle(0x00ff883a,1);me.gl.fillRect(p.x,p.y,SZ,SZ);
game.moves({square:me.sel,verbose:1}).forEach(function(x){var o=TL(x.to);me.gl.fillStyle(0x00cc66,.9);me.gl.fillCircle(o.x+SZ*.5,o.y+SZ*.5,8)})}
var bd=game.board();for(r=0;r<8;r++)for(c=0;c<8;c++){var pc=bd[r][c];if(!pc)continue;var lb=me.add.text(c*SZ+SZ*.5,r*SZ+SZ*.5,chars(pc.color,pc.type),
{fontFamily:"Georgia,serif",fontSize:String(Math.floor(SZ*.76))+"px"});lb.setOrigin(.47,.52).setDepth(5);me.hs.push(lb)}line()};
function boot(){game.reset();me.sel=null;me.go()};
me.go();
me.input.on("pointerdown",function(pt){var x=pt.worldX,y=pt.worldY;if(x<0||x>=W||y<0||y>=H)return;
if(game.game_over()){boot();return;}
var alg=XY(x,y);if(!alg)return;var T=game.turn();var hp=game.get(alg);
if(me.sel){var m=game.move({from:me.sel,to:alg,promotion:"q"});
if(!m)m=game.move({from:me.sel,to:alg});me.sel=null;
if(m){line();me.go();return;}
if(hp&&hp.color===T)me.sel=alg}else{if(hp&&hp.color===T)me.sel=alg}me.go()});};
window.onload=function(){new Phaser.Game({type:Phaser.AUTO,width:W,height:H,parent:"g",scene:Main,backgroundColor:0x0a0f14,
scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}})};
})();<\/script></body></html>`;

export const PHASER_BREAKOUT_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
<style>html,body{margin:0;height:100%;background:#061822}</style></head><body><div id="g"></div>
<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"><\/script>
<script>(function(){var GW=392,GH=620;
function S(){Phaser.Scene.call(this,{key:"br"});} S.prototype=Object.create(Phaser.Scene.prototype);
S.prototype.create=function(){this.physics.world.setBoundsCollision(true,true,true,false);
var tops=88,brickH=22,gapY=10,cols=8,bw=(GW-gapY*(cols+1))/cols,rows=6,bl=this.physics.add.staticGroup(),i,j,x,y,r;
for(j=0;j<rows;j++)for(i=0;i<cols;i++){x=gapY+i*(bw+gapY);y=tops+j*(brickH+8);
r=this.add.rectangle(x+bw*.5,y+brickH*.5,bw-2,brickH-4,Phaser.Display.Color.HSVToRGB((i+j)/12,.65,.95).color);
this.physics.add.existing(r,true);bl.add(r);}
var paddle=this.add.rectangle(GW*.5,GH-86,118,14,8963071);this.physics.add.existing(paddle,true);paddle.body.immovable=true;
var ball=this.add.circle(GW*.5,GH-200,11,15921868);this.physics.add.existing(ball);
ball.body.setVelocity(246,-296);ball.body.setBounce(1);ball.body.setCollideWorldBounds(true);var hud=this.add.text(16,28,"Bricks + Score 0",{fontSize:18,color:"#c4ffe8"});var sc=0,me=this;var live=3,under=0;
function updHud(){var n=typeof bl.countActive==="function"?bl.countActive(true):999;hud.setText("❤"+live+"  Br "+n+"  "+sc)};
updHud();
this.physics.add.collider(ball,paddle,function(){var k=(ball.x-paddle.x)/(paddle.width*.5)*150;ball.body.setVelocityX(Phaser.Math.Clamp(ball.body.velocity.x+k,-460,460));});
this.physics.add.collider(ball,bl,function(b,brk){brk.destroy(false);sc+=24;updHud();
if(bl.countActive(true)<1){try{window.NexusPost&&window.NexusPost({type:"ARCADE_SCORE",game:"breakout",score:sc});}catch(z){}
hud.setText("CLEAR "+sc+" TAP");ball.body.setVelocity(0,0);me.physics.pause();
me.input.once("pointerdown",function(){me.scene.restart();});}});
this.events.on("update",function(){if(me.physics.world.isPaused)return;
paddle.x=me.input.activePointer.worldX;if(paddle.x<70)paddle.x=70;if(paddle.x>GW-70)paddle.x=GW-70;paddle.body.updateFromGameObject();
if(ball.y<GH*0.7)under=0;
if(ball.y>GH+22&&under===0&&!me.physics.world.isPaused){under=1;live--;if(live<=0){try{window.NexusPost&&window.NexusPost({type:"ARCADE_SCORE",game:"breakout",score:sc});}catch(z){}
hud.setText("OUT TAP");me.physics.pause();me.input.once("pointerdown",function(){me.scene.restart()});return;}
ball.setPosition(GW*.5,GH-200);ball.body.setVelocity(246,-296);updHud()}});
};
window.onload=function(){new Phaser.Game({type:Phaser.AUTO,width:GW,height:GH,parent:"g",backgroundColor:3945512,physics:{default:"arcade"},
scene:S,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});};})();<\/script></body></html>`;

export const PHASER_MEMORY_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
<style>html,body{margin:0;height:100%;background:#140b24}</style></head><body><div id="g"></div>
<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"><\/script>
<script>(function(){var GW=392,GH=688,CARD=68,GAPX=12,GAPY=11,ROWS=4,COLS=4,OFX=(GW-COLS*CARD-(COLS-1)*GAPX)*.5,OFY=110+.5*((GH-110)-(ROWS*CARD+(ROWS-1)*GAPY));
var DEAL=["A","K","Q","J","10","9","8","7"];function Mem(){Phaser.Scene.call(this,{key:"mem"});}Mem.prototype=Object.create(Phaser.Scene.prototype);
Mem.prototype.create=function(){var deck=[],i,s;for(i=0;i<DEAL.length;i++){s=DEAL[i];deck.push(s,s)}Phaser.Utils.Array.Shuffle(deck);
var picks=[],lock=0,done=0,me=this,ix=0,hud=this.add.text(GW*.5,62,"MATCH PAIRS",{fontSize:21,color:"#e8dcff"}).setOrigin(.5,.5);
function shut(P,Q){me.time.delayedCall(620,function(){P.lab.setVisible(0);Q.lab.setVisible(0);P.r.setFillStyle(5592405);Q.r.setFillStyle(5592405);P.r.flag=Q.r.flag=0;picks=[];lock=0})}
function flip(rect,txt,sv){if(lock||rect.flag)return;rect.flag=1;txt.setText(sv);txt.setVisible(1);rect.setFillStyle(3368601);picks.push({r:rect,lab:txt,v:sv});if(picks.length<2)return;lock=1;var P=picks[0],Q=picks[1];if(P.v===Q.v){done++;hud.setText(done+" / "+DEAL.length);P.r.flag=Q.r.flag=0;lock=0;picks=[];if(done===DEAL.length){hud.setText("SOLVED TAP REPLAY");try{window.NexusPost&&window.NexusPost({type:"ARCADE_SCORE",game:"memory",score:done*200});}catch(z){}}}else shut(P,Q)}}
for(i=0;i<ROWS;i++)for(var j=0;j<COLS;j++){var cc=deck[ix++],gx=OFX+j*(CARD+GAPX),gy=OFY+i*(CARD+GAPY),rg=this.add.rectangle(gx+CARD*.5,gy+CARD*.5,CARD,CARD,5592405).setStrokeStyle(4,9945471).setInteractive({useHandCursor:1});
var lb=this.add.text(gx+CARD*.5,gy+CARD*.5,"",{fontSize:29,color:"#fff"}).setOrigin(.5,.5).setVisible(0);rg.flag=0;(function(rr,tl,vv){rr.on("pointerdown",function(){flip(rr,tl,vv)})})(rg,lb,cc)}
this.input.on("pointerdown",function(p){if(done===DEAL.length&&p.y>GH-64)me.scene.restart()});}};
window.onload=function(){new Phaser.Game({type:Phaser.AUTO,width:GW,height:GH,scene:Mem,backgroundColor:1310744,parent:"g",
scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});};})();
<\/script></body></html>`;
export const PHASER_PONG_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
<style>html,body{margin:0;height:100%;background:#050810}</style></head><body><div id="g"></div>
<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"><\/script>
<script>(function(){var W=400,H=640,PW=12,PH=100;
function Pg(){Phaser.Scene.call(this,{key:"pg"});}Pg.prototype=Object.create(Phaser.Scene.prototype);
Pg.prototype.create=function(){var bx=W*.5,by=H*.5,vx=300,vy=240,p1=null,p2=null,scP=0,scC=0,cool=0;var me=this;
p1=this.add.rectangle(W*.5,H-80,PW,PH,43520).setStrokeStyle(3,2236962);p2=this.add.rectangle(W*.5,86,PW,PH,16750848).setStrokeStyle(3,2236962);
var ball=this.add.circle(bx,by,11,15466527);var txt=this.add.text(W*.5,36,"YOU 0 · 0 BOT",{fontSize:19,color:"#bfffd8"}).setOrigin(.5,.5);
function rst(){cool=42;bx=W*.5;by=H*.5;vx=Phaser.Math.Between(-1,1)||1;vx=Math.sign(vx)*Phaser.Math.Between(220,340);
vy=(Math.random()>.5?-1:1)*Phaser.Math.Between(220,340);ball.setPosition(bx,by);txt.setText("YOU "+scP+" · "+scC+" BOT");}
rst();
this.events.on("update",function(){if(--cool>0)return;var dt=this.game.loop.delta*.001;var ip=me.input.activePointer.worldX;
p1.x=Phaser.Math.Clamp(ip,W*.08,W*.92);var aim=Phaser.Math.Clamp(bx,W*.06,W*.94);p2.x=Phaser.Math.Linear(p2.x,aim,.068);
bx+=vx*dt;by+=vy*dt;if(bx<W*.04||bx>W*.96){vx*=-1;bx=Phaser.Math.Clamp(bx,W*.04,W*.96)}
var hitLo=by>H-114;if(hitLo&&Math.abs(bx-p1.x)<PH*.45){vy=-Math.abs(vy)+30;vx+=(bx-p1.x)*4.8}
else if(hitLo&&by>H+34){scC++;rst()}
var hitHi=by<126;if(hitHi&&Math.abs(bx-p2.x)<PH*.46){vy=Math.abs(vy)+34;vx+=(bx-p2.x)*5.1}
else if(hitHi&&by<-10){scP++;try{window.NexusPost&&window.NexusPost({type:"ARCADE_SCORE",game:"pong",score:scP*50});}catch(z){}
rst()}ball.setPosition(bx,by)});};window.onload=function(){new Phaser.Game({type:Phaser.AUTO,width:W,height:H,parent:"g",physics:{default:"arcade"},
scene:Pg,backgroundColor:223642,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});};})();
<\/script></body></html>`;
