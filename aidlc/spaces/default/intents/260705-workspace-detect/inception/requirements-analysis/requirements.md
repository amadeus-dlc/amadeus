# Requirements — workspace-detection の誤判定修正（260705-workspace-detect）

対象 Issue: [#459](https://github.com/amadeus-dlc/amadeus/issues/459)

## 意図分析

`detectWorkspace` の言語カウントは「トップ直下のファイル + 定型 source dir（src / app / lib / pages / components / tests）」しか走査しない。
コードが `dev-scripts/`、`skills/`、`lints/` にある本リポジトリでは言語カウントが 0 になり、hasSourceFiles / hasFrameworkConfig / hasNonDev / hasOtherManifest / hasAppSourceDir がすべて false に倒れて `Greenfield / Languages: Unknown` と誤判定される（本日の intent-birth 3 回 + Issue 記載の #455 実行時で再現）。

## 機能要求

- R001: 言語カウントの再帰対象を「SCAN_EXCLUDE とドット始まりを除く全トップレベルディレクトリ」へ広げる（questions Q1 = A、Q2 = A。深さ上限 6 と symlink 除外は既存のまま）。
- R002: これにより、定型外配置のコードベースで Languages が検出され（本 repo なら TypeScript）、hasSourceFiles 経由で Brownfield 判定になる。
- R003: 空ワークスペース（コード無し）の判定は Greenfield / Unknown のまま変えない（後方互換）。
- R004: 定型 source dir だけにコードがある既存ケースの判定結果は変わらない（SCAN_SOURCE_DIRS の挙動は R001 の一般化に包含される）。

## 非機能要求

- N1: eval は隔離 workspace で実 CLI（intent-birth の Project type / Languages 出力）を駆動する。RED 先行（修正前は定型外配置で Greenfield / Unknown になることを確認する）。
- N2: 既存検証の退行なし（`npm run test:all` 全件）。
- N3: parity は `tools/aidlc-utility.ts` 宣言済みのため追加不要（確認のみ）。

## 受け入れ条件（Issue と対応）

| AC | 内容 | 担保する要求 |
|---|---|---|
| 1 | 定型外配置（dev-scripts 等）のコードベースが Brownfield / 言語検出ありと判定される | R001 / R002 |
| 1b | 上記のとき bugfix scope の reverse-engineering が SKIP へ降格されず、最初の post-init stage になる（Issue の主症状の解消） | R002 |
| 2 | 空ワークスペースは Greenfield / Unknown のまま | R003 |
| 3 | 定型 source dir 配置の判定が変わらない | R004 |
| 4 | 既存検証に退行がない | N2 |

## スコープ外

git 履歴・aidlc record を brownfield シグナルへ追加する案（Q1 = B。必要が観測されたら別 Issue）、Frameworks 検出規則の拡充（Issue の主症状は Languages / projectType であり、Frameworks は検出対象の実体が無い repo では Unknown が正しい）。
