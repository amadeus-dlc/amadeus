# 起票待ち GitHub Issue(権限制約により保留 — 2026-07-09)

**Title**: t92.test.ts (Group N, test 44) is red: bunx-resolved TypeScript exit-code drift for TS18003

**Body 要旨**:
- Bolt 4(publish-readiness)の検証中に発見。U1〜U4 の変更と無関係(`git log -- tests/integration/t92.test.ts` は rebrand コミットが最後)。2回の再実行で同一失敗 = 決定論的
- t92 Group N test 44 は「壊れた tsconfig で tsc が exit 2(TS18003)」を期待する回帰ガード
- `amadeus-sensor-type-check.ts` は `bunx tsc --project ... --incremental ...` で起動。pinned typescript 6.0.3(node_modules/.bin/tsc)は exit 2(期待どおり)だが、この環境の `bunx tsc` は v7.0.2 を解決し同一フィクスチャで exit 1
- 対応選択肢: (a) センサーの tsc 起動を pinned 版に固定(node_modules/.bin/tsc 優先)、(b) テスト期待値に exit 1 も許容
- クロスカッティング(センサー実装 or テスト期待値)のため installer intent スコープ外 — team.md の Issue 起票ノルム該当
