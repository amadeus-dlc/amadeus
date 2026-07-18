# re-scan 記録 — 260718-hooks-config-conflict

## 実行メタデータ

- Date: 2026-07-18(Asia/Tokyo)
- Intent: `260718-hooks-config-conflict`
- Issue: [#770](https://github.com/amadeus-dlc/amadeus/issues/770)
- Scope / project type: `bugfix` / Brownfield
- Repository / stage: `amadeus` / `reverse-engineering`(2.1)
- Base commit: `e9a001105d253e14affb77417423d9f0b0360f9e`
- Observed commit: `594ba21d636218558b711b371c286f16731fb081`
- Base selection: 全 `re-scans/*.md` の Observed commitを走査し、observedの祖先で距離最小の候補を採用。祖先性exit 0、距離8。
- Focus: `.codex/hooks.json` のreader／writer／packaging／activation／preserve／ignore／restart／bridge／testを対称棚卸しし、[PR #783](https://github.com/amadeus-dlc/amadeus/pull/783) の解決済みmarker面と残存hooks面を分離。
- 実施体制: Developer code scan→Architect synthesis。外部agmsg 1.1.7のreader／writerは別のread-only走査で独立照合。

## 結論

再発の根本原因は、Amadeusがtracked canonical activationとして扱う`.codex/hooks.json`を、agmsg 1.1.7がmutable per-machine runtime stateとしても扱う二重所有である。monitor runtimeはAmadeusの9 commandを意味的に保持して正常にbridge deliveryを成立させる一方、SQLite JSON1 compact rewriteと絶対skill／clone pathを同じtracked fileへ残す。

base..observedは8コミット、全体15 files・+842/-31だが、Codex hooks／emitter／run-codex／team-up／promote-self／関連test／docsのフォーカス契約変更は0件。新規regressionではなく、既存契約の組合せがCodex再導入で再顕在化した。

## reader／writer／配布経路

| 面 | 正の経路 | 観測結果 |
| --- | --- | --- |
| canonical writer | `packages/framework/harness/codex/emit.ts:25-54,291-298` | `HOOK_WIRING` 9 commandを整形済み`hooks.json.example`へ生成 |
| activation／reader | Codex guide／fixtureのexample→exact active copy、trust seed `emit.ts:156-172` | `.example`自体はruntime readerではない |
| self-install preserve | `scripts/promote-self.ts:84-97,207-299` | active bytesを比較／上書き／orphan除去から外す |
| agmsg path resolver | `type.conf:18-22`、`delivery.sh:63-81` | 同じ`.codex/hooks.json`をruntime fileへ解決 |
| agmsg writer | `delivery.sh:86-150`、`hooks-json.sh:35-158` | agmsg group strip→mode entry add→SQLite JSON1 compact write→`mv` |
| mode reader | `delivery.sh:172-220`、`codex-shim.sh:112-159` | active hooksのSessionStart／Stopからmodeを導出 |
| restart | `codex-monitor.sh:97-213`（`:194`再設定）、`scripts/team-up.sh:742-748` | 起動ごとにmonitor設定を再適用 |
| marker | 現行agmsg scriptsのexact reader／writerを別々に走査 | `.codex/agmsg-delivery-mode`は双方0件。hooksが正の真実源 |

absence claimはmarker literalのgrep 0だけに依存せず、上表の正のmode reader／writerを同時に確定した。

## 実測と独立再照合

| # | 主張 | 検証 | 結果 |
| --- | --- | --- | --- |
| 1 | observed=HEAD | `git rev-parse HEAD` | `594ba21d…` 一致 |
| 2 | baseは祖先 | `git merge-base --is-ancestor e9a0011 594ba21d` | exit 0 |
| 3 | base距離 | `git rev-list --count e9a0011..594ba21d` | 8 |
| 4 | canonical三者同一 | `git ls-files --stage`＋byte compare | blob `8eeff909…`、1925 bytes／93 lines |
| 5 | runtime差分 | read-only byte／JSON／Git diff比較 | 2021 bytes／改行0／1 insertion・93 deletions |
| 6 | Amadeus hooks保持 | agmsg-owned group除外後のevent／command multiset比較 | 9 commandと3 PostToolUse matcher一致 |
| 7 | machine state混入 | runtime command／commandWindowsをJSON parse | skill path／clone pathとも絶対path |
| 8 | focus区間変更 | `git diff base..observed -- <focus paths>` | 0件 |

## 恒久案と検証境界

| 案 | 利点 | 未解決事項 |
| --- | --- | --- |
| `【裁定待ち】` A: active hooksをuntrack／ignore | 現行agmsg／bridgeを変更せずfresh fixtureのtracked cleanを成立させやすい | canonical更新、既存tracked fileの安全migration、self-onlyかdistribution-wideか |
| `【裁定待ち】` B: tracked static dispatcher + ignored sidecar | canonicalをtracked／drift-guardedに保てる | 外部agmsg協調変更、legacy fallback、Windows／turn／restart／SessionEnd互換 |

共通完了条件は、monitor登録前後のtracked bytesとGit status不変、Amadeus 9 command保持、tracked absolute path不在、mode遷移の重複なし、Codex再起動後bridge delivery、dist／promote／trust seed greenである。pretty-printだけ、Codexが発見する証拠のないlocal fileへの単純移動、Codex退役前提の運用は受入条件を満たさない。

## CodeKB反映判断

更新: `architecture.md`（二重所有境界とInteraction Diagram）、`code-structure.md`（全経路台帳）、`component-inventory.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`reverse-engineering-timestamp.md`。同時に現コードと不一致だった「4 harness配布／Claude・Codexのみself-install」を、6 harness配布／Claude・Codex・Cursor・OpenCode self-installへ鮮度訂正した。

温存: `business-overview.md`（事業目的・主要機能に変更なし）、`api-documentation.md`（repository所有の公開API／CLI外形は未変更で、恒久config契約は裁定待ち）。

## 未決事項とdelivery boundary

- A／Bの採用、untrackの適用範囲、active初期化／migration、外部agmsgリリース同期、SessionEnd扱い、実agmsgをCI依存にするかは全て`【裁定待ち】`。
- 実装、外部agmsg変更、main merge/rebase、Issue close、PR作成／更新は未実施。
- user-owned dirty `.codex/hooks.json` と旧intentのstate／auditは変更していない。
