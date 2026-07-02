# R002 決定論的な再生成

## 要求

`intents.md` と `discoveries.md` を、`intents/` と `discoveries/` 配下のモジュールと `state.json` から決定論的に再生成できる。

## 背景

すべての Intent と Discovery が共有インデックスへ行を追記するため、並行 branch 間で追記衝突が起きている。
インデックスを生成物にすれば、並行 branch はモジュールディレクトリだけを触り、統合後の再生成で衝突なくインデックスが揃う。

## 受け入れ条件

- 同じ配下モジュールと `state.json` から、常に同じ内容の `intents.md` と `discoveries.md` が生成される。
- 並行する 2 つの branch がそれぞれ Intent または Discovery を追加し、統合後に再生成すると、両方の行を含むインデックスが手動コンフリクト解消なしに得られる。
- 行の並び順が決定論的な規則で定まる。

## 依存

R001。

## 対応する対象境界

- SC-IN-001

## 未確認事項

- 行の並び順規則（現行の時系列追記順の保持か、識別子順か）は、Unit Design Brief と Construction Functional Design で確定する。
- 再生成スクリプトの名前と CLI 契約は、Construction Functional Design で確定する。
