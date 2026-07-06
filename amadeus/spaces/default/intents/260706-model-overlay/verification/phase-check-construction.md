# Phase Check — Construction（260706-model-overlay）

対象 phase: Construction（refactor scope、実行ステージは functional-design / code-generation / build-and-test。unit: model-overlay）
検査日: 2026-07-06

## トレーサビリティ

| 連鎖 | 状態 |
|---|---|
| FR-1（overlay 設定: 宣言・base 記録・fallbacks・bootstrap window 排除） → functional-design（O-1、BR-2）→ code-generation（model-overrides.json + apply の base 3 分岐）→ eval (b)(e) GREEN | Fully traced |
| FR-2（適用スクリプト正 + promote 連携 + 上流同期後の再適用） → functional-design（CLI 仕様、BR-6）→ code-generation（apply-model-overrides.ts、promote フック = fail-soft + redirect スキップへ gate 確定で再定義、AGENTS.md 運用注意）→ eval (a)(b)(j) GREEN | Fully traced |
| FR-3（parity 逆変換正規化・drift 検出・可逆性） → functional-design（BR-4/5/9、BR-12 = FR-3.2 機構描写の不採用を gate 確定）→ code-generation（parity-check.ts 正規化 1 段）→ eval (c)(d)(i) GREEN | Fully traced |
| FR-4（fallback 明示発動 + 発動記録 + doctor 警告） → functional-design（BR-3/7。BR-7 は gate 承認条件 = 読み取り失敗時 1 行警告）→ code-generation（--use-fallback --reason、doctor 検査）→ eval (f)(g) GREEN | Fully traced |
| reviewer 所見（functional-design: 3 反復で READY / code-generation: 2 反復で READY。High = promote フック blast radius は発火限定 + fail-soft + eval (j) で解消） → 遡及 RED 3 件で検出力実証 | Fully traced |
| build-and-test の fresh 検証（2026-07-06 全 pass、build-test-results.md） → 実適用状態（2 agent = fable、base 記録済み） | Fully traced |

## カバレッジ

- NFR-1（決定論的検証）: eval 10 系列 37+ 検査が test:it:all → test:all 連鎖で常設。恒真でないことは遡及 RED 3 件と手動独立検証（管理外値の拒否・parity fail 再現）で確認済み。
- FR-1.3（配布対象外）: installer MANIFEST の許可リスト方式を実測確認（BR-11。dev-scripts/ は配布対象に含まれない）。
- Corrections c3: parity-map.json exceptions へ理由追記、skills/ 正準ソース不在を grep で確認。

## 整合性検査

- 承認済み文書からの逸脱 2 件（BR-12 = FR-3.2 機構描写の不採用、FR-2.2 = 「no-op 前方互換ガード」の再定義）は、いずれも memory.md Deviations に記録し、それぞれ functional-design gate / code-generation gate の人間承認で確定済み。
- Per unit は実 unit 名 model-overlay へ record 整合済み（Corrections c2）。
- origin/main（29f3122c）追従済み。intents.json / parity-map.json の競合は union で解消し、追従後の再検証（eval / parity / validator）pass。

## 警告

- doctor の「宣言 agent ファイル不在時の 1 行警告」は今回見送り（reviewer 任意対応。code-summary.md に判断記録）。必要になれば後続 Issue とする。

## 人間承認

- [x] functional-design の gate を人間が承認した（auto 委任、leader 内容確認 2026-07-06 15:32 JST、HUMAN_TURN mint・DECISION_RECORDED 転記済み。BR-7 条件付き承認 + BR-12 確定）。
- [x] code-generation の gate を人間が承認した（auto 委任、leader 内容確認 2026-07-06 17:12 JST、HUMAN_TURN mint・DECISION_RECORDED 転記済み。FR-2.2 再定義の確定）。
- [ ] build-and-test の gate 承認（本 phase-check を添えて gate 報告 → 中継承認受信後に転記する）。
