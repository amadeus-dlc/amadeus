# Driver Contract & Selection Policy Frontend Components

## N/A判定

本Unitにfrontend/UI componentは存在しない。`requirements.md`のOOS-05はdriver選択UIとdashboardを対象外とし、`unit-of-work.md`と`unit-of-work-story-map.md`はU-01の価値を純粋なselection contractとして定義している。`components.md`と`component-methods.md`も公開面をTypeScript contractとselectorに限定し、`services.md`は短命なCLI processのstdout/stderrをfeedback境界としている。

したがって、component hierarchy、props/state、form validation、browser API integrationは設計しない。`frontend-components.md`はengineが宣言した成果物名との整合と、UI非適用の反証可能な根拠を残すために生成する。

## CLI feedback contractへの引き渡し

UIの代わりに、U-01は後続Unitが表示できるredacted valueを返す。

| Channel | U-01が渡す値 | U-01が行わないこと |
|---|---|---|
| stdout用 | schema v1のrequested、selected、mode、harness、topology、attempt外のdiagnostic code | 出力、色付け、対話prompt |
| stderr用 | warning/error code、accepted values、fallback reason、修正可能なharness情報 | 生env値、credential、provider stderrの転送 |
| audit用 | stdoutと同じallowlistのselection projection | audit append、checkpoint更新 |

表示文言の組立と実出力はU-02のCLI lifecycleが所有する。U-01は機械可読な値を返すだけで、harness proseに選択表を複製させない。

## 非適用範囲の検証

- frontend source、TSX、CSS、form、router、GUI dependencyを追加しない。
- 既存の対話conductor、通常stage subagent、single-Unit UXを変更しない。
- driver選択のためのinteractive menuや確認dialogを追加しない。
- CLI契約は`components.md`のC-01境界と`services.md`のUX feedback contractへ一方向に引き渡す。
- `component-methods.md`のversioned JSON結果を唯一の機械可読面とし、`requirements.md`の5値やfallback表を表示層で再実装しない。

## 上流参照一覧

本N/A判定は、`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`の全consumed artifactを確認した結果である。

