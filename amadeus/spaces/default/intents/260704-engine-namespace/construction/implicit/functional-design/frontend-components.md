# Frontend Components — engine-namespace

## 対象外の判断

本 unit は UI を含まない（エンジン内部の改名 refactor であり、対象は tools・hooks・ディレクトリ・参照更新のみ）。
上流要求 `../../../inception/requirements-analysis/requirements.md` にもフロントエンド要求は存在しない。

## 根拠

- 変更対象は `.agents/` 配下のエンジンファイルと参照であり、コンポーネント階層、props/state、インタラクションフローを持つ画面は存在しない。
- ステージ定義でも frontend-components.md は「unit が frontend/UI を含む場合のみ」の条件付き成果物である。本書は produces 契約を満たすための対象外記録として置く。
