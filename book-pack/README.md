# book パック(パイロット版)

amadeus で書籍を執筆するためのローカルパック。**unit = 章、Bolt = 章の執筆、walking skeleton = 見本章**のマッピングで AI-DLC エンジンを書籍執筆に流用する。

- 由来: [Issue #643](https://github.com/amadeus-dlc/amadeus/issues/643) の grilling 裁定(2026-07-22 コメント参照)
- 関連: [Issue #1333](https://github.com/amadeus-dlc/amadeus/issues/1333)(composed-stage carve-out — 本パックを framework リポジトリ内へ置けない理由と将来の enabling 機構)
- 位置づけ: **ローカル定義**。本家出荷(ファーストクラス化)はパイロット実測後に #643 で再判断

## 構成(EXECUTE 10/35)

| 種別 | ステージ | 役割 |
|---|---|---|
| 流用 | init×3, intent-capture, scope-definition, requirements-analysis | 企画意図・範囲・読者/内容要件(`scopes:` に book を追加するだけ) |
| 新規 | book-structure-design (2.6) | 部・章構成、読者契約、用語規約 → `book-structure` |
| fork | units-generation (2.7) | unit=章の切り出し+依存 DAG(slug・成果物名はエンジン結合で維持) |
| 新規 | chapter-drafting (3.8) | 章の執筆(per-unit、`workspace_requires`、editor レビューゲート) |
| 新規 | manuscript-review (3.9) | 全章通しレビュー+construction phase-check |

エージェント新規2: `amadeus-author-agent`(執筆)/ `amadeus-editor-agent`(構成・レビュー)。
scope メタ: `--scope book` 明示のみ(keywords なし)、depth=Standard。

## 適用

```bash
book-pack/scripts/apply-pack.sh <workspace-root>   # <workspace-root>/.claude が対象
```

処理内容: 新規/fork ステージと agent・scope のコピー → 流用6ステージの `scopes:` に book を追記 → stage-graph.json の番号事前ピン(application-design を 2.9 へ退避し book-structure-design を 2.6 に挿入 — compile のエラーメッセージが公認する renumber 手段)→ `amadeus-graph.ts compile`。冪等。

## 検証

```bash
book-pack/scripts/verify-dummy.sh <framework-repo-root>
```

/tmp に使い捨てダミーを生成して適用し、LLM なしの決定的検証を行う:

- A. graph shape(35ステージ、2.6 < 2.7 の順序、for_each/workspace_requires)
- B. grid EXECUTE 集合(想定10ステージとの機械照合)
- C. `validate-scope book`(exit 0。2026-07-22 実測: advisory ゼロ = 必須 consumes 飢餓なし)
- D. runtime walk 順序(`nextInScopeStage` 連鎖がハードコード期待列と一致)
- E. bolt_dag fixture(章 unit の YAML edge block が batch 化される)
- F. skeleton stance(book は `SKELETON_ON_SCOPES` 外 — stance=on 明示が前提)

**落ちる実証済み**(2026-07-22): (1) chapter-drafting の `for_each` 除去 → A が赤 (2) manuscript-review の scope membership 除去 → B が赤(`missing=['manuscript-review']`)。

## パイロット運用

1. 書籍専用ワークスペースを新設し amadeus をインストール → 本パックを適用
2. memory 層(`amadeus/spaces/default/memory/`)を執筆用に書き下ろす(コード開発規範を持ち込まない — phases/construction.md の Code Completeness 等は書籍向けに置換)
3. `/amadeus --scope book` で intent 開始
4. skeleton-gate では **stance=on を明示**(`report --skeleton-stance on`)— 見本章1章を単独ゲートで回してから残りの章へ
5. textlint/prh の sensor 化は執筆規約が固まってから(裁定 Q8)

## 既知の制約

- **専用ワークスペース前提**: fork した units-generation は `scopes: [book]` のみ。同じワークスペースでソフトウェア系スコープを回すと units-generation を失う(意図的な loud degrade)
- **アップグレード上書き**: インストーラ更新は fork/新規ステージを上書き・孤児化しうる(恒久解は #1333)
- `unit-of-work-story-map` は fork の produces から削除(user-stories SKIP のため)。消費側(functional-design 等)は optional 消費なので非破壊
- application-design は 2.9 に退避(book スコープでは SKIP。番号のみの変更で表示・順序以外に影響なし)
