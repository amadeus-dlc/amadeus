# R002: 内部 skill 判定基準

## 要求

内部 skill と公開入口 skill の判断基準を追跡できる。

## 根拠

- [Issue #284](https://github.com/amadeus-dlc/amadeus/issues/284)
- [scope.md](../../ideation/scope.md) の SC-IN-002
- [codebase-analysis.md](../codebase-analysis.md)

## 受け入れ状態

- Phase skill、横断的補助 skill、内部 skill の分類が説明されている。
- Issue #284 に列挙された内部 skill 以外の `amadeus-*` skill を、対象に含めるかどうか判断できる。
- `amadeus-validator` を Internal Skills に置くか、横断的補助 skill に残すかの判断が追跡できる。

## 対象外

- 新しい skill 分類体系の導入。
- skill の責務変更。
