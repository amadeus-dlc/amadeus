# Build and Test Summary — 260807-projectdir-worktree-fix

上流入力(consumes 全数): code-generation-plan（実装ステップと検証集合の正本）、code-summary（実装決定・Red/Green・裁定系譜の出典）

## ビルド状態

成功。前提は bun のみ（build-instructions.md）。source-only 境界のため fresh worktree は `bun install && bun run build` の bootstrap が必要。

## テスト種別インベントリ

| 種別 | 成果物 | 実体 |
|---|---|---|
| Unit（要件駆動） | unit-test-instructions.md | t481 — in-process 直 import、7ケース（AC-1a〜1f 対応、C+env は env 勝ち pin） |
| Integration | integration-test-instructions.md | t144（shipped layout 逐語形 B pin 含む 11 tests）+ hook 不変3本 + 閉包実証 + PR CI フルスイート |
| Performance | performance-test-instructions.md | **適用外宣言**（性能 NFR 不在 — 根拠と既存担保面を明記、新規試験なし） |
| Security | security-test-instructions.md | **適用外宣言**（セキュリティ NFR 不在 — 本修正自体が監査整合性の保護、新規試験なし） |

## カバレッジ

- 新規行は t481 の in-process 駆動で全行計測（spawn 盲点なし）。正規判定 = PR #2413 の Patch Coverage Gate / Project Coverage Gate（絶対 AND 相対）— **PASS 実測**
- t481 は実 FS fixture のため integration 層配置（in-process と層は独立の2軸）

## Readiness 評価

- **build-ready**: ✅（再現性検査 = Reproducible build も PR CI で pass）
- **test-ready**: ✅（対象集合 41 tests green + PR CI フルスイート green）
- **deployment-ready**: ✅ 無条件 READY — 未検証面は受け入れ基準（FR-1〜3 / NFR-1〜4）の外に存在しない（cid:build-and-test:c2-unconditional-ready-boundary の実文照合: AC 全数がローカル実測または PR CI で閉包済み。「実装時実測」規定項目の先送りなし）

## 申し送り（AC 外・非ブロッキング）

- C+env で worktree を選ばせる経路はスコープ外（受け皿 `--project-dir`、恒久解 #1287 — requirements Out of scope 節が正本）
- マージは人間承認待ち（PR #2413 — no-AI-merge）。マージ着地後に Issue #2352 のクローズ判定（close-after-landing-verification）
- 副次 Issue 起票候補: #1492 allowlist フォールバック化（Q4 裁定で Out of scope、issue-first-capture 対象）

## 既知の制約

- 逐語形ケース B の Red は in-process で構造的に取得不能（E-PWF-CGDEV 裁定の検証面注記 — requirements AC-1a 参照）。逐語形の回帰 pin は t144 test 5b が担う
