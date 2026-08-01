# Reliability Requirements — u1-schema-resolver

## 上流境界

`business-logic-model.md` の §1.2-1.5(スキーマ検証と非侵襲性)/ §2.2-2.6(リゾルバの境界と宣言照合)、`business-rules.md` の BR-S1/S8/S9、BR-R3/R4/R5/R6/R7、BR-C1、BR-P1〜P5、`requirements.md` の NFR-1(後方互換)/ NFR-2(fail-closed)を正本とする。

## 適用性の評価

本 Unit は CI 内で完走する検証ツールであり、可用性目標(SLA/SLO)、バックアップ/復旧、災害復旧、データ耐久性の概念を持たない(状態を永続化しない純粋パース + 解決)。これらのカテゴリは**適用外**とする — 根拠は非永続・非常駐の実行形態。適用する信頼性要件は fail-closed・後方互換・決定性・複製整合の4系統であり、これらは本ツールの信頼性の本体(誤緑を出さないこと)である。

## fail-closed(NFR-2)

- 未解決参照は `MODULE_DEP_UNRESOLVED`、循環(自己参照含む)は `MODULE_DEP_CYCLE`、文法外名は `MODULE_DEP_OUT_OF_BOUNDS` で**明示失敗**し、silent fallback / 打ち切り黙認 / 異常トークンの silent skip を全て禁止する(BR-R3 / BR-R4 / BR-R7)。
- 不正な TLA+ ソース(閉じられないブロックコメント)は末尾までコメントとみなし、偽の依存を返さない — 寛容な解析で誤った結果を出すより後段の照合で落ちる側へ倒す(BR-R6、graceful degradation の本 Unit 形)。
- 宣言照合は双方向(missing / extra)で、片方向の部分集合判定で緑にすることを禁止する(BR-C1 — 過剰宣言の取りこぼしは信頼性欠陥)。

## 後方互換(NFR-1)

- `auxiliaries` / `vocabulary` 省略モデルのパース結果・identity 値は変更前と **byte 不変**(BR-S1)。新規エラーコードを追加せず、失敗は全て既存 `invalid(...)` 経路(`MODEL_MAP_INVALID`)に乗せる(BR-S8 — `ModelLoadErrorCode` 列挙不変)。
- byte-identical 2 複製(`packages/framework/core/tools/` と `plugins/formal-model-check/tools/` の `amadeus-formal-verif-model-map.ts`)は同一 byte で同時更新し、`cmp` exit 0 と dual-copy テスト表の両側 green で実証する(BR-S9)。片側のみの更新は構造的にテストが落ちる。

## 決定性とテストカバレッジ

- 同一入力には常に同一出力(ソート・重複排除・起点除外、BR-R5)。走査順や環境に依存する非決定性を禁止する。
- **patch coverage 100% ゲート(全 Unit 共通、team-practices Testing Posture)**: 変更行 0-hit 不許容。スキーマ表テスト拡張(負例全件赤、BR-P1)と新規 t402(偽陽性 / 偽陰性 / 境界 red、BR-P2〜P4)を修正と同 PR で運び、`bun run typecheck` / `lint` / 既存テスト green を維持する(BR-P5)。

## Acceptance

合否は: (1) 境界 red 3種がそれぞれ固有コードで落ちること(t402)、(2) 省略モデルの byte 不変が既存テスト据置きで保たれること、(3) `cmp` exit 0 + dual-copy 表 green、(4) patch gate で変更行 0-hit なし、の4点で判定する。
