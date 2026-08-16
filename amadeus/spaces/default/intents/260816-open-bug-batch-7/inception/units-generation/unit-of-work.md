# Unit of Work — 260816-open-bug-batch-7

境界戦略: **Issue 単位**(1 Issue = 1 Unit = 1 PR、E-AD-24D2644A で計画承認済み)。定義の根拠は application-design の components.md(C-PI / C-NSD / C-SEN と 1:1)と requirements.md の FR 群。

## Unit 定義

### pi-distribution(kind: `packaging`)

- **責務**: #2363 の解消 — pi を dogfood self-install 配布集合(3 面 + ignore 生成)へ追加し、固定件数ピンのテスト 3 本と docs を同期(FR-PI-1〜3)
- **境界**: `scripts/promote-self.ts`、`scripts/plugin-projection.ts`、`packages/framework/core/tools/data/self-install-allowlist.ts`、生成 `.gitignore`/`.gitattributes`、対応テスト 3 本、docs 2 面
- **デプロイモデル**: なし(ビルド/配布スクリプト面 — kind: packaging)
- **複雑度**: M
- **制約**: core 正本変更を含むため build + 全ハーネス再現性検査(requirements.md 制約)。vendor 例外の 2 方向検証(decisions.md D2)

### nsd-provenance(kind: `library`)

- **責務**: #2162 の解消 — bootstrap fallback と provenance 面の退役(D1 = E-AD-BFDBEC73)、`baselineAtRevision` 死経路の除去、gate テストの events-only 再構成(FR-NSD-1〜2、AC は D1 の上書き後を正とする)
- **境界**: `tests/no-silent-drop/bootstrap.ts`、`ledger.ts`、`bootstrap-provenance.json`(削除)、`bootstrap/` fixtures(削除)、`no-silent-drop-gate.test.ts`、`t427`
- **デプロイモデル**: なし(テスト内ゲートエンジン — kind: library)
- **複雑度**: M(削除中心だがテスト再構成を伴う)
- **制約**: events 欠落 → fail-closed の negative test を落ちる実証つきで残す

### sensor-docs-sync(kind: `spec`)

- **責務**: #3097 の解消 — 07-sensor-system(en/ja)の matches 表を実在 13 件へ同期し、t3028 の件数フリー検査対象へ 07 を追加(FR-SEN-1〜2)
- **境界**: `docs/reference/07-sensor-system.md` / `.ja.md`、`tests/integration/t3028-sensors-docs-sync.integration.test.ts`
- **デプロイモデル**: なし(docs 契約 + guard — kind: spec)
- **複雑度**: S
- **制約**: en/ja 同一変更、落ちる実証(1 行注入 → Red → revert 残渣ゼロ)

## 横断制約

- 各 unit はクロスレビュー 2 名成立(対象 Issue)を実装バッチ組み込みの前提とする(requirements.md 制約)
- 実装は unit ごとの git worktree 分離、push-first(requirements.md NFR)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-16T14:12:18Z
- **Iteration:** 1
- **Scope decision:** none

3成果物はstage契約の必須要素(全unitのkind宣言、fenced yaml edge blockの整形・非循環、S/M/L/XL見積り)を満たし、FR7件はcomponents.mdのC-PI/C-NSD/C-SENと1:1対応で完全被覆、FR・コンポーネントID・決定IDのクロスリファレンスもすべて実在先に解決した。2.7/2.8の責務分離(実装順・critical pathの2.8への委譲)も守られ、stories SKIPに伴うFR代替も申告済みの読み替えであり無申告逸脱はない。軽微な出典欠落と見積り不整合をFOLLOW-UPとして記録するのみでBLOCKERは検出されなかった。

### Findings

- FOLLOW-UP | component-methods.mdとservices.mdが3成果物のどこにもファイル名で明示引用されていない。内容(公開面の変更契約、サービス層なし宣言)は反映されているが出典明記が欠落しており、upstream-coverageセンサーの参照チェックに抵触する可能性がある。
- FOLLOW-UP | unit-of-work.mdのsensor-docs-sync節の制約欄にdecisions.md D3への引用が欠けている。D3の『t3028内のderivedCorpus()からmatches宣言でフィルタして導出し、07専用の第2コーパス定義を作らない』という制約はconstruction phase.mdのcanonical-single-definitionガードレールに直結する実装制約だが、pi-distribution(D2引用)・nsd-provenance(D1引用)とは非対称にこのunitだけ決定ID引用がない。
- FOLLOW-UP | 複雑度見積り(S/M/L/XL)がcomponents.md自身の行数見積りと内部整合していない。nsd-provenance(変更5ファイル、−250〜−450行/+120〜200行、fixture・JSON削除+gate test再構成を伴う)とpi-distribution(変更8ファイル、+40〜80行/−10行)が同じ『M』であり、4〜10倍の変更規模差が反映されていない。sensor-docs-sync(60行)は同程度の規模のpi-distributionより低い『S』。2.8delivery-planningの工数配分判断を歪める可能性があるため見積り根拠の明記または再評価を推奨する。
- NIT | unit-of-work-story-map.mdのpi-distribution intra-unit実装順の記述がやや不明瞭。ステップ1『テストRed実測→集合追加』とステップ3『FR-PI-1のRedがここでGreen化』の記述を字義通り読むと、ステップ2(FR-PI-2)の作業中もFR-PI-3の固定件数テストがRedのまま放置される含意になる。unit内順序はstage契約上許容される記載範囲だが、code-generation側の誤解を避けるため文言の明確化を推奨する。

## 再束縛記録(2026-08-16、承認後)

unit `nsd-provenance` の対象 Issue を #2162 → **#3155** へ再束縛(ユーザー裁定。#2162 は解消済みでクローズ、残余ギャップが #3155)。責務は「#3155 の解消 — baselineAtRevision 死経路の除去、陳腐化 provenance 値の扱いの確定、実 artifact 非束縛 fixture / rebind 欠落の処遇確定」へ更新。D1 失効のため方式は実装前に再裁定(decisions.md の失効記録参照)。#3155 の主張は #2162 クロスレビュー独立 2 名の実測からの転記であり、独立検証済み。
