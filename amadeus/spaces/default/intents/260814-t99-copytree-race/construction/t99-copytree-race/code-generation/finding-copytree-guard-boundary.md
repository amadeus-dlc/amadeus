## 背景・対象範囲

Issue #3003 の修正(copyTreeWithRetry の attempt 毎 dest クリア)で射程外とした残余 3 面の記録。いずれも `tests/` 配下のコピー堅牢性・注入シームの整理であり、プロダクトコードには触れない。

## 根拠・実測証拠

測定 ref: branch `fix-3003-t99-copytree`(origin/main `5b12d96e9` 起点)。RE 記録 `amadeus/spaces/default/codekb/amadeus/re-scans/260814-t99-copytree-race.md` に再実行可能な検索述語つきで収載。

1. **fixtures.ts:784 の姉妹面**: `setupIntegrationProject` 内で `:769` が `copyTreeWithRetry` でガードする dist ツリーの直後に、`cpSync(AMADEUS_MEMORY_SRC, ...)` が素のまま実行される。同一関数内で同じ並行変異レースに曝されながら post-condition なし — 部分コピーが無音通過する(可視の赤より悪い)。
2. **未ガード素 cpSync 面**: 実 dist / AMADEUS_SRC 系を post-condition なしで読む cpSync サイトが多数(件数は検索述語依存: 狭い述語 19 サイト / 15 ファイル、広い述語 89 / 41 — RE 記録 P-A 述語参照。件数を AC に使う場合は述語を AC 側に固定すること)。
3. **CopyTreeOps.exists の copy 側未消費**: `fixtures.ts:619` の `exists` は copyTreeWithRetry 本体から一度も呼ばれない(RemoveTreeOps 側 :580 でのみ消費)。「どのコードも消費しない検証用フィールド」(team.md 検証劇場クラス)に該当する疑い。

## 期待結果・完了条件

トリアージで以下を裁定し実装する: (a) :784 姉妹面のガード適用 (b) 未ガード面のガード適用範囲(全数置換 / 高頻度共通経路のみ / 現状維持)と、採る場合の検索述語の AC 固定 (c) `exists` フィールドの除去または消費。完了条件は裁定された範囲の実装 + 対象テスト緑 + フルスイート緑。

## 影響・価値

未ガード面では #3003 と同じレースが起きても検査がなく部分コピーが無音通過し、後段テストが偽 green / 偽 red を出しうる(xrev-260814-3003 両レビュアーの指摘)。

## 関連

- Issue #3003(本体修正)/ xrev-260814-3003 / PR #2593(copyTreeWithRetry 導入、#2397 対策)
- 発見 intent: 260814-t99-copytree-race

## 初期分類

- 種別: bug(既存の合意済み契約「partial copy を無音で通さない」への違反面が残存)/ 優先度: P3 / 重大度: S4-MINOR
