# Functional Design Questions — pr-gate-discipline

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)（FR-1〜FR-5、NFR-1〜NFR-3）。
配置・言語の大枠は requirements-analysis のピア協議（5/5 一致）で確定済みのため、本ファイルは設計の細部 4 問を扱う。
いずれも team.md 質問プロトコルの「小さな構造判断」に該当するため、担当 engineer の自己判断で回答し、gate の人間承認で確定する。

## Q1. 知識文書のファイル名

amadeus-shared の既存命名は内容記述型（audit-format.md、rules-reading.md、verification.md、brownfield.md）である。

- A. `pr-gate-discipline.md`（Issue タイトルの語をそのまま使い、Intent 名とも一致して追跡しやすい）
- B. `pr-monitoring.md`（監視手順の側面を強調）
- C. `pr-gate-protocol.md`（protocols/ の命名に寄せる）
- D. `pull-request-review.md`
- E. その他
- X. Other (please specify)

[Answer]: A（`pr-gate-discipline.md`）。内容記述型の既存命名と両立し、Issue #534・Intent 名・parity 宣言・PR 説明からの追跡が一語で通る。自己判断（理由付き）。

## Q2. stage-protocol.md への最小追記の挿入位置

- A. 「Construction Bolt gates (walking skeleton + ladder + halt-and-ask)」節の末尾（Bolt PR gate の文脈に直結する位置）
- B. 文書末尾に新 H2 節を追加
- C. 冒頭の overview に追記
- D. その他
- E. 追記しない（要求から外す）
- X. Other (please specify)

[Answer]: A（Construction Bolt gates 節の末尾）。Bolt PR の merge を gate evidence とする既存記述と同じ文脈に、不変条件 1〜2 行 + 知識文書への参照 1 行を置くのが注意資源の観点で最小。新 H2 は required-sections や上流差分を不必要に増やす。自己判断（理由付き）。

## Q3. phases/construction.md への追記形式

- A. 新 H2 節「PR Gate」を追加し、FR-1 の不変条件 4 行相当を箇条書きで置く（既存の Code Completeness / Error Handling などの H2 並び + 箇条書き構成に一致）
- B. 既存「Bolt 運用」節へ追記
- C. Corrections 節へ追記
- D. その他
- X. Other (please specify)

[Answer]: A（新 H2 節「PR Gate」）。この文書は防護規定を主題別 H2 で列挙する構成であり、PR gate は独立主題。「Bolt 運用」は Bolt 分割の運用が主題で混ぜない。NFR-2 の上限（不変条件 4 行相当）を守る。自己判断（理由付き）。

## Q4. 受け入れ条件「ポインタが機能している」の検証方法（requirements の未解決事項）

- A. 機械的確認 + 目視の併用: build-and-test で「ルール側 3 ファイルの参照文字列が知識文書の実在パスへ解決すること」を grep / test で確認し、文面の妥当性は reviewer と gate の目視に委ねる
- B. 目視レビューのみ
- C. 専用 sensor を新設する
- D. その他
- X. Other (please specify)

[Answer]: A（機械的確認 + 目視の併用）。パス解決は決定論的に検査でき、dev-scripts ルールの TDD 要求とも整合する。C の専用 sensor 新設は暫定機構への作り込みで Right-Sizing を超える（Issue #530 の「リンター = 強制」は別 Intent）。自己判断（理由付き）。
