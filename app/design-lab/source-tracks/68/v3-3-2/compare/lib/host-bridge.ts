/**
 * Source Track 68 — Host Bridge
 *
 * Host-side adaptation of the frozen V3.3.1 A/B and V3.3.2 launcher sources.
 * The frozen source HTML bytes are NEVER modified in the repository. This
 * module performs in-memory, client-side transformations at runtime:
 *
 *  1. Injects `<base>` so relative `../images/` paths resolve to the
 *     local public-assets directory.
 *  2. Replaces the two CloudFront hero MP4 URLs with the local companion
 *     assets (DIRECT_CLOUDFRONT_HOTLINK = NOT_AUTHORIZED).
 *  3. Injects a bridge `<script>` before `</body>` that:
 *     - intercepts `window.open` and routes portal navigation through the
 *       fail-closed repository portal ledger (HOLD targets never navigate);
 *     - adds WORKS overlay modal semantics (role=dialog, aria-modal, focus
 *       trap, background inert, Escape, focus return);
 *     - adds role=button to WORKS rows;
 *     - pauses RAF choreography when prefers-reduced-motion is active;
 *     - restores visible cursor for reduced-motion desktop fine pointers.
 *
 * SOURCE BEHAVIOR (frozen, unmodified): hero scrub, 9-Moment archive,
 * scroll choreography, portal graph, WORKS index, keyboard activation.
 *
 * HOST ADAPTATION (this module): media transport, portal routing,
 * accessibility remediation, reduced-motion correction.
 */

import {
  SOURCE_TRACK_68_COMPARE_RUNNER,
  SOURCE_TRACK_68_HERO_LEFT,
  SOURCE_TRACK_68_HERO_RIGHT,
  SOURCE_TRACK_68_LAUNCHER,
  SOURCE_TRACK_68_PORTAL_LEDGER,
  SOURCE_TRACK_68_VARIANT_A,
  SOURCE_TRACK_68_VARIANT_B,
} from "./provenance";

export type CompareMode = "launcher" | "A" | "B";

export interface BridgeMessage {
  readonly type: "track68-select-variant" | "track68-portal-open";
  readonly variant?: "A" | "B";
  /** Child-supplied target ID — UNTRUSTED. Parent recomputes from ledger. */
  readonly targetId?: string | null;
  readonly sourceLabel?: string;
  /** Child-supplied route — UNTRUSTED. Parent recomputes from ledger. */
  readonly resolvedRoute?: string | null;
  /** Child-supplied status — UNTRUSTED. Parent recomputes from ledger. */
  readonly status?: "DESIGN_LAB_TARGET" | "STABLE_REPO_TARGET" | "HOLD_UNRESOLVED" | "FAIL_CLOSED_UNKNOWN";
}

/**
 * The source-local portal path prefixes that `window.open` receives.
 * The frozen source's `resolveWork()` fails on `about:srcdoc` base, so
 * `window.open` gets the raw relative path. These prefixes identify targets.
 */
const PORTAL_PATH_PREFIXES: ReadonlyArray<{
  readonly prefix: string;
  readonly targetId: string;
}> = [
  { prefix: "../../67_", targetId: "67" },
  { prefix: "../../65_", targetId: "65" },
  { prefix: "../../../../코덱스/14_", targetId: "C14" },
  { prefix: "../../../../코덱스/13_", targetId: "C13" },
  { prefix: "../../../../코덱스/12_", targetId: "C12" },
  { prefix: "../../../../코덱스/11_", targetId: "C11" },
  { prefix: "../../../../코덱스/10_", targetId: "C10" },
  { prefix: "../../../../코덱스/09_", targetId: "C09" },
  { prefix: "../../../../코덱스/08_", targetId: "C08" },
];

/** Build the resolved-route lookup injected into the bridge script. */
function buildResolvedRoutesObject(): string {
  const entries: string[] = [];
  for (const entry of SOURCE_TRACK_68_PORTAL_LEDGER) {
    if (entry.routeStatus === "DESIGN_LAB_TARGET" && entry.resolvedRepositoryRoute) {
      entries.push(`'${entry.sourceTargetId}':'${entry.resolvedRepositoryRoute}'`);
    }
  }
  return `{${entries.join(",")}}`;
}

/** Build the HOLD target list injected into the bridge script. */
function buildHoldTargetsArray(): string {
  const hold = SOURCE_TRACK_68_PORTAL_LEDGER
    .filter((e) => e.routeStatus === "HOLD_UNRESOLVED")
    .map((e) => `'${e.sourceTargetId}'`);
  return `[${hold.join(",")}]`;
}

