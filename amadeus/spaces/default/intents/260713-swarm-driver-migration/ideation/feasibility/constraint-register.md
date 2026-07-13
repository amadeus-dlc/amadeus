# 制約登録簿

## 技術・互換性制約

| ID | 制約 | 影響 | 対応 | 状態 |
|---|---|---|---|---|
| C-01 | 公開 selector は `AMADEUS_SWARM_DRIVER`、既定値は `auto` | 全ハーネスと文書で同一契約が必要 | 共通の選択表を正本化し、生成物の drift を検査する | 確定 |
| C-02 | 公開値はハーネス修飾名に限定する | 別ハーネスの明示値は利用できない | 不一致を実行前 hard error にし、暗黙変換しない | 確定 |
| C-03 | 明示 driver は fallback 禁止 | 一部環境では従来より早く失敗する | 能力検査結果と修正方法を error に含める | 確定 |
| C-04 | `auto` の選択は task topology と能力検査から決定する | topology の機械可読な分類が必要 | 分類入力と優先表を後続設計で固定し、理由を監査する | 確定 |
| C-05 | `auto` の fallback は silent にできない | 表示・監査の追加が必要 | requested、selected、reason を同一 execution id で記録する | 確定 |
| C-06 | Agent Teams は実験的で明示的な環境変数が必要 | 提供仕様やイベント形式が変わり得る | version だけでなく Team 実起動を能力検査する | 未検証 |
| C-07 | Agent Teams は nested team と in-process teammate 再開を提供しない | 再帰的 Unit 分解と途中再開を driver に委ねられない | Amadeus conductor とレフェリーが外側の再試行・収束を所有する | 確定 |
| C-08 | Claude Ultra Code の明示指定には `claude -p --effort ultracode` 対応が必要 | 古い CLI では起動不能 | 2.1.203 以上を最低目安とし、flag と workflow 実起動を検査する | 確認済み |
| C-09 | Codex Ultra は `xhigh` と異なる | ユーザーの既定設定をそのまま使うと Ultra にならない | driver 起動時に `ultra` を明示し、model の対応を検査する | 確認済み |
| C-10 | Kiro subagent は最大4並列で、非対話承認は fail-fast する | 大きな batch は分割と trust 検査が必要 | 上限に合わせて wave 化し、必要な tool trust を事前検査する | 確認済み |
| C-11 | 各 Unit は既存の隔離 worktree と保護 spec を維持する | native driver 独自の作業ディレクトリ管理へ委譲できない | prepare / check / finalize を全 driver 共通の収束境界にする | 確定 |
| C-12 | Responses API Multi-agent は本 Intent の対象外 | API key / SDK driver は提供されない | ローカル Codex Ultra を正本とし、将来 Intent に分離する | 確定 |

## 移行制約

| ID | 制約 | 影響 | 対応 | 状態 |
|---|---|---|---|---|
| C-13 | `AMADEUS_USE_SWARM` は 0.1.x で現行意味を保持する | 一時的に旧・新 selector の両方を検査する | 互換 adapter を期限付きにし、全旧利用で警告する | 確定 |
| C-14 | 旧・新変数の同時指定は禁止 | 既存 CI が両方を設定すると失敗する | 設定競合 error と移行手順を提示する | 確定 |
| C-15 | 旧変数は 0.2.0 で削除する | 0.2.0 への更新時に設定変更が必要 | 0.1.x の release note と migration guide で予告する | 確定 |
| C-16 | 旧変数未設定時は `auto` が既定になる | 従来の floor から native driver へ変わり得る | 選択結果を常に可視化し、明示 driver で固定可能にする | 確定 |

## セキュリティ・運用制約

| ID | 制約 | 影響 | 対応 | 状態 |
|---|---|---|---|---|
| C-17 | provider credential を Amadeus に保存しない | subprocess は既存 CLI の認証状態に依存する | credential の存在だけを検査し、値は出力・監査しない | 確定 |
| C-18 | 監査に prompt、secret、生レスポンスを残さない | native 起動証明には最小限の metadata が必要 | driver、version、model、event 種別、Unit、結果だけを記録する | 確定 |
| C-19 | live test は provider token と network を消費する | 通常 CI で常時実行すると費用・不安定性が増す | 非機密の小型 fixture と専用 live suite を使う | 確定 |
| C-20 | live 証跡なしでは Intent を完了できない | credential のない CI だけでは完了判定できない | 認証済み環境で4 driver の2 Unit以上の収束証跡を保管する | 確定 |
| C-21 | 新しい AWS 資源を要求しない | cloud provisioning は scope 外 | CI secret と outbound policy は既存基盤を利用する | 確定 |

## 未解消の制約

- Agent Teams が `claude -p` で Team を起動したことを、どの安定したイベントまたは成果物で検出できるか。
- Codex Ultra の自動委譲を、通常の `codex exec` 実行と区別できる安定した JSON event がどこまで保証されるか。
- `auto` の topology 分類に必要な信号を、Units Generation の成果物から過不足なく取得できるか。
- 4 driver の live suite を実行する認証済み環境、token 上限、実行頻度は後続計画で確定する必要がある。
