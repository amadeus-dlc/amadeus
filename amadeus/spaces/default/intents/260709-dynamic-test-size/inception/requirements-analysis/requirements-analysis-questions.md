# Requirements Analysis — 明確化質問(#699 / dynamic-test-size)

> 起草: claude-engineer-1(conductor、amadeus-product-agent ペルソナ)。
> 回答経路: team.md の election-protocol(leader が全メンバーへ配信し、各自実測確認のうえ投票、多数決)。
> 既決事項は質問しない(no-election-for-decided-norms): per-file 粒度・DTrace 非前提・赤/緑 fixture 実証・#683 へ渡す軸は derived size・#696 成果物の重複実装禁止 — いずれも Issue #699 本文/AC・team.md Mandated で既決。

## Q1. duration 永続化の合流点(sink)

RE 実測: wall-clock は既測(`tests/run-tests.ts:724/762`、root JUnit `time` 秒 float)だが、`aggregateTierResults`(`run-tests.ts:430`)で `.meta` が集約後に全削除され、永続化経路が存在しない。coverage registry(`tests/gen-coverage-registry.ts`)は `covers:` 軸で直交。per-file の実測 duration+derived size をどこへ永続化するか?

A. 新規レポートファイル: runner が per-file `{file, scope, staticSize, duration, signals}` を JSON で書き出し、CI で artifact upload(registry と直交を保つ。RE 所見の推奨)
B. coverage registry を拡張して size/duration 列を追加(単一レジストリに集約、ただし covers: 軸と変更理由が異なる)
C. `.meta` の削除をやめて生データを保全(スクラッチ増加、スキーマは JUnit 由来のまま)
D. printSizeMatrix のテキスト出力拡張のみ(永続化しない — Issue の「CI artifact/registry 化」と不整合のため非推奨)
X. Other (please specify)

[Answer]: A(選挙 2026-07-09、4票全会一致。根拠: registry は covers: 軸と変更理由が異なり統合不可、.meta 削除は既存契約、ci.yml の coverage artifact パターン再利用が最小)

## Q2. 動的 drift(wall-clock 由来)の執行姿勢

静的 drift guard(`tests/unit/t-test-size-drift.test.ts`)は宣言 size < 実測(静的シグナル)で CI 赤。wall-clock 由来の drift(例: `small` 宣言なのに実測 ≥1s)はどう執行するか? CI マシンの実行時間分散による flake リスクがある。

A. 段階導入: 本 intent では advisory(レポート記録+matrix 表示。CI は赤くしない)とし、実測分布の安定を確認した後続 Issue でゲート昇格を判断(flake リスク回避)
B. 静的 guard と同格に即 CI 赤(分散対策なし)
C. 余裕係数付きで即ゲート(例: 宣言帯上限の3倍超のみ赤 — flake と検出力のバランス)
X. Other (please specify)

[Answer]: A(選挙 2026-07-09、4票全会一致。根拠: 実測分布の分散(unit p95=2.0s vs max=11.1s)で即ゲートは flake 源。静的 guard が CI 赤を既に担う。ゲート昇格は後続 Issue で判断)

## Q3. wall-clock 帯の閾値

size と実行時間の対応帯をどう定めるか(drift 判定・分類の基準値。NFR 是正 c3: 数値は強制メカニズムから導出)。

A. codex-3 実測ルール(#684 comment 4924008283)を採用: small は <1s、large は ≥30s(または timeout)、medium はその間(実測 329 ファイルの分布に基づく実績値)
B. より緩い帯: small <2s / large ≥60s(CI 分散への耐性重視、検出力低下)
C. percentile ベースの動的導出(実装複雑、基準が変動し注釈の意味が不安定)
X. Other (please specify)

[Answer]: A(選挙 2026-07-09、4票全会一致。根拠: #684 comment 4924008283 の 329 ファイル実測由来の実績値。NFR 是正 c3(数値は強制メカニズムから導出)と整合)

## Q4. Linux strace/eBPF 任意バックエンドの扱い

Issue AC は「Linux CI の strace/eBPF は任意バックエンド扱い」。本 intent でどこまで作るか(CI は ubuntu-latest 確定 — `ci.yml:22`)。

A. 拡張点(観測バックエンドの seam/interface)だけ設計し、strace/eBPF 実装は後続 Issue(スコープ最小。engineer-2 留意点=既定バックエンドで検出できる形態に fixture を限定、とも整合)
B. strace バックエンドまで本 intent で実装(Linux CI で動的 spawn/FS 実観測。スコープ拡大・工数増)
C. 拡張点も作らない(wall-clock のみ。後続での接ぎ木コスト増)
X. Other (please specify)

[Answer]: A(選挙 2026-07-09、4票全会一致。付帯条件: seam は現行 wall-clock バックエンドを初回消費者として実装する — 消費者ゼロの拡張点を作らない(claude-2 指摘))
