# Functional Design 質問 — Driver Contract & Selection Policy

## 判定

追加のユーザー質問はない。`unit-of-work.md` と `unit-of-work-story-map.md` が U-01 の責務と受入 slice を閉じ、`requirements.md` が公開5値、選択表、fallback、legacy 互換をテスト可能に固定している。さらに `components.md`、`component-methods.md`、`services.md` が純粋 policy と副作用境界、versioned contract、provider Unit との所有分担を確定している。

Construction で新しい product decision を作らず、以下は上流の既決事項を設計入力として確認した記録である。そのため interaction mode の選択や回答待ちは発生しない。

## 上流で確定済みの設計確認

### Q1. U-01 はどこまでの lifecycle を所有するか

[Answer]: `unit-of-work.md` の U-01 定義と `components.md` の C-02〜C-04に従い、閉じた契約、環境変数 parse、topology 分類、決定的 selection、registration contract までを所有する。generic `DriverAdapter`は`probe`、pure `prepareResources`、U-02のmaterialized setを受けるpure `buildExecution`、`normalize`へ閉じ、最終planは`launch + capture + captureIdentity + resources`を必須とする。CLI 起動、filesystem、resource materialize/cleanup、audit append、checkpoint、provider event parse は U-02〜U-05へ渡す。

### Q2. 明示 driver と `auto` は同じ fallback 規則を使うか

[Answer]: 使わない。`requirements.md` の FR-06、FR-10と `component-methods.md` の `SelectorError` 契約に従い、明示 driver は harness 不一致または能力不足で hard error、`auto` だけが列挙済み候補または内部 floor へ dispatch 前に縮退できる。

### Q3. topology 信号が競合した場合はどう扱うか

[Answer]: `requirements.md` の FR-08と `unit-of-work-story-map.md` の U-01 slice 2〜3に従い、相互調整信号を優先して `topology=coordinated`、`reason=coordination-precedence` とする。信号なしは `unknown` とし、Claude では `claude-ultracode` を第一候補にする。

### Q4. Kiro の balanced wave 分割を U-01 で実装するか

[Answer]: U-01では実装しない。`component-methods.md` は C-03 の公開 seam と式を示すが、より具体的な Unit 所有権は `unit-of-work.md` の U-05および `services.md` の Kiro process contract が `kiro-subagent` adapter に割り当てている。U-01は入力順と Unit 集合を失わない contract だけを定義し、wave policy の具象実装を U-05へ残す。

### Q5. frontend artifact は必要か

[Answer]: UI は対象外である。`requirements.md` の OOS-05、`components.md` の CLI UX 境界、`services.md` の UX feedback contract に従い、機械可読 stdout と警告用 stderr だけを後続 Unit へ引き渡す。engine 宣言との整合のため `frontend-components.md` は N/A 根拠を記録する。

## 曖昧性分析

- 曖昧な回答: なし。すべて上流成果物の確定済み契約へ遡れる。
- 回答間の矛盾: なし。U-01 の純粋 policy 境界と provider 固有実装の所有分担は両立する。
- 成果物生成を止める不足情報: なし。
