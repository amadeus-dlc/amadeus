# Build and Test Summary

上流入力(consumes 全数): requirements.md、code-generation-plan.md、code-summary.md — FR-1〜FR-8 の合否基準を検証結果へ 1:1 で対応づける。

測定 ref: worktree plugin-dev、HEAD = 実装3コミット+record(base origin/main 0c4709102)。変更規模: `git diff 0c4709102..HEAD --stat` = 101 files / +4499 / -566(record 含む)。

## 合否判定(FR 別)

| FR | Issue | 判定 | 根拠(build-test-results.md の実測) |
| --- | --- | --- | --- |
| FR-1 | #1575 | **PASS** | canonical 1定義 grep 確認+再導入注入で赤(実証済み)。reviewer 独立 grep 一致 |
| FR-2 | #1585 | **PASS** | t339 green+起票時再現手順の verbatim 再適用(空ホスト doctor → 「Plugins: 0 installed」出力)を reviewer が独立実証 |
| FR-3 | #1586 | **PASS** | t340 green+compose→drop の FS 完全復元を reviewer が scratch ホストで独立再現(`find .claude/plugins` → not found) |
| FR-4 | #1589 | **PASS** | t341 (a)〜(f) 全実測 green(3独立実行: builder/conductor/reviewer)。0.76秒・オフライン |
| FR-5 | #1589 | **PASS(CI 実機は PENDING)** | ジョブ配線 t222 green+ローカル落ちる実証(意図的失敗→同一コマンド exit 1)。CI 実機の赤/緑は PR 初回 CI で確定(閉包条件: PR CI 実行) |
| FR-6 | #1590 | **PASS** | t132 8/8 green+count word 注入で赤+full CI exit 0 回復 |
| FR-7 | #1591 | **PASS** | E2E (a)(b)(e)+hook 巻き戻し falling proof+統合 doctor 対称化(同根第3面) |
| FR-8 | #1592 | **PASS** | E2E (c)(d)+recompile 巻き戻し falling proof |

## NFR

- NFR-1 オフライン決定性: E2E は env ゲート・ネットワークなし、serial 命名 — PASS
- NFR-2 隔離: temp workspace+残渣ゼロ assert(repo `plugins/`/`dist/`/`.claude` に `.amadeus-plugin*` 0件) — PASS
- NFR-3 テスト層規律: 新規実 FS テストは integration/e2e 層のみ、size purity ratchet green(wall-clock drift 2件は既存テストの宣言 vs 実測の注記であり本 intent 変更外) — PASS
- NFR-4 CI 予算: 並行ジョブ構成+E2E 0.76秒 — PASS(CI 実機 duration は PR で記録)

## 検証済み面と未検証面の書き分け(cid:build-and-test:verdict-names-unverified-facets)

- **検証済み**: claude 面の folder-drop 導入〜stage 到達〜drop 復元(出荷面・実バイナリ)、7ハーネス dist 同期、count-free ガード
- **未検証(明示引き継ぎ)**: (1) CI 実機での `plugin-conformance-e2e` ジョブの green/duration — PR 初回 CI で確定 (2) claude marketplace 経路 / 他ハーネス面の導入 E2E — requirements Out of Scope どおり残存 (3) FR-3 の「compose 前から空だった祖先ディレクトリ」エッジ — 実害未観測・安全側

## verdict

**条件付き READY** — 条件は FR-5 の CI 実機確定のみ(PR 発行で自動的に閉包)。ローカルで検証可能な全面は PASS。
