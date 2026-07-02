# R002 承認待ちキューの横断一覧

## 要求

複数 Intent の `state.json` を横断スキャンし、承認待ちの Intent、phase、ゲート、待ち理由を 1 回の実行で Markdown 表として一覧できる。

## 背景

並行 Intent が増えると、どの Intent がどの phase のどのゲートで承認待ちかを人間が一望できず、承認が律速になったうえに見落としが起きる。
フェーズパイプラインでは人間の役割がゲート審査官へ寄るため、承認待ちキューの一望が前提になる。

## 受け入れ条件

- 複数 Intent が並行する workspace で、1 回の実行により承認待ちの一覧が得られる。
- 一覧は Intent、phase、ゲート、待ち理由の列を持つ Markdown 表である。
- 待ち理由は `state.json` のフィールド（phase ブロック、gate 値、`taskGeneration.status`、Bolt ID）から導出される。
- 同じ `state.json` の集合からは、常に同じ一覧が得られる。

## 依存

R001。

## 対応する対象境界

- SC-IN-001
- SC-IN-004

## 未確認事項

- 待ち理由の文言への写像規約は、Construction Functional Design で確定する。
- スクリプト名と CLI 契約（workspace 引数、exit code）は、Construction Functional Design で確定する。
