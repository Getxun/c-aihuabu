# 模型名后缀协议识别方案

## 目标

通过模型名尾部的协议标识，让同一个渠道地址也能按不同上游协议发请求。

典型场景：

- 用户只知道中转 / NewToken 渠道地址，不知道真实上游域名。
- 中转返回的模型 ID 带有 `sd-2-17[ld]`。
- 前端看到 `[ld]` 后，不按 NewToken 的 `image_url + extra_images + aspect_ratio + /videos` 发，而是按 Lingdong 的 `images/videos/audios + ratio + /video/generations` 发。

核心原则：

- 不按域名判断。
- 不按裸模型名猜测。
- 只按明确后缀判断，例如 `[ld]`。
- UI、配置和提交给上游的 `model` 都保留后缀；后缀只用于前端选择请求链路。

## 后缀规则

| 后缀 | 协议 | 示例 | 说明 |
| --- | --- | --- | --- |
| `[ld]` | `lingdongapi` | `sd-2-17[ld]` | Lingdong 请求协议 |
| `[nt]` | `newtoken` | `video-standard-720p[nt]` | NewToken 请求协议 |
| `[dm]` | `duomiapi` | `doubao-seedance-2-0-260128[dm]` | Duomi 请求协议 |
| `[vk]` | `volcengine` | `doubao-seedance-xxx[vk]` | 火山方舟请求协议 |
| 无后缀 | 渠道配置 | `gpt-image2-2k` | 使用 `channel.apiFormat` |

后缀只识别模型名末尾，推荐正则：

```ts
/\[(ld|nt|dm|vk)\]$/i
```

不要用 `includes("[ld]")`，避免模型名中间出现方括号时误判。

## Lingdong `[ld]` 对应请求方式

参考文档：`https://www.lingdongapi.com/docs/api/?v=20260517`

### 图片创建

路径：

```txt
POST /v1/images/generations
```

请求体：

```json
{
  "model": "gpt-image-2[ld]",
  "prompt": "产品海报，干净背景",
  "size": "1024x1024",
  "n": 1,
  "images": ["https://example.com/ref1.jpg"]
}
```

注意：

- 参考图统一放 `images` 数组。
- 不走 OpenAI 的 `/images/edits` multipart 文件上传。
- `model` 保留后台模型名，例如 `gpt-image-2[ld]`；不要带 `response_format` / `output_format` 这类 OpenAI 专用字段。

### 视频创建

路径：

```txt
POST /v1/video/generations
```

请求体：

```json
{
  "model": "sd-2-17[ld]",
  "prompt": "美女舞蹈",
  "duration": 15,
  "ratio": "9:16",
  "images": ["https://example.com/ref1.jpg", "https://example.com/ref2.jpg"],
  "videos": [],
  "audios": []
}
```

注意：

- 图片统一放 `images`。
- 视频统一放 `videos`。
- 音频统一放 `audios`。
- 比例统一放 `ratio`，例如 `16:9`、`9:16`。
- 不使用 NewToken 的 `image_url`、`extra_images`、`extra_videos`、`extra_audios`、`aspect_ratio`。

### 视频查询和结果

查询路径：

```txt
GET /v1/video/generations/{task_id}
```

结果读取兼容字段：

```txt
url
video_url
result_url
content_url
```

这些字段可能指向：

```txt
/v1/videos/{task_id}/content
```

当前 `readVideoUrl` 已经覆盖这些字段，重点是 `[ld]` 的轮询也必须走 Lingdong 查询路径。

## 推荐实现

### 1. 做一个共享后缀工具

不要在 `image.ts` 和 `video.ts` 里复制两份函数。建议放在 `web/src/stores/use-config-store.ts` 旁边导出，或新增 `web/src/lib/model-api-suffix.ts`。

推荐导出：

```ts
const MODEL_API_SUFFIX_FORMATS = {
    ld: "lingdongapi",
    nt: "newtoken",
    dm: "duomiapi",
    vk: "volcengine",
} as const;

type ModelApiSuffix = keyof typeof MODEL_API_SUFFIX_FORMATS;

export function detectModelApiFormat(model: string): ApiCallFormat | null {
    const name = modelOptionName(model).trim();
    const match = name.match(/\[(ld|nt|dm|vk)\]$/i);
    if (!match) return null;
    return MODEL_API_SUFFIX_FORMATS[match[1].toLowerCase() as ModelApiSuffix];
}

export function resolveRequestApiFormat(config: AiConfig, model = config.model) {
    return detectModelApiFormat(model) || config.apiFormat;
}
```

### 2. 保留配置和 UI 原始模型名

`channel.models`、`imageModel`、`videoModel`、UI 下拉项都保留原始值：

```txt
default::sd-2-17[ld]
```

不要改 `modelOptionName` 的行为。它仍然返回：

```txt
sd-2-17[ld]
```

提交上游请求体时也保留这个后台模型名，不做后缀清理。

### 3. 请求路由按后缀优先

优先级：

```txt
模型后缀 > 渠道 apiFormat
```

也就是说：

```ts
const requestFormat = resolveRequestApiFormat(requestConfig, requestConfig.model);
```

然后用 `requestFormat` 分支，而不是只看 `requestConfig.apiFormat`。

### 4. 图片接口改法

`requestGeneration`：

