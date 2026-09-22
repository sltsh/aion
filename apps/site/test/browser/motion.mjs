// Run against a production preview with PLAYWRIGHT_MODULE pointing to an installed Playwright module.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium, firefox, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:4187';
const output = process.env.EVIDENCE_DIR || '/tmp/aion-motion-evidence';
await mkdir(output, { recursive: true });
const rows = [];
const errors = [];
const sizes = [[1440,900],[768,1024],[390,844],[320,568],[599,844],[600,844]];
const settled = async page => {
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-theme-transition'));
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))); });
};
const openMenu = async page => { if(await page.locator('[data-menu-toggle]').isVisible() && await page.locator('[data-menu-toggle]').getAttribute('aria-expanded')==='false') { await page.locator('[data-menu-toggle]').click(); await page.waitForTimeout(380); } };
const state = async (page, theme, stored=true) => {
  const value = await page.evaluate(() => ({theme:document.documentElement.dataset.theme, checked:document.querySelector('[data-theme-choice]:checked')?.value, stored:(()=>{try{return localStorage.getItem('aion-site-theme')}catch{return null}})(), icons:[...document.querySelectorAll('[data-theme-favicon]')].filter(e=>e.media==='all').map(e=>e.dataset.themeFavicon), images:[...document.querySelectorAll('.theme-image')].map(e=>[...e.children].filter(i=>getComputedStyle(i).display!=='none').map(i=>i.dataset.themeAsset)), values:[...document.querySelectorAll('[data-theme-value]')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.dataset.themeValue)}));
  assert.equal(value.theme,theme); assert.equal(value.checked,theme); if(stored) assert.equal(value.stored,theme);
  assert.deepEqual(value.icons,[theme]); for(const images of value.images) assert.deepEqual(images,[theme]); for(const t of value.values) assert.equal(t,theme); return value;
};
const motionPreference = async (page, reduced) => {
  await page.evaluate(() => {
    window.motionPreferenceSettled = null;
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
      window.motionPreferenceSettled = { animations: document.getAnimations().length, disclosure: document.querySelector('.site-menu')?.hasAttribute('data-disclosing'), scene: document.documentElement.hasAttribute('data-theme-transition') };
    }, { once: true });
  });
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.waitForFunction(() => window.motionPreferenceSettled !== null);
  if (reduced) assert.deepEqual(await page.evaluate(() => window.motionPreferenceSettled), { animations: 0, disclosure: false, scene: false });
};
const spy = () => {
  window.motionRecords=[];
  const original = Element.prototype.animate;
  Element.prototype.animate=function(frames,options){const a=original.call(this,frames,options); window.motionRecords.push({frames,options,target:this.className,animation:a}); return a;};
  if(document.startViewTransition){ const start=document.startViewTransition.bind(document); document.startViewTransition=(...args)=>{ const transition=start(...args); window.lastThemeTransition=transition; return transition; }; }
};
const record = async (page, id, info={}) => { const artifact=`${id}.png`; await page.screenshot({path:`${output}/${artifact}`,fullPage:true}); rows.push({id,passed:true,artifacts:[artifact],...info}); };
for (const [name, engine] of Object.entries({chromium,firefox,webkit})) {
 if(process.env.BROWSER && process.env.BROWSER!==name) continue;
 let browser;
 try { browser=await engine.launch(); } catch(error) { rows.push({browser:name,unavailable:String(error)}); continue; }
 const version=browser.version();
 try {
  if(!process.env.SKIP_CAPTURES) for(const route of ['/', '/palette.html']) for(const theme of ['dark','light']) for(const [width,height] of sizes) {
   const page=await browser.newPage({viewport:{width,height},colorScheme:theme}); page.on('pageerror',e=>errors.push(`${name}: ${e.message}`));
   await page.goto(base+route); await settled(page);
   if(route==='/' && theme==='dark' && width===1440) {
    const scene=await page.evaluate(()=>document.getAnimations().filter(a=>a.animationName==='seam-draw'||a.animationName==='terminal-handoff').map(a=>{a.pause();return {name:a.animationName,duration:a.effect.getTiming().duration};}));
    assert.equal(scene.length,2); assert.ok(scene.every(a=>a.duration===720));
    for(const time of [0,360,719]) {await page.evaluate(t=>document.getAnimations().filter(a=>a.animationName==='seam-draw'||a.animationName==='terminal-handoff').forEach(a=>{a.currentTime=t;}),time);await record(page,`${name}-hero-${time}`,{browser:name,state:'scene-frame',time,measurements:scene});}
    await page.evaluate(()=>document.getAnimations().forEach(a=>a.play()));
   }
   await page.waitForTimeout(750); await state(page,theme,false);
   const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,mark:getComputedStyle(document.querySelector('slt-site-mark')).display,controls:[...document.querySelectorAll('.site-nav a,.theme-switch label,.menu-toggle,.jump a,.actions a')].filter(e=>e.getBoundingClientRect().width).map(e=>{const r=e.getBoundingClientRect(); return {text:e.textContent.trim(),x:r.x,right:r.right,width:e.clientWidth,scroll:e.scrollWidth};})}));
   assert.equal(geometry.overflow,0); for(const c of geometry.controls){assert.ok(c.x>=-1 && c.right<=width+1,JSON.stringify(c));assert.ok(c.scroll<=c.width+1,JSON.stringify(c));}
   if(width<600) assert.equal(geometry.mark,'none'); else assert.notEqual(geometry.mark,'none');
   await record(page,`${name}-${route==='/'?'home':'palette'}-${theme}-${width}`,{browser:name,version,viewport:`${width}x${height}`,theme,page:route,measurements:geometry}); await page.close();
  }
  if(!process.env.SKIP_CAPTURES) for(const route of ['/','/palette.html']) for(const theme of ['dark','light']) {
   const page=await browser.newPage({viewport:{width:390,height:844},colorScheme:theme,javaScriptEnabled:false}); await page.goto(base+route); await page.waitForTimeout(100);
   assert.equal(await page.locator('.theme-switch').isVisible(),false); assert.ok(await page.locator('h1').isVisible()); assert.equal(await page.locator('[data-copy]:not(:disabled)').count(),0);
   const visible=await page.locator('.theme-image').evaluateAll(es=>es.map(e=>[...e.children].filter(i=>getComputedStyle(i).display!=='none').map(i=>i.dataset.themeAsset))); for(const a of visible)assert.deepEqual(a,[theme]);
   await record(page,`${name}-no-js-${route==='/'?'home':'palette'}-${theme}`,{browser:name,version,viewport:'390x844',page:route,state:'no-js'}); await page.close();
  }
  const page=await browser.newPage({viewport:{width:1440,height:900},colorScheme:'dark'}); page.on('pageerror',e=>errors.push(`${name}: ${e.message}`)); await page.addInitScript(spy); await page.goto(base+'/'); await settled(page);
  const supported=await page.evaluate(()=>typeof document.startViewTransition==='function');
  for(const theme of ['light','dark']) {
   await page.locator(`[data-theme-choice][value=${theme}]`).click();
   if(supported) {
    await page.waitForFunction(()=>window.motionRecords.some(r=>r.options?.pseudoElement==='::view-transition-new(root)'));
    const scene=await page.evaluate(()=>{const r=window.motionRecords.filter(r=>r.options?.pseudoElement).at(-1); r.animation.pause(); r.animation.currentTime=360; return {frames:r.frames,options:r.options,old:{animation:getComputedStyle(document.documentElement,'::view-transition-old(root)').animationName,blend:getComputedStyle(document.documentElement,'::view-transition-old(root)').mixBlendMode,opacity:getComputedStyle(document.documentElement,'::view-transition-old(root)').opacity},group:getComputedStyle(document.documentElement,'::view-transition-group(root)').animationName,scroll:scrollY,focus:document.activeElement?.value};});
    assert.equal(scene.options.duration,720); assert.equal(scene.options.easing,'linear'); assert.deepEqual(scene.old,{animation:'none',blend:'normal',opacity:'1'}); assert.equal(scene.group,'none'); assert.equal(scene.focus,theme); assert.equal(scene.scroll,0);
    assert.deepEqual(scene.frames,[{clipPath:'polygon(-900px 0, -900px 0, 0 100%, 0 100%)'},{clipPath:'polygon(-900px 0, 1440px 0, 2340px 100%, 0 100%)'}]);
    await record(page,`${name}-wipe-${theme}`,{browser:name,state:'mid-scene',measurements:scene});
    await page.evaluate(()=>window.motionRecords.filter(r=>r.options?.pseudoElement).at(-1).animation.play());
   }
   await settled(page); await state(page,theme); await page.evaluate(()=>{window.motionRecords=[];});
  }
  rows.push({id:`${name}-theme-api`,browser:name,version,passed:true,state:supported?'motion-pass':'immediate-fallback-pass'});
  // Native radio keyboard path and rapid input during snapshot ownership.
  await page.locator('[data-theme-choice][value=dark]').focus(); await page.keyboard.press('ArrowRight'); await settled(page); await state(page,'light');
  await page.evaluate(()=>{document.querySelector('[value=dark][data-theme-choice]').click();document.querySelector('[value=light][data-theme-choice]').click();document.querySelector('[value=dark][data-theme-choice]').click();}); await settled(page); await state(page,'dark');
  if(supported){
   await page.locator('[value=light][data-theme-choice]').click(); await page.waitForTimeout(120);
   const box=await page.locator('[value=dark][data-theme-choice]').boundingBox();
   await page.mouse.click(box.x+box.width/2,box.y+box.height/2); await page.waitForTimeout(100);
   assert.equal(await page.locator('[data-theme-choice]:checked').inputValue(),'dark');
   await settled(page); await state(page,'dark');
   await page.locator('[value=light][data-theme-choice]').click(); await page.waitForTimeout(100); await motionPreference(page,true); await settled(page); await state(page,'light');
   assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
   await motionPreference(page,false); assert.equal(await page.locator('[data-theme-transition]').count(),0);
   await page.locator('[value=dark][data-theme-choice]').click(); await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}))); await settled(page); await state(page,'dark');
   await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))); await page.locator('[value=light][data-theme-choice]').click(); await settled(page); await state(page,'light');
   await page.locator('[value=dark][data-theme-choice]').click(); await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));}); await settled(page); await state(page,'dark');
   await page.evaluate(()=>{delete document.hidden;delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));});
  }
  await page.reload(); await settled(page); await state(page,'dark');
  // A copied result is accessible before its local 160ms visual settle; old promises cannot win.
  await page.evaluate(()=>{window.copyResolvers=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:text=>new Promise((resolve,reject)=>window.copyResolvers.push({text,resolve,reject}))}});});
  const copy=page.locator('.copy-button').first(); await copy.click(); await copy.click();
  await page.evaluate(()=>window.copyResolvers[1].resolve());
  await page.waitForFunction(()=>document.querySelector('.copy-button').dataset.copied==='true');
  assert.equal(await page.locator('.copy-status').textContent(),'Copied to clipboard');
  await page.evaluate(()=>window.copyResolvers[0].reject()); await page.waitForTimeout(20); assert.equal(await page.locator('.copy-status').textContent(),'Copied to clipboard');
  const local=await copy.evaluate(e=>e.getAnimations({subtree:true}).map(a=>a.effect.getTiming().duration)); assert.ok(local.every(d=>d===160));
  await copy.click(); await page.evaluate(()=>window.copyResolvers[2].reject()); await page.waitForFunction(()=>document.querySelector('.copy-status').dataset.status==='error');
  assert.ok(await page.locator('.copy-status[data-visible]').isVisible());
  await page.setViewportSize({width:390,height:844}); await page.evaluate(()=>scrollTo(0,0)); await page.waitForTimeout(400);
  const menu=page.locator('[data-menu-toggle]'); const beforeMenu=await page.evaluate(()=>scrollY); await menu.click(); assert.equal(await menu.getAttribute('aria-expanded'),'true');
  await page.waitForTimeout(50); await menu.click(); await page.waitForTimeout(50); await menu.click(); await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>scrollY),beforeMenu);
  assert.equal(await page.locator('.site-menu').getAttribute('data-disclosing'),null); assert.equal(await page.locator('.site-menu').evaluate(e=>e.inert),false);
  await menu.click(); await page.waitForTimeout(60); await motionPreference(page,true);
  assert.equal(await page.locator('.site-menu').isVisible(),false); assert.equal(await page.locator('.site-menu').getAttribute('style'),null);
  await motionPreference(page,false); await menu.click(); await page.keyboard.press('Escape'); await page.waitForTimeout(400); assert.ok(await menu.evaluate(e=>e===document.activeElement));
  rows.push({id:`${name}-interruption-feedback`,browser:name,passed:true}); await page.close();
  for(const mode of ['no-api','blocked-storage','reduce','system']) {
   const p=await browser.newPage({viewport:{width:1440,height:900},colorScheme:'dark',reducedMotion:mode==='reduce'?'reduce':'no-preference'});
   p.on('pageerror',e=>errors.push(`${name}: ${e.message}`)); await p.addInitScript(spy);
   if(mode==='no-api')await p.addInitScript(()=>{document.startViewTransition=undefined;});
   if(mode==='blocked-storage')await p.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}});});
   await p.goto(base+'/'); await settled(p);
   if(mode==='system'){await p.emulateMedia({colorScheme:'light'});await p.waitForFunction(()=>document.documentElement.dataset.theme==='light');await state(p,'light',false);assert.equal(await p.locator('[data-theme-transition]').count(),0);}
   else {await p.locator('[value=light][data-theme-choice]').click();await settled(p);await state(p,'light',mode!=='blocked-storage');if(mode!=='blocked-storage')assert.equal(await p.evaluate(()=>window.motionRecords.filter(r=>r.options?.pseudoElement).length),0);}
   rows.push({id:`${name}-${mode}`,browser:name,passed:true}); await p.close();
  }
 } finally { await browser.close(); await writeFile(`${output}/results.json`,JSON.stringify({rows,errors},null,2)); }
}
assert.deepEqual(errors,[]); console.log(JSON.stringify({cases:rows.length,errors,engines:rows.filter(r=>r.id?.endsWith('theme-api'))},null,2));
