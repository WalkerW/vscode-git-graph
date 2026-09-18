# Git Graph：当前能力与升级候选清单

> 本文档面向此仓库的本地自用维护，用于盘点 Git Graph `1.30.0` 已有能力，并评估值得新增的 Git 功能。
>
> 基线：当前分支最后一次原始提交为 2021-09-19；扩展声明支持 VS Code `^1.38.0`。Git 的最低兼容版本不应整体抬高，新能力应在运行时检测 `git --version` 后按需启用。

## 目标与边界

这是一个 VS Code 内的 Git 历史图形客户端：看清提交拓扑、查看变更，并直接完成常见 Git 操作。

当前代码的许可证允许本地使用、复制和修改，但不授予发布或分发衍生版本的权限。因此本分支只用于个人开发和安装，不发布到 Marketplace、Open VSX 或公共仓库。

## 本地开发环境

- 已验证环境：Node.js `18.20.8`、npm `10.8.2`、Git `2.55.0`；CI 使用相同的 Node 精确版本。
- 安装依赖：首次本地安装使用 `npm install`；复现 CI 或排查依赖问题时使用 `npm ci`。仓库提交 `package-lock.json`，确保依赖树可重复安装。
- 工具链：TypeScript `5.9.3`、ESLint `9.39.5`（flat config）、Jest `29.7.0` 与 ts-jest `29.4.12`。测试断言使用 `toHaveBeenCalled*`，不再依赖已废弃的 `toBeCalled*` 别名；全局采用 legacy fake timers，以保持旧测试对 `Date` 和计时器 spy 的语义。
- 测试脚本启用 Jest `--forceExit`：历史测试的轮询辅助函数会保留计时器句柄；断言完成后应立即退出。常规验证不使用 `--detectOpenHandles`，因为它与 legacy fake timers 的计时器语义冲突。
- webview 编译目标为 ES2015（`web/tsconfig.json` 的 `target: es6`），打包器已升级以支持该语法；保留现有全局命名空间架构，模块化迁移将作为独立的 UI 重构阶段处理。
- 验证命令：`npm run compile`、`npm test`。当前基线应为 15 个测试套件、1269 个测试全部通过。
- GitHub Actions 使用 `actions/checkout@v6`、`actions/setup-node@v7`、npm 缓存与 `npm ci`；不再使用已停止维护的 Node 12 与 Actions v1。
- 本项目源文件采用 CRLF 换行；修改 TypeScript 文件后应运行 ESLint 或项目编译命令，避免混入 LF。
- Node.js 18 会弃用旧的 `url.parse()`；头像下载已使用 WHATWG `URL` API，启动扩展时不应再出现 `DEP0169` 告警。

### 文档同步约定

每次改变用户可见功能、Git 版本兼容性、开发工具链、配置项或已知限制时，必须同步更新本文件；对应的测试与实现也应在同一提交中完成。纯重构且不改变行为时，可仅在提交说明中注明无需更新本文档。

## 源码目录

根目录保留扩展清单、许可证、说明文档和 ESLint/Jest 配置，这是 VS Code、npm 与 GitHub Actions 的标准发现位置；不将这些文件移动到任意子目录。

- `src/extension.ts`：唯一扩展入口，`package.json` 的 `main` 指向其编译结果。
- `src/application/`：命令注册与应用层协调；`commandManager.ts` 负责命令处理。
- `src/git/`：Git 命令、仓库管理、仓库文件监听与 askpass 集成。
- `src/ui/`：Git Graph Webview、差异文档提供器和状态栏入口。
- `src/services/`：独立服务，例如头像下载与缓存。
- `src/platform/`：VS Code 持久化状态与输出日志等平台适配。
- `src/lifecycle/`：安装、升级、卸载生命周期上报。
- `src/utils/`：通用队列、事件与 disposable 工具；`src/types.ts` 为共享领域类型。

为避免破坏既有测试 mock 与外部导入，`src` 根目录保留少量同名公共导出层，它们只重新导出上述目录的实现，不承载业务逻辑。测试文件继续以实现名称命名，便于按功能定位。

## 当前已支持的功能

### 历史图与筛选

- 显示本地分支、远程分支、远程 HEAD、标签、stash 和未提交改动。
- 显示提交图、作者、日期、摘要，以及分支和标签引用。
- 按全部分支、选定分支或自定义 glob 规则筛选。
- 按提交日期、作者日期或拓扑顺序加载；可只沿 first-parent 加载。
- 支持按作者、日期、哈希、消息、分支或标签名全文查找。
- 支持自动/手动继续加载提交；可隐藏或调整日期、作者、提交说明列的宽度。
- 支持加载 reflog 独有提交、仅显示带标签提交、弱化 merge 提交或非 HEAD 祖先提交。
- 支持提交作者头像、`.mailmap`、Emoji shortcode 与一部分行内 Markdown。