/** Build the portal path-prefix matcher injected into the bridge script. */
function buildPortalPrefixArray(): string {
  const entries = PORTAL_PATH_PREFIXES.map(
    (p) => `{p:'${p.prefix.replace(/'/g, "\\'")}',t:'${p.targetId}'}`,
  );
  return `[${entries.join(",")}]`;
}

/**
 * Generate the bridge script injected before `</body>`.
 * This is HOST ADAPTATION code, not source behavior.
 */
function buildBridgeScript(mode: CompareMode): string {
  const resolvedRoutes = buildResolvedRoutesObject();
  const holdTargets = buildHoldTargetsArray();
  const portalPrefixes = buildPortalPrefixArray();
  const variantLinks =
    mode === "launcher"
      ? `
    // Launcher mode: intercept A/B card clicks and notify parent to switch variant.
    document.querySelectorAll('a.card').forEach(function(card) {
      card.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var href = card.getAttribute('href') || '';
        var variant = href.indexOf('V3.3.1A') !== -1 ? 'A' : href.indexOf('V3.3.1B') !== -1 ? 'B' : null;
        if (variant) {
          window.parent.postMessage({ type: 'track68-select-variant', variant: variant }, '*');
        }
      });
      // Also handle keyboard activation
      card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });`
      : "";

  return `<script>
(function(){
'use strict';
var PREFIXES=${portalPrefixes};
var RESOLVED=${resolvedRoutes};
var HOLD=${holdTargets};

// ── Portal navigation: intercept window.open (fail-closed) ──
var origOpen=window.open;
window.open=function(url,target,features){
  var tu=url||'',du;
  try{du=decodeURIComponent(tu)}catch(_){du=tu}
  var tid=null;
  for(var i=0;i<PREFIXES.length;i++){
    if(tu.indexOf(PREFIXES[i].p)!==-1||du.indexOf(PREFIXES[i].p)!==-1){
      tid=PREFIXES[i].t;break;
    }
  }
  if(tid){
    var route=RESOLVED[tid]||null;
    var status=HOLD.indexOf(tid)!==-1?'HOLD_UNRESOLVED':'DESIGN_LAB_TARGET';
    window.parent.postMessage({type:'track68-portal-open',targetId:tid,resolvedRoute:route,status:status},'*');
    return null;
  }
  // Unknown source-local path — fail closed
  window.parent.postMessage({type:'track68-portal-open',targetId:null,resolvedRoute:null,status:'FAIL_CLOSED_UNKNOWN'},'*');
  return null;
};

${variantLinks}

// ── Accessibility: WORKS overlay modal semantics (HOST ADAPTATION) ──
function remediateWorksOverlay(){
  var overlay=document.getElementById('worksOverlay');
  if(!overlay)return;
  // Add role=dialog and aria-modal (source lacks these)
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  // Label the dialog
  var brand=overlay.querySelector('.works-brand strong');
  if(brand)overlay.setAttribute('aria-label',brand.textContent||'Works portal index');

  // Add role=button to non-current WORKS rows (source uses focusable divs without role)
  overlay.querySelectorAll('.work-row').forEach(function(row){
    if(!row.classList.contains('current')){
      row.setAttribute('role','button');
    }
  });

  // Focus trap inside the overlay
  var focusableSel='button,[role="button"],a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
  function trapFocus(e){
    if(!overlay.classList.contains('open'))return;
    var focusables=Array.prototype.slice.call(overlay.querySelectorAll(focusableSel))
      .filter(function(el){return el.offsetParent!==null||el.getClientRects().length>0;});
    if(focusables.length===0)return;
    var first=focusables[0],last=focusables[focusables.length-1];
    if(e.key==='Tab'){
      if(e.shiftKey){
        if(document.activeElement===first){e.preventDefault();last.focus();}
      }else{
        if(document.activeElement===last){e.preventDefault();first.focus();}
      }
    }
  }
  overlay.addEventListener('keydown',trapFocus);

  // Make background inert when overlay opens; restore when closed
  var focusReturnEl=document.getElementById('view');
  var bgElements=[];
  function setInert(inert){
    document.body.querySelectorAll('body > *').forEach(function(el){
      if(el!==overlay&&!el.contains?.(overlay)){
        if(inert){
          if(!el.hasAttribute('inert')){
            bgElements.push(el);
            el.setAttribute('inert','');
          }
        }else{
          el.removeAttribute('inert');
        }
      }
    });
    // Also handle children of scroll-spacer
    var spacer=document.getElementById('scroll-spacer');
    if(spacer){
      Array.prototype.forEach.call(spacer.children,function(el){
        if(el!==overlay){
          if(inert){
            if(!el.hasAttribute('inert')){bgElements.push(el);el.setAttribute('inert','');}
          }else{el.removeAttribute('inert');}
        }
      });
    }
  }

  // Observe class changes to sync inert + focus return
  var observer=new MutationObserver(function(){
    if(overlay.classList.contains('open')){
      setInert(true);
    }else{
      setInert(false);
      // Focus return handled by source closeWorks() which calls view.focus()
    }
  });
  observer.observe(overlay,{attributes:true,attributeFilter:['class']});
}

// ── Reduced-motion: pause RAF choreography (HOST ADAPTATION) ──
function applyReducedMotion(){
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  // Source uses requestAnimationFrame loops for scroll choreography + cursor.
  // Cancel all existing RAF callbacks and replace requestAnimationFrame with a no-op.
  var origRAF=window.requestAnimationFrame;
  // Call once to get pending IDs, then cancel
  // Replace RAF so future calls are no-oped (source calls RAF at bottom of script)
  window.requestAnimationFrame=function(){return 0;};
  // Also override cancelAnimationFrame to be safe
  window.cancelAnimationFrame=function(){};
  // Restore visible cursor for desktop reduced-motion (source .scroll-spacer has cursor:none)
  var spacer=document.getElementById('scroll-spacer');
  if(spacer){
    spacer.style.cursor='auto';
    // Re-enable video controls for reduced-motion users
    document.querySelectorAll('video').forEach(function(v){
      v.setAttribute('controls','');
      v.style.objectFit='contain';
    });
  }
}

// Run remediations after DOM is ready (source script runs synchronously)
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',function(){
    remediateWorksOverlay();
    applyReducedMotion();
  });
}else{
  remediateWorksOverlay();
  applyReducedMotion();
}
})();
<\/script>`;
}

