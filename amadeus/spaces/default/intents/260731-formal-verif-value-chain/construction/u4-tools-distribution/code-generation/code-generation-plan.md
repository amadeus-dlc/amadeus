# Code Generation Plan — u4-tools-distribution

上流入力(consumes 全数): unit-of-work, functional-design(business-logic-model / business-rules / domain-entities), nfr-design, bolt-plan

## 実行計画(FD M1〜M5・I2 撤回済み前提)

1. **M1**: PluginManifest へ `tools` 追加、parseTools(expectRelPath 検証・欠落時 [])。
2. **M2**: composeWriteSet の toolsCopies 合流+ownedPaths 拡張+**digest 対称拡張**(ownedStageDigests → stages+tools 走査)。
3. **M3**: drop 対称(digest 照合削除)+compose⇔drop 対称テスト。
4. **M4**: `compose --all-harnesses`(hostRoot 集合拡大フラグ)— staging 不在ツリーへの先行配置、fail-closed 集計。
5. **M5**: 本 repo 全現存ツリーの一括 compose 実施と composed 実測。
6. formal-model-check の plugin.json へ tools 宣言追記+dist 8 変種同期。TDD(t379)+落ちる実証。core 変更のため dist 7 ハーネス+self-install 再生成同梱。
