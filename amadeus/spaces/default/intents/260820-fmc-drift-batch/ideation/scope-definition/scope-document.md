# Scope Document — 260820-fmc-drift-batch

上流入力: `ideation/intent-capture/intent-statement.md`(必須・実在)を正本として消費する。`feasibility-assessment` と `constraint-register` は self-feature スコープが feasibility ステージを SKIP するため設計どおり不在(consumes_absent expected)であり、制約は本書 §制約 に直接記載する。

## In Scope(確定境界)

capability inventory 全5件(すべて SETTLED — 出典は `scope-definition-questions.md` §確定済み境界):

| ID | Capability | 出典 |
|---|---|---|
| C-3186a | tla-authoring 適用性判定への語彙 drift 検出の腕 | #3186 期待結果1 |
| C-3186b | 欠陥再発による authoring 評価の強制起動の腕 | #3186 期待結果 |
| C-2289 | registration committer の revise-model 同名置換 + 不在名 fail-open 閉鎖 + t448 再スコープ | #2289 + XR-260820-2289 |
| C-2929 | model-map 実装境界の3面同時是正(validator/loader/sensor)+ PR系2モデルの plugin 実装 pin + 述語1定義化 | #2929 + XR-260820-2929 |
| C-3187 | advisory authoring-hold 経路の完全退役(宣言・コード・t528 同一変更) | #3187 ユーザー裁定 2026-08-20 |

## Out of Scope

- #3246 の waiting terminal(AWAITING_RULING)モデル新規作成 — ユーザー裁定で別 intent
- t448 自己参照比較(検証劇場)の修正 — 別 Issue 起票のみ(intent-capture Q3=C)
- 後方互換レイヤー・フォールバック分岐・移行シムの追加 — ユーザー直接指示により禁止(org.md Forbidden の再確認)
- リリース・publish 等の不可逆外部操作 — grant 対象外(常に人間)

## 制約

- 全変更は `packages/framework/core/` / `plugins/` の正本編集 + `bun run build` 再生成(dist 直接編集禁止)
- Bolt PR ごとのスカッシュマージ、record checkpoint 同梱可。ブロッキング CI 集合(typecheck / lint / 再現性 / source-only / graph 不変量 / full tests / coverage 両ゲート / patch coverage / plugin-conformance-e2e)+ 台帳4クラス resync(model-map ハッシュピン / coverage-patch-allowlist / coverage-registry / prose リテラルテスト)
- TDD 既定(team.md Testing Posture): 失敗テスト→最小実装の vertical slice。落ちる実証は注入→赤→revert の1セット
- 検証順序は remote-first(push-first)— ローカルは typecheck / lint / targeted テストまで

## 依存とシーケンシング(Q1=A / Q2=A 裁定)

- 順序依存は1本のみ: **C-3187 → C-3186**(`plugins/formal-model-check/tools/tla-authoring.ts` を共有するため)
- C-2289 / C-2929 は相互独立・他とも独立で並列実装可
- Bolt 1 は walking-skeleton ゲート対象(self-feature の Mandated)。以後の並列編成は delivery-planning で確定
- ハードデッドラインなし(Q3=A)

## Value Stream

検出(C-3186a/b)→ 改訂の commit(C-2289)→ governed 被覆(C-2929)→ 死経路の退役(C-3187)の4部品で「モデルが実装と共に生き続ける」閉ループが成立し、形式検証の防御力(4モデル・13 entries)が実装前進に追随可能になる。
