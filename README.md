# LogicSim · 逻辑结构工作台

在浏览器中把逆波兰逻辑表达式转换为选择器结构图。项目是纯静态网站，无需后端或构建步骤。它展示逻辑结构，当前不提供交互式电路仿真。
Github Pages: https://the-watcher-of-the-wind.github.io/logicsim-redesign/

## 使用

运行本地静态服务器：

```sh
python -m http.server 8765 --directory public
```

然后打开 <http://localhost:8765/>。输入表达式，点击“生成结构图”；也可以按 Ctrl/⌘ + Enter。点击示例可快速填入表达式。

| 运算符 | 含义 | 示例 |
| --- | --- | --- |
| `.` | 与 | `a b .` |
| `,` | 或 | `a b ,` |
| `<` | 非 | `a <` |
| `>` | 蕴含 | `a b >` |
| `=` | 等价／同或 | `a b =` |

组合示例：`a b . fe >`、`a b . fe ge > =`。支持常量 `0` 和 `1`。

画布支持拖动平移、滚轮或工具栏缩放、小地图定位、点击节点编辑名称及备注。顶部按钮可导入和下载 JSON；“高级：JSON 编辑”支持直接修改图形数据，以及图与 JSON 的往返转换。

JSON 顶层保留 `nodeArray`、`linkArray` 两个数组。节点沿用 `key`、`type`、`name`，并可使用可选的 `memo` 文本；旧文件无需迁移。仓库中的 `public/latch.json` 可用于导入示例。

## 部署

`.github/workflows/pages.yml` 在推送到 `main` 时将 `public/` 上传到 GitHub Pages。站点使用相对资源路径，可从仓库子路径访问。

## 来源

本项目基于 [kuangdash/logicsim](https://gitlab.com/kuangdash/logicsim) 的源码改造。本地基线为原仓库 `main` 分支提交 `4498910e8f8efff0d7dfd4840739298e2a29f06e`。原仓库未提供许可证文件。功能与改造分析见 [ANALYSIS_AND_REDESIGN.md](ANALYSIS_AND_REDESIGN.md)。

## 声明

本仓库及项目托管网页仅作作业展示用途，全部文件预计将在2026年10月31日前删除。
