#!/usr/bin/env bash
# scripts/v2-check.sh: Countersign V2 guardrails (acceptance greps over src/v2).
# Exit 0 = clean, 1 = violations, 2 = setup error.
# Portable: macOS bash 3.2, BSD grep/sed/awk, shasum. Paths under src/v2 contain no spaces.
set -u
cd "$(dirname "$0")/.." || exit 2
V2="src/v2"
TOK="$V2/v2.css"
if [ ! -d "$V2" ] || [ ! -f "$TOK" ]; then echo "v2-check: $V2 or $TOK missing"; exit 2; fi
FAIL=0
N=0
EM=$'\xe2\x80\x94'

report() { # report <id> <description> <offending-lines>
  N=$((N+1))
  if [ -z "$3" ]; then echo "ok   $1  $2"; else echo "FAIL $1  $2"; printf '%s\n' "$3" | sed 's/^/       /' | head -40; FAIL=1; fi
}
# gr <regex> <files...>: grep with file:line prefixes; silent when the file list is empty
gr() { re=$1; shift; [ $# -gt 0 ] || return 0; grep -HnE -- "$re" "$@" </dev/null; }

CSS=$(find "$V2" -type f -name '*.css' | sort)
TS=$(find "$V2" -type f \( -name '*.ts' -o -name '*.tsx' \) | sort)
TSX=$(find "$V2" -type f -name '*.tsx' | sort)
# TS/TSX minus the two files that print motion and review vocabulary as copy
TS_APP=$(printf '%s\n' $TS | grep -vE "^$V2/(KitPage\.tsx|design-pending\.ts)\$")
TSX_APP=$(printf '%s\n' $TSX | grep -vE "^$V2/KitPage\.tsx\$")
SCREEN_TSX=$( { find "$V2/screens" "$V2/chrome" -type f -name '*.tsx' 2>/dev/null; [ -f "$V2/App.tsx" ] && echo "$V2/App.tsx"; } | sort)
UI_TSX=$( { printf '%s\n' $SCREEN_TSX; [ -f "$V2/KitPage.tsx" ] && echo "$V2/KitPage.tsx"; } | grep . | sort)
NONKIT_CSS=$(find "$V2" -type f -name '*.css' ! -path "$V2/kit/*" | sort)
MODEL="^$V2/model/"

# every CSS line OUTSIDE the token block of v2.css, as "file:line: text"
outside() { [ -n "$CSS" ] || return 0; awk 'FNR==1{t=0} /@tokens:start/{t=1} { if(!t) printf "%s:%d: %s\n", FILENAME, FNR, $0 } /@tokens:end/{t=0}' $CSS; }
# every line INSIDE the token block
inside()  { awk '/@tokens:start/{t=1} { if(t) printf "%s:%d: %s\n", FILENAME, FNR, $0 } /@tokens:end/{t=0}' "$TOK"; }
# outside lines whose matching declarations carry px values outside an allowed set
pxcheck() { # pxcheck <declaration-regex> <allowed-px-regex>
  outside | grep -E "$1" | while IFS= read -r l; do
    v=$(printf '%s\n' "$l" | sed -E 's/^[^:]+:[0-9]+: //' | grep -oE "$1[^;}]*" | grep -oE -- '-?[0-9.]+px' | grep -vxE "$2")
    [ -n "$v" ] && printf '%s\n' "$l"
  done
}
# outside lines with a typography declaration whose value is not exactly one role token
typecheck() {
  outside | awk '{ s = $0; while (match(s, /(font-size|font-weight|line-height|letter-spacing)[ \t]*:[^;}]*/)) {
    d = substr(s, RSTART, RLENGTH); if (d !~ /:[ \t]*var\(--t-[a-z0-9-]+\)[ \t]*$/) { print $0; break } s = substr(s, RSTART + RLENGTH) } }'
}
# outside lines whose transition/animation carries a literal duration (0s and 0ms are allowed)
durcheck() {
  outside | grep -E '(transition|animation)[a-z-]*[[:space:]]*:' | while IFS= read -r l; do
    v=$(printf '%s\n' "$l" | sed -E 's/^[^:]+:[0-9]+: //; s/(^|[^0-9.])0m?s([^a-z0-9-]|$)/\1\2/g' | grep -E '[0-9.]+m?s([^a-z0-9-]|$)')
    [ -n "$v" ] && printf '%s\n' "$l"
  done
}
# engine files that were already uncommitted before the V2 build: path:sha256 (edit only if the owner changes one on purpose)
BASELINE="src/agent/monitor.ts:bf6f47b21d1104691a1798cc9413b118d29486ec446e0381ff9b80de3523a22b
src/agent/runAgent.ts:914890655c90452424480e65868c3c2f0b6bf9743e108c839526b6ee7ade7b49
src/agent/synthesize.ts:d3795d7d924bb4e708bb633be4030722f055c9d2cc2239a8389f5022084e05c4
src/agent/whatif.ts:721b7e967b9f666fb29198c7f27375c487ddaa15d74c6dc109f76413ee40ee0f
src/agent/format.ts:1a8caef4aacbeb3d9ae17cfe1465bed5f9d0644d2dd45c541be7668a9882c786
src/agent/rating.ts:26a22b21f73284a1b09d1c5c2552b17f94090c39bb776e95428bf80b31f9a493
src/agent/policy.ts:ee9302ee7ce67370275224af544d026ccbbc66064420c0641dac472bdbc5b41b
src/agent/tools.ts:c192f8fa3d065991af814a80bd26aa0e7824e17b8339619339e5972a9d9b3837
src/agent/types.ts:0ee87874c4509efd6ae3afc399b37f93864d568df5689175d33ea83af87f95d8
src/agent/responder.ts:e2711122cccaf604d3529ad48af7fe3c93dcf2fa781b7d0718ee8eec2431fc18
src/agent/draftNote.ts:43f371774bc24bb1287b84c2d137295ed17b5a26421fd269868faa446395273d
src/agent/mockData.ts:7f23e8574a16db47532b3fdf72d2538590658d4cef3f2d68bde48d3498a6afd3
src/hooks/useCreditAgent.ts:6ec0ddc30bf823a91bbb3f13f5b3810ee198d8e511d8a3abed97f939348bf744
src/hooks/useMonitor.ts:0d2c62194ae45b45acb5ff84a48b92300b4ef39181bc79f545243c47f4e6401b
src/App.tsx:a04e3b16d009952b6ff754e2df0811912854f51b700b383a37264793f202b309
src/components/ApprovalGate.tsx:b9c2140fd558acac046fd33af97658311ee63fc76e34b3134e87d30fbfa5400b
src/components/Artifact.tsx:10a95ce1a981bfde4958696435f8df1713b18e37b0a5d19ce67bd0d8abdf4fa5
src/components/OutcomeBanner.tsx:052167f4694e1d0e1e8bc5c94334c6b329d53c4e766e9a47ea159fb8af48c3c8
src/components/StepCard.tsx:dab8c16d4a805e40616b78d9a3e8111d02211bc7b90c57e6a31de18a2619714e
src/components/WhatIfPanel.tsx:a46e8f5c9049e0edc9d60e69ae5ba7e0ef383b334e0ecd9699ba0b8fd0e68dcc
src/components/amendTerms.ts:28141b45e747dcaa773b48d6404db1e06c3334753265ab2c36e02701ec8477b0"
v1_changes() {
  { git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u | while IFS= read -r f; do
    case "$f" in
      src/v2/*|src/main.tsx|package.json|scripts/v2-check.sh|docs/v2/*|CLAUDE.md|.claude/*) continue ;;
    esac
    want=$(printf '%s\n' "$BASELINE" | awk -F: -v p="$f" '$1==p {print $2}')
    if [ -z "$want" ]; then echo "$f  (outside the V2 build area)"
    elif [ "$(shasum -a 256 "$f" 2>/dev/null | awk '{print $1}')" != "$want" ]; then echo "$f  (engine baseline file was edited)"; fi
  done
  git diff HEAD -- package.json | grep -E '^[-+]' | grep -vE '^(\+\+\+|---) ' | grep -vE '^\+[[:space:]]*"v2-check": "bash scripts/v2-check\.sh",$' | sed 's/^/package.json  /'
}

report C01 "no colour literals outside the token block" "$(
  outside | grep -E '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?([^0-9a-zA-Z_-]|$)|rgba?\(|hsla?\(|oklch\(|:[^;{]*[^a-z-](white|black|red|green|blue|gray|grey|silver|teal|navy)([^a-z-]|$)';
  gr '#[0-9a-fA-F]{6}([^0-9a-zA-Z_-]|$)|#[0-9a-fA-F]{3}([^0-9a-zA-Z_-]|$)|rgba?\(|hsla?\(' $TS )"
report C02 "no native title attributes" "$(gr '[[:space:]]title=' $TSX)"
report C03 "type only through role tokens" "$(
  typecheck;
  outside | grep -E '(^|[[:space:];{])font(-family)?[[:space:]]*:';
  gr 'fontSize|fontWeight|lineHeight|letterSpacing|fontFamily' $TSX )"
report C04 "role tokens: sizes 11/12/13/15/18/22px, line boxes 16/18/20/24/28px, weights 400/500/600; 12 role classes" "$(
  inside | grep -oE -- '--t-[a-z0-9-]+-size[[:space:]]*:[^;]*' | grep -vE ':[[:space:]]*(11|12|13|15|18|22)px$';
  inside | grep -oE -- '--t-[a-z0-9-]+-lh[[:space:]]*:[^;]*' | grep -vE ':[[:space:]]*(16|18|20|24|28)px$';
  inside | grep -oE -- '--t-[a-z0-9-]+-weight[[:space:]]*:[^;]*' | grep -vE ':[[:space:]]*(400|500|600)$';
  inside | grep -oE '(^|[^-])font-weight[[:space:]]*:[^;]*' | grep -vE 'font-weight[[:space:]]*:[[:space:]]*var\(--t-[a-z0-9-]+-weight\)$';
  for r in display heading body strong control small label meta eyebrow figure figure-lg token; do
    inside | grep -qE ": \.t-$r[[:space:]]*\{" || echo ".t-$r is not defined inside the token block"; done )"
report C05 "box-shadow only via --shadow-pop / --halo-focus / --halo-error" "$(
  outside | grep -E 'box-shadow[[:space:]]*:' | grep -vE 'box-shadow[[:space:]]*:[[:space:]]*(none|var\(--(shadow-pop|halo-focus|halo-error)\))[[:space:]]*(;|\}|$)';
  gr 'boxShadow' $TSX )"
INF=$(gr 'infinite' $CSS $TS_APP)
report C06 "exactly one infinite animation (the caret); keyframes from the allowlist" "$(
  if [ "$(printf '%s\n' "$INF" | grep -c .)" -ne 1 ] || ! printf '%s\n' "$INF" | grep -q 'v2-caret'; then
    printf 'need exactly 1 line with "infinite", on the v2-caret rule; found:\n%s\n' "$INF"; fi;
  [ -n "$CSS" ] && grep -hoE '@keyframes[[:space:]]+[A-Za-z0-9_-]+' $CSS </dev/null | awk '{print $2}' | grep -vxE 'v2-enter|v2-flash|v2-ink|v2-fill|v2-caret' )"
report C07 "no imports from V1 components, App or index.css" "$(gr "(from|import)[[:space:]]*\(?[[:space:]]*['\"](\.\./)+(components|App|index\.css)['\"/]" $TS)"
report C08 "no gradients, blur, backdrop-filter, filter or text-shadow" "$(
  gr 'gradient\(|backdrop-filter|blur\(|text-shadow|(^|[^a-z-])filter[[:space:]]*:' $CSS;
  gr 'gradient\(|backdropFilter|WebkitBackdropFilter|textShadow' $TSX )"
report C09 "no em dashes in V2 source" "$(gr "$EM" $CSS $TS)"
UPP=$(gr 'text-transform[[:space:]]*:[[:space:]]*uppercase' $CSS)
report C10 "uppercase only in .t-eyebrow and .t-token; toUpperCase only in src/v2/model/" "$(
  printf '%s\n' "$UPP" | grep . | grep -vE '^[^:]+:[0-9]+:[[:space:]]*\.t-(eyebrow|token)[[:space:]]*\{';
  [ "$(printf '%s\n' "$UPP" | grep -c .)" -le 2 ] || echo "more than 2 uppercase rules";
  gr 'toUpperCase\(' $TS | grep -vE "$MODEL" )"
report C11 "border/outline widths 1px or 2px; dashed only via the --line-provisional tokens" "$(
  pxcheck '(border(-(top|right|bottom|left))?(-width)?|outline(-width)?)[[:space:]]*:' '(0|1|2)px';
  outside | grep 'dashed';
  gr 'dashed' $TS )"
report C12 "no literal durations in transition/animation (0s allowed)" "$(
  durcheck;
  gr "(transition|animation)[A-Za-z]*['\"]?[[:space:]]*:" $TSX_APP )"
report C13 "at most one primary button per screen/chrome file" "$(for f in $SCREEN_TSX; do n=$(grep -o 'variant="primary"' "$f" | grep -c .); [ "$n" -gt 1 ] && echo "$f: $n primaries"; done)"
report C14 "light only: no theme switching" "$(gr 'prefers-color-scheme|data-theme|color-scheme[[:space:]]*:[[:space:]]*dark' $CSS $TS)"
report C15 "number/date formatting only in src/v2/model/" "$(gr 'toFixed\(|toLocale[A-Za-z]*\(|new Date\(|Intl\.' $TS | grep -vE "$MODEL")"
report C16 "no strokeWidth props (icon stroke is set in CSS)" "$(gr 'strokeWidth' $TSX)"
report C17 "agent tokens only from the model; banned decision words absent" "$(
  gr "['\">](APPROVE|ESCALATE|DECLINE|REJECTED)['\"<]" $TSX_APP;
  gr '(^|[^A-Za-z])(Approved|Declined)([^A-Za-z]|$)|Awaiting approval|Running(…|\.\.\.)' $CSS $TS_APP )"
report C18 "V2 never calls selectDeal (browsing must not abort a run)" "$(gr 'selectDeal\(' $TS)"
report C19 "browser storage only in src/v2/state/" "$(gr 'localStorage|sessionStorage' $TS | grep -vE "^$V2/state/")"
report C20 "every kit primitive is shown on the kit page" "$(
  [ -f "$V2/KitPage.tsx" ] || echo "KitPage.tsx missing";
  for n in $(cat $V2/kit/*.tsx 2>/dev/null | grep -oE 'export function [A-Z][A-Za-z0-9]*' | awk '{print $3}' | sort -u); do
    grep -qE "<$n([[:space:]/>]|\$)" "$V2/KitPage.tsx" 2>/dev/null || echo "$n is not rendered in KitPage.tsx"; done )"
report C21 "every data-pattern id has a design-pending entry" "$(
  for id in $(grep -rhoE 'data-pattern="P-[0-9]+"' $V2 </dev/null | grep -oE 'P-[0-9]+' | sort -u); do
    grep -q "id: '$id'" "$V2/design-pending.ts" 2>/dev/null || echo "$id has no entry in design-pending.ts"; done )"
report C22 "no hand-rolled controls in screens, chrome, App or KitPage (use the kit)" "$(gr '<(button|input|textarea|select|a)([[:space:]>]|$)' $UI_TSX)"
report C23 "kit classes are styled only in kit/kit.css" "$(gr '\.k-[a-z]' $NONKIT_CSS)"
report C24 "icon sizes 12/14/16 only" "$(gr 'size=\{[0-9]+\}' $TSX | grep -vE 'size=\{(12|14|16)\}')"
report C25 "radius only via --r-xs/--r-sm/--r-md/--r-pill" "$(outside | grep -E 'border-radius[[:space:]]*:' | grep -vE 'border-radius[[:space:]]*:[[:space:]]*(0|var\(--r-(xs|sm|md|pill)\))[[:space:]]*(;|\}|$)')"
report C26 "spacing on the 4px grid (no negative spacing)" "$(pxcheck '(^|[[:space:];{])(padding|margin|gap|row-gap|column-gap)(-(top|right|bottom|left|inline|block)(-start|-end)?)?[[:space:]]*:' '(0|4|8|12|16|20|24|32|40|48)px')"
report C27 "no !important" "$(gr '!important' $CSS)"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  report C28 "V1 untouched: changes only in src/v2, src/main.tsx, scripts/v2-check.sh, one package.json line" "$(v1_changes)"
else
  echo "skip C28  not a git work tree"
fi
if [ "$FAIL" -eq 0 ]; then echo "v2-check: $N checks, clean"; else echo "v2-check: $N checks, FAILED"; fi
exit "$FAIL"
