# Get changed Cargo packages

## Usage

```yml
on: push
jobs:
  get-changed-cargo-packages:
    runs-on: ubuntu-latest
    outputs:
      changed-cargo-packages: ${{ steps.get-changed-cargo-packages.outputs.changed-cargo-packages }}
    steps:
      - uses: actions/checkout@v4
      - id: get-changed-cargo-packages
        uses: jcbhmr/get-changed-cargo-packages@v1
  cargo-test:
    needs: get-changed-cargo-packages
    strategy:
      matrix:
        package: ${{ fromJSON(needs.get-changed-packages.outputs.changed-packages) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cargo test --package "$PACKAGE" --all-features
        env:
          PACKAGE: ${{ matrix.package }}
```
