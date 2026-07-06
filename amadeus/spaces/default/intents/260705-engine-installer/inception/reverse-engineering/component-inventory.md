# component-inventory — 260705-engine-installer

正本は [codekb/amadeus/component-inventory.md](../../../../codekb/amadeus/component-inventory.md)（解析時刻 2026-07-05T12:25:00Z、解析基準 3049eadf、PR #496）である。本ファイルは参照台帳として重複記述を避ける。

## 採用根拠と既知デルタ

本 Intent の reverse-engineering は、前例（260705-agmsg-trial-docs、260705-steering-learnings）と leader の中継承認（2026-07-05T19:14:36Z、#498 症状への interim 対応の許可）に基づき、既存 codekb/amadeus/ を本ステージ成果物として採用し、codekb/engineer2/ は生成しない。

既知デルタ: git diff 3049eadf..origin/main（27e2dcca）は aidlc/ と docs/ のほかに 24 ファイル（PR #489 = pdm scope 追加: scopes/amadeus-pdm.md、scope-grid / stage-graph、validator lifecycle-v2、parity-map、pdm-scope eval、mise/settings の chore）を含む。本 Intent（インストーラ）は codekb の記述内容ではなく repo の実レイアウト（.agents/amadeus/ 7 dir、symlink 7 entry、hooks 配線 11 entry）を feasibility で実測済みであり、このデルタは採用の妨げにならない。codekb 本体の更新は本 Intent のスコープ外（CON-7）。
