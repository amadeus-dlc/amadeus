# D003: B002 と B003 の Task Generation 承認

## 背景

B002（validator の不整合検査）と B003（writer skill 手順とテンプレートの更新）の Task Generation Gate が `ready_for_approval` に到達した。

## 判断

B002 の Task 分解（T001 検証先行 RED、T002 不整合検査の実装、T003 promote 同期）と、B003 の Task 分解（T001 intent-capture、T002 discovery、T003 steering テンプレート、T004 promote 同期）を Maintainer が承認した。
実装は Sonnet サブエージェントへ順次委譲し（B002 の後に B003）、メインセッションが監査する。

## 理由

両 Bolt の Task に具体的な作業、要求、ユースケース、依存、設計根拠があり、B001 で確定した生成ロジックとマーカー定数を参照先として明示している。
B002 完了時点で `test:all` が未 migration の index 整合で fail する中間状態は、意図された repo 規模の RED として tasks.md と notes.md に明記されている。

## 影響

`state.json.construction.bolts[]` の B002 と B003 の `taskGeneration.status` を `passed` にし、この判断を approval evidence として追加する。
