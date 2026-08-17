# Component Dependency — intent 260816-priority-bug-batch-3

requirements.md の 5 FR が触るコンポーネント間の依存・交差を、unit 分割と直列化の判断材料として確定する(一次実測は RE developer scan §4、codekb `architecture.md` の本 intent 節)。

## 依存マトリクス

| 呼出元 \ 呼出先 | C1 presence (state/lib) | C2 autonomy prod | C3 pr-convergence | C4 source-work guard | C5 election store |
|---|---|---|---|---|---|
| C1 (`amadeus-state.ts:3744`) | — | **呼ぶ**(approve 試行ごと) | — | — | — |
| engine `next`(`amadeus-orchestrate.ts:2822`) | — | **呼ぶ**(directive 発行ごと) | — | — | — |
| C3 センサー | — | — | 同一 report を独立検査 | — | — |
| 選挙 CLI(`amadeus-election.ts:318`) | — | — | — | — | **呼ぶ** |

## ファイル交差(write scope の衝突面)

| 領域 | 主要ファイル | 交差 |
|---|---|---|
| FR-1 (#3153) | `amadeus-state.ts`(:3721-3772)、`amadeus-lib.ts`(:3926-3941)、(q1 裁定次第で)`amadeus-presence-reservation.ts` | **FR-2 と呼出鎖を共有**(:3744 → `productionStageAutonomy`)。FR-4 と同一ファイルだが行域は離れている(:2491-2691 vs :3721-3772) |
| FR-2 (#3152) | `amadeus-intent-autonomy-production.ts`(:295-370)、(q2 裁定次第で)`amadeus-orchestrate.ts:2822` | **FR-1 と同一鎖**。`amadeus-orchestrate.ts` を触る場合は model-map ハッシュピン + allowlist セレクタの resync が発火(NFR-3) |
| FR-3 (#3149) | `plugins/github-pr-convergence/tools/`(cli / sensor / git-runner) | **他 FR と交差なし**。自己適用の運用注意のみ |
| FR-4 (#3156) | `amadeus-state.ts`(:2491-2691) | FR-1/FR-2 と同一ファイル(行域非重複)。dist 経由 import のテスト(t206)があるため `bun run build` 前提 |
| FR-5 (#3046) | `amadeus-election-store.ts`(:475-549, :1032-1092) | **他 FR と交差なし** |

## データフロー(修正対象経路)

- ゲート承認経路: `amadeus-state.ts approve` → `assertHumanPresentForGateResolution`(C1)→ `productionStageAutonomy`(C2、autoApprove 判定 + human-required 監査行)→(偽なら)`humanActedSinceGate`(C1)→ 承認/拒否。#3153 の欠陥はこの鎖の C2→C1 間で autonomy の結論が読み捨てられる点、#3152 は C2 が読取のたび監査行を積む点
- directive 発行経路: `amadeus-orchestrate.ts next` → `routeMainWorkflowDirective:2822` → C2(ゲート未開設でも human-required 行が積まれる — #3152 の第2発火点)
- PR 収束経路: pr-convergence CLI `report`(C3)→ lifecycle 遷移判定(:907-924)→ record へ mint → `pr-convergence-report-format` センサー(C3)が独立検査 → stage approve の blocking gate
- 選挙投票経路: `amadeus-election.ts vote:318` → `appendPending`(C5)→ 全体読み(:1042)→ 採番(:1063)→ per-voter 書込(:1088)。TOCTOU 窓は読み→書きの間

## 直列化・並列化の帰結(units-generation への入力)

1. **FR-1・FR-2 は同一呼出鎖・同一ファイル群** — 別 unit にする場合は直列実装(FR-2 → FR-1 の順を推奨: 冪等化で監査面を安定させてから結線を変える)。同一 unit への統合は 1 Issue = 1 Unit 原則に反するため不採用
2. **FR-4 は FR-1/FR-2 と同一ファイル**(`amadeus-state.ts`)— 行域は非重複だが、同一ファイル PR の並行は merge conflict と coverage 計測の相互破壊を招くため直列化(cid:code-generation:c1-coverage-single-owner)
3. **FR-3 と FR-5 は完全独立** — 他と並列実装可能
4. 推奨着地順(優先度キュー順 + 依存): FR-3(park 解除の前提)と FR-5 を並列先行 → FR-2 → FR-1 → FR-4 の直列(amadeus-state.ts 群)

## 共有リソース

- 監査シャード(append-only): C1/C2 が書く。同一 intent 内の並行書込は seq 単調性検査の対象(cid:code-generation:c1-shard-monotonic)
- `dist/` 自己インストール投影: C3 の自己適用と C4 のテスト(t206、dist 経由 import)が依存 — 各 unit のレビュー前に `bun run build` 必須(cid:code-generation:c1-mirror-and-rebuild-before-review)
