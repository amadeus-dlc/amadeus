# Business Rules — git-drift-plugin

上流入力: `business-logic-model.md`、`requirements.md` FR-DRIFT-1〜6 / NFR-1 / NFR-4、`decisions.md` ADR-4/ADR-5/ADR-6、`unit-of-work.md` U3 制約、`components.md` C5/C6、`component-methods.md` C5、`services.md` F1/F2。

## 規則

| # | 規則 | 検証 |
|---|---|---|
| R1 | git 状態の変更は fetch による remote-tracking ref 更新のみ。作業ツリー・index・ブランチ・stash を一切変更しない | 実装 grep + テスト(git status 前後不変) |
| R2 | 全ての失敗(fetch 失敗・非 git・origin 不在・タイムアウト)は loud に記録して exit 0(fail-open) | 落ちる実証 (iii) + 非 git 不発火テスト |
| R3 | スロットルは fetch のみ skip。判定は毎回、前回の remote-tracking ref で実行 | スロットル内でも info/warning が出るテスト |
| R4 | スロットル間隔はハードコードせず settings(`fetch-throttle-seconds`、default 600)から解決 | 設定変更が挙動に反映される実測(FR-SET (iii)) |
| R5 | 警告は「即 rebase」を指示せず、取り込み/先着地の判断を促す文言 | 文言テスト(golden 断片) |
| R6 | 台帳系交差(audit シャード・amadeus-state.md・ULID イベント台帳)は優先提示 | 交差判定テスト |
| R7 | severity は advisory 固定(blocking にしない) | sensor md の default_severity + graph compile 検証 |
| R8 | core を import しない(ADR-6)— git/fs/クロックは自前 port、設定は argv 受領のみ | import-closure-guard(ビルド時)+ レビュー |
| R9 | plugin.json は stages:[] + seams(code-generation, build-and-test の sensors)+ sensors + tools + settings を宣言 | conformance ケース(C6 — compose→投影→graph→発火の全層) |
| R10 | seam エントリ id と sensor manifest id の一致(不一致は graph compile で loud になる失敗様式をテストで固定) | C6 テスト(spike 弱点 3) |
| R11 | エンジン/状態ツールの変更操作をしない(audit への記録は core の sensor dispatcher 所有) | NFR-4、実装 grep |
| R12 | テストは実ネットワークに依存しない(ローカル bare リポジトリで完結) | external-dependency-map の運用依存規定 |

## 不変量

- I1: 同一の repo 状態と settings に対し DriftReport は決定的。
- I2: センサー実行がワークフローを止めることはない(advisory + fail-open + exit 0)。
- I3: 警告の重複疲れを避ける — 同一 head/origin 状態での再発火は同じ報告を再生成するのみ(状態を持たない。抑制は throttle が担う)。

## エラー分類

- 回復可能(fail-open skip): fetch 失敗・タイムアウト・非 git・origin 不在 → loud 記録 + exit 0
- 契約違反(fail-closed — U2 側で検出): settings 解決エラーはセンサー起動前に C4 が中止(本 Unit へは到達しない)
