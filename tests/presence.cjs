// Behavior contract tests. No WebGL/browser mock can validate the final image.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(reducedMotion = false, cameraFails = false) {
  class Element {
    constructor(dataset = {}) { this.dataset = dataset; this.style = {}; this.listeners = {}; this.attrs = {}; this.classes = new Set(); this.classList = { add: (...a) => a.forEach(x => this.classes.add(x)), remove: (...a) => a.forEach(x => this.classes.delete(x)), contains: x => this.classes.has(x), toggle: x => this.classes.has(x) ? this.classes.delete(x) : this.classes.add(x) }; }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    setAttribute(k,v) { this.attrs[k] = v; }
    append() {}
    click() { return this.listeners.click?.(); }
  }
  class Color {
    constructor(value) { this.set(value); }
    set(value) { const n = parseInt(String(value).replace('#',''),16); this.r = (n >> 16 & 255)/255; this.g = (n >> 8 & 255)/255; this.b = (n & 255)/255; return this; }
    clone() { const c = new Color('#000000'); Object.assign(c,this); return c; }
    lerp(c,k) { for (const a of ['r','g','b']) this[a] += (c[a]-this[a])*k; return this; }
    getHexString() { return [this.r,this.g,this.b].map(c => Math.round(c*255).toString(16).padStart(2,'0')).join(''); }
  }
  const nodes = new Map(), palettes = ['amber','glacier','olive'].map(palette => new Element({palette})), scenes = ['encounter','macro','night'].map(scene => new Element({scene}));
  const get = id => { if (!nodes.has(id)) nodes.set(id,new Element()); return nodes.get(id); };
  const root = new Element(); root.querySelector = get;
  root.querySelectorAll = s => s === '[data-scene]' ? scenes : palettes;
  const body = new Element(), document = new Element();
  Object.assign(document,{body,createElement:()=>root,getElementById:get,documentElement:new Element(), hidden:false});
  const reduced = {matches:reducedMotion,addEventListener(){}};
  const params = {lightIntensity:2.5,lightAngle:1.8,fillLight:.6,lid3d:1,irisColorA:'#b07830',irisColorB:'#5a3214'};
  const renderer = {renderer:{domElement:new Element()},fillLight:{intensity:.6},setLid3d(v){this.skin=v;},setIrisColorA(v){this.inner=v.clone();},setIrisColorB(v){this.outer=v.clone();}};
  const controller = {params,triggerBlink(){this.blinked=true;}};
  const tracker = {initPointerFallback(){this.pointer=true;},async init(){if(cameraFails) throw Error('denied');this.video={srcObject:{active:true}};},stop(){this.video=null;this.stopped=true;}};
  const macroConfig = {}, photoConfig = {cameraDrift:1};
  const context = vm.createContext({document,matchMedia:()=>reduced,console:{warn(){}},THREE:{Color,MathUtils:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v))}}});
  const code = fs.readFileSync(new URL('../presence.js',`file://${__filename}`),'utf8').replace("import * as THREE from 'three';",'').replace('export function','function');
  vm.runInContext(code,context);
  const api = context.createPresence({renderer,controller,tracker,macroConfig,photoConfig,applyPersonality(){}});
  return {api, get, scenes, palettes, renderer, tracker, macroConfig, photoConfig, body, document, params};
}

test('starts immediately with pointer and no camera request',()=>{
  const x=setup(); assert.equal(x.tracker.pointer,true); assert.equal(x.tracker.video,undefined); assert.equal(x.body.classList.contains('presence-ready'),true);
});
test('macro and dark views preserve the original skin mode on return',()=>{
  const x=setup(); x.scenes[1].click(); assert.equal(x.macroConfig.enabled,true);
  x.scenes[2].click(); assert.equal(x.renderer.skin,false);
  for(let i=0;i<180;i++) x.api.update(1/60);
  assert.ok(x.params.lightIntensity<1.5);
  x.scenes[0].click(); assert.equal(x.renderer.skin,true); assert.equal(x.macroConfig.enabled,false);
});
test('film visits all chapters and finishes after 36 seconds',()=>{
  const x=setup(); x.get('#presence-film').click();
  for(let i=0;i<250;i++)x.api.update(.05);
  assert.equal(x.macroConfig.enabled,true);
  for(let i=0;i<250;i++)x.api.update(.05);
  assert.equal(x.renderer.skin,false);
  for(let i=0;i<230;i++)x.api.update(.05);
  assert.equal(x.renderer.skin,true); assert.equal(x.get('#presence-film').attrs['aria-pressed'],'false');
});
test('palette converges and reduced motion prevents automatic travel',()=>{
  const x=setup(true); x.palettes[1].click(); x.api.update(.05);
  assert.equal(x.renderer.inner.getHexString(),'9b9874'); assert.equal(x.photoConfig.cameraDrift,0);
  x.get('#presence-film').click(); for(let i=0;i<300;i++)x.api.update(.05);
  assert.notEqual(x.macroConfig.enabled,true);
});
test('camera is optional, can be stopped, and recovers after denial',async()=>{
  const x=setup(); await x.get('#presence-camera').click(); assert.equal(x.tracker.video.srcObject.active,true);
  await x.get('#presence-camera').click(); assert.equal(x.tracker.stopped,true); assert.equal(x.get('#presence-camera').disabled,false);
  const denied=setup(false,true); await denied.get('#presence-camera').click();
  assert.equal(denied.get('#presence-camera').disabled,false); assert.match(denied.get('#presence-input').textContent,/POINTEUR ACTIF/);
});
test('hidden document pauses travel and manual selection cancels it',()=>{
  const x=setup(); x.get('#presence-film').click(); x.document.hidden=true;
  for(let i=0;i<500;i++)x.api.update(.05);
  assert.notEqual(x.macroConfig.enabled,true);
  x.document.hidden=false; x.scenes[2].click(); assert.equal(x.get('#presence-film').attrs['aria-pressed'],'false');
});