- 如果 `requestFormat === "lingdongapi"`，直接走 `requestLingdongImages(requestConfig, prompt, [], n, options)`。
- 否则保持原有 OpenAI / Gemini / NewToken 逻辑。

`requestEdit`：

- 如果 `requestFormat === "lingdongapi"`，走 `requestLingdongImages(requestConfig, requestPrompt, references, n, options)`。
- 不走 `/images/edits`。
- Lingdong 参考图由 `resolveLingdongReferenceImageUrl` 上传为公网 URL 后放入 `images`。

`requestLingdongImages`：

```ts
{
    model: modelOptionName(config.model),
    prompt: withSystemPrompt(config, prompt),
    n: count,
    ...(requestSize ? { size: requestSize } : {}),
    ...(imageUrls.length ? { images: imageUrls } : {}),
}
```

普通 OpenAI / NewToken / Gemini 路径里，只要请求体里出现 `model`，也保持后台模型名原样；`[nt]` / `[dm]` 这类后缀只负责前端路由，不负责改写上游模型名。

### 5. 视频接口改法

`createVideoGenerationTask`：

```ts
const requestFormat = resolveRequestApiFormat(requestConfig, requestConfig.model);

if (requestFormat === "duomiapi") ...
if (requestFormat === "lingdongapi") ...
if (requestFormat === "newtoken") ...
if (requestFormat === "volcengine") ...
```

`pollVideoGenerationTask` 也必须用同样规则。这里很关键：异步任务创建后轮询仍然要知道 `[ld]`，否则会创建走 Lingdong，轮询又落回 NewToken。

建议：

- `VideoGenerationTask.model` 保存用户选择的原始模型值，例如 `default::sd-2-17[ld]` 或 `sd-2-17[ld]`。
- 上游请求体里的 `model` 使用 `modelOptionName(model)`，保留 `[ld]` 等后台模型后缀。
- 轮询时用 `task.model` 检测后缀。

`createLingdongVideoTask` 请求体：

```ts
const modelName = modelOptionName(model);
const payload: Record<string, any> = {
    model: modelName,
    prompt: buildSeedancePromptText(prompt, references, videoReferences, audioReferences),
    duration: normalizeLingdongDuration(config.videoSeconds, modelName),
};

appendLingdongSize(payload, config, modelName);
if (imageUrls.length) payload.images = imageUrls;
if (videoUrls.length) payload.videos = videoUrls;
if (audioUrls.length) payload.audios = audioUrls;
```

不要为了路由再改写 payload 里的模型名。

### 6. Lingdong 模型参数细节

建议补强 `normalizeLingdongDuration`：

- `sora-2`：4 / 8 / 12。
- `sd-2-1`、`sd-2-2`、`sd-2-7`、`sd-2-17`、`cvk`、`sd-2-fast-720`：10 / 15。
- `sd-2-4`：5-15。
- `sd-2-11`：4-15。

建议 `createLingdongVideoTask` 对 Lingdong Seedance 模型追加：

```ts
payload.resolution = normalizeCaiResolution(config.vquality);
```

素材数量建议按模型限制截断：

- `sd-2-17`、`sd-2-1`、`sd-2-2`、`sd-2-7`、`cvk`、`sd-2-fast-720`：图片 9、视频 3、音频 3。
- `sd-2-4`：图片/视频合计 4，图片超过 4 时上游可能会合并，前端最好不主动传超过文档限制。
- `sora-2`：图片最多 1。

## 为什么不能按域名

用户配置的通常是中转地址，例如 NewToken 或自建代理地址。真实上游 `lingdongapi.com` 对用户不可见，也不一定出现在 Base URL。

所以兼容条件必须来自模型 ID：

```txt
sd-2-17[ld]
```

而不是：

```txt
baseUrl.includes("lingdongapi.com")
```

## 示例流程

模型列表返回：

```json
{
  "data": [
    { "id": "sd-2-17[ld]" },
    { "id": "gpt-image2-2k" }
  ]
}
```

用户选择：

```txt
default::sd-2-17[ld]
```

前端识别：

```txt
modelOptionName -> sd-2-17[ld]
detectModelApiFormat -> lingdongapi
payload model -> sd-2-17[ld]
```

最终提交：

```json
{
  "model": "sd-2-17[ld]",
  "prompt": "美女舞蹈",
  "duration": 15,
  "ratio": "9:16",
  "images": ["url1", "url2", "url3"]
}
```

## 验证清单

- 无后缀模型继续使用渠道原本的 `apiFormat`。
- `sd-2-17[ld]` 在 NewToken 渠道下也走 Lingdong 视频创建路径 `/v1/video/generations`。
- `sd-2-17[ld]` 的视频 payload 使用 `images`，不是 `image_url + extra_images`。
- `sd-2-17[ld]` 的比例字段是 `ratio`，不是 `aspect_ratio`。
- 所有上游请求体中的 `model` 都不包含 `[ld]`。
- 轮询路径跟创建路径一致，都是 Lingdong 协议。
- UI 下拉仍显示 `[ld]`，方便用户知道模型会强制使用 Lingdong 协议。

## 实施顺序

1. 新增共享后缀工具。
2. 修改图片生成和编辑路由。
3. 修改视频创建和轮询路由。
4. 清理所有上游请求体中的模型后缀。
5. 补强 Lingdong 视频 duration / resolution / 素材数量限制。
6. 更新待测文档，记录 `[ld]` 多图视频验证项。
