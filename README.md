[![npm version](https://badge.fury.io/js/@mixedbread%2Fcli.svg)](https://www.npmjs.com/package/@mixedbread/mgrep)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0) 

<br />
<div align="center">
  <a href="https://github.com/mixedbread-ai/mgrep">
    <img src="public/logo_mb.svg" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">mgrep</h3>

  <p align="center">
    An awesome command line tool for searching using Mixedbread.
    <br />
    <a href="https://github.com/mixedbread-ai/mixedbread"><strong>Mixedbread</strong></a>
  </p>
</div>

Mixedbread offers a simple, powerful, and scalable search solution for your AI
applications. It supports multiple modalities, including text, images, audio,
and video. It allows you to search your data using natural language queries, not
just keyword searches.

**mgrep** is a command line tool for searching your local files using
Mixedbread. It's as simple as `mgrep watch` and `mgrep "hello world"`. It offers
a grep-like experience for searching your local files, making it perfect for
agents.

## Usage

1. Install the package:
    ```bash
    pnpm install -g @mixedbread/mgrep  # or
    npm install -g @mixedbread/mgrep  # or
    bun install -g @mixedbread/mgrep
    ```

2. Sync the git project or folder you want to search. You will be prompted to
   login and authorize the application automatically:
    ```bash
    mgrep watch
    ```

3. Search the files:
    ```bash
    mgrep <pattern>
    ```

## Development

```bash
pnpm install
npx husky init
pnpm dev
```
