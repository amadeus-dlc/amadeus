# Requirements Analysis 質問（260706-three-layer-build）

対象 Issue: [#572](https://github.com/amadeus-dlc/amadeus/issues/572)

回答は Issue の確定記載、leader ディスパッチ（2026-07-06 18:20 JST）、Phase 1 確定成果物からの出典付き転記である。新規の人間質問はない。

本質問の判断は次の上流成果物（consumes）に依る。

- [Phase 1 feasibility-questions.md](../../../260706-harness-codex/ideation/feasibility/feasibility-questions.md) — 設計 6 問の確定内容と付帯条件（Q1〜Q6 の再協議禁止の根拠）。
- [Phase 1 initiative-brief.md](../../../260706-harness-codex/ideation/approval-handoff/initiative-brief.md) — Phase 2 への引き継ぎ事項（起案材料と検証方針）。
- [codekb/amadeus/code-structure.md](../../../../codekb/amadeus/code-structure.md) — 現行の skills / .agents / harness 配置（FR-1 の移動対象実測の根拠）。
- [codekb/amadeus/architecture.md](../../../../codekb/amadeus/architecture.md) — promote 経路と parity 検査の位置づけ（FR-6 の追従対象の根拠）。
- [codekb/amadeus/component-inventory.md](../../../../codekb/amadeus/component-inventory.md) — installer と build 系 tooling の一覧（FR-4/FR-5 の統合点の根拠）。

---

## Q1. 設計の確定範囲は？

A. Phase 1 の 6 問（Q1=A/Q2=A/Q3=A/Q4=A/Q5=A/Q6=B）を確定として引き継ぎ、再協議しない。本 Intent で確定するのは build.ts の実現形・core/ の細部配置・検査の実装形（functional-design で確定）
B. 6 問も再協議する
X. Other (please specify)

[Answer]: A（Phase 1 で 5/5 全員一致 + gate 承認済み。initiative-brief の引き継ぎ事項の転記）

## Q2. scope の選択は？

A. refactor（全 skill 移動 + tooling 置き換え = 既存構造の再編成が主体。functional-design で build.ts を設計確定できる 8 stage 構成）
B. feature
X. Other (please specify)

[Answer]: A（ディスパッチの主候補。engine の freeform 解決 = bugfix は実態と乖離するため decision 記録付きで補正済み）

## Q3. #543（installer versioning、engineer2 進行中）との依存の扱いは？

A. 統合点（build 時 manifest 生成の接続面）を build.ts 設計に含め、#543 の merge 状況で実装まで進めるか接続点記録に留めるかを functional-design で確定する（検討中注記つき）
B. #543 の merge を待ってから本 Intent を開始する
X. Other (please specify)

[Answer]: A（Issue 作業内容「#543 のバージョン・ハッシュ manifest をビルド時生成に統合」の転記 + 並行運用ポリシーの意味的接触の申し送り。B は単独実行枠の確保と衝突する）

## Q4. restructure の実施形は？

A. solo window 内の 1 Bolt、最新 origin/main 基点、git mv、原子的 commit + nameMappings 拡張 + 検出器追従の 3 点セット、移動前後の等価性検証（sha256）つき
B. 複数 Bolt に分割
X. Other (please specify)

[Answer]: A（ディスパッチ順序制約 + Q1 付帯条件（#553 の実例に基づく 3 点セット）の転記）