### 查看、比较与代码审查

- 单击提交可查看完整信息、父提交、关联文件和每个文件的 Diff。
- 可打开某个提交中的文件版本，或复制变更文件路径。
- `Ctrl/Cmd + 单击` 第二个提交可比较任意两次提交，并查看文件级 Diff。
- 可查看未提交改动，也可将未提交改动与任意提交比较。
- 内置代码审查状态：针对单次提交或两次提交比较记录已审/未审文件，并跨 VS Code 会话保存。
- 提交消息中的 HTTP/HTTPS 链接可直接打开；可配置 Issue 链接规则。
- 支持显示已签名提交与 annotated tag 的签名状态；当前 UI 的说明偏向 GPG/X.509。

### 可在图上执行的 Git 操作

| 对象 | 已支持操作 |
| --- | --- |
| 分支 | 创建、checkout、重命名、删除、fetch into branch、merge、pull、push、rebase、reset |
| 提交 | checkout、从此创建分支、cherry-pick、drop、merge、revert、reset、复制哈希 |
| 标签 | 创建轻量/annotated tag、删除、push、查看 annotated tag 详情、复制名称 |
| Stash | 创建、查看、apply、pop、drop、从 stash 创建分支、复制名称 |
| 工作区 | 查看未提交/未跟踪文件、clean、reset、stash |
| 远端 | 添加、编辑、删除、fetch、prune；全局 Fetch 可同时 prune branches/tags |

### 集成与配置

- 状态栏、命令面板、SCM 标题栏均可启动 Git Graph。
- 可处理多仓库工作区，并自动发现子模块仓库。
- 内置 GitHub、GitLab、Bitbucket 的创建 Pull Request 链接；可配置自定义服务商。
- 仓库级图形配置可导出并提交进项目，供团队共享。
- 可设置图线颜色和样式、提交初始加载量、文件树/扁平视图、Diff 打开位置、对话框默认值、快捷键、无障碍文件状态标记等。

## 当前缺口

- 没有 **Git worktree** 可视化或管理。
- Rebase 对话框没有 Git 2.38 的 `--update-refs`。
- Stash 只能选择是否包含未跟踪文件，不能“只 stash 暂存区”。
- 有两提交 Diff，但没有适合比较两段历史的 `git range-diff`。
- 没有 sparse checkout 状态和操作入口。
- 子模块只能作为独立仓库被发现，缺少对子模块递归建分支等操作的 UI。
- 不展示 branch description、Git notes、reflog 列表或 stash 的导入导出。
- 没有针对 `safe.directory`、reftable refs 等新 Git 环境的专门提示或测试矩阵。

## 建议新增功能

### 第一阶段：高收益、适合日常使用

| 功能 | 用户价值 | Git 最低版本 | 建议范围 | 工作量 |
| --- | --- | ---: | --- | --- |
| Worktree 管理 | 可同时处理多条分支，不必频繁 stash/checkout | 2.5+ | 列表、创建、打开 VS Code/终端、删除、lock/unlock、repair | 大 |
| Rebase `--update-refs` | interactive rebase 后自动移动指向被改写提交的本地分支 | 2.38 | 在现有 Rebase 弹窗增加复选框和版本检测 | 小 |
| Stash staged changes | 只暂存 index，保留工作区中的试验性改动 | 2.35 | 在现有 Stash 弹窗增加“仅暂存区”选项 | 小 |
| Range Diff | 对比 rebase 前后或两版 PR 分支的提交序列 | 2.19；merge 支持 2.48 | 选择两个范围/分支后，在只读面板展示 `git range-diff` 输出 | 中 |

#### Worktree 管理的最小设计

1. 仓库工具栏或右键菜单新增 **Worktrees…**。
2. 用 `git worktree list --porcelain` 获取路径、HEAD、分支、bare/locked/prunable 状态；不要读取 `.git/worktrees` 内部文件。
3. 创建时选择：目标路径、现有分支 / 新分支 / 任意 commit、是否 detach、是否创建 orphan branch。
4. 每个 worktree 提供：在 VS Code 打开、在终端打开、在 Finder/Explorer 显示、复制路径、lock/unlock、remove、repair。
5. 对“分支已在另一个 worktree checkout”这类 Git 限制，直接显示 Git 的错误文本，不尝试强行绕过。

### 第二阶段：面向大仓库与高级工作流

