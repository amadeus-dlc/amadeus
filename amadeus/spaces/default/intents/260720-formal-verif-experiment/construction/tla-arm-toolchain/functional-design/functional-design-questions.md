# Functional Design 質問 — tla-arm-toolchain

本質問は `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md` の既決事項だけを確認する。

## Q1. TLC artifactと実行profile

- A. TLA+ tools 1.7.4の固定URL / SHA-256を取得時に検証し、検査runはoffline・workers=1・timeout=120秒とする
- B. 実行ごとにlatest artifactを取得する
- C. checksumを記録せずcacheを信用する
- X. その他

[Answer]: A — URL、version、SHA-256、workers、timeoutをclosed constantとして検証し、取得とmodel checkのnetwork境界を分離する。（E-FVEAD2 / E-FVEAD3）
**Basis:** `services.md` external dependency lifecycle、`component-methods.md` TLC Toolchain

## Q2. `NOT_DETECTED`の成立条件

- A. TLC exit 0、version固定の公式completion marker、state統計、search depth、timeout/tool warningなし、固定点到達を全て要求する
- B. counterexample文字列が見つからなければ成立とする
- C. exit 0だけで成立とする
- X. その他

[Answer]: A — counterexample不存在だけでは完全性を主張せず、有限state graphのcomplete exploration proofが揃う場合だけ`NOT_DETECTED`をmintする。（E-FVEAD2）
**Basis:** `requirements.md` FR-4/NFR-2、`component-methods.md` exploration契約

## Q3. frontend成果物の要否

- A. frontend/UIなしとして生成しない
- B. TLC output viewerを追加する
- C. model editorを追加する
- X. その他

[Answer]: A — `services.md` はlocal non-interactive CLIとraw evidenceだけを定義するため、optional `frontend-components.md` は生成しない。（E-FVEAD3）
**Basis:** `services.md` service stance、`components.md` 配置境界
