# Motion next-pass validation

Implementation scope: `apps/site` only. Palette values, packages and approved
artwork are unchanged. Brand v1.1.0 is pinned to
`edd50cc44e61caa45f39c5a1e025eb48fa42100a`; the local snapshot verifies.

## Behavior

- Explicit theme choices use the shared 720 ms linear diagonal incoming-root
  wipe. Unchanged, initial, system, restored, reduced-motion and unsupported
  changes settle immediately. The latest radio intent wins.
- Mobile disclosure uses 360 ms, commits semantics before motion, preserves
  scroll/focus and restores intrinsic layout after interruption or settlement.
- Copy results commit before 160 ms icon and status-edge feedback. Superseded
  promises cannot replace newer results. Confirmation remains for two seconds.
- Control presses and section rails use 160 ms. The palette link moves only its
  content and top rail. Native anchor scrolling remains native.
- The gold seam hands off to the teal terminal within 720 ms; reading content
  and artwork remain complete from the first frame.

A native View Transition excludes captured root content from pointer
hit-testing ([W3C painting and hit-testing model](https://www.w3.org/TR/css-view-transitions-1/)).
During a scene, `theme.ts` forwards a real click at a visible theme radio's
bounds to that control, preserving focus and latest-choice semantics. This
handler is restricted to root-targeted clicks while a scene is active and is
removed at teardown. Snapshot animation suppression remains in place until
the transition itself finishes, rather than only until the wipe animation ends.
History restoration re-reads a writable stored preference without replay.

## Reproduction

Build with `npm run build -w apps/site`, then run a production preview on an
isolated port. The browser harness imports an existing Playwright installation;
it adds no runtime or package dependency:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
SITE_URL=http://127.0.0.1:4187 EVIDENCE_DIR=/tmp/aion-motion-evidence \
node apps/site/test/browser/motion.mjs
```

`BROWSER=chromium|firefox|webkit` narrows an engine; `SKIP_CAPTURES=1` reruns only
interaction cases. Captures and machine-readable `results.json` remain outside
the public site's build. Missing browser engines are recorded as unavailable.
