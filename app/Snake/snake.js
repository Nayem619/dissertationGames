import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";

import {
  PlayEntitlementSplash,
  useConsumePlayEntitlement,
} from "@/lib/useConsumePlayEntitlement";

function trimUrl(s) {
  if (!s || typeof s !== "string") return "";
  const t = s.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t.replace(/\/+$/, "");
  return `https://${t.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

function getSnakeWebUrl() {
  return trimUrl(process.env.EXPO_PUBLIC_SNAKE_URL || "");
}

function getGemMatchWebUrl() {
  return trimUrl(process.env.EXPO_PUBLIC_GEM_MATCH_URL || "");
}

const commonWv = {
  javaScriptEnabled: true,
  domStorageEnabled: true,
  allowsInlineMediaPlayback: true,
  mediaPlaybackRequiresUserAction: false,
  originWhitelist: ["*", "https://*", "http://*"],
  mixedContentMode: "always",
  setSupportMultipleWindows: false,
  allowsFullscreenVideo: true,
};

/**
 * Bundled Phaser 3 fallback when EXPO_PUBLIC_SNAKE_URL is not set.
 * If you deploy iliyaZelenko/phaser3-snake-cordova to Vercel, set EXPO_PUBLIC_SNAKE_URL
 * to that https URL and the app will load the remote build instead.
 */
const PHASER_SNAKE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<style>
html,body,#g{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#0d1117}
#h{position:fixed;left:0;right:0;top:0;z-index:5;padding:6px 10px;font:13px/1.3 system-ui,sans-serif;color:#e6edf3;text-shadow:0 0 4px #000;display:flex;justify-content:space-between;pointer-events:none}
</style>
</head>
<body>
<div id="h"><span>Score: <b id="sc">0</b></span><span id="st">Arrows or WASD · Swipe to turn · Space pauses</span></div>
<div id="g"></div>
<script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>
<script>
(function(){
var C=16,Gw=25,Gh=20,W=Gw*C,H=Gh*C,L=0,R=1,U=2,D=3;
var scEl=document.getElementById("sc"),stEl=document.getElementById("st");
var aCtx=null;function beep(){try{
if(!aCtx)aCtx=new(window.AudioContext||window.webkitAudioContext)();
var o=aCtx.createOscillator(),g=aCtx.createGain();o.frequency.value=512;g.gain.setValueAtTime(0.1,aCtx.currentTime);
o.connect(g);g.connect(aCtx.destination);o.start();o.stop(aCtx.currentTime+0.05);
}catch(e){}}
function Main(){Phaser.Scene.call(this,{key:"main"});}Main.prototype=Object.create(Phaser.Scene.prototype);
Main.prototype.constructor=Main;
Main.prototype.preload=function(){
this.load.setBaseURL("https://cdn.phaserfiles.com/v385");
this.load.image("food","assets/games/snake/food.png");
this.load.image("body","assets/games/snake/body.png");
};
Main.prototype.create=function(){
this.parts=[];this.seg=[];this.score=0;this.heading=R;this.nh=R;this.tMove=0;this.step=125;this.alive=true;this.paused=false;
this.foodG={x:0,y:0};
var i,im;for(i=0;i<3;i++){this.parts.push({x:8-i,y:8});im=this.add.image(0,0,"body").setOrigin(0,0);
im.setPosition((8-i)*C,8*C);this.seg.push(im);}
this.foodI=this.add.image(0,0,"food").setOrigin(0,0);
this.foodG={x:5,y:5};this.foodI.setPosition(5*C,5*C);
this.add.rectangle(0,0,2,H,0x3b82f6).setOrigin(0).setDepth(2);
this.add.rectangle(W-2,0,2,H,0x3b82f6).setOrigin(0).setDepth(2);
this.add.rectangle(0,0,W,2,0x3b82f6).setOrigin(0).setDepth(2);
this.add.rectangle(0,H-2,W,2,0x3b82f6).setOrigin(0).setDepth(2);
this.keys=this.input.keyboard.addKeys({A:"A",D:"D",S:"S",W:"W"});
this.arrows=this.input.keyboard.createCursorKeys();
this.keySpace=this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
var p0={x:0,y:0},me=this;
this.input.on("pointerdown",function(p){p0.x=p.x;p0.y=p.y;});
this.input.on("pointerup",function(p){if(!me.alive||me.paused)return;var dx=p.x-p0.x,dy=p.y-p0.y;
if(Math.abs(dx)+Math.abs(dy)<22)return;me.nh=Math.abs(dx)>Math.abs(dy)?(dx>0?R:L):(dy>0?D:U);});
if(scEl)scEl.textContent="0";stEl.textContent="Running";stEl.style.color="#e6edf3";
};
Main.prototype.opp=function(a,b){return(a===L&&b===R)||(a===R&&b===L)||(a===U&&b===D)||(a===D&&b===U);};
Main.prototype.repickFood=function(){
var x,y,k,j,ok;for(k=0;k<300;k++){
x=Phaser.Math.Between(0,Gw-1);y=Phaser.Math.Between(0,Gh-1);ok=1;for(j=0;j<this.parts.length;j++){
if(this.parts[j].x===x&&this.parts[j].y===y){ok=0;break}}if(ok)break;
}this.foodG.x=x;this.foodG.y=y;this.foodI.setPosition(x*C,y*C);
};
Main.prototype.die=function(){
this.alive=0;stEl.textContent="Game over — tap to restart";stEl.style.color="#f87171";
this.input.once("pointerdown",function(){this.scene.restart();},this);
};
Main.prototype.update=function(t){
if(this.keys.A.isDown||this.arrows.left.isDown)this.nh=L;
if(this.keys.D.isDown||this.arrows.right.isDown)this.nh=R;
if(this.keys.W.isDown||this.arrows.up.isDown)this.nh=U;
if(this.keys.S.isDown||this.arrows.down.isDown)this.nh=D;
if(Phaser.Input.Keyboard.JustDown(this.keySpace)){this.paused=!this.paused;stEl.textContent=this.paused?"Paused":"Running";}
if(!this.alive||this.paused)return;
if(t<this.tMove)return;this.tMove=t+this.step;
if(!this.opp(this.heading,this.nh))this.heading=this.nh;
var h=this.parts[0],nx=h.x,ny=h.y;
if(this.heading===L)nx--;if(this.heading===R)nx++;
if(this.heading===U)ny--;if(this.heading===D)ny++;
if(nx<0||nx>=Gw||ny<0||ny>=Gh){this.die();return;}
var eat=(nx===this.foodG.x&&ny===this.foodG.y);
var lim=this.parts.length-(eat?0:1),j;for(j=0;j<lim;j++){if(this.parts[j].x===nx&&this.parts[j].y===ny){this.die();return;}}
this.parts.unshift({x:nx,y:ny});
this.seg.unshift(this.add.image(nx*C,ny*C,"body").setOrigin(0,0));
if(eat){
beep();this.step=Math.max(55,this.step-2);this.score++;if(scEl)scEl.textContent=String(this.score);
this.repickFood();
}else{this.parts.pop();var tail=this.seg.pop();if(tail)tail.destroy();
}
};
new Phaser.Game({type:Phaser.AUTO,width:W,height:H,parent:"g",backgroundColor:"#0d1117",scene:Main,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},input:{activePointers:4}});})();
<\/script>
</body>
</html>`;

function paramFirst(p, key) {
  const v = p[key];
  return Array.isArray(v) ? v[0] : v;
}

function GameTopRow({ onBack, onLeaderboard, tint = "#e6edf3" }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        s.topRow,
        { paddingTop: insets.top + 6, paddingLeft: 6, paddingRight: 8 },
      ]}
    >
      <TouchableOpacity
        onPress={onBack}
        style={s.iconHit}
        accessibilityLabel="Back to menu"
      >
        <Ionicons name="chevron-back" size={32} color={tint} />
      </TouchableOpacity>
      <View style={{ flex: 1 }} />
      {onLeaderboard ? (
        <TouchableOpacity
          onPress={onLeaderboard}
          style={[s.iconHit, { marginRight: 2 }]}
          accessibilityLabel="Leaderboard"
        >
          <Ionicons name="trophy-outline" size={25} color={tint} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function PhaserSnakeWebView() {
  const gate = useConsumePlayEntitlement("snake");
  if (gate.loading) return <PlayEntitlementSplash entitlementId="snake" />;
  if (!gate.ok) return null;
  const router = useRouter();
  const remote = getSnakeWebUrl();
  const source = remote
    ? { uri: remote }
    : { html: PHASER_SNAKE_HTML, baseUrl: "https://cdn.phaserfiles.com/" };
  return (
    <View style={s.gameRoot}>
      <GameTopRow
        onBack={() => router.replace("/Snake/snake")}
        onLeaderboard={() => router.push("/Leaderboard/leaderboard?game=snake")}
        tint="#c9d1d9"
      />
      <WebView source={source} style={s.wv} {...commonWv} />
    </View>
  );
}

function GameTopRowSimple({ onBack, tint = "#fce7f3" }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        s.topRow,
        { paddingTop: insets.top + 6, paddingLeft: 6, paddingRight: 8 },
      ]}
    >
      <TouchableOpacity onPress={onBack} style={s.iconHit} accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={32} color={tint} />
      </TouchableOpacity>
      <View style={{ flex: 1 }} />
    </View>
  );
}

