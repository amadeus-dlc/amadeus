# Business Logic Model — U2 Contributor Documentation Update

## Upstream Trace

この設計は `unit-of-work`, `unit-of-work-story-map`, `requirements`, `components`, `component-methods`, `services` を入力とする。U2 は contributor documentation に root framework zone と package-owned setup zone の境界を反映する。

## Workflow

1. U1 の design record を source of truth として読む。
2. README/docs/contributing guide の現行 layout 説明を確認する。
3. root `core/`, `harness/`, `scripts/`, `dist/` が framework source/distribution contract であることを明記する。
4. `packages/setup` は sibling package であり、この intent では実装対象外であることを明記する。
5. install command や `dist/` contract を変更しない場合、既存 command を維持する。
6. docs の言語を日本語または既存 docs の言語方針に合わせる。

## Transformation Rules

- Application Design の decision を docs language に変換する。
- technical path は code font で保持する。
- full normalization を否定しすぎず、future migration は source root abstraction から始めると説明する。

## Output Contract

Documentation update は、maintainer が「どこを編集し、どこを生成物として扱うか」を迷わない状態にする。
