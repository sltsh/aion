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
  if (startTransition) Document.prototype.startViewTransition = function (update) { const t = () => Math.round(performance.now() - (window.__t0 ?? 0)); const entry = { start: t(), width: innerWidth }; window.__transitions.push(entry); const vt = startTransition.call(this, update); vt.finished.then(() => { entry.finished = t(); }); return vt; };
  const live = () => window.__transitions.some(e => e.finished === undefined);
  // The page scene's incoming reveal as the engine runs it: the clip animation's progress on the new root snapshot, or null.
  // Samples carry the frame's timestamp, the time the engine sampled the animation at, not the time the callback ran.
  const reveal = () => { if (!live()) return null; const a = document.getAnimations().find(a => a.effect?.pseudoElement === '::view-transition-new(root)' && a.playState === 'running'); const p = a?.effect?.getComputedTiming().progress; return typeof p === 'number' ? p : null; };
  const frames = ms => new Promise(resolve => { const start = performance.now(), out = []; const step = t => { out.push(t); if (performance.now() - start < ms) raf(step); else resolve(out); }; raf(step); });
  window.__resizeProbe = {
    running, share, reveal,
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
      const hero = document.querySelector('[data-hero]'); let value = share(), changed = t0;
      let arrived; const observer = new MutationObserver(() => { const s = share(); if (s !== value) { value = s; changed = performance.now(); if (s >= .999) arrived ??= changed - t0; } });
      if (hero) observer.observe(hero, { attributes: true, attributeFilter: ['data-hero-share'] });

      let quiet = 0, calmSince, intervals = [], previous, seen = changed; const reveals = [];
      return new Promise(resolve => { const step = t => { if (previous !== undefined) intervals.push(t - previous); previous = t; const now = performance.now(); const r = reveal(); if (r !== null) reveals.push([Math.round((t - t0) * 10) / 10, Math.round(r * 1000) / 1000]);
        const busy = window.freezeFrames || running().length || document.documentElement.hasAttribute('data-intro') || document.documentElement.hasAttribute('data-theme-transition');
        if (busy) { quiet = 0; calmSince = undefined; } else { calmSince ??= now; quiet = seen === changed ? quiet + 1 : 0; } seen = changed;
        if (quiet >= 3 || now - t0 > bound) { observer.disconnect(); intervals.sort((a, b) => a - b); const ended = now - t0 <= bound; resolve({ ended, end: Math.max(changed, calmSince ?? now) - t0, frame: intervals[Math.floor(intervals.length / 2)] ?? 1000 / 60, share: value, reveals, arrived }); } else raf(step); }; raf(step); });
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
    try {await Promise.race([action(page,context,row,capture),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('Case exceeded30s')),30000);})]);assert.deepEqual(errors,[],'page errors');if(!row.artifacts.length)await capture();row.passed=true;}
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
    await run('resize-settle-font-during-assembly',{reducedMotion:'no-preference',viewport:{width:1440,height:1000}},async(p,_c,row)=>{
      let release;const gate=new Promise(resolve=>{release=resolve;});await p.route('**/*.woff2',async route=>{await gate;await route.continue();});
      await p.addInitScript(()=>{try{sessionStorage.setItem('aion-site-intro','seen');}catch{}});await p.addInitScript(resizeProbe);
      await p.goto(base+'/#depth',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>!document.documentElement.hasAttribute('data-intro'));await p.waitForTimeout(900);
      await p.locator('#depth').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(100);
      assert.equal(await p.evaluate(()=>document.fonts.status),'loading');
      await p.evaluate(()=>{const frame=document.querySelector('[data-depth-frame]');window.__movers=[...frame.querySelectorAll('.depth-mover:not(.depth-base)')];window.__frameWrites=0;new MutationObserver(r=>{window.__frameWrites+=r.length;}).observe(frame,{childList:true});
        const f=()=>Number(getComputedStyle(window.__movers[0]).getPropertyValue('--site-depth-f'));window.__assembly=[];
        document.querySelector('[data-depth-assemble]').addEventListener('click',()=>{const t0=performance.now();window.__t0=t0;document.fonts.ready.then(()=>{window.__fontsAt=performance.now()-t0;});const step=t=>{window.__assembly.push([Math.round((t-t0)*10)/10,f()]);if(performance.now()-t0<1400)requestAnimationFrame(step);};requestAnimationFrame(step);},{capture:true,once:true});});
      await p.locator('[data-depth-assemble]').click();await p.waitForFunction(()=>performance.now()-window.__t0>=200);release();
      await p.waitForFunction(()=>window.__assembly.at(-1)?.[0]>=1350,null,{timeout:5000});
      const result=await p.evaluate(()=>({assembly:window.__assembly,fontsAt:window.__fontsAt,frameWrites:window.__frameWrites,kept:window.__movers.every(m=>m.isConnected)&&document.querySelectorAll('[data-depth-frame] .depth-mover:not(.depth-base)').length===window.__movers.length}));
      const still=await p.evaluate(()=>window.__resizeProbe.still(2000));row.measurements={...result,still};
      assert.ok(result.fontsAt!==undefined&&result.fontsAt<600,`fonts did not land during the assembly (${result.fontsAt} ms)`);
      assert.equal(result.frameWrites,0,'the movers were replaced');assert.ok(result.kept,'a transitioning mover was removed');
      const a=result.assembly,drops=a.slice(1).map(([t,v],i)=>[t,a[i][1]-v]);const frame=a.slice(1).map(([t],i)=>t-a[i][0]).sort((x,y)=>x-y)[Math.floor((a.length-1)/2)];
      const steepest=Math.max(...drops.filter(([t])=>t<=result.fontsAt).map(([,d])=>d));const late=drops.filter(([t])=>t>result.fontsAt);
      row.measurements.timeline={frame,steepest,lateSteepest:Math.max(...late.map(([,d])=>d))};
      assert.ok(a.every(([,v],i)=>i===0||v<=a[i-1][1]),'the assembly reversed or restarted');
      assert.ok(late.every(([,d])=>d<=steepest+1e-3),`the parts jumped when the fonts landed: ${JSON.stringify(late.filter(([,d])=>d>steepest+1e-3))}`);
      const lastChange=drops.filter(([,d])=>d>0).at(-1)?.[0];row.measurements.timeline.lastChange=lastChange;
      assert.ok(lastChange!==undefined&&lastChange>=720-2*frame&&lastChange<=720+2*frame,`the assembly last moved at ${lastChange} ms, not at the end of its 720 ms timeline`);
      assertStill(still,'fonts during assembly');
    });
    // B1 in flight: the resize keeps the share, neither restarts nor extends the sequence, and the page is still once it ends.
    const sequence=async(kind,resize,row,evidence=false)=>{
      const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'dark',reducedMotion:'no-preference'});const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(7000);
      try{
        if(kind!=='intro')await p.addInitScript(()=>{try{sessionStorage.setItem('aion-site-intro','seen');}catch{}});
        else await p.addInitScript(()=>new MutationObserver((_r,o)=>{if(document.querySelector('.splash-intro')){window.__t0=performance.now();o.disconnect();}}).observe(document,{subtree:true,childList:true}));
        await p.addInitScript(resizeProbe);await p.addInitScript(holdFrames);

        const mark=selector=>p.evaluate(s=>{window.__t0=undefined;(s?document.querySelector(s):window).addEventListener(s?'click':'pointerup',()=>{window.__t0=performance.now();},{capture:true,once:true});},selector);
        if(kind==='intro')await p.goto(base,{waitUntil:'domcontentloaded'});
        else{await p.goto(base+(kind==='chip-off'?'/#install':'/'));await settled(p);await p.waitForTimeout(900);}
        if(kind==='glide'){const box=await p.locator('[data-hero-handle]').boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await mark(null);await p.mouse.move(box.x+box.width/2+25,box.y+box.height/2,{steps:3});await p.mouse.up();}
        if(kind==='chip-on'||kind==='chip-off'){assert.equal(await p.evaluate(on=>{const r=document.querySelector('[data-hero]').getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;}),kind==='chip-on');await mark('[data-scheme-chip]');await p.locator('[data-scheme-chip]').click();}
        await p.waitForFunction(()=>window.__t0!==undefined);await p.evaluate(()=>{window.__ended=window.__resizeProbe.end(window.__t0);});
        const result={kind,resized:resize};
        if(resize){
          await p.waitForFunction(at=>performance.now()-window.__t0>=at,{glide:400,intro:900,'chip-on':300,'chip-off':300}[kind]);
          await p.evaluate(()=>{window.freezeFrames=true;});result.before=await p.evaluate(()=>window.__resizeProbe.share());result.revealBefore=await p.evaluate(()=>window.__resizeProbe.reveal());result.at=await p.evaluate(()=>performance.now()-window.__t0);
          await p.setViewportSize({width:759,height:1000});result.after=await p.evaluate(()=>window.__resizeProbe.share());
          await p.evaluate(()=>{window.freezeFrames=false;window.heldFrames.splice(0).forEach(callback=>requestAnimationFrame(callback));});
        }
        // Evidence only: screenshots taken while the sequence runs. Chromium paints view-transition snapshots into them; Firefox and
        // WebKit screenshots show the live document, so their page-scene frames show the committed scheme.
        if(evidence){result.frames=[];while(result.frames.length<24){const t=await p.evaluate(()=>performance.now()-window.__t0);if(t>2400)break;const path=`${dir}/${screenshotName(`${row.id}-frame-${String(result.frames.length).padStart(2,'0')}`)}.png`;await p.screenshot({path});row.artifacts.push(path);result.frames.push({t:Math.round(t),path,reveal:await p.evaluate(()=>window.__resizeProbe.reveal()),share:await p.evaluate(()=>window.__resizeProbe.share())});}}
        Object.assign(result,await p.evaluate(()=>window.__ended));result.still=await p.evaluate(()=>window.__resizeProbe.still(2000));
        const path=`${dir}/${screenshotName(`${row.id}-${evidence?'evidence':resize?'resized':'baseline'}`)}.png`;await p.screenshot({path});row.artifacts.push(path);
        Object.assign(result,{url:p.url(),viewport:p.viewportSize(),screenshot:path,transitions:await p.evaluate(()=>window.__transitions??null)});
        assert.deepEqual(errors,[],'page errors');return result;
      }catch(error){try{const path=`${dir}/${screenshotName(`${row.id}-${resize?'resized':'baseline'}-failure`)}.png`;await p.screenshot({path});row.artifacts.push(path);}catch{}throw error;}
      finally{await context.close();}
    };
    for(const kind of ['glide','intro','chip-on','chip-off'])await run(`resize-settle-in-flight-${kind}`,{},async(_p,_c,row)=>{
      const baseline=await sequence(kind,false,row);const resized=await sequence(kind,true,row);const evidence=await sequence(kind,true,row,true);row.measurements={baseline,resized,evidence};
      assert.ok(baseline.ended&&resized.ended,'the sequence did not finish within 6 s');
      if(kind==='glide')assert.ok(baseline.end>1000&&resized.end>1000,'a release without velocity starts no glide to compare');
      assert.ok(Math.abs(resized.after-resized.before)<1e-3,`share moved across the resize ${resized.before} → ${resized.after}`);
      const frame=baseline.frame;
      if(kind==='glide'||kind==='intro'){
        assert.ok(resized.end<=baseline.end+frame,`the resize extended the sequence: ${resized.end.toFixed(1)} ms against ${baseline.end.toFixed(1)} ms + ${frame.toFixed(1)} ms`);
        assert.ok(resized.end>=baseline.end-2*frame,`the resize cut the sequence short: ${resized.end.toFixed(1)} ms against ${baseline.end.toFixed(1)} ms - ${(2*frame).toFixed(1)} ms`);
      }else{
        // A page scene starts once the engine has captured its snapshot, and that latency differs between page loads by tens of
        // milliseconds (WebKit: hundreds), so the scene is compared on its own clock. Each reveal frame implies the scene's start as
        // t - progress x 720 ms: a restart, a jump or a cut shows as a different implied start. The sequence then ends no later
        // after its scene's deadline than the unresized one does, plus one frame, and not before the deadline.
        const implied=r=>r.reveals.filter(([,q])=>q>.02&&q<.98).map(([t,q])=>t-q*720);const spread=list=>list.length?Math.max(...list)-Math.min(...list):0;
        const after=resized.reveals.filter(([t])=>t>resized.at);const starts=implied(resized);const tolerance=2*Math.max(frame,resized.frame);
        const deadline=r=>Math.min(...implied(r))+720;
        row.measurements.reveal={baselineStarts:implied(baseline).map(Math.round),resizedStarts:starts.map(Math.round),revealBefore:resized.revealBefore,after,baselineDeadline:deadline(baseline),resizedDeadline:deadline(resized),tolerance,throwArrived:[baseline.arrived,resized.arrived]};
        assert.ok(implied(baseline).length&&starts.length,'no page-scene reveal observed');
        assert.ok(spread(implied(baseline))<=tolerance,`the unresized scene ran off its own clock: ${implied(baseline).map(Math.round)}`);
        assert.ok(spread(starts)<=tolerance,`the resize moved the scene's clock: implied starts ${starts.map(Math.round)} (tolerance ${tolerance.toFixed(1)} ms)`);
        assert.ok(resized.end>=deadline(resized)-frame,`the resize cut the scene short: ended ${resized.end.toFixed(1)} ms, deadline ${deadline(resized).toFixed(1)} ms`);
        assert.ok(resized.end-deadline(resized)<=baseline.end-deadline(baseline)+frame,`the resize extended the scene: ended ${(resized.end-deadline(resized)).toFixed(1)} ms after its deadline against ${(baseline.end-deadline(baseline)).toFixed(1)} ms + ${frame.toFixed(1)} ms`);
        // The snapshot itself must last: a skipped transition takes the outgoing page away however long its animation object runs.
        const shown=r=>Math.max(...(r.transitions??[]).map(e=>e.finished??Infinity));
        if(resized.transitions?.length){row.measurements.reveal.shownUntil=[shown(baseline),shown(resized)];
          assert.ok(shown(resized)>=deadline(resized)-tolerance,`the page scene's snapshot ended at ${shown(resized)} ms, before its deadline ${deadline(resized).toFixed(1)} ms`);}
        if(kind==='chip-on')assert.ok(Math.abs(resized.arrived-baseline.arrived)<=2*frame,`the resize moved the throw's arrival: ${resized.arrived?.toFixed(1)} ms against ${baseline.arrived?.toFixed(1)} ms`);
        if(resized.revealBefore!==null){
          assert.ok(after.length>0,`the page scene stopped at the resize (${resized.reveals.length} reveal frames, none after ${resized.at.toFixed(0)} ms)`);
          assert.ok(after.every(([,q])=>q>=resized.revealBefore-.02),`the page scene restarted after the resize: ${resized.revealBefore} → ${after.map(([,q])=>q)}`);
        }
      }
      assertStill(resized.still,`${kind} after the sequence`);
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
