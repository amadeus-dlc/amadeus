# User Stories — eoc1-gate-check

## 上流入力(consumes 全数)

`../requirements-analysis/requirements.md`(FR-1〜5)、`../../ideation/intent-capture/intent-statement.md`、`../../ideation/rough-mockups/user-flow.md`(3フロー)、personas.md、codekb `business-overview.md` / `component-inventory.md`(エンジン tool 内部のみの feature と非交差 — 参照非該当、code-structure 当該節を正とする)。

## Epic: ゲート整合性(単一エピック — 狭いガード追加)

### US-1: 先記入の即時検出(conductor)

conductor として、承認証跡なしに [Answer] を記入したまま gate-start したとき即座に是正手順つきで拒否されたい — slip をコミット前に必ず気づけるように。

- Given [Answer] タグに裁定待ち文言以外の記入がある questions ファイル、And 裁定参照(E-code)も承認タイムスタンプ行もない
- When `amadeus-state.ts gate-start <slug>` を実行する
- Then exit 非0+是正手順つきエラー(wireframes 文言)、And STAGE_AWAITING_APPROVAL は emit されず checkbox も遷移しない

### US-2: 正常フローの無音通過(conductor)

conductor として、正当な運用(裁定後記入・0問様式・questions なしステージ)では gate-start が従来どおり無音で通ってほしい — ガードが作業を遅くしないように。

- Given (a) 裁定参照付き [Answer] 記入+承認行、(b) [Answer] タグ不在の0問様式、(c) questions ファイル不在、のいずれか
- When gate-start を実行する
- Then exit 0+既存出力のみ(検査由来の出力なし)

### US-3: 型不正証跡の拒否(leader/conductor)

チームとして、承認行がタイムスタンプとして parse できない場合は通過させたくない — 形だけの証跡行(検証劇場)を許さないため。

- Given [Answer] 記入あり+「承認」行はあるが ISO タイムスタンプが抽出できない
- When gate-start を実行する
- Then exit 非0+型不正の是正文言(verification-numeric-parse 同族)
