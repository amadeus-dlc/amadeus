# RE 差分リフレッシュ — intent 260815-rfc-autonomy-modes（2026-08-15）

## §1 スキャン方式と断面

- base `83e1dbeefb3`（前回 observed、祖先性 exit 0）→ observed `2eb94f1e39e`（origin/main tip）。距離 3 コミット
- xrev differential scan mode は不採用（対象は Issue クロスレビューでなく approved RFC。currency 判定は RFC 実装引用への直接照合で実施）
- 区間帰属: 3 コミット全量が intent 260815-stale-epoch-landed（#3113 / #3114 / #3115）。RFC-0001 bound-surfaces（`packages/framework/core/`）との交差 **0 file**

## §2 RFC 実装引用の currency（11 件）

| 引用 | 判定 |
|---|---|
| `amadeus-intent-autonomy.ts:581` SEMI_ROUTINE_INTERACTIONS | 一致（逐語） |
| `amadeus-intent-autonomy.ts:636-640` allowsOccurrence 第 2 ガード | 一致 |
| `amadeus-intent-autonomy.ts:510-516` PROHIBITED_EFFECTS | 一致 |
| `amadeus-intent-autonomy.ts:930-974` resolveAutoDecision | 一致 |
| `amadeus-intent-autonomy-production.ts:833-838` 定数 approve 推奨 | 一致 |
| `amadeus-intent-autonomy-production.ts:713` 書込投影 | 一致 |
| `amadeus-intent-autonomy-production.ts:99-106` 効果分類消費 | 一致 |
| `amadeus-state.ts:1599` park guard 述語 | 一致 |
| `amadeus-stop.ts:569` transcriptIsConversational | 一致（逐語署名） |
| `amadeus-advisory-choice.ts:300-303` 効果分類 | 一致（逐語） |
| `amadeus-orchestrate.ts:2040` semi→gated ハードコード | **行移動 → `:2046`**（逐語一致、意味論不変） |

計測: 各行を `sed -n` で直読し RFC 記述の意味論と突合（本 intent RE、observed 断面）。

## §3 Verification（環境不変量）

- git 状態変更: worktree 追加なし。branch `work-rfc-autonomy` は RE 前に作成済み（RE 自体は読取のみ）
- GitHub 書込: ゼロ
- engine/state 変更操作: conductor の正規ループ(orchestrate next/report)のみ。スキャン自体はツール実行なし
- 書込範囲: `codekb/amadeus/`(architecture.md / code-structure.md / reverse-engineering-timestamp.md / 本ファイル)
