
/** Inline Phaser 3 mini-games; CDN scripts at runtime (see Arcade hub). Chess/Ludo ship as vendor-hosted WebViews instead. */

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