| 功能 | Git 最低版本 | 建议与注意事项 |
| --- | ---: | --- |
| Sparse checkout 面板 | 2.34+ | 显示 cone 模式和目录规则；支持 `set`、`add`、`reapply`、`disable`。操作文件时需尊重 `--sparse` 的安全语义。 |
| SSH 签名展示 | 2.34+ | 将 UI 的“GPG Key Id”改为通用“签名者/签名类型/验证状态”，正确兼容 SSH 签名。 |
| 子模块递归创建分支 | 2.36+ | Create Branch 对话框提供 `--recurse-submodules`；仅当用户明确勾选时执行。 |
| 分支描述 | 2.39+ | 在分支右键菜单增加查看/编辑 description，用于展示分支用途。 |
| Git notes | 2.48+ | 在提交详情显示 notes，并提供编辑入口；适合作为本地评审注记。 |
| Stash 导入/导出 | 2.51+ | 基于 `git stash export/import` 做备份和迁移入口；低频但完整。 |
| Git maintenance | 2.38+ | 显示维护建议、执行 `git maintenance run`；可选展示 reflog 过期任务。 |

### 应优先做兼容性修复，而非新 UI 的项目

| 项目 | 原因 | 处理原则 |
| --- | --- | --- |
| `safe.directory` | Git 在可疑所有权仓库中会拒绝操作 | 解释错误并提供可复制的精确 `git config --global --add safe.directory <path>` 命令；绝不自动写入，更不能建议 `*`。 |
| Reftable refs | Git 2.45+ 可用 reftable 替代传统 loose/packed refs | 所有 refs、reflog、worktree 信息都经 Git CLI 读取；补充 reftable 仓库测试。 |
| 新 Git 版本检测 | 不同系统随附的 Git 版本差异很大 | 初始化时解析 `git --version`；每个新按钮独立 gate，不因一个功能抬高全局最低版本。 |
| Shell 参数安全 | Git Graph 负责拼接用户输入的分支、路径和消息 | 新命令优先使用参数数组调用，不拼 shell 字符串；为带空格、引号、Unicode 路径写测试。 |

## Git 官方更新与本项目的映射

| Git 版本 | 与 Git Graph 直接相关的更新 | 本项目建议 |
| --- | --- | --- |
| 2.35 | `git stash --staged`、SSH 签名改进、sparse-checkout 命令统一 | 新增 staged stash；泛化签名 UI；准备 sparse checkout 支持。 |
| 2.36 | `git branch --recurse-submodules`、更好的 worktree/sparse-index 兼容 | 子模块递归建分支；worktree 兼容测试。 |
| 2.38 | interactive rebase `--update-refs`、`range-diff` 支持 pathspec | 优先增加 update-refs；规划 Range Diff 面板。 |
| 2.42 | `git worktree add` 支持 orphan branch | 在 worktree 创建对话框支持 orphan。 |
| 2.45 | reftable 成为可选 refs 后端、`git reflog list` | 避免解析 `.git/refs`；可加 reflog 浏览器。 |
| 2.48 | `range-diff --diff-merges`、rebase-merges 使用分支标签 | Range Diff 面板增加“包含 merge”选项。 |
| 2.51 | stash interchange format 与 `stash export/import` | 可做 stash 备份/迁移。 |
| 2.52 | `git refs` 工具、sparse-checkout `clean` | 暂不直接依赖 `git refs`；Sparse 面板可增加 clean。 |
| 2.55 | Linux fsmonitor daemon、`checkout -m` | 不必在扩展中实现；应确保状态刷新与 Git 自身 fsmonitor 共存。 |

官方资料：[Git 2.35](https://github.com/git/git/blob/master/Documentation/RelNotes/2.35.0.adoc)、[Git 2.38](https://github.com/git/git/blob/master/Documentation/RelNotes/2.38.0.adoc)、[Git 2.42](https://github.com/git/git/blob/master/Documentation/RelNotes/2.42.0.adoc)、[Git 2.45](https://github.com/git/git/blob/master/Documentation/RelNotes/2.45.0.adoc)、[Git 2.48](https://github.com/git/git/blob/master/Documentation/RelNotes/2.48.0.adoc)、[Git 2.51](https://github.com/git/git/blob/master/Documentation/RelNotes/2.51.0.adoc)、[Git 2.52](https://github.com/git/git/blob/master/Documentation/RelNotes/2.52.0.adoc)、[Git 2.55](https://github.com/git/git/blob/master/Documentation/RelNotes/2.55.0.adoc)。

## 推荐实施顺序

1. 补 Git 版本能力检测和测试工具。
2. 实现 staged stash 与 rebase `--update-refs`：改动小、收益立刻可见。
3. 实现 worktree 管理的只读列表和“打开”操作。
4. 扩展 worktree 创建、删除、lock/unlock、repair。
5. 实现 Range Diff。
6. 视实际使用频率选择 sparse checkout、notes、子模块递归分支和 stash 导入导出。

## 暂不建议投入的方向

- 为了支持 reftable 而自行实现 refs 解析：Git CLI 已经处理得更可靠。
- 把 Git 的 maintenance、fsmonitor、bundle-URI 做成复杂图形化产品：对日常 Git Graph 使用价值较低。
- 自动处理安全设置、强制删除分支、跨 worktree 强制 checkout：这些操作风险高，应保留 Git 的保护机制。