function GemMatchWebView() {
  const gate = useConsumePlayEntitlement("gemmatch");
  if (gate.loading) return <PlayEntitlementSplash entitlementId="gemmatch" />;
  if (!gate.ok) return null;
  const router = useRouter();
  const url = getGemMatchWebUrl();
  if (!url) {
    return (
      <View style={gstyles.gameRoot}>
        <GameTopRowSimple onBack={() => router.replace("/Snake/snake")} />
        <View style={gstyles.missingBox}>
          <Text style={gstyles.missingTitle}>Gem Match URL not set</Text>
          <Text style={gstyles.missingBody}>
            Add EXPO_PUBLIC_GEM_MATCH_URL to your .env (see web-games/HOW_TO_VERCEL.md), then
            restart Expo.
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View style={gstyles.gameRoot}>
      <GameTopRowSimple onBack={() => router.replace("/Snake/snake")} />
      <WebView source={{ uri: url }} style={gstyles.wv} {...commonWv} allowsFullscreenVideo={false} />
    </View>
  );
}

function SnakeHub() {
  const router = useRouter();
  const snakeRemote = getSnakeWebUrl();
  const gemRemote = getGemMatchWebUrl();
  return (
    <View style={hubStyles.screen}>
      <ScrollView contentContainerStyle={hubStyles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={hubStyles.h1}>Arcade (WebView)</Text>
        <Text style={hubStyles.p}>
          <Text style={hubStyles.strong}>Snake</Text>: Best on a phone is the Cordova build by
          iliyaZelenko (in <Text style={hubStyles.mono}>web-games/phaser3-snake-cordova</Text>
          ) — deploy it to Vercel, then set <Text style={hubStyles.mono}>EXPO_PUBLIC_SNAKE_URL</Text>{" "}
          in <Text style={hubStyles.mono}>.env</Text>. If that is not set, the app uses a bundled
          Phaser fallback (needs internet for CDNs).{"\n\n"}
          <Text style={hubStyles.strong}>Gem Match</Text>: Phaser 3 match-3 in{" "}
          <Text style={hubStyles.mono}>web-games/phaser3-match3</Text> — deploy its{" "}
          <Text style={hubStyles.mono}>dist</Text> folder, then set{" "}
          <Text style={hubStyles.mono}>EXPO_PUBLIC_GEM_MATCH_URL</Text>.
        </Text>
        <Text style={hubStyles.pSmall}>
          Snake remote: {snakeRemote ? "on (EXPO_PUBLIC_SNAKE_URL)" : "off (bundled fallback)"}
          {"\n"}
          Gem URL: {gemRemote ? "on" : "not set — add to .env to play"}
        </Text>
        <TouchableOpacity
          style={hubStyles.primary}
          onPress={() => router.replace({ pathname: "/Snake/snake", params: { play: "1" } })}
        >
          <Text style={hubStyles.primaryT}>
            {snakeRemote ? "Play Snake (Vercel)" : "Play Snake (bundled Phaser)"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[hubStyles.gemBtn, !gemRemote && hubStyles.gemBtnOff]}
          disabled={!gemRemote}
          onPress={() => router.replace({ pathname: "/Snake/snake", params: { play: "gem" } })}
        >
          <Text style={hubStyles.gemBtnT}>
            {gemRemote ? "Play Gem Match (Vercel)" : "Gem Match (set EXPO_PUBLIC_GEM_MATCH_URL)"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={hubStyles.secondary}
          onPress={() => router.push("/Leaderboard/leaderboard?game=snake")}
        >
          <Text style={hubStyles.secondaryT}>View leaderboard (snake)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={hubStyles.secondary}
          onPress={() => router.push("/Arcade/arcade")}
        >
          <Text style={hubStyles.secondaryT}>Phaser arcade (chess, breakout…)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={hubStyles.back} onPress={() => router.push("/home")}>
          <Text style={hubStyles.backT}>Back to main menu</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export default function SnakeEntry() {
  const p = useLocalSearchParams();
  const play = paramFirst(p, "play");
  if (play === "1" || play === "snake") return <PhaserSnakeWebView />;
  if (play === "gem") return <GemMatchWebView />;
  return <SnakeHub />;
}

const s = StyleSheet.create({
  gameRoot: { flex: 1, backgroundColor: "#0d1117" },
  wv: { flex: 1, backgroundColor: "#0d1117" },
  topRow: { flexDirection: "row", alignItems: "center", width: "100%", zIndex: 3 },
  iconHit: { padding: 6 },
});

const gstyles = StyleSheet.create({
  gameRoot: { flex: 1, backgroundColor: "#1a0a1a" },
  wv: { flex: 1, backgroundColor: "#000" },
  missingBox: { flex: 1, padding: 20, justifyContent: "center" },
  missingTitle: { color: "#fda4af", fontSize: 20, fontWeight: "800", marginBottom: 10 },
  missingBody: { color: "#e7e5e4", lineHeight: 22 },
});

const hubStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#eaf4ff" },
  scroll: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 26, fontWeight: "bold", color: "#111", textAlign: "center", marginBottom: 8 },
  p: { color: "#444", textAlign: "left", lineHeight: 22, marginBottom: 12 },
  pSmall: {
    color: "#666",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
    fontFamily: "monospace",
  },
  strong: { fontWeight: "800", color: "#0d47a1" },
  mono: { fontWeight: "600", color: "#374151" },
  primary: {
    backgroundColor: "#1e4fe0",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryT: { color: "#fff", fontWeight: "800", fontSize: 17 },
  gemBtn: { backgroundColor: "#be185d", padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 10 },
  gemBtnOff: { opacity: 0.55 },
  gemBtnT: { color: "#fff", fontWeight: "800", fontSize: 17 },
  secondary: { borderWidth: 2, borderColor: "#1e4fe0", padding: 14, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  secondaryT: { color: "#1e4fe0", fontWeight: "700" },
  back: { backgroundColor: "#6c757d", padding: 14, borderRadius: 10, alignItems: "center" },
  backT: { color: "#fff", fontWeight: "600" },
});
