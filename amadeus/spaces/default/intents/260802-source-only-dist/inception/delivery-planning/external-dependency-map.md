# External Dependency Map — 260802-source-only-dist

上流入力(consumes 全数): requirements(NFR-3/4 の境界要件)、unit-of-work(u1/u2 の外部面)、unit-of-work-dependency(統合点 u1→u2 の外部契約)、unit-of-work-story-map(Slice 1 の出荷判定 = draft release E2E — 検証用外部リソース節の根拠)、components(Reuse 対象の外部 action)。bolt-plan.md(Bolt 対応列)も併参照。

## 外部依存一覧(Bolt 対応付き)

| 外部依存 | 使う Bolt | 契約 | 障害時 |
|---|---|---|---|
| GitHub Releases(作成・asset 添付) | Bolt 1(u1)、以降の各リリース | softprops/action-gh-release@pin + App トークン(permission-contents: write)。`files:` 追加 | release CI 失敗は loud。リリースは workflow_dispatch 一本のため人間が再実行判断 |
| asset 配信(github.com → release-assets.githubusercontent.com) | Bolt 1(u2)、利用者の全インストール | ALLOWED_HOSTS 4ホスト+redirect fail-closed(ADR-A4)。実装時再実測条項 | 欠落・不一致・ホスト逸脱 = fail closed(silent fallback なし) |
| codeload.github.com | 旧版インストール(恒久) | 現行経路 byte 不変(ADR-A1) | 既存挙動どおり typed error |
| api.github.com | バージョン解決(既存) | 既存 ports 層 | 既存挙動 |
| npm registry | release CI の publish ジョブ(既存・変更なし) | `@amadeus-dlc/setup` publish | 既存挙動 |
| bun 1.3.13(toolchain pin) | 全 Bolt の build/test、release CI | 同一 toolchain が再現性(NFR-1)の前提 — CI と release で同一 pin を維持 | pin 更新は再現性検査で検出 |
| GitHub Actions ランナー(Linux) | CI・release | macOS 生成 dist と byte 一致の実績あり(requirements NFR-1) | 再現性検査が乖離を loud 検出 |

## 外部承認・人間境界

- PR マージ(全 Bolt)・ノルム PR(Bolt 8)・リリース実行(workflow_dispatch)・Bolt 1 / Bolt 7 ゲート — すべて人間承認(NFR-4)。外部サービスへの新規 credential 追加はゼロ(既存 App トークン流用)

## 検証用の外部リソース

- Bolt 1 の E2E は **draft release**(または prerelease タグ)を使用し、公開 Release チャネルを汚さない。draft の後始末(削除)は E2E 完了後に人間へ報告のうえ実施
