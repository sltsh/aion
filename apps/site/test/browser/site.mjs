// Production-browser checks. Each case retains its result and screenshot, including failures.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const engines = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.env.SITE_URL || 'http://127.0.0.1:4192').replace(/\/$/, '');
const output = process.env.EVIDENCE_DIR || '/tmp/aion-site-evidence';
const filter = process.env.CASE_FILTER ? new RegExp(process.env.CASE_FILTER) : null;
const widths = [1440,1280,1100,768,600,599,390,320];
const opposite = theme => theme === 'dark' ? 'light' : 'dark';
const { solveLightness } = await import('../../../../packages/tokens/dist/index.js');
await mkdir(output, {recursive:true});
const settled = async page => {
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-intro') && !document.documentElement.hasAttribute('data-theme-transition'));
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
};
const themeState = async page => page.evaluate(()=>({theme:document.documentElement.dataset.theme,far:document.querySelector('[data-hero-far]')?.dataset.theme,share:Number(document.querySelector('[data-hero]')?.dataset.heroShare),checked:document.querySelector('[role="switch"]').getAttribute('aria-checked')}));
const consistent = async (page, theme) => {
  const state=await themeState(page);assert.equal(state.theme,theme);assert.equal(state.checked,String(theme==='light'));
  if(state.far)assert.equal(state.far,opposite(theme));
  const variants=await page.locator('[data-theme-value]').evaluateAll(es=>es.filter(e=>e.getClientRects().length&&!e.closest('[data-hero-far],.chip-half,.install-thumbnail')).map(e=>e.dataset.themeValue));
  assert.ok(variants.every(value=>value===theme),`inactive scheme visible: ${variants}`);
};
const overflow = async page => assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0,'horizontal overflow');
const screenshotName = id => id.replace(/[^a-z0-9-]/gi,'-');
// Resize probes. The lab caret's infinite blink is ambient rendering that no interaction starts or ends; every other animation counts.
const resizeProbe = () => {
  const raf = window.requestAnimationFrame.bind(window);
  const running = () => document.getAnimations().filter(a => a.playState === 'running' && !(a.animationName === 'blink' && a.effect?.getTiming().iterations === Infinity)).map(a => `${a.constructor.name}:${a.transitionProperty || a.animationName || a.id || 'animation'}:${a.effect?.target?.getAttribute?.('class') ?? a.effect?.pseudoElement ?? ''}`);
  const share = () => Number(document.querySelector('[data-hero]')?.dataset.heroShare ?? 0);
  const boxes = () => Object.fromEntries(['[data-hero]', '[data-hero-handle]', '[data-scheme-chip]', '.chapter-rail', ...[...document.querySelectorAll('#content > section[id]')].map(s => `#${s.id}`)].map(s => { const r = document.querySelector(s)?.getBoundingClientRect(); return [s, r ? [r.x, r.y, r.width, r.height] : null]; }));
  const clips = () => ['[data-hero-far]', '[data-hero-seam-far]'].map(s => { const e = document.querySelector(s); return e ? getComputedStyle(e).clipPath : null; });
  // Every root view transition, when it started and when the engine finished or skipped it. A skipped transition removes its
  // snapshot, while Chromium keeps a script animation aimed at the vanished pseudo-element running, so a reveal counts only while
  // a transition is live.
  const startTransition = Document.prototype.startViewTransition; window.__transitions = [];
  const stamp = () => performance.now() - (window.__t0 ?? 0);
  if (startTransition) Document.prototype.startViewTransition = function (update) { const entry = { start: stamp(), width: innerWidth }; window.__transitions.push(entry); const vt = startTransition.call(this, update); vt.ready.then(() => { entry.ready = stamp(); }, () => { entry.skipped = true; }); vt.finished.then(() => { entry.finished = stamp(); }); return vt; };
  const live = () => window.__transitions.some(e => e.ready !== undefined && e.finished === undefined);
  // The page scene's incoming reveal as the engine runs it: the clip animation's progress on the new root snapshot, or null.
  // Samples carry the frame's timestamp, the time the engine sampled the animation at, not the time the callback ran.
  const scene = () => { if (!live()) return null; const a = document.getAnimations().find(a => a.effect?.pseudoElement === '::view-transition-new(root)' && a.playState === 'running'); const timing = a?.effect?.getComputedTiming(); return typeof timing?.progress === 'number' && typeof a.startTime === 'number' ? { progress: timing.progress, start: a.startTime + timing.delay - (window.__t0 ?? 0), duration: timing.duration, clip: getComputedStyle(document.documentElement, '::view-transition-new(root)').clipPath } : null; };
  const reveal = () => scene()?.progress ?? null;
  const frames = ms => new Promise(resolve => { const start = performance.now(), out = []; const step = t => { out.push(t); if (performance.now() - start < ms) raf(step); else resolve(out); }; raf(step); });
  window.__resizeProbe = {
    running, share, reveal, scene,
    // Every running animation seen on any frame for `ms`: a resize must start none.
    async started(ms) { const seen = new Set(); const start = performance.now(); await new Promise(resolve => { const step = () => { running().forEach(n => seen.add(n)); if (performance.now() - start < ms) raf(step); else resolve(); }; raf(step); }); return [...seen]; },
    async still(ms) {
      let mutations = 0; const writes = new Set();
      const observer = new MutationObserver(records => { mutations += records.length; records.slice(0, 8).forEach(r => writes.add(`${r.type}:${r.target.getAttribute?.('class') ?? r.target.nodeName}:${r.attributeName ?? ''}`)); });
      observer.observe(document.documentElement, { subtree: true, attributes: true, childList: true, characterData: true });
      const first = { boxes: boxes(), clips: clips() }; let move = { delta: 0 }, clipChanges = 0; const seen = new Set(); let count = 0;
      await new Promise(resolve => { const start = performance.now(); const step = () => { count++; const now = boxes(); for (const [k, r] of Object.entries(now)) { const a = first.boxes[k]; const d = a && r ? Math.max(...r.map((v, i) => Math.abs(v - a[i]))) : a === r ? 0 : Infinity; if (d > move.delta) move = { el: k, delta: d, from: a, to: r }; } if (clips().some((c, i) => c !== first.clips[i])) clipChanges++; running().forEach(n => seen.add(n)); if (performance.now() - start < ms) raf(step); else resolve(); }; raf(step); });
      observer.disconnect(); return { frames: count, move, clipChanges, running: [...seen], mutations, writes: [...writes].slice(0, 12) };
    },
    // Follow a motion sequence from `t0` until nothing runs, no intro or scene remains and the share holds for 3 frames.
    // The share's last change is stamped when it is written, so the order of frame callbacks cannot delay the end by a frame.
    async end(t0, bound = 6000) {
      const hero = document.querySelector('[data-hero]'); let value = share(), changed = t0; const shares = [[0, window.__motionFrom ?? value]]; let introRemoved;
      const frameClock = window.requestAnimationFrame; window.requestAnimationFrame = callback => frameClock(t => { window.__paintTime = t; callback(t); });
      const introObserver = new MutationObserver(() => { if (introRemoved === undefined && !document.documentElement.hasAttribute('data-intro')) introRemoved = performance.now() - t0; });
      if (document.documentElement.hasAttribute('data-intro')) introObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-intro'] });
      let arrived; const observer = new MutationObserver(() => { const s = share(); if (s !== value) { value = s; changed = window.__paintTime ?? performance.now(); shares.push([changed - t0, s]); if (s >= .999) arrived ??= changed - t0; } });
      if (hero) observer.observe(hero, { attributes: true, attributeFilter: ['data-hero-share'] });

      let quiet = 0, calmSince, intervals = [], previous, seen = changed; const reveals = [], scenes = [];
      return new Promise(resolve => { const step = t => { if (previous !== undefined) intervals.push(t - previous); previous = t; const now = performance.now(); const r = scene(); if (r) { reveals.push([Math.round((t - t0) * 10) / 10, Math.round(r.progress * 1000) / 1000]); scenes.push({ t: t - t0, ...r }); }
        const busy = window.freezeFrames || running().length || document.documentElement.hasAttribute('data-intro') || document.documentElement.hasAttribute('data-theme-transition');
        if (busy) { quiet = 0; calmSince = undefined; } else { calmSince ??= now; quiet = seen === changed ? quiet + 1 : 0; } seen = changed;
        if (quiet >= 3 || now - t0 > bound) { observer.disconnect(); introObserver.disconnect(); intervals.sort((a, b) => a - b); const ended = now - t0 <= bound; resolve({ ended, end: Math.max(changed, calmSince ?? now) - t0, frame: intervals[Math.floor(intervals.length / 2)] ?? 1000 / 60, share: value, reveals, scenes, shares, introRemoved, arrived }); } else raf(step); }; raf(step); });
    },
    frames,
  };
};
const assertStill = (still, label) => {
  assert.ok(still.move.delta <= .5, `${label}: a box moved ${JSON.stringify(still.move)}`);
  assert.equal(still.clipChanges, 0, `${label}: hero clip changed`);
  assert.deepEqual(still.running, [], `${label}: animation running`);
  assert.equal(still.mutations, 0, `${label}: still writing ${JSON.stringify(still.writes)}`);
};
const holdFrames = () => { const native = window.requestAnimationFrame.bind(window); window.heldFrames = []; window.requestAnimationFrame = callback => native(time => { if (window.freezeFrames) window.heldFrames.push(callback); else callback(time); }); };
async function engineRun(name) {
  const dir=`${output}/${name}`;await mkdir(dir,{recursive:true});const rows=[];let browser;
  try {browser=await engines[name].launch();}catch(error){const result={browser:name,unavailable:String(error),rows};await writeFile(`${dir}/results.json`,JSON.stringify(result,null,2));return result;}
  const version=browser.version();
  async function run(id, options, action) {
    const engineFilter=process.env[`CASE_FILTER_${name.toUpperCase()}`];if(engineFilter?!new RegExp(engineFilter).test(id):filter&&!filter.test(id))return;
    const row={id,browser:name,version,passed:false,artifacts:[],measurements:{}};
    const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'dark',reducedMotion:'reduce',...options});
    const page=await context.newPage();const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(7000);
    const capture=async(label=id,fullPage=false)=>{const path=`${dir}/${screenshotName(label)}.png`;await page.screenshot({path,fullPage});row.artifacts.push(path);};
    let deadline;
    try {await Promise.race([action(page,context,row,capture),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('Case exceeded30s')),30000);})]);assert.deepEqual(errors,[],'page errors');if(!row.artifacts.length){assert.notEqual(page.url(),'about:blank','successful case has no rendered page evidence');await capture();}row.passed=true;}
    catch(error){row.error=String(error.stack||error);row.pageErrors=errors;try{await capture(`${id}-failure`);}catch(captureError){row.captureError=String(captureError);}console.error(`${name}/${id}: FAIL ${error.message}`);}
    finally{clearTimeout(deadline);rows.push(row);await context.close();await writeFile(`${dir}/results.json`,JSON.stringify({browser:name,version,rows},null,2));}
  }
  try {
    for(const route of ['/', '/palette.html'])for(const scheme of ['dark','light'])for(const width of widths)await run(`${route==='/'?'home':'reference'}-${scheme}-${width}`,{viewport:{width,height:1000},colorScheme:scheme},async(p,_c,row,capture)=>{
      await p.addInitScript(()=>{window.copies=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.copies.push(text)}});});
      await p.goto(base+route);await settled(p);await overflow(p);await consistent(p,scheme);await capture(row.id,true);
      const chip=await p.locator('[data-scheme-chip]').boundingBox();assert.ok(chip&&chip.x>=0&&chip.y>=0&&chip.x+chip.width<=width&&chip.y+chip.height<=1000);
      if(width<600){const menu=p.locator('[data-menu-toggle]');await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'true');assert.equal(await p.locator('[data-scheme-chip]').isVisible(),false);assert.equal(await menu.locator('svg:visible').count(),1);await p.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');assert.ok(await menu.evaluate(e=>document.activeElement===e));}
      if(route!=='/'){await p.locator('[data-copy]').first().click();assert.equal(await p.evaluate(()=>window.copies.length),1);return;}
      row.measurements.hero=await p.locator('[data-hero]').evaluate(h=>{
        const far=h.querySelector('[data-hero-far]'),headline=h.querySelector('.hero-headline'),font=getComputedStyle(headline);
        const diffs=['.hero-headline','.hero-sub','.hero-actions','.hero-editor','.site-path'].map(sel=>{const a=h.querySelector('[data-hero-base]').querySelector(sel).getBoundingClientRect(),b=far.querySelector(sel).getBoundingClientRect();return {sel,delta:Math.max(...['x','y','width','height'].map(k=>Math.abs(a[k]-b[k])))};});
        return {diffs,weight:font.fontWeight,lineHeight:parseFloat(font.lineHeight),fontSize:parseFloat(font.fontSize),shadows:[...h.querySelectorAll('.find-widget,.hover-card')].map(e=>getComputedStyle(e).boxShadow),clip:getComputedStyle(far).clipPath,seamTop:+h.querySelector('[data-hero-seam]').getAttribute('x1'),width:h.clientWidth,height:h.getBoundingClientRect().height,farIds:far.querySelectorAll('[id]').length};
      });
      const hero=row.measurements.hero;assert.ok(hero.diffs.every(d=>d.delta<1),JSON.stringify(hero.diffs));assert.equal(hero.weight,'800');assert.ok(Math.abs(hero.lineHeight/hero.fontSize-.94)<.02);assert.ok(hero.shadows.every(s=>s==='none'));assert.equal(hero.farIds,0);if(width===1440)assert.ok(hero.seamTop<hero.width,'rest seam misses header');assert.ok(Math.abs(Number([...hero.clip.matchAll(/(-?[\d.]+)px/g)].at(-1)?.[1])-hero.height)<.02,'clip height differs from measured hero');
      assert.equal(await p.locator('.claims-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),width>=1100?3:width>=600?2:1);
      assert.equal(await p.locator('[data-depth-stage]').isVisible(),width>=760);assert.equal(await p.locator('.depth-list').isVisible(),width<760);
      if(width>=760){assert.equal(await p.locator('.depth-tag').count(),8);await p.locator('[data-depth-assemble]').click();await p.locator('[data-depth-assemble]').click();}else assert.equal(await p.locator('.depth-list>li').count(),4);
      assert.equal(await p.locator('.solved-scale:visible').count(),1);await p.locator('[data-solved-accent="violet"]').click();
      await p.locator('[data-solved-lightness]').evaluate((e,s)=>{e.value=s==='dark'?e.min:e.max;e.dispatchEvent(new Event('input',{bubbles:true}));},scheme);
      assert.equal(await p.locator('[data-solved-verdict]').getAttribute('data-verdict'),'fail');await p.locator('[data-solved-hold]').check();assert.equal(await p.locator('[data-solved-verdict]').getAttribute('data-verdict'),'pass');
      await p.locator('[data-rounded-find]').click();assert.deepEqual(await p.locator('[data-rounded-values]:visible [data-verdict]').evaluateAll(es=>es.map(e=>e.dataset.verdict)),['pass','fail']);
      const state=p.locator('[data-state-scheme]:visible');assert.equal(await state.count(),1);assert.equal(await state.locator('[data-delta-visible]').count(),0);
      const toggle=key=>state.locator(`[data-state-toggle="${key}"]`);await toggle('selection').click();assert.equal(await toggle('lineHighlight').isDisabled(),true);assert.ok((await p.locator('[data-state-reasons]').textContent()).length>0);
      await toggle('addedWord').click();assert.equal(await toggle('addedLine').getAttribute('aria-pressed'),'true');assert.equal(await toggle('removedLine').isDisabled(),true);await toggle('addedLine').click();assert.equal(await toggle('addedWord').getAttribute('aria-pressed'),'false');
      assert.equal(await state.locator('.states-code').evaluate(e=>getComputedStyle(e).fontSize),width<600?'16px':'22px');
      assert.equal(await p.locator('[data-terminal-session]:visible').count(),2);assert.equal(await p.locator('[data-terminal-slot]:visible').count(),16);
      assert.equal(await p.locator('.terminal-slots:visible').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),width<600?2:width<900?4:8);
      assert.equal(await p.locator('[data-palette-column]:visible').count(),8);await p.locator('[data-palette-column]:visible').first().focus();assert.ok(await p.locator('[data-palette-token][data-linked]').count()>0);
      if(width<600){const g=await p.locator('.palette-chart:visible').evaluate(e=>{const r=e.querySelector('.palette-columns').getBoundingClientRect(),f=e.querySelector('.palette-floor').getBoundingClientRect();return {actual:f.left,expected:r.left+r.width*+e.style.getPropertyValue('--site-floor-fraction')};});assert.ok(Math.abs(g.actual-g.expected)<.1,JSON.stringify(g));}
      const geometry=await p.locator('[data-install-target]').evaluateAll(es=>es.map(e=>({top:e.getBoundingClientRect().top,thumbnail:e.querySelector('.install-thumbnail').getBoundingClientRect().top})));for(const x of geometry)for(const y of geometry)if(Math.abs(x.top-y.top)<1)assert.ok(Math.abs(x.thumbnail-y.thumbnail)<1,JSON.stringify(geometry));
      const copy=p.locator('[data-install-target] [data-copy]');for(let i=0;i<5;i++)await copy.nth(i).click();assert.deepEqual(await p.evaluate(()=>window.copies),await p.locator('.install-command code').allTextContents());
      await overflow(p);assert.equal(await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
    });
    for(const scheme of ['dark','light'])await run(`no-js-${scheme}`,{javaScriptEnabled:false,colorScheme:scheme,viewport:{width:390,height:1000}},async(p,_c,row)=>{
      await p.goto(base+'/#solved');await p.waitForTimeout(300);await overflow(p);
      assert.equal(await p.locator('[data-hero-far]').isVisible(),false);assert.equal(await p.locator('[data-hero-handle]').isVisible(),false);assert.equal(await p.locator('[data-scheme-chip]').isVisible(),false);
      const inputs=JSON.parse(await p.locator('#aion-measures').textContent())[scheme];
      const L=Number(await p.locator('#solved input[type=range]:visible').inputValue());assert.ok(Math.abs(L-inputs.accents.gold[0])<1e-12,`no-JS shipped L sanitized: ${L} != ${inputs.accents.gold[0]}`);
      const floor=solveLightness(inputs.comment[1],inputs.comment[2],inputs.editor,4.5,inputs.comment[0]>inputs.editor[0]?'up':'down');assert.ok(Math.abs(Number(await p.locator('#rounded input[type=range]:visible').inputValue())-floor)<1e-12);
      assert.equal(await p.locator('.solved-scale:visible').count(),1);assert.equal(await p.locator('[data-copy]:not(:disabled)').count(),0);row.measurements={shipped:L,floor};
    });
    await run('hero-motion-storage-keyboard', {reducedMotion:'no-preference'},async(p,c,row)=>{
      await c.addInitScript(()=>{try{sessionStorage.setItem('aion-site-intro','seen');}catch{}});await p.goto(base);await settled(p);await p.waitForTimeout(750);
      const q=await c.newPage();await q.goto(base+'/#install');await settled(q);
      await p.locator('[data-scheme-chip]').click();await p.waitForTimeout(100);await q.locator('[data-scheme-chip]').click();await q.waitForFunction(()=>document.documentElement.dataset.theme==='light');await p.waitForTimeout(1000);await consistent(p,'light');await consistent(q,'light');assert.equal((await themeState(p)).share,0);
      await p.locator('[data-scheme-chip]').evaluate(e=>{e.click();e.click();e.click();});await p.waitForTimeout(1600);await settled(p);await consistent(p,'dark');
      await p.evaluate(()=>{window.wipes=[];const original=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(this===document.documentElement)window.wipes.push(options);return original.call(this,frames,options);};});
      const handle=p.locator('[data-hero-handle]');await handle.focus();await p.keyboard.press('End');await p.waitForFunction(()=>document.documentElement.dataset.theme==='light');await settled(p);await consistent(p,'light');
      if(await p.evaluate(()=>typeof document.startViewTransition==='function'))assert.ok(await p.evaluate(()=>window.wipes.some(o=>o.pseudoElement==='::view-transition-new(root)'&&o.duration===720)),'missing scene wipe');
      const box=await handle.boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.mouse.move(20,box.y+box.height/2);row.measurements.dragRelease=await themeState(p);await p.mouse.up();await p.waitForFunction(()=>document.documentElement.dataset.theme==='dark',{},{timeout:6000});await settled(p);await consistent(p,'dark');row.measurements={p:await themeState(p),q:await themeState(q)};
    });
    await run('resize-mid-glide-and-depth-motion',{reducedMotion:'no-preference',viewport:{width:768,height:1000}},async(p,_c,row)=>{
      await p.addInitScript(()=>{const native=requestAnimationFrame;window.heldFrames=[];window.requestAnimationFrame=callback=>native(time=>{if(window.freezeFrames)window.heldFrames.push(callback);else callback(time);});});
      await p.goto(base+'/#depth');await settled(p);await p.waitForTimeout(750);await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
      const box=await p.locator('[data-hero-handle]').boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width/2+25,box.y+box.height/2);await p.mouse.up();
      await p.evaluate(()=>{window.freezeFrames=true;});const before=(await themeState(p)).share;await p.setViewportSize({width:759,height:1000});const after=(await themeState(p)).share;row.measurements={before,after};assert.ok(Math.abs(after-before)<.001,JSON.stringify(row.measurements));await p.evaluate(()=>{window.freezeFrames=false;window.heldFrames.splice(0).forEach(callback=>requestAnimationFrame(callback));});assert.equal(await p.locator('.depth-list').isVisible(),true);assert.equal(await p.locator('[data-depth-stage]').isVisible(),false);
      await p.setViewportSize({width:1440,height:1000});await p.locator('#depth').scrollIntoViewIfNeeded();await p.waitForTimeout(800);
      await p.evaluate(()=>{window.depthMutations=0;new MutationObserver(records=>window.depthMutations+=records.length).observe(document.querySelector('[data-depth-frame]'),{childList:true});});
      await p.locator('[data-depth-assemble]').click();await p.waitForTimeout(120);const motion=await p.evaluate(()=>({mutations:window.depthMutations,duration:getComputedStyle(document.querySelector('.depth-mover:not(.depth-base)')).transitionDuration,transforms:[...document.querySelectorAll('.depth-mover:not(.depth-base)')].map(e=>getComputedStyle(e).transform)}));assert.equal(motion.mutations,0);assert.equal(motion.duration,'0.72s');assert.ok(motion.transforms.some(t=>t!=='none'&&t!=='matrix(1, 0, 0, 1, 0, 0)'));row.measurements=motion;
    });
    await run('states-delta-motion-alignment',{reducedMotion:'no-preference',viewport:{width:1100,height:1000}},async(p,_c,row)=>{
      await p.goto(base+'/#states');await settled(p);await p.waitForTimeout(750);await p.locator('[data-state-scheme]:visible [data-state-toggle="selection"]').click();await p.waitForTimeout(150);
      assert.ok(await p.locator('[data-delta-visible]').count()>0);const bars=await p.locator('[data-state-scheme]:visible .states-meter-bar').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));assert.ok(Math.max(...bars)-Math.min(...bars)<1,JSON.stringify(bars));
      row.measurements=await p.locator('[data-state-fill]').first().evaluate(e=>({duration:getComputedStyle(e).transitionDuration}));assert.equal(row.measurements.duration,'0.36s');await p.waitForTimeout(1900);assert.equal(await p.locator('[data-delta-visible]').count(),0);
      await p.emulateMedia({reducedMotion:'reduce'});await p.locator('[data-state-scheme]:visible [data-state-toggle="selection"]').click();assert.equal(await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
    });
    for(const width of [1440,390])await run(`keyboard-controls-${width}`,{viewport:{width,height:1000}},async(p,_c,row)=>{
      await p.goto(base+'/#overview');await settled(p);
      const expected=await p.locator('#content a[href],#content button,#content input,#content [tabindex="0"]').evaluateAll(es=>es.filter(e=>e.getClientRects().length&&!e.disabled&&!e.closest('[inert]')&&e.tabIndex>=0).map((e,i)=>{e.dataset.focusCase=String(i);return String(i);}));
      await p.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0);});const seen=[];
      for(let i=0;i<expected.length+50&&seen.length<expected.length;i++){await p.keyboard.press('Tab');await p.waitForFunction(()=>{const r=document.activeElement.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;});const active=await p.evaluate(()=>{const e=document.activeElement,s=getComputedStyle(e),r=e.getBoundingClientRect();return {id:e.dataset.focusCase,outline:s.outlineStyle,width:parseFloat(s.outlineWidth),shadow:s.boxShadow,top:r.top,bottom:r.bottom};});if(active.id!==undefined){assert.ok(active.width>0&&active.outline!=='none'||active.shadow!=='none',`invisible focus ${JSON.stringify(active)}`);assert.ok(active.bottom>0&&active.top<1000,`focus outside viewport ${JSON.stringify(active)}`);assert.ok(!seen.includes(active.id),`control reached twice ${active.id}`);seen.push(active.id);}}
      assert.deepEqual([...seen].sort(),[...expected].sort());row.measurements={controls:seen.length};
    });
    await run('rail-gutter-current-and-chip',{},async(p,_c,row)=>{
      await p.goto(base+'/#states');await settled(p);
      for(const width of [1440,1920]){await p.setViewportSize({width,height:1000});await p.locator('#states').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(100);const g=await p.evaluate(()=>{const rail=document.querySelector('.chapter-rail'),chip=document.querySelector('[data-scheme-chip]'),r=rail.getBoundingClientRect(),c=chip.getBoundingClientRect();return {gutter:document.querySelector('#depth').getBoundingClientRect().left,hidden:rail.hidden,current:rail.querySelector('[aria-current]')?.hash,overlap:!rail.hidden&&r.left<c.right&&r.right>c.left&&r.top<c.bottom&&r.bottom>c.top};});assert.equal(g.hidden,g.gutter<190);assert.equal(g.current,'#states');assert.equal(g.overlap,false);row.measurements[width]=g;}
    });
    await run('touch-outside-tab-scroll',{hasTouch:true,viewport:{width:390,height:1000}},async(p,c,row)=>{
      await p.goto(base);await settled(p);const before=(await themeState(p)).share;
      const prevented=await p.locator('[data-hero]').evaluate(e=>{const event=new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:7,button:0,clientX:30,clientY:350});e.dispatchEvent(event);return event.defaultPrevented;});assert.equal(prevented,false);
      if(name==='chromium'){const session=await c.newCDPSession(p);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:30,y:600}]});for(const y of [550,450,350,250])await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:30,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(300);row.measurements.method='native CDP touch swipe';}
      else{await p.mouse.wheel(0,350);await p.waitForTimeout(300);row.measurements.method='emulated touch admission plus native scroll (Playwright exposes touch tap only)';}
      assert.ok(await p.evaluate(()=>scrollY)>0);assert.equal((await themeState(p)).share,before);
    });
    for(const width of [1440,390,320])for(const scheme of ['dark','light'])await run(`splash-labels-${scheme}-${width}`,{viewport:{width,height:1000},colorScheme:scheme,reducedMotion:'no-preference'},async(p,_c,row)=>{
      await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1200);const boxes=await p.locator('.splash-intro__label').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));assert.equal(boxes.length,8);assert.ok(boxes.every(r=>r.x>=0&&r.y>=0&&r.right<=width&&r.bottom<=1000),JSON.stringify(boxes));assert.ok((await p.locator('.splash-intro__wordmark').getAttribute('src')).includes(scheme==='light'?'aion-wordmark.webp':'aion-wordmark-light.webp'));row.measurements={boxes};
    });
    await run('splash-first-skip-reload',{reducedMotion:'no-preference'},async(p,_c,row)=>{
      await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForTimeout(200);assert.equal(await p.locator('html').getAttribute('data-intro'),'pending');await p.keyboard.press('Escape');await settled(p);await p.reload({waitUntil:'domcontentloaded'});assert.equal(await p.locator('html').getAttribute('data-intro'),null);row.measurements={session:await p.evaluate(()=>sessionStorage.getItem('aion-site-intro'))};
    });
    for(const [id,route,options] of [['deep','/#install',{reducedMotion:'no-preference'}],['reference','/palette.html',{reducedMotion:'no-preference'}],['reduced','/',{}]])await run(`splash-skipped-${id}`,options,async(p)=>{await p.goto(base+route,{waitUntil:'domcontentloaded'});assert.equal(await p.locator('html').getAttribute('data-intro'),null);await settled(p);if(id==='reduced')assert.equal(await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);});
    await run('splash-blocked-client-timeout',{reducedMotion:'no-preference'},async(p,_c,row)=>{
      await p.route('**/assets/*.js',route=>route.abort());await p.goto(base,{waitUntil:'domcontentloaded'});assert.equal(await p.locator('html').getAttribute('data-intro'),'pending');const start=Date.now();await p.waitForFunction(()=>!document.documentElement.hasAttribute('data-intro'),{},{timeout:5000});row.measurements.releaseMs=Date.now()-start;assert.ok(row.measurements.releaseMs<=4100);assert.equal(await p.locator('#app').evaluate(e=>getComputedStyle(e).visibility),'visible');
    });
    // B1: a resize with nothing in flight starts no motion, and 720 ms later nothing moves, clips, animates or writes.
    for(const [width,from] of [[1440,390],[1100,1440],[768,1100],[390,768]])await run(`resize-settle-${width}`,{reducedMotion:'no-preference',viewport:{width:from,height:1000}},async(p,_c,row)=>{
      await p.addInitScript(()=>{try{sessionStorage.setItem('aion-site-intro','seen');}catch{}});await p.addInitScript(resizeProbe);
      await p.goto(base+'/#depth');await settled(p);await p.waitForTimeout(900);await p.locator('#depth').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(100);
      assert.deepEqual(await p.evaluate(()=>window.__resizeProbe.running()),[],'motion in flight before the resize');
      await p.setViewportSize({width,height:1000});const started=await p.evaluate(()=>window.__resizeProbe.started(720));const still=await p.evaluate(()=>window.__resizeProbe.still(2000));
      row.measurements={from,width,started,still};assert.deepEqual(started,[],'the resize started motion');assertStill(still,`${from}→${width}`);
    });
    await run('resize-settle-hidden',{reducedMotion:'no-preference'},async(p,_c,row)=>{
      await p.addInitScript(()=>{try{sessionStorage.setItem('aion-site-intro','seen');}catch{}});await p.addInitScript(resizeProbe);
      await p.goto(base+'/#depth');await settled(p);await p.waitForTimeout(900);
      const visibility=hidden=>p.evaluate(h=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>h});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>h?'hidden':'visible'});document.dispatchEvent(new Event('visibilitychange'));},hidden);
      await visibility(true);await p.setViewportSize({width:759,height:1000});await p.setViewportSize({width:1100,height:1000});await visibility(false);
      const started=await p.evaluate(()=>window.__resizeProbe.started(720));const still=await p.evaluate(()=>window.__resizeProbe.still(2000));row.measurements={method:'emulated document.hidden and visibilitychange',started,still};
      assert.deepEqual(started,[],'the hidden resize started motion');assertStill(still,'hidden resize');
    });
    await run('resize-settle-font-late',{reducedMotion:'no-preference',viewport:{width:1100,height:1000}},async(p,_c,row)=>{
      let release;const gate=new Promise(resolve=>{release=resolve;});await p.route('**/*.woff2',async route=>{await gate;await route.continue();});
      await p.addInitScript(()=>{try{sessionStorage.setItem('aion-site-intro','seen');}catch{}});await p.addInitScript(resizeProbe);
      await p.goto(base+'/#depth',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>!document.documentElement.hasAttribute('data-intro'));await p.waitForTimeout(900);
      assert.equal(await p.evaluate(()=>document.fonts.status),'loading');await p.setViewportSize({width:1440,height:1000});await p.waitForTimeout(100);
      release();await p.evaluate(()=>document.fonts.ready);const started=await p.evaluate(()=>window.__resizeProbe.started(720));const still=await p.evaluate(()=>window.__resizeProbe.still(2000));row.measurements={started,still};
      assert.deepEqual(started,[],'the late font started motion');assertStill(still,'late font');
    });
    // Fonts that land while the parts assemble re-cut the existing movers; replacing them jumped the parts to the end of the assembly.
    await run('resize-settle-font-during-assembly',{reducedMotion:'no-preference',viewport:{width:1440,height:1000}},async(p,_c,row,capture)=>{
      let release,requests=0;const gate=new Promise(resolve=>{release=resolve;});await p.route('**/*.woff2',async route=>{requests++;await gate;await route.continue();});
      await p.addInitScript(()=>{try{sessionStorage.setItem('aion-site-intro','seen');}catch{}});await p.addInitScript(resizeProbe);
      await p.goto(base+'/#depth',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>!document.documentElement.hasAttribute('data-intro'));await p.waitForTimeout(900);
      await p.locator('#depth').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(100);
      assert.equal(await p.evaluate(()=>document.fonts.status),'loading');
      await p.evaluate(()=>{const frame=document.querySelector('[data-depth-frame]');window.__movers=[...frame.querySelectorAll('.depth-mover:not(.depth-base)')];window.__frameWrites=0;new MutationObserver(r=>{window.__frameWrites+=r.length;}).observe(frame,{childList:true});
        const f=()=>Number(getComputedStyle(window.__movers[0]).getPropertyValue('--site-depth-f'));window.__assembly=[];window.__assemblyAnimations=[];const ids=new WeakMap();let next=0;
        const motions=()=>document.getAnimations().filter(a=>window.__movers.includes(a.effect?.target)&&a.transitionProperty==='--site-depth-f'&&typeof a.startTime==='number').map(a=>{if(!ids.has(a))ids.set(a,++next);const timing=a.effect.getComputedTiming();return {id:ids.get(a),start:a.startTime-window.__t0,duration:timing.duration,progress:timing.progress};});window.__assemblyMotions=motions;
        document.querySelector('[data-depth-assemble]').addEventListener('click',()=>{const t0=performance.now();window.__t0=t0;document.fonts.ready.then(()=>{window.__fontsAt=performance.now()-t0;window.__fontsMotions=motions();window.__loadedFonts=[...document.fonts].filter(f=>f.status==='loaded').length;});const step=t=>{window.__assembly.push([Math.round((t-t0)*10)/10,f()]);window.__assemblyAnimations.push({t:t-t0,motions:motions()});if(performance.now()-t0<1400)requestAnimationFrame(step);};requestAnimationFrame(step);},{capture:true,once:true});});
      await p.locator('[data-depth-assemble]').click();await p.waitForFunction(()=>performance.now()-window.__t0>=150);
      const beforeFonts=await p.evaluate(()=>({t:performance.now()-window.__t0,motions:window.__assemblyMotions(),f:window.__assembly.at(-1)?.[1]}));row.measurements={beforeFonts,fontRequests:requests};release();
      assert.ok(requests>0&&beforeFonts.motions.length&&beforeFonts.f>0&&beforeFonts.f<1,'no blocked fonts during an active assembly');
      await p.waitForFunction(()=>window.__assembly.at(-1)?.[0]>=1350,null,{timeout:5000});
      const result=await p.evaluate(()=>({assembly:window.__assembly,animations:window.__assemblyAnimations,fontsAt:window.__fontsAt,fontsMotions:window.__fontsMotions,loadedFonts:window.__loadedFonts,frameWrites:window.__frameWrites,kept:window.__movers.every(m=>m.isConnected)&&document.querySelectorAll('[data-depth-frame] .depth-mover:not(.depth-base)').length===window.__movers.length}));
      const still=await p.evaluate(()=>window.__resizeProbe.still(2000));row.measurements={...result,beforeFonts,fontRequests:requests,still};
      assert.ok(result.loadedFonts>0&&result.fontsMotions.length&&result.fontsMotions.every(a=>a.progress>0&&a.progress<1),'the fonts did not load while the assembly was active');
      assert.ok(result.fontsAt!==undefined&&result.fontsAt<600,`fonts did not land during the assembly (${result.fontsAt} ms)`);
      assert.equal(result.frameWrites,0,'the movers were replaced');assert.ok(result.kept,'a transitioning mover was removed');
      const a=result.assembly,drops=a.slice(1).map(([t,v],i)=>[t,a[i][1]-v]);const frame=a.slice(1).map(([t],i)=>t-a[i][0]).sort((x,y)=>x-y)[Math.floor((a.length-1)/2)];
      const steepest=Math.max(...drops.filter(([t])=>t<=result.fontsAt).map(([,d])=>d));const late=drops.filter(([t])=>t>result.fontsAt);
      row.measurements.timeline={frame,steepest,lateSteepest:Math.max(...late.map(([,d])=>d))};
      assert.ok(a.every(([,v],i)=>i===0||v<=a[i-1][1]),'the assembly reversed or restarted');
      assert.ok(late.every(([,d])=>d<=steepest+1e-3),`the parts jumped when the fonts landed: ${JSON.stringify(late.filter(([,d])=>d>steepest+1e-3))}`);
      const motions=result.animations.flatMap(r=>r.motions),starts=motions.map(a=>a.start),deadline=Math.min(...starts)+720;
      assert.ok(motions.every(a=>a.duration===720)&&Math.max(...starts)-Math.min(...starts)<=frame,'the assembly changed its duration or start time');
      const initial=new Set(beforeFonts.motions.map(a=>a.id));assert.ok(result.fontsMotions.every(a=>initial.has(a.id)),'the font load replaced an active transition');
      const lastChange=drops.filter(([,d])=>d>0).at(-1)?.[0];row.measurements.timeline={...row.measurements.timeline,lastChange,deadline,starts:[...new Set(starts)]};
      assert.ok(lastChange!==undefined&&lastChange>=deadline-frame&&lastChange<=deadline+frame,`the assembly last moved at ${lastChange} ms, not at its ${deadline.toFixed(1)} ms deadline`);
      assertStill(still,'fonts during assembly');await capture(`${row.id}-loaded-fonts`);
    });
    // B1 in flight: the resize keeps the share, neither restarts nor extends the sequence, and the page is still once it ends.
    const sequence=async(kind,resize,row,evidence=false)=>{
      const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'dark',reducedMotion:'no-preference'});const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(7000);
      try{
        if(kind!=='intro')await p.addInitScript(()=>{try{sessionStorage.setItem('aion-site-intro','seen');}catch{}});
        else await p.addInitScript(()=>new MutationObserver((_r,o)=>{if(document.querySelector('.splash-intro')){window.__t0=performance.now();o.disconnect();}}).observe(document,{subtree:true,childList:true}));
        await p.addInitScript(resizeProbe);await p.addInitScript(holdFrames);

        const mark=selector=>p.evaluate(s=>{window.__t0=undefined;(s?document.querySelector(s):window).addEventListener(s?'click':'pointerup',()=>{window.__t0=performance.now();window.__motionFrom=window.__resizeProbe.share();},{capture:true,once:true});},selector);
        if(kind==='intro')await p.goto(base,{waitUntil:'domcontentloaded'});
        else{await p.goto(base+(kind==='chip-off'?'/#install':'/'));await settled(p);await p.waitForTimeout(900);}
        if(kind==='glide'){const box=await p.locator('[data-hero-handle]').boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await mark(null);await p.mouse.move(box.x+box.width/2+25,box.y+box.height/2,{steps:3});await p.mouse.up();}
        if(kind==='chip-on'||kind==='chip-off'){assert.equal(await p.evaluate(on=>{const r=document.querySelector('[data-hero]').getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;}),kind==='chip-on');await mark('[data-scheme-chip]');await p.locator('[data-scheme-chip]').click();}
        await p.waitForFunction(()=>window.__t0!==undefined);await p.evaluate(()=>{window.__ended=window.__resizeProbe.end(window.__t0);});
        const result={kind,resized:resize};
        if(resize){
          await p.waitForFunction(at=>performance.now()-window.__t0>=at,{glide:400,intro:900,'chip-on':300,'chip-off':300}[kind]);
          if(evidence){const path=`${dir}/${screenshotName(`${row.id}-before-resize`)}.png`;await p.screenshot({path});row.artifacts.push(path);result.beforeFrame={path,url:p.url(),viewport:p.viewportSize(),t:await p.evaluate(()=>performance.now()-window.__t0)};}
          await p.evaluate(()=>{window.freezeFrames=true;});result.before=await p.evaluate(()=>window.__resizeProbe.share());result.revealBefore=await p.evaluate(()=>window.__resizeProbe.reveal());result.at=await p.evaluate(()=>performance.now()-window.__t0);
          await p.setViewportSize({width:759,height:1000});result.after=await p.evaluate(()=>window.__resizeProbe.share());
          if(evidence){const path=`${dir}/${screenshotName(`${row.id}-after-resize`)}.png`;await p.screenshot({path});row.artifacts.push(path);result.afterFrame={path,url:p.url(),viewport:p.viewportSize(),t:await p.evaluate(()=>performance.now()-window.__t0)};}
          await p.evaluate(()=>{window.freezeFrames=false;window.heldFrames.splice(0).forEach(callback=>requestAnimationFrame(callback));});
        }
        // Evidence only: screenshots taken while the sequence runs. Chromium paints view-transition snapshots into them; Firefox and
        // WebKit screenshots show the live document, so their page-scene frames show the committed scheme.
        if(evidence){result.frames=[];while(result.frames.length<24){const t=await p.evaluate(()=>performance.now()-window.__t0);if(t>2400)break;const beforeCapture=await p.evaluate(()=>({t:performance.now()-window.__t0,scene:window.__resizeProbe.scene(),share:window.__resizeProbe.share()}));const path=`${dir}/${screenshotName(`${row.id}-frame-${String(result.frames.length).padStart(2,'0')}`)}.png`;await p.screenshot({path});row.artifacts.push(path);const afterCapture=await p.evaluate(()=>({t:performance.now()-window.__t0,scene:window.__resizeProbe.scene(),share:window.__resizeProbe.share()}));result.frames.push({path,url:p.url(),viewport:p.viewportSize(),beforeCapture,afterCapture});}}
        Object.assign(result,await p.evaluate(()=>window.__ended));result.still=await p.evaluate(()=>window.__resizeProbe.still(2000));
        const path=`${dir}/${screenshotName(`${row.id}-${evidence?'evidence':resize?'resized':'baseline'}`)}.png`;await p.screenshot({path});row.artifacts.push(path);
        Object.assign(result,{url:p.url(),viewport:p.viewportSize(),screenshot:path,transitions:await p.evaluate(()=>window.__transitions??null),finalTheme:await p.evaluate(()=>document.documentElement.dataset.theme),sceneMarker:await p.evaluate(()=>document.documentElement.hasAttribute('data-theme-transition'))});
        assert.deepEqual(errors,[],'page errors');return result;
      }catch(error){try{const path=`${dir}/${screenshotName(`${row.id}-${resize?'resized':'baseline'}-failure`)}.png`;await p.screenshot({path});row.artifacts.push(path);}catch{}throw error;}
      finally{await context.close();}
    };
    for(const kind of ['glide','intro','chip-on','chip-off'])await run(`resize-settle-in-flight-${kind}`,{},async(_p,_c,row)=>{
      const baseline=await sequence(kind,false,row);const resized=await sequence(kind,true,row);const evidence=await sequence(kind,true,row,true);row.measurements={baseline,resized,evidence};
      assert.ok(baseline.ended&&resized.ended,'the sequence did not finish within 6 s');
      if(kind==='glide')assert.ok(baseline.end>1000&&resized.end>1000,'a release without velocity starts no glide to compare');
      assert.ok(Math.abs(resized.after-resized.before)<1e-3,`share moved across the resize ${resized.before} → ${resized.after}`);
      const frame=Math.max(baseline.frame,resized.frame);
      const spread=list=>list.length?Math.max(...list)-Math.min(...list):Infinity;
      if(kind==='glide'||kind==='intro'){
        // Read each run's clock from its painted shares. Separate page loads can delay the intro's timers or pointer delivery.
        const clock=r=>{
          const target=kind==='intro'?.42:r.share,from=kind==='intro'?0:r.shares[0][1],duration=kind==='intro'?720:3200;
          const starts=r.shares.filter(([,p])=>{const q=(p-from)/(target-from);return q>.02&&q<.98;}).map(([t,p])=>{
            const q=(p-from)/(target-from);
            if(kind==='glide')return t+320*Math.log(1-q);
            const b=1-Math.cbrt(1-q),u=1-b;
            return t-720*(3*u*u*b*.22+3*u*b*b*.36+b**3);
          });
          return {starts,deadline:Math.min(...starts)+duration,last:r.shares.at(-1)?.[0]};
        };
        const clocks=[clock(baseline),clock(resized)];row.measurements.motion=clocks;
        for(const [i,r] of [baseline,resized].entries()){
          const c=clocks[i];assert.ok(c.starts.length,'no hero motion observed');
          assert.ok(spread(c.starts)<=frame,`the ${i?'resized':'baseline'} ${kind} moved its clock: ${c.starts.map(Math.round)}`);
          assert.ok(c.last>=c.deadline-frame&&c.last<=c.deadline+frame,`the ${kind} last moved at ${c.last?.toFixed(1)} ms, deadline ${c.deadline.toFixed(1)} ms`);
          if(kind==='intro')assert.ok(Math.abs(Math.min(...c.starts)-r.introRemoved)<=frame,'the intro did not hand off to its arrival on the same frame');
        }
        assert.ok(resized.end-clocks[1].deadline<=baseline.end-clocks[0].deadline+frame,'the resize extended the sequence past its own deadline');
      }else{
        const clock=r=>r.scenes.filter(s=>s.progress>.02&&s.progress<.98).map(s=>s.start);
        const deadline=r=>Math.min(...clock(r))+720;
        const starts=clock(resized),after=resized.reveals.filter(([t])=>t>resized.at);
        row.measurements.reveal={baselineStarts:clock(baseline),resizedStarts:starts,revealBefore:resized.revealBefore,after,baselineDeadline:deadline(baseline),resizedDeadline:deadline(resized),tolerance:frame,throwArrived:[baseline.arrived,resized.arrived]};
        for(const [i,r] of [baseline,resized].entries()){
          // Owner-approved B1 exception: resizing an active page wipe settles it without recapture.
          if(i===1&&kind==='chip-off'){
            assert.equal(r.finalTheme,'light','resize did not retain the selected theme');
            assert.equal(r.sceneMarker,false,'resize left the page scene active');
            assert.equal(r.transitions.length,1,'resize recaptured or replayed the page wipe');
            assert.ok(r.end<=baseline.end+frame,'resize extended the page wipe');
            continue;
          }
          assert.ok(clock(r).length,'no live page-scene reveal observed');
          assert.ok(r.scenes.every(s=>s.duration===720&&s.clip!=='none'),'the snapshot reveal has no visible clip or changed duration');
          assert.ok(spread(clock(r))<=frame,`the ${i?'resized':'baseline'} scene moved its clock: ${clock(r).map(Math.round)}`);
          const intervals=(r.transitions??[]).filter(t=>t.ready!==undefined).sort((a,b)=>a.ready-b.ready);
          const shown=Math.max(...intervals.map(t=>t.finished??Infinity));
          assert.ok(shown>=deadline(r)-frame,`the ${i?'resized':'baseline'} page scene's snapshot ended at ${shown.toFixed(1)} ms, before its deadline ${deadline(r).toFixed(1)} ms`);
          r.snapshotGaps=intervals.slice(1).map((t,j)=>({from:intervals[j].finished,to:t.ready,ms:t.ready-intervals[j].finished}));
          assert.ok(r.end>=deadline(r)-frame,`the scene ended at ${r.end.toFixed(1)} ms, before its deadline ${deadline(r).toFixed(1)} ms`);
        }
        if(kind!=='chip-off')assert.ok(resized.end-deadline(resized)<=baseline.end-deadline(baseline)+frame,`the resize extended the scene past its own deadline`);
        if(kind==='chip-on'){
          const throwStart=r=>{const from=r.shares[0][1];return r.shares.filter(([,p])=>{const q=(p-from)/(1-from);return q>.02&&q<.98;}).map(([t,p])=>{const q=(p-from)/(1-from),b=1-Math.cbrt(1-q),u=1-b;return t-720*(3*u*u*b*.22+3*u*b*b*.36+b**3);});};
          const clocks=[throwStart(baseline),throwStart(resized)];row.measurements.reveal.throwStarts=clocks;
          for(const [i,r] of [baseline,resized].entries())assert.ok(clocks[i].length&&spread(clocks[i])<=frame&&Math.abs(r.shares.find(([,p])=>p===1)?.[0]-(Math.min(...clocks[i])+720))<=frame,'the throw changed its own timeline');
        }
        if(kind!=='chip-off'&&resized.revealBefore!==null){
          assert.ok(after.length>0,`the page scene stopped at the resize (${resized.reveals.length} reveal frames, none after ${resized.at.toFixed(0)} ms)`);
          assert.ok(after.every(([,q])=>q>=resized.revealBefore-.02),`the page scene restarted after the resize: ${resized.revealBefore} → ${after.map(([,q])=>q)}`);
        }
      }
      assertStill(resized.still,`${kind} after the sequence`);
    });
    // Native transition readiness is not painted evidence: Chromium may show the live outgoing page while it recaptures.
    if(name==='chromium')await run('resize-settle-compositor-chip-off',{reducedMotion:'no-preference'},async(p,c,row,capture)=>{
      await p.addInitScript(()=>{try{sessionStorage.setItem('aion-site-intro','seen');}catch{}});await p.addInitScript(resizeProbe);
      await p.goto(base+'/#install');await settled(p);await p.waitForTimeout(900);
      const cdp=await c.newCDPSession(p),frames=[],writes=[];
      cdp.on('Page.screencastFrame',f=>{
        const path=`${dir}/${row.id}-paint-${String(frames.length).padStart(3,'0')}.png`;
        frames.push({path,timestamp:f.metadata.timestamp,data:f.data});row.artifacts.push(path);
        writes.push(writeFile(path,Buffer.from(f.data,'base64')));
        cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId}).catch(()=>{});
      });
      await cdp.send('Page.startScreencast',{format:'png',everyNthFrame:1,maxWidth:1440,maxHeight:1000});
      try{
        await p.evaluate(()=>document.querySelector('[data-scheme-chip]').addEventListener('click',()=>{window.__t0=performance.now();window.__epoch=performance.timeOrigin+window.__t0;},{capture:true,once:true}));
        await p.locator('[data-scheme-chip]').click();await p.waitForFunction(()=>{const progress=window.__resizeProbe.reveal();return progress!==null&&progress>=.35&&progress<.8;});await p.evaluate(()=>window.__resizeProbe.frames(35));
        const resizeAt=await p.evaluate(()=>performance.now()-window.__t0);await p.setViewportSize({width:759,height:1000});await settled(p);await p.waitForTimeout(100);
        await cdp.send('Page.stopScreencast');await Promise.all(writes);
        const epoch=await p.evaluate(()=>window.__epoch);
        // The blank left margin contains only the page surface. It excludes the intentionally opposite-scheme install thumbnails.
        const painted=await p.evaluate(async frames=>Promise.all(frames.map(async f=>{
          const bytes=Uint8Array.from(atob(f.data),c=>c.charCodeAt(0)),bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
          const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);
          const pixels=ctx.getImageData(0,0,8,bitmap.height).data;let lightRows=0;
          for(let y=0;y<bitmap.height;y++){let light=0;for(let x=0;x<8;x++){const i=(y*8+x)*4;if((pixels[i]+pixels[i+1]+pixels[i+2])/3>150)light++;}if(light>=7)lightRows++;}
          return {path:f.path,timestamp:f.timestamp,width:bitmap.width,height:bitmap.height,lightRows};
        })),frames);
        for(const f of painted)f.t=f.timestamp*1000-epoch;
        row.measurements={url:p.url(),viewport:p.viewportSize(),resizeAt,transitions:await p.evaluate(()=>window.__transitions),painted};
        await capture(`${row.id}-settled`);
        const visible=painted.find(f=>f.t>=0&&f.t<resizeAt&&f.lightRows>8);
        assert.ok(visible,'the compositor probe did not see the reveal before the resize');
        const reset=painted.find(f=>f.t>visible.t&&f.lightRows===0);
        assert.ok(!reset,`the painted reveal reset to the outgoing scheme at ${reset?.t.toFixed(1)} ms after visible progress at ${visible.t.toFixed(1)} ms`);
      }finally{await cdp.send('Page.stopScreencast').catch(()=>{});await Promise.all(writes);await cdp.detach();}
    });
    await run('clipboard-unavailable-and-rejection',{},async(p)=>{
      await p.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined}));await p.goto(base+'/#install');await settled(p);await p.locator('[data-install-target] [data-copy]').first().click();assert.match(await p.locator('.copy-status').textContent(),/unavailable|select/i);assert.equal(await p.locator('.install-command code').first().evaluate(e=>getComputedStyle(e).userSelect),'text');
      await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('rejected');}}}));await p.locator('[data-install-target] [data-copy]').first().click();await p.waitForFunction(()=>document.querySelector('.copy-status').dataset.status==='error');assert.ok(await p.locator('.copy-status').isVisible());
    });
  }finally{await browser.close();}
  const result={browser:name,version,passed:rows.every(r=>r.passed),cases:rows.length,failed:rows.filter(r=>!r.passed).map(r=>r.id),rows};await writeFile(`${dir}/results.json`,JSON.stringify(result,null,2));return result;
}
const names=process.env.BROWSER?[process.env.BROWSER]:['chromium','firefox','webkit'];
for(const name of names)assert.ok(['chromium','firefox','webkit'].includes(name),`Unknown BROWSER ${name}`);
const results=await Promise.all(names.map(engineRun));await writeFile(`${output}/results.json`,JSON.stringify(results.map(({rows,...summary})=>summary),null,2));console.log(JSON.stringify(results.map(({rows,...summary})=>summary),null,2));if(results.some(r=>!r.passed))process.exitCode=1;
