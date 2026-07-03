# Construction Decisions

## 判断一覧

| ID | 判断 | 根拠 | 影響 |
|---|---|---|---|
| CD001 | audit の主 shard を `audit/audit.md` にする | v2 の audit format は「workflow の audit.md」へ追記する形を示し、initialization は record 直下に `audit/` shard ディレクトリを作る。両者を満たす最小解釈である | validator は `audit/audit.md` を必須にする。Bolt worktree の fork / merge shard は複数 Bolt 運用で導入する |
| CD002 | 暗黙 Bolt（implicit）の Bolt PR を construction phase PR と兼用する | Bolt が 1 つだけの Intent では、Bolt PR の merge 後に空の phase PR を作る意味がない。inception phase でも 1 PR を gate にした | merge 後の境界処理で `BOLT_COMPLETED` と `PHASE_VERIFIED` を同じ PR の URL で記録する |
| CD003 | ladder 提案を実施しない | walking skeleton の merge 後に残る Bolt がない | `Construction Autonomy Mode` は `unset` のまま Intent を完了する |
| CD004 | `codekb/amadeus/` の知識を移行前の解析内容のまま保持する | 2.1 の解析はこの Intent が変更する前のコードを対象にしており、timestamp が鮮度を示す。知識の更新は次の brownfield Intent の 2.1 の責務である | 次の Intent の 2.1 で鮮度点検が必要である |
| CD005 | 移行時の遡及 audit イベントに `Recovered=true` を明記する | v2 の audit format が backfill の標識として `Recovered` を定義している。会話承認の evidence は `STAGE_COMPLETED` の Details に温存した | 移行由来のイベントと通常運用のイベントを区別できる |
| CD006 | Intent モジュールファイルの旧セクション（目的、対象、成功条件、契機、範囲）は移行で削除し、git 履歴で参照する | R005 でモジュールファイルは索引、依存、目標プロファイルだけを持つ。refactor scope の定義元は `requirements.md` である（scope が 1.1 を実行する場合は `intent-statement.md`） | 旧内容が必要な場合は git 履歴を参照する |
| CD007 | 検証結果の記録ログは repo に置かず、CI の再実行を再現手段にする | `build-test-results.md` に実行コマンドと内訳を記録すれば、CI の `npm run test:all` で同じ検証を再現できる | PR の CI が最終的な green の証拠になる |
