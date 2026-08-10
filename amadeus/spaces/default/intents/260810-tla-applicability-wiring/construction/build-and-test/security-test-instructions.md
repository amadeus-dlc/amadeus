# Security Test Instructions — 260810-tla-applicability-wiring

上流入力（consumes 全数）: `code-generation-plan.md`（D2 の宣言検証裁定を消費）、`code-summary.md`（実装面の棚卸しを消費）

## 適用判定

攻撃面の増分を実測で棚卸しし、対応する検査を比例選定する（`cid:build-and-test:c3` — 実測明記のある場合のみ比例選定、既存必須 scan の省略根拠にしない）。

- **新規入力面 1: 宣言 `handoff.stage`**（plugin.json → engine directive）— slug regex（`STAGE_SLUG_RE`）で検証され、path・引数・シェル語彙の混入を構造的に拒否する。負側は t526「a handoff that names no stage slug is invalid rather than ignored」で固定済み。argv は配列のみ（シェル文字列非受理 — BR-U2-19 既存契約）。
- **新規入力面 2: `subjects declare` の宣言ファイル**— 書込前検証 + fail-closed 3 経路（`governed-subjects-unreadable` / `unresolvable-id` / io-failure）は NFR-2 で無緩和と要件固定され、t524/t445 が負側を固定。
- **秘密情報・認可面**: 増分なし（新規 env・credential・外部通信なし）。

## 既存必須検査

リポジトリ全体の依存 audit・既存 CI セキュリティ面は本 intent と独立に維持される（対象変更の regression と全体 audit の別判定 — `cid:build-and-test:c1-doctor-seam`）。専用 DAST 等は対応 NFR 不在のため生成しない。