/**
 * The `<base>` tag injected so relative paths resolve to local public assets.
 */
const BASE_HREF = `${SOURCE_TRACK_68_COMPARE_RUNNER.sourceAssetBase}/html/`;

/**
 * Transform the frozen launcher HTML into a host-bridge srcdoc.
 * - Inject `<base>` for relative A/B link resolution
 * - Inject bridge script (A/B link interception → parent postMessage)
 * Does NOT modify the frozen source bytes on disk.
 */
export function buildLauncherSrcdoc(frozenHtml: string): string {
  const bridge = buildBridgeScript("launcher");
  // Inject <base> after <html ...> tag
  let result = frozenHtml.replace(
    /(<html[^>]*>)/i,
    `$1<base href="${BASE_HREF}">`,
  );
  // Inject bridge script before </body>
  result = result.replace(/<\/body>/i, `${bridge}</body>`);
  return result;
}

/**
 * Transform a frozen variant (A or B) HTML into a host-bridge srcdoc.
 * - Inject `<base>` for relative image path resolution
 * - Replace CloudFront hero URLs with local companion paths
 * - Inject bridge script (portal interception + a11y remediation)
 * Does NOT modify the frozen source bytes on disk.
 */
export function buildVariantSrcdoc(frozenHtml: string): string {
  const bridge = buildBridgeScript("A");
  // Replace CloudFront hero URLs with local companion paths
  let result = frozenHtml
    .replace(SOURCE_TRACK_68_HERO_LEFT.cloudfrontUrl, SOURCE_TRACK_68_HERO_LEFT.assetPath)
    .replace(SOURCE_TRACK_68_HERO_RIGHT.cloudfrontUrl, SOURCE_TRACK_68_HERO_RIGHT.assetPath);
  // Inject <base> after <html ...> tag
  result = result.replace(
    /(<html[^>]*>)/i,
    `$1<base href="${BASE_HREF}">`,
  );
  // Inject bridge script before </body>
  result = result.replace(/<\/body>/i, `${bridge}</body>`);
  return result;
}

/**
 * Pinned fingerprints for the source-runner verification gate.
 */
export const SOURCE_TRACK_68_VERIFICATION_TARGETS = [
  {
    mode: "launcher" as const,
    label: "V3.3.2 Compare Launcher",
    assetPath: SOURCE_TRACK_68_LAUNCHER.assetPath,
    bytes: SOURCE_TRACK_68_LAUNCHER.bytes,
    sha256: SOURCE_TRACK_68_LAUNCHER.sha256,
  },
  {
    mode: "A" as const,
    label: "V3.3.1A Mystic / Mixed",
    assetPath: SOURCE_TRACK_68_VARIANT_A.assetPath,
    bytes: SOURCE_TRACK_68_VARIANT_A.bytes,
    sha256: SOURCE_TRACK_68_VARIANT_A.sha256,
  },
  {
    mode: "B" as const,
    label: "V3.3.1B East Asian",
    assetPath: SOURCE_TRACK_68_VARIANT_B.assetPath,
    bytes: SOURCE_TRACK_68_VARIANT_B.bytes,
    sha256: SOURCE_TRACK_68_VARIANT_B.sha256,
  },
];
