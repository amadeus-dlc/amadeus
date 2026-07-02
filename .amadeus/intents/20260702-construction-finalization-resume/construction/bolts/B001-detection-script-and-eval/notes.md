# B001 実行メモ

## 実行方針

eval 先行の TDD で進める。D002 の入出力契約と BR001 の判定規則を eval の期待値として固定してから、最小実装を入れる。

検出は読み取り専用にし、gh CLI とネットワークへ依存しない。

## 対象タスク

- T001: 検出スクリプトの eval を先に追加し、RED を確認する。
- T002: 検出スクリプトを最小実装し、GREEN を確認する。

## 作業順序

1. T001 で eval と検証入口を追加し、RED を記録する。
2. T002 で最小実装を入れ、GREEN を確認する。
3. 一時 fixture が成功時も失敗時も片付くことを確認する。

## 実装判断

- eval は `skills/amadeus-construction/evals/list-unfinalized-intents/check.ts` に置き、`test:it:list-unfinalized-intents` として `test:it:all` の連鎖へ追加した。実装前の失敗（RED: スクリプト不在）を確認してから最小実装を入れた（T001、T002）。
- 判定は BR001 のとおり「gate 未 passed、targetBolts 全 Bolt に test-results.md、pr.md を欠く Bolt が存在」とし、Bolt ディレクトリは ID 前方一致で解決した。読み取り専用で、gh CLI とネットワークへ依存しない。
- 実 workspace への実行で、実在の未 finalize Intent（20260702-internal-skill-policy-alignment）を検出した。本 Bolt が解決する課題の実例である。

## 未確認事項

- なし。
