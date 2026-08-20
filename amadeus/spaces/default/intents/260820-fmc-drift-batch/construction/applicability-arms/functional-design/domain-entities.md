# Domain Entities — applicability-arms(U4 / #3186)

上流入力: `business-logic-model.md` / `business-rules.md` / `component-methods.md`(C1 変更面)/ `unit-of-work.md` U4 / `unit-of-work-story-map.md`(#3186 クローズ条件)/ `requirements.md` FR-ARM 群 / `components.md` C1 / `services.md`(CLI 面)。

## 新設されるエンティティ

| エンティティ | 所在 | 役割 |
|---|---|---|
| armCheck 段(vocabularyDrift / defectRecurrence) | `tla-applicability.ts`(judge 後・receipt 前) | 2本の腕の発火述語評価。結果は Result 判別ユニオン |
| coverageCheck 段 | 同上 | subject 実装面 × governed entries の被覆確認(明記 + 裁定提示、非再分類) |
| 値集合クラスタ述語 | 同上(内部関数) | .tla 値集合 S × 実装リテラルクラスタ C の `\|C∩S\|≥2 ∧ C⊄S` 判定(一般形) |
| 腕チェック結果の receipt 面 | 既存 receipt 契約(#3262)への追加フィールド | 発火有無・drift 詳細・プロパティクラス(invariants-only / has-properties)・被覆不足面・「未実施」明記 |
| CLI 入力 `--issue-evidence <path>` / `--changed <path,...>` | `tla-authoring.ts` applicability verb | conductor 供給の入力シーム(OQ-AD-2 確定 — plugin→core import 新設なし) |

## 変更されるエンティティ

| エンティティ | 所在 | 変更 |
|---|---|---|
| `AUTHORING_ROUTES` | `tla-applicability.ts:302` | 定義削除 → leaf `authoring-routes.ts`(U1 が新設 — 実装時に実在確認、不在なら停止)から import |
| applicability verb 出力 | `tla-authoring.ts`(dispatch 面) | 腕チェック結果の露出(新 verb なし — services.md の CLI 面変化と整合) |
| stage 契約 | `stages/tla-authoring.md`(:51 近傍、U3 撤去後断面) | 発火述語(腕2本 + 被覆確認)の明文 + two-layer 整合文 |
| docs | `docs/reference/22-formal-model-supply.{md,ja.md}`(U3 撤去後断面) | 腕の契約と two-layer 整合の追記(en/ja 同一変更) |

## 不変のエンティティ(境界確認)

- J1..J6 判定表・route 語彙・`intersectsRegisteredModel`(#3261)・terminal-route receipt の fail-closed(`tla-authoring.ts:447-450`)— 非接触
- `tla-registration.ts` / leaf `authoring-routes.ts` の内容 — U1 が新設する leaf の実在確認後に消費するのみ(import 追加、ファイル変更なし)
- model-map スキーマ・vocabulary 構造(A-1: 4モデル全てに存在)— 読取のみ
- engine(`amadeus-orchestrate.ts` の汎用 advisory 機構)— 非接触

## ライフサイクル

承認済み unit graph の辺は **C-3187 → C-3186(U3 → U4)の1本のみ**(unit-of-work.md §Constraints)— 本 FD はこれに辺を追加しない。U4 の実装は U3 の撤去断面(stage 契約 :53 撤去・docs 撤去後)の上で行う。leaf import 置換(手順6)は承認済み ADR-1/components.md の帰結(C1 の切替は C2 着地後)を消費し、実装時に leaf 実在を確認してから行う(不在なら停止)。vocabularyDrift の落ちる実証は二層設計(述語レベル = U1/U2 非依存の実 corpus 赤、pipeline レベル = fixture)により**他 unit の着地順に依存しない**(business-logic-model.md 手順2(a))。段挿入 + import 置換 + stage/docs 追記 + テストは1 PR で原子的に着地する。
