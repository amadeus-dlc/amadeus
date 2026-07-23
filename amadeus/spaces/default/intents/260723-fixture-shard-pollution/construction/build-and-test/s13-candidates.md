# §13 学習候補 — build-and-test(260723-fixture-shard-pollution)

提出: conductor e4、2026-07-23T05:12Z 頃。採否選挙用 verbatim 正本(所見なし — conductor-opinion 分離様式)。

## 候補1(採用提案)

**候補文**: coverage-patch-allowlist の行ピンは stale 検査(範囲が測定可能行に一致するか)に映らないまま**別の測定可能行へ無音転位**しうる — 行シフトを跨ぐ変更では、stale 検出されたエントリだけでなく**全エントリの reason 記述と現行行内容の一致**を直読照合する(検出された 4402-4403 に加え、未検出の 2916 が qualifiedStandingGrant 宣言行へ無音転位していた実測 — PR #1407)。統合先想定: cid:code-generation:allowlist-line-pin-stale への追補(e1 も §13 材料に推奨)。

## 不採用(PM 回付)

- allowlist stale 検出→再ピン自体は allowlist-line-pin-stale の既知クラス(違反実例)
- t257→t258→t259 のテスト番号連鎖は swarm-test-number-reservation の intent 間実例(E-ASGRES13 で PM 連鎖報告済み)
- ローカル環境赤(fast-check 欠落)の帰属は local-ci-red-assertion-verbatim の執行

parked open questions: 0 件。
