# Units of Work — solo-election

上流入力(consumes 全数): requirements.md(FR-01〜13)、components.md(変更対象と規模)、component-methods.md(tally 2体分岐の擬似コード・SKILL 内挿点・spawn テンプレ構成 — U1/U2 の作業内容の設計正本)、decisions.md(ADR-1〜4)、services.md(実行時構成)、component-dependency.md(依存方向)、scope-document.md(M-01〜M-07/S-01)。

## U1: solo-election-core(walking skeleton)

- **内容**: tally 2体規則(FR-05: split/discussion 1票/棄権 quorum-short — ADR-1/2 準拠、model.ts:419 HoldReason へ "split")+ HOLD_RESOLUTIONS split エントリ(FR-07)+ FormalElection.tla 意味論拡張(Voters 2体インスタンス・"SPLIT"・HoldReason(r) 2体分岐 — ADR-1 波及先 (a))+ model-map.json SHA 写像更新 + t234 既存2体アサーションの per-assertion 監査・書換(実例 :150-151 の established→hold 反転)+ 新規 solo loop integration テスト(open→2票 voterKind=subagent→tally→recorded、FR-01/03 の AC)+ FR-05 の落ちる実証({5,1}/{4,1}/{1,7} が修正前 established になることの実証→修正)+ FR-06 の3〜6体代表組合せ regression(既存 t234/t244 全ケース含む bit 一致固定)+ CLI 面の dist 7面・self-install 5面同期。
- **出荷実証(スケルトン)**: 実選挙1件を本 intent の実裁定でソロ完走(2-0 即採用分岐)+1-1 スプリットのエスカレーション発火実証(Q4=A)。
- **推定規模**: 実装 +80〜130 行(model/election/tla)、テスト既存書換 +30〜60・新規 +250〜350 行。
- **単独 deployable**: 可 — 集計規則+テスト+実選挙実証で利用者価値(ソロ選挙の成立)を単独出荷できる。

## U2: solo-election-surface(手順・ノルム・文書)

- **内容**: amadeus-election SKILL.md への4節内挿(FR-02/04/08/09/10/11 — spawn プロンプト定型・同期完遂・再spawn 1回→エスカレーション・resume 再投票・発動類型・loud 降格告知。t242 契約不変で green)+ team.md ソロモード節のノルム改定(FR-12 — 2体 subagent 選挙の正規形態化、発動規則は SKILL と同文)+ SKILL 面の dist 3面・self-install 3面同期 + FR-02 のテンプレート検査テスト(構成要素 grep)+ 選挙関連 EN/JA docs の該当箇所同期(FR-13、該当有無は実装時 grep で確定)。
- **推定規模**: SKILL +20〜30 行、team.md +10〜15 行、テスト +40〜80 行、docs 実測次第。
- **単独 deployable**: 可 — U1 着地後の手順・規範スライスとして独立に出荷できる(t242/テンプレ検査が green の検証面)。

## 分割の根拠

検出(U1 の集計・実証)と手順・規範(U2)は片側だけでも利用者価値を持つ: U1 単独で「ソロ選挙が機械的に正しく集計・記録される」、U2 単独で「手順とノルムが正典化される」。U2 の文面は U1 の実装挙動(split 語彙等)を参照するため依存は U1→U2 の一方向。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T14:54:11Z
- **Iteration:** 1
- **Scope decision:** none

U1/U2 分割の単独 deployable 妥当性・YAML edge block の parseBoltDag 準拠・FR 全数写像・規模整合・skeleton 閉包・引用実在をすべて実測確認。Minor 1件(FR-06 の U1 未明示)は conductor が1句追記で即時是正済み。

### Findings

- None
