# D003: B002 の Task Generation 承認

## 背景

B002（手順記載と promote 同期）の Task 分解が Task Generation Gate の `ready_for_approval` に到達し、人間の承認待ちになった。

## 判断

B002 の Task 分解（T001 SKILL.md の `## 同梱スクリプト` への手順記載、T002 promote 同期と非破壊確認）を Maintainer が承認した。
`taskGeneration.status` を `passed` にし、実装実行へ進める。

準備で確定した判断（evals.json への LLM eval 追加はしない、README への記載はしない）も併せて承認する。

## 理由

Task が Bolt の完了条件（手順が利用者向け文書から読める、promote 同期、`test:it:promote-skill` pass）と 1:1 以上で対応しており、記載先が `StateScaffold.ts` の先例と同居する見出しに確定しているため。

## 影響

実装実行は T001、T002 の順で進める。
承認 evidence として本判断を `state.json` の `taskGeneration.evidence` に記録する。
