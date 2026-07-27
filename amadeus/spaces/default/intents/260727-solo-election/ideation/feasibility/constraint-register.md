# Constraint Register — solo-election

上流入力(consumes 全数): intent-statement.md — スコープ境界(Q5)・GoA 2体適用表(Q6)・リスクと前提を制約の導出元として使用。

## 制約一覧

| ID | 種別 | 制約 | 根拠 |
|---|---|---|---|
| C-01 | 互換 | チームモード選挙(member 輸送・既存 GoA 集計帯)の挙動は不変。tally の voters-aware 化は既存票数帯で同一結果を返すことを regression テストで固定する | intent-statement 成功指標4、org.md 検証劇場 Forbidden |
| C-02 | 設計 | 選挙プロトコルの正本は TS(CLI の typed directive loop)— SKILL.md は手順の追従のみで、集計・状態遷移のロジックを prose に持たない | cid:election-cli-canonical、D-13 裁定 |
| C-03 | 独立性 | 配布は blind view の verbatim 参照のみ。spawn プロンプトに main agent の分析・推奨・先行票を含めない。main agent は投票しない | D-12、本 intent Q裁定、transport 構造的 blind |
| C-04 | 監査 | 票の提出は subagent 自身の CLI 実行。裁定は elections store + record に固定し事後追跡可能にする(P2) | intent-statement Q3=A |
| C-05 | 人間コントロール | 1-1 スプリット・ブロック・棄権・追加議論再投票後の 5 残存はすべてユーザーエスカレーション。仕様変更・正準リスト事項は選挙対象外 | Q2/Q6、エスカレーション正準リスト |
| C-06 | 配布 | core 変更は7ハーネス dist・self-install・EN/JA docs・テストを同一変更で同期(ALWAYS)。SKILL.md は core/skills 正本から各 dist へ投影 | project.md ALWAYS 群 |
| C-07 | コスト | 定足数は2体固定 — コールドスタート×2 が発動1回あたりの上限コスト。発動は3類型+明示指示に限定 | Q1/Q2 |

## 制約の検証方法

- C-01/C-02/C-04 は build-and-test 段の regression テスト+落ちる実証で機械検証する(検証コマンドは nfr/design 段で確定)。
- C-03/C-05 は requirements の受け入れ基準へ昇格させ、§12a レビュー観点に含める。
- C-06 は既存ゲート(dist:check / promote:self:check)がそのまま検証面になる。
- C-07 は SKILL.md の発動条件記述と spawn 体数の直読で検証する。
