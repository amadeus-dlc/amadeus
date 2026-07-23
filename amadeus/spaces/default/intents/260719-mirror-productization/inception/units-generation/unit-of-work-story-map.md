# Unit of Work Story Map — 260719-mirror-productization

上流入力(consumes 全数): components.md、component-methods.md、services.md、component-dependency.md、decisions.md、requirements.md

> 写像の導出元: ジャーニー列は requirements.md の FR 群と decisions.md ADR-3/5 の運用面、Unit 列は components.md の C1〜C4(unit-of-work.md の Unit 境界と同一)、診断・分岐の体験は component-methods.md C2 手順と services.md の gh optional 前提から導出。

## 利用者ジャーニー別マップ

| ジャーニー | 利用者価値 | 提供 Unit |
|---|---|---|
| 導入(他プロジェクトで mirror を使い始める) | フレームワーク配布物として mirror が届く(gh がある環境で即利用可) | U1(+T-norm) |
| リカバリー(乖離診断) | `/amadeus-mirror` で status 診断→create/sync/close へ案内 | U1+U2 |
| 自動同期(節目の同期忘れ防止) | phase 境界の ask、auto-mirror 設定で sync 自動化 | U3+U4 |

## 価値の最小実行可能単位(ux-first-scope-for-distribution-intents 準拠)

Bolt 1(U1+U2)単独で「配布+診断+手動運用」の完結した利用者体験を提供する(段階昇格ではなく縦スライス)。U3+U4 は自動化の追加価値であり、U1+U2 着地後に独立して価値を積む。

## Cross-cutting stories(複数 Unit 跨ぎの明示)

- **リカバリー** = U1(status verb 本体)+U2(SKILL 入口・分岐案内)の2 Unit 跨ぎ — 診断ロジックは U1、体験の入口は U2 が持つ
- **自動同期** = U3(設定解決)+U4(engine 分岐)の2 Unit 跨ぎ — 設定の真実源は U3、発火判断は U4 が持つ
- **導入**は U1 単独(+T-norm のマージ順序前提)で完結

## Unit 内のストーリー実装順序

- **U1**: (1) 移設(挙動不変、t232 green)→ (2) status verb(乖離3クラス+exit 契約)→ (3) usage 出力の運用注記(ADR-5)— 挙動不変の検証を新規機能より先に固定する
- **U2**: (1) SKILL 骨格(status 入口)→ (2) create/sync/close 分岐案内+運用注記(ADR-5 の3条件)— U1 の status 出力契約が確定してから分岐文言を書く
- **U3**: (1) パーサ(fail-closed)→ (2) 3層解決(下位優先)→ (3) default off — parse-don't-validate の内側から外側へ
- **U4**: (1) 境界検出+ask 分岐 → (2) auto-mirror print 分岐 → (3) 未作成×auto の ask 降格 — 既定動作(ask)を先に固定し、auto は上乗せ

## Coverage verification(全数検証)

- 全ジャーニー3件(導入/リカバリー/自動同期)は上表で Unit へ割当済み — 未割当 0
- 全 Unit 4件(U1/U2/U3/U4)はいずれかのジャーニーに出現 — ストーリーを持たない Unit 0(機械照合: 表+cross-cutting 節の Unit 出現集合 = {U1,U2,U3,U4})
