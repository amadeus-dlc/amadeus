# Unit of Work — 260802-source-only-dist

上流入力(consumes 全数): requirements(FR/NFR — 各 Unit の受け入れ根拠)、components(C1〜C9 と規模見積り — Unit 対応の正本)、component-methods(各 Unit の実装契約)、services(外部境界 — u1/u2 の fail-closed 契約)、component-dependency(依存グラフ — DAG の導出元)、decisions(ADR-A1〜A9 — 各 Unit の設計確定事項)。

## Unit 一覧

粒度原則: 1 Unit = 独立に実装・検証可能な境界(units-generation:c1)。**原子切替が必要な C9 追跡除外 + C7 段階2 + C8 は分割すると片側だけでは出荷不能なため単一 Unit(u8)へ統合**した。規模は components.md の見積りを Unit 単位へ再配分(実装+テスト行)。

| Unit | 内容(対応コンポーネント / ADR) | 主要成果 | 規模 |
|---|---|---|---|
| u1-asset-build | C1 / ADR-A2, A3。`buildDistAssets`(決定的 tar + SHA256SUMS + manifest + self-check)と release.yml `build-dist` ジョブ + `files:` 添付 | asset 生成経路(draft release で実証可能) | 250+250 |
| u2-installer-asset | C2 / ADR-A1, A4, A9。`ASSET_INTRO_VERSION` 分岐、asset 取得+checksum 検証+fail-closed、locate 2段 fallback、ALLOWED_HOSTS 拡張、ADR-003 改訂 | installer が asset 経路でインストール成功(= walking skeleton の縦切り完成) | 200+350 |
| u3-scope-promotion | C6。scope 定義の root 面コピー22ファイル(5 scope × 面 — #2043 実測)を**正本5ファイル**へ昇格(全 dogfood 面へ対称投影 — RA Q1)、grid 5キーは compile 導出、self-scope-consistency センサー追随 | 昇格済み正本+全面再現 | 60+150 |
| u4-hook-dispatcher | C3 / ADR-A5。追跡 dispatcher 1ファイル+settings.json の11参照書換 | bootstrap(a) 解消 | 80+120 |
| u5-agents-import | C4 / ADR-A6。AGENTS.md import 分離、composeRootAgents 廃止、PROJECT_INSTRUCTIONS 正本移設 | bootstrap(b) 解消・build の追跡ファイル不触 | 120+150 |
| u6-allowlist-canonical | C5 / ADR-A7。allowlist 正本データ+preserved import 化+.gitignore/.gitattributes 整合テスト(落ちる実証込み) | 三重定義の解消 | 100+200 |
| u7-ci-stage1 | C7 段階1。ci.yml build 前段、run-tests 入口ガード、再現性検査ジョブ新設(旧 check 並存) | build-before-test 基盤 | 250(= C7 の内 段階1 分) |
| u8-source-only-switch | C9 追跡除外 + C7 段階2 + C8 / ADR-A8。`.gitignore` 反転・追跡除外、旧 check 撤去、第3ガード再定義、境界ガード有効化(落ちる実証)、promote-self 再責務化 — **単一 PR の原子切替** | source-only 契約の成立 | 650(= C7 段階2 200 + C8 350 + C9 追跡除外分 100) |
| u9-docs-norms | C9 文書 / FR-6。README ほか文書更新、ノルム PR 5点の起草(マージは norm-changes-via-pr の人間承認) | 文書・規範の整合 | 200(= C9 の内 文書分。追跡除外分 100 は u8 へ) |

規模注記(総量保存の機械照合): 再配分はゼロサム — C7(450)= u7 250 + u8 内 200、C8(350)= u8、C9(300)= u8 内 100 + u9 200。u1〜u9 合計 = 500+550+210+200+270+300+250+650+200 = **3,130 = components.md C1〜C9 合計 3,130** と一致(reviewer iteration 1 Major の是正)。数値は行数見積り(コード+テスト)。ノルム PR は別 PR(norm-changes-via-pr)のため実装 PR 規模に含めない。

## 独立実装可能性の検証(units-generation:c1)

- u1/u2: u2 は ADR-A2 の tar 契約に対する fixture で単体開発可能だが、受け入れ(実 asset での E2E)は u1 成果に依存 — DAG エッジで表現(u1→u2)
- u3〜u7: 概ね独立(異なるファイル面 — scope 正本 / claude hooks / AGENTS+promote-self 合成部 / allowlist データ+テスト / ci.yml 前段)。並行実装可能。ただし **u5 と u6 は promote-self.ts を両方触る**(u6=preserved :101-114 / u5=:65-99,:422-437 — u5 FD 段の実測で訂正、bolt-plan は u6→u5 直列化済み)ため直列化し、u5 と u8 も同ファイルのため Bolt 編成時に非交差判定(c6)を行う
- u8: 追跡除外と検査切替は片側だけでは出荷不能(reviewer iteration 1 Critical の教訓)— 統合済み。u2〜u7 全完了+クリーン環境検証が前提
- u9: u8 の着地後に文書・規範を確定(先行すると文書が実態と乖離)

## 検証・受け入れの対応

各 Unit の受け入れは requirements の対応 FR(u1=FR-1、u2=FR-2、u3=FR-0、u4=FR-3.2、u5=FR-3.1 の冪等・不触性質/3.3、u6=FR-5.2/5.3、u7=FR-4.1+NFR-1+**FR-3.1 の単一コマンド script 新設面(u7 FD の申告により所有確定 — CI で build を呼ぶ当事者へ局所化)**、u8=FR-4.2/4.3/4.5+FR-5+NFR-2/3、u9=FR-3.5/FR-6)に従う。TDD 既定(project.md Testing Posture)を全 Unit に適用し、新設ガード(u6 整合テスト・u8 境界ガード)は落ちる実証を必須とする。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T18:06:30Z
- **Iteration:** 1
- **Scope decision:** none

DAG・Unit 境界・u8 原子切替は上流と精密整合だが、規模再配分が components.md 原資と +150 乖離(ledger-count-mechanical-recalc 違反)

### Findings

- Major: u7/u8/u9 の規模合計 3,280 が C 合計 3,130 と不一致 — C9 の u8/u9 内訳明示とゼロサム化が必要
- Minor: story map に stories 不存在の N/A 根拠注記なし

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T18:06:30Z
- **Iteration:** 2
- **Scope decision:** none

Major(規模ゼロサム化)と Minor(N/A 根拠)の是正着地を独立再計算(C計 3,130 = U計 3,130)で確認、DAG・story map への退行なし

### Findings

- 閉包確認: 規模再配分の総量保存を独立再計算で確認(個別対応も全件検算一致)
- 閉包確認: story map 冒頭の N/A 根拠注記の実在を確認
- 残存指摘なし
