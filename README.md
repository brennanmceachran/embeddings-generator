# Github Action Embeddings Generator

This action updates Supabase's default `headless-vector-search` example with a few changes:

- Broader chunking strategy changes for content (400 token, 100 token overlap)
- Updates to `text-embedding-3-large` embeddings model (from ada-002)
- Adds tests with `vitest` (removes jest)

## Usage

In your knowledge base repository, create a new action called `.github/workflows/generate_embeddings.yml` with the following content:

```yml
name: 'generate_embeddings'
on: # run on main branch changes
  push:
    branches:
      - main

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: brennanmceachran/embeddings-generator@main
        with:
          supabase-url: 'https://your-project-ref.supabase.co'
          supabase-service-role-key: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          openai-key: ${{ secrets.OPENAI_KEY }}
          docs-root-path: 'docs' # the path to the root of your md(x) files
```

Make sure to set `SUPABASE_SERVICE_ROLE_KEY`, and `OPENAI_KEY` as repository secrets in your repo settings (settings > secrets > actions).

See the instructions in the [`headless-vector-search`](https://github.com/supabase/headless-vector-search) for more information on how to query your database from your website.

## Developers

See details in [MAINTAINERS.md](https://github.com/supabase/embeddings-generator/blob/main/MAINTAINERS.md)

## License

[MIT](https://github.com/supabase/embeddings-generator/blob/main/LICENSE)
