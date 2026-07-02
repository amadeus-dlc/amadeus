# D003: Task Generation の人間承認

## 背景

B001、B002、B003 の Task Generation Gate が `ready_for_approval` に到達し、2026-07-02 に人間へ承認を求めた。

## 判断

人間は 3 Bolt の Task 生成を承認した。

- B001: `provenance:generate` の eval 先行（9 項目スキーマ、Pnnn 採番、未コミット変更の入力エラー）と最小実装の 2 Task。
- B002: `provenance:check` の eval 先行（drift 3 種、スキーマ不適合、exit code 契約、実 workspace 検証）、最小実装、`test:it:all` 連鎖への組み込みの 2 Task。
- B003: policies.md と development.md の文書整合の 2 Task。

## 理由

Task が Functional Design（BR001〜BR009、BL001〜BL006）、Unit Design Brief、Bolt 完了条件に対応し、TDD の順序（eval 先行 RED → 最小実装 GREEN）が作業と証拠候補に明記されているため。

## 影響

3 Bolt の `taskGeneration.status` を `passed` にし、この判断を `approval` evidence として記録する。実装実行へ進める。
