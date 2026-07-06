# Requirements（260706-engine-consistency）

対象 Issue: [#547](https://github.com/amadeus-dlc/amadeus/issues/547)（complete-workflow の末尾 skip 整合）、[#548](https://github.com/amadeus-dlc/amadeus/issues/548)（validator の RE produces 解決）、[#555](https://github.com/amadeus-dlc/amadeus/issues/555)（log-subagent の完了ガード）

## 意図分析

完了処理（complete-workflow）と hooks（log-subagent）と validator の三者で「workflow の完了・skip 状態」の扱いが不整合なまま残っており、手動整合・stub 9 件・未 push 残渣という運用の手戻り（#546 と実害 3 例で実測）を生んでいる。3 件を 1 Intent で正す。現行構造の把握は [codekb/amadeus/architecture.md](../../../../codekb/amadeus/architecture.md)（エンジン層構成・hooks fail-open）、[codekb/amadeus/api-documentation.md](../../../../codekb/amadeus/api-documentation.md)（state verb 一覧）、[codekb/amadeus/code-quality-assessment.md](../../../../codekb/amadeus/code-quality-assessment.md)（eval 規約）を上流入力として参照する。

## 機能要求

- FR-1（#547、B001）:
  - FR-1.1: `complete-workflow` が末尾 skip 連続の workflow を閉じるとき、Current Stage / Next Stage を `none` に設定する（finalize 経路の既存規約と同形）。
  - FR-1.2: 全ステージ `[S]` の phase の Phase Progress を `Skipped` へ更新し、`PHASE_SKIPPED` を emit する。
  - FR-1.3: TDD — engine-e2e に「末尾 skip 連続で完了する workflow」ケースを先に追加し、手動整合なしで validator pass になることを検証する。
- FR-2（#548、B002）:
  - FR-2.1: validator の reverse-engineering produces 判定へ参照解決型判定（#501）の適用範囲を拡大し、record stub がなくても共有 `codekb/<repo>/` の 9 実ファイルの実在で pass させる。
  - FR-2.2: 既存の stub 付き record は従来どおり pass（判定の拡張であり、既存 record を壊さない）。
  - FR-2.3: TDD — stub なし Intent（codekb 直接解決）の validator pass を先に fail する eval として追加する。
- FR-3（#555、B003）:
  - FR-3.1: `amadeus-log-subagent.ts` に完了ガード（lib の `activeIntentIsComplete` = #479 導入済み）を適用し、完了済み Intent への SubagentStop を no-op にする。
  - FR-3.2: audit へ書く他 hook への同判定の適用可否を実測し、適用したものと見送ったもの（根拠つき）を記録する。
  - FR-3.3: TDD — 完了済み Intent への SubagentStop 発火が no-op になる検証を先に追加する（hooks 系 eval）。
- FR-4（共通）: parity-map の engineFileExceptions 宣言（対象: amadeus-state.ts = 宣言済み reason 追記、amadeus-log-subagent.ts = 宣言状況を実測）と skills/ 正準ソース反映（validator は source + 昇格先の両面）。

## 非機能要求

- NFR-1: Bolt 3 本は同一 worktree 内で直列実行。
- NFR-2: 接触面 — engineer3 #554（promote/parity 系）・engineer4 #552（harness/codex 新設）と非接触見込み（amadeus-state.ts は engineer3 の read 参照のみ = ディスパッチ確認済み）。
- NFR-3: 成果物・PR は日本語、TS は英語。

## 受け入れ条件（Issue AC と対応）

| # | 受け入れ条件 | 対応要求 |
|---|---|---|
| 1 | 末尾 skip 構成の workflow を complete-workflow で閉じたとき、手動整合なしで validator が pass する（先に fail する engine-e2e ケースつき） | FR-1 |
| 2 | codekb 直接解決で成立する Intent で、stub 9 件なしに validator が pass し、既存 stub 付き record も従来どおり pass する（先に fail する eval つき） | FR-2 |
| 3 | 完了済み Intent への SubagentStop が no-op になり（先に fail する検証つき）、他 hook への適用判断が根拠つきで記録されている | FR-3 |
| 4 | parity 宣言と skills/ 正準反映を伴い、`npm run parity:check` ok | FR-4 |
| 5 | `npm run test:all` pass、validator（260706-engine-consistency 指定）pass | 全要求 |

## スコープ外

- hooks の所有権判定モデルの再設計（#476/#479 の既存判定を流用する）。
- validator の他ステージ produces 判定の変更（reverse-engineering に限る）。
- cursor と実作業の乖離そのものの解消（#555 実害 2 例目の複合要因。別課題）。
