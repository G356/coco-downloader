# CoCo 桌面端（Electron）

Electron 外壳在本机回环地址上运行一个 Next.js 服务（`renderer/`），窗口加载该服务。第三方渠道请求从用户本机发出。

```
electron/
├─ src/main/          主进程：窗口、迷你模式、启动 Next 服务（随机端口 + 会话令牌）
├─ src/preload/       contextBridge，仅暴露 window.coco（窗口控制、平台信息）
├─ renderer/          Next.js App Router 界面
│  └─ src/
│     ├─ proxy.ts     拦截所有请求：校验 Host 与会话令牌
│     ├─ app/         页面路由（page.tsx）与 /api/music/* 曲库接口
│     ├─ server/music 曲库服务：平台无关类型 + 各平台实现（当前为网易云）
│     ├─ components/
│     │  ├─ ui/         基础控件：Button、IconButton、Slider、Spinner
│     │  ├─ scroll/     滚动体系：ScrollArea、CollapsingHeader、StickyBar、Page
│     │  ├─ layout/     外壳、侧边栏、顶栏、路由（navigation.tsx）
│     │  ├─ player/     播放栏、进度条、歌词抽屉、播放状态
│     │  ├─ music/      歌单卡、榜单卡、歌曲表、歌手卡等业务组件
│     │  ├─ search/     搜索框、联想面板、搜索结果页
│     │  ├─ collection/ 歌单 / 专辑详情页
│     │  └─ home | discover | charts | common
│     ├─ lib/         catalog-client、hooks（分页、防抖）、搜索历史
│     └─ types/
└─ scripts/           dev.mjs（热重载）、依赖检查、构建辅助
```

## 开发（热重载）

在仓库根目录：

```bash
npm run desktop:dev
```

- 界面代码（`renderer/`）：Next Fast Refresh，保存即更新，页面状态保留。
- 主进程（`src/main/`）：`tsc --watch` 重新编译后自动重启 Electron，Next 服务不重启。
- preload（`src/preload/`）：重新编译后自动刷新窗口。
- 依赖变化时会自动执行 `npm ci`。
- `COCO_WEBPACK=1 npm run desktop:dev` 可改用 webpack（无原生 SWC 的平台）。
- `npm run desktop:preview`：仅在浏览器中预览界面（http://127.0.0.1:3457）。

## 生产构建

```bash
npm run desktop:build   # 编译主进程，next build 输出 standalone 服务
npm run desktop:start   # 以 standalone 服务启动 Electron
```

## 滚动交互约定

页面统一放在 `<Page>` 内，滚动容器由外壳提供，滚动条贴窗口最右侧。

- `CollapsingHeader`：页面标题随滚动缩小、上移并淡出。
- `StickyBar`：内容滚过后吸顶，出现磨砂底与阴影，左侧淡入紧凑标题（标签栏、筛选器、歌单工具栏都用它）。
- `useScrollArea()`：拿到 `scrollY`（motion value），自定义滚动联动动画不会引起重渲染。
- 鼠标滚轮带缓动；触控板保持原生惯性。返回上一页会恢复离开时的滚动位置。

## 曲库接口

路由在 `renderer/src/app/api/music/`，参数 `source` 默认 `netease`。

| 接口 | 用途 | 网易云上游 |
| --- | --- | --- |
| `GET /api/music/home?section=featured\|new\|artists` | 首页三个标签 | `personalized/*`、`v1/discovery/new/songs`、`album/new`、`artist/top` |
| `GET /api/music/charts?limit=8` | 排行榜（每榜前三首含封面） | `toplist/detail` + `v6/playlist/detail` |
| `GET /api/music/categories` | 歌单广场分类 | `playlist/catalogue` |
| `GET /api/music/playlists?category=&order=hot\|quality&cursor=` | 歌单广场列表 | `playlist/list`、`playlist/highquality/list` |
| `GET /api/music/playlist?id=&offset=&limit=` | 歌单 / 榜单详情，歌曲分页 | `v6/playlist/detail` + `v3/song/detail` |
| `GET /api/music/album?id=` | 专辑详情 | `v1/album/{id}` |
| `GET /api/music/search?keyword=&type=song\|playlist\|album\|artist&offset=` | 搜索 | eapi `cloudsearch/pc` |
| `GET /api/music/search/suggest?keyword=` | 搜索联想（补全词 + 分组匹配） | `search/suggest/web`、`search/suggest/keyword` |
| `GET /api/music/search/best?keyword=` | 最佳匹配 | `search/suggest/multimatch` |
| `GET /api/music/search/hot` | 热搜榜、默认搜索词 | `hotsearchlist/get`、eapi `search/defaultkeyword/get` |

weapi / eapi 加密参照 NeteaseCloudMusicApi（`util/crypto.js`）。新增 QQ、酷狗时，在 `server/music/` 下实现 `CatalogProvider` 并注册到 `server/music/index.ts`。

## 本地服务安全

- 仅监听 `127.0.0.1` 的随机端口。
- 每次启动生成随机令牌。窗口通过 httpOnly cookie 携带令牌，主进程通过 `x-coco-token` 请求头携带。`proxy.ts` 会拒绝令牌不符或 Host 不符的请求，防止其他本机程序、网页或 DNS 重绑定访问该端口。
- 直接运行 `npm run desktop:preview` 时没有令牌，校验会跳过，仅用于浏览器预览。
