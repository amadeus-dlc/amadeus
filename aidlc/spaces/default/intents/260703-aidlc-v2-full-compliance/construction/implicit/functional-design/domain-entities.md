# Domain Entities：v2 完全準拠の中核ロジック

## 目的

v2 完全準拠後の workspace を構成する概念を Entity として確定し、実装（validator、入口 skill、移行スクリプト）が同じ語彙と責務分担を共有できるようにする。

## Domain Entity

| Entity | 責務 | 主な属性 |
|---|---|---|
| Space | Intent 群と組織知識の入れ物。`aidlc/spaces/<name>/` に対応する | name（今回は `default` のみ）、memory/、knowledge/、codekb/、intents/ |
| Intents Registry | Space 内の全 Intent の正準台帳。`intents/intents.json` に対応する | entries（uuid v7、slug、dirName、scope、repos、status） |
| Intent Record | 1 つの Intent の作業記録。`intents/<YYMMDD>-<label>/` に対応する | dirName、phase ディレクトリ群、verification/、audit/、aidlc-state.md |
| Aidlc State | Intent の実行状態の単一の持ち主。`aidlc-state.md` に対応する | 9 セクション（Header〜Session Resume）、Phase Progress、Stage Progress（checkbox 語彙 6 種） |
| Audit Trail | Intent の decision trail。`audit/` に対応する | 追記専用イベント列（Timestamp、Event、Stage、Details）、Bolt worktree の fork / merge |
| Stage Artifact | 各ステージが作る成果物。v2 の実ファイル名を持つ | 改名対応表（unit-of-work 系、code-generation 系、intent-statement.md、`<stage>-questions.md` ほか） |
| Stage Memory | ステージ実行の学習記録。stage ディレクトリの `memory.md` に対応する | 実行時の判断、使った入力、次回への引き継ぎ |
| Memory | Space の組織・チーム・プロジェクト知識。`memory/` に対応する | org.md、team.md、project.md、phases/、templates/ |
| Code KB | リポジトリ別のコードベース知識。`codekb/<repo>/` に対応する | Reverse Engineering の 9 成果物 |

## 関係

- Space は Intents Registry をちょうど 1 つ持ち、Intent Record を 0 個以上持つ。
- Intents Registry の entry と Intent Record は dirName で 1:1 に対応し、正準 ID は entry の uuid である。
- Intent Record は Aidlc State と Audit Trail をそれぞれちょうど 1 つ持つ。状態の現在値は Aidlc State だけが持ち、Audit Trail は遷移の履歴だけを持つ。
- Intent Record は Stage Artifact と Stage Memory を stage ディレクトリ配下に持つ。
- Memory と Code KB は Space 直下にあり、複数の Intent Record から参照される（Reverse Engineering が Code KB を更新する）。
- Amadeus 独自成果物（grillings、traceability、phase decisions、モジュールファイル、intents.md 索引）は Intent Record と intents/ 直下に同居するが、v2 Entity の名前空間（aidlc-state.md、intents.json、audit/、verification/）を侵さない。

## Domain Map と Context Map への反映候補

| 候補 | 種別 | 判断 |
|---|---|---|
| なし | - | 見送り |

上記の Entity は Amadeus DLC の運用基盤の構造であり、対象プロダクトのドメインの共有境界ではない。
Domain Map と Context Map は対象ドメインの索引として使うため、今回の Intent からは反映しない。

## 未確認事項

- Audit Trail の shard 構成（単一 `audit.md` か複数 shard か）。code generation で v2 の `audit-format.md` 原文と `aidlc-audit.ts` から確定する。
