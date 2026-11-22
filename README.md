<!-- 本文件由 scripts/build.ts 自动生成，请勿直接编辑；修改 data/*.json 后重新运行即可。 -->

<h1 align="center">Awesome AI CN</h1>

<p align="center">
  <a href="https://awesome.re"><img src="https://awesome.re/badge.svg" alt="Awesome"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://github.com/zhycn/awesome-ai-cn/actions/workflows/ci.yml"><img src="https://github.com/zhycn/awesome-ai-cn/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
</p>

<p align="center"><em>给中文开发者的 AI 资源地图：模型、工具、产品与学习资料</em></p>

<p align="center">按用途分类，每条一句话说清它强在哪、适合谁；以中文可直接使用为优先，绕不开的国际主流也会保留。数据以 JSON 维护，程序与 Agent 可直接读取。</p>

<p align="center">共 <strong>13</strong> 个主题、<strong>143</strong> 条资源。</p>

<p align="center">🌐 需要科学上网（8 条），其余可直接访问</p>

## 目录

- [🧠 基础模型与 API](#基础模型与-api)（18）
- [🔀 模型服务与聚合平台](#模型服务与聚合平台)（2）
- [💻 AI 编程](#ai-编程)（17）
- [🤖 Agent 与工作流](#agent-与工作流)（15）
- [📚 RAG 与知识库](#rag-与知识库)（8）
- [🎨 多模态生成](#多模态生成)（10）
- [🧰 开发框架与 SDK](#开发框架与-sdk)（12）
- [⚙️ 训练与推理部署](#训练与推理部署)（14）
- [📊 数据、评测与基准](#数据评测与基准)（8）
- [🚀 应用与产品](#应用与产品)（9）
- [🔌 MCP 与工具生态](#mcp-与工具生态)（8）
- [🏗️ 基础设施](#基础设施)（13）
- [🎓 学习资源](#学习资源)（9）

## 基础模型与 API

*先定一个主力模型：国产可直连，海外看网络条件。*

- [DeepSeek](https://chat.deepseek.com) ⭐ - 深度求索的大模型，代码与推理能力突出，权重开源 `国产` `代码`
- [通义千问](https://tongyi.aliyun.com) ⭐ - 阿里云通用大模型，中文理解与长文本处理见长 `国产` `多模态`
- [豆包](https://www.doubao.com) - 字节跳动的通用助手，语音与多模态交互自然 `国产` `多模态`
- [Kimi](https://www.kimi.com) - 月之暗面的长文本助手，擅长资料阅读与总结 `国产`
- [智谱清言](https://chatglm.cn) - 智谱 AI 的通用助手，基于 GLM 系列模型 `国产`
- [文心一言](https://yiyan.baidu.com) - 百度的大模型助手，中文知识问答与创作见长 `国产`
- [腾讯混元](https://hunyuan.tencent.com) - 腾讯自研大模型，提供对话、生图与 API 服务 `国产` `图像`
- [讯飞星火](https://xinghuo.xfyun.cn) - 科大讯飞大模型，语音识别与合成能力突出 `国产` `语音`
- [MiniMax](https://www.minimaxi.com) - 多模态大模型厂商，语音、视频与角色对话见长 `国产` `语音` `视频`
- [阶跃星辰](https://www.stepfun.com) - 阶跃星辰的通用助手，主打多模态与终端场景 `国产` `多模态`
- [零一万物](https://www.lingyiwanwu.com) - 零一万物的大模型与行业方案，提供开放权重模型 `国产`
- [盘古大模型](https://www.huaweicloud.com/product/pangu.html) - 华为云行业大模型，面向政企私有化部署 `国产` `私有化` `企业`
- [ChatGPT](https://chatgpt.com) ⭐ 🌐 - OpenAI 的通用助手，生态与工具调用能力成熟 `多模态`
- [Claude](https://claude.ai) - Anthropic 的通用助手，长文写作与代码能力突出 `代码`
- [Gemini](https://gemini.google.com) 🌐 - Google 的多模态助手，与搜索和办公套件集成 `多模态`
- [Llama](https://www.llama.com) - Meta 的开放权重模型系列，可本地部署与微调
- [Mistral AI](https://mistral.ai) 🌐 - 法国的开源模型厂商，小尺寸模型性价比高
- [Grok](https://grok.com) 🌐 - xAI 的助手，接入实时信息，回答风格直接

## 模型服务与聚合平台

*不想逐个开户，就用聚合平台一处调用。*

- [阿里云百炼](https://www.aliyun.com/product/bailian) - 大模型调用与智能体开发平台，含通义系列 API `企业`
- [硅基流动](https://siliconflow.cn) - 聚合主流开源模型的推理服务平台，按量计费

## AI 编程

*按现有编辑器选，别重复装一套。*

- [通义灵码](https://lingma.aliyun.com) ⭐ - 阿里云的 AI 编程助手，支持行级补全与仓库级问答 `国产`
- [文心快码](https://comate.baidu.com) - 百度的 AI 编程助手，覆盖补全、单测与代码评审 `国产`
- [豆包 MarsCode](https://www.marscode.cn) - 字节跳动的编程助手，附带云端 IDE 与一键部署 `国产`
- [CodeGeeX](https://codegeex.cn) - 智谱的代码大模型与 IDE 插件，支持私有化部署 `国产` `私有化`
- [腾讯云 AI 代码助手](https://cloud.tencent.com/product/acc) - 腾讯云的编程助手，支持企业私有化与国产化环境 `国产` `私有化` `企业`
- [华为云 CodeArts](https://www.huaweicloud.com/product/codearts.html) - 华为云的一站式研发工具链，内置智能编程助手 `国产` `企业`
- [Trae](https://www.trae.cn) - 字节跳动的 AI 原生编辑器，中文界面开箱可用 `国产`
- [Cursor](https://cursor.com) ⭐ 🌐 - AI 原生编辑器，多文件改写与补全体验流畅
- [Claude Code](https://claude.com/product/claude-code) ⭐ - Anthropic 的终端编程 Agent，擅长长任务与重构
- [GitHub Copilot](https://github.com/features/copilot) - GitHub 官方编程助手，与仓库和 PR 流程深度集成
- [Codex](https://openai.com/codex/) - OpenAI 的云端编程 Agent，可并行处理多项任务
- [Cline](https://cline.bot) 🌐 - 开源的编辑器内 Agent，可自主读写文件并执行命令
- [Continue](https://www.continue.dev) - 可自托管的编程助手框架，支持接入任意模型
- [Windsurf](https://windsurf.com) 🌐 - AI 原生 IDE，主打多文件协同与终端操作
- [Aider](https://aider.chat) - 终端里的结对编程工具，改动以 Git 提交呈现
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) - Google 的终端编程 Agent，开源且有免费额度
- [Zed](https://zed.dev) - Rust 编写的高性能编辑器，内置 AI 补全与协作

## Agent 与工作流

*要自动化而不只是问答，看这节。*

- [Dify](https://dify.ai) ⭐ - 开源的大模型应用开发平台，可视化编排工作流与 Agent `国产`
- [扣子 Coze](https://www.coze.cn) ⭐ - 字节跳动的智能体搭建平台，拖拽即可发布到多端 `国产`
- [腾讯元器](https://yuanqi.tencent.com) - 腾讯的智能体开发平台，可接入公众号与微信生态 `国产`
- [Manus](https://manus.im) ⭐ - 通用型 Agent，可自主拆解并执行多步任务 `国产`
- [AgentScope](https://github.com/agentscope-ai/agentscope) - 阿里开源的多智能体框架，含调试与评测工具 `国产`
- [MetaGPT](https://github.com/geekan/MetaGPT) - 模拟软件公司的多智能体框架，输入需求输出代码 `国产`
- [FastGPT](https://fastgpt.io) - 开源的知识库问答与工作流平台，支持私有化部署 `国产` `私有化`
- [n8n](https://n8n.io) - 开源的自动化工作流平台，节点覆盖常见 SaaS 与数据库
- [LangGraph](https://www.langchain.com/langgraph) - 用图编排有状态 Agent，适合需要回滚的复杂流程
- [CrewAI](https://www.crewai.com) - 面向多角色协作的 Agent 框架，抽象简洁上手快
- [AutoGen](https://microsoft.github.io/autogen/) - 微软的多智能体对话框架，支持人机协同编排
- [Flowise](https://flowiseai.com) - 拖拽式 LLM 应用搭建工具，可快速产出聊天与 Agent
- [Langflow](https://www.langflow.org) - 节点式 LLM 编排工具，搭好的流程可直接导出 API
- [OpenManus](https://github.com/FoundationAgents/OpenManus) - 开源的通用 Agent 实现，可在本地复现多步任务
- [Browser Use](https://github.com/browser-use/browser-use) - 让 Agent 直接操作浏览器的开源框架

## RAG 与知识库

*文档解析比向量库更决定效果，先看前两条。*

- [RAGFlow](https://ragflow.io) ⭐ - 基于深度文档解析的 RAG 引擎，切片与检索可视化 `国产`
- [QAnything](https://github.com/netease-youdao/QAnything) - 网易有道的本地知识库问答，支持多种文档格式 `国产`
- [AnythingLLM](https://anythingllm.com) ⭐ - 可本地部署的知识库对话应用，可接入任意模型 `私有化`
- [Onyx](https://onyx.app) - 开源的企业知识搜索与问答平台，可连常见数据源 `企业`
- [MinerU](https://github.com/opendatalab/MinerU) - PDF 与文档解析工具，输出结构化内容供 RAG 用 `国产`
- [MarkItDown](https://github.com/microsoft/markitdown) - 微软的文档转 Markdown 工具，适配大模型输入
- [Unstructured](https://unstructured.io) - 文档解析与智能分块服务，擅长复杂版式与表格
- [Docling](https://github.com/docling-project/docling) - IBM 的文档解析库，把 PDF 与 Office 转成结构化文本

## 多模态生成

*图、视频、语音各有专精，按产出物挑。*

- [即梦](https://jimeng.jianying.com) ⭐ - 字节的图片与视频生成工具，中文提示词理解好 `国产` `图像` `视频`
- [可灵](https://klingai.com) ⭐ - 快手的视频生成模型，支持图生视频与运镜控制 `国产` `视频`
- [海螺 AI](https://hailuoai.com) - MiniMax 的语音与视频生成入口，音色自然 `国产` `语音` `视频`
- [通义万相](https://tongyi.aliyun.com/wanxiang/) - 阿里的图像与视频生成模型，中文场景理解到位 `国产` `图像` `视频`
- [ComfyUI](https://www.comfy.org) - 节点式图像生成工作流，插件与生态非常丰富
- [FLUX](https://blackforestlabs.ai) - BFL 的图像生成模型，画质与提示词跟随能力强
- [Midjourney](https://www.midjourney.com) - 以审美见长的图像生成服务，出图风格统一
- [ElevenLabs](https://elevenlabs.io) - 语音合成与音色克隆服务，多语种自然度高 `语音`
- [GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS) - 开源语音克隆工具，少量样本即可复刻音色 `国产` `语音`
- [CosyVoice](https://github.com/FunAudioLLM/CosyVoice) - 阿里开源的多语种语音合成与克隆模型 `国产` `语音`

## 开发框架与 SDK

*按语言栈挑框架，别为了框架换语言。*

- [LangChain](https://www.langchain.com) ⭐ - 最通用的 LLM 应用框架，组件与集成极其丰富
- [LlamaIndex](https://www.llamaindex.ai) - 以数据为中心的 LLM 框架，索引与检索组件齐全
- [Vercel AI SDK](https://ai-sdk.dev) ⭐ - TypeScript 的 AI 应用 SDK，前后端流式集成顺手
- [Semantic Kernel](https://github.com/microsoft/semantic-kernel) - 微软的 LLM 编排 SDK，.NET 与 Java 生态友好
- [Spring AI](https://spring.io/projects/spring-ai) - Spring 生态的 AI 集成框架，Java 团队上手成本低 `企业`
- [LangChain4j](https://github.com/langchain4j/langchain4j) - Java 版 LangChain，支持主流模型与向量库
- [Pydantic AI](https://ai.pydantic.dev) - Pydantic 团队出品的 Agent 框架，类型安全
- [Instructor](https://python.useinstructor.com) - 让模型稳定输出结构化数据的小而美工具
- [Outlines](https://github.com/dottxt-ai/outlines) - 约束解码库，保证输出符合 JSON Schema 或正则
- [LiteLLM](https://www.litellm.ai) - 统一 100+ 模型接口的代理层，自带成本与限流 `企业`
- [Agno](https://www.agno.com) - 轻量的 Agent 运行时，性能与上手速度兼顾
- [Mastra](https://mastra.ai) - TypeScript 的 Agent 框架，内置工作流与评测

## 训练与推理部署

*要私有化或降本时，从这里开始。*

- [vLLM](https://vllm.ai) ⭐ - 高吞吐推理引擎，PagedAttention 显著节省显存
- [SGLang](https://github.com/sgl-project/sglang) - 面向结构化输出的推理引擎，吞吐表现出色
- [Ollama](https://ollama.com) ⭐ - 本地一键运行开源模型，命令行与 API 都简单 `私有化`
- [llama.cpp](https://github.com/ggml-org/llama.cpp) - C++ 实现的推理，可在 CPU 与消费级显卡上运行
- [LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory) - 一站式微调框架，覆盖主流模型与训练方法 `国产`
- [Unsloth](https://unsloth.ai) - 单卡微调加速库，显存占用低、训练更快
- [Axolotl](https://github.com/axolotl-ai-cloud/axolotl) - 配置驱动的微调工具，支持多种并行与量化策略
- [DeepSpeed](https://www.deepspeed.ai) - 微软的分布式训练库，ZeRO 显著降低显存占用
- [Megatron-LM](https://github.com/NVIDIA/Megatron-LM) - NVIDIA 的大规模训练框架，支持千卡并行
- [TensorRT-LLM](https://github.com/NVIDIA/TensorRT-LLM) - NVIDIA 的推理优化库，延迟与吞吐领先
- [XTuner](https://github.com/InternLM/xtuner) - 上海 AI Lab 的微调工具箱，小显存也能跑 `国产` `私有化`
- [ms-swift](https://github.com/modelscope/ms-swift) - 魔搭的微调与部署框架，覆盖训练到上线 `国产`
- [PEFT](https://github.com/huggingface/peft) - 参数高效微调库，LoRA 等方法的官方实现
- [Xinference](https://github.com/xorbitsai/inference) - 统一的本地推理服务，可管理多种模型与嵌入 `国产` `私有化`

## 数据、评测与基准

*选型前先看评测口径，别只看名次。*

- [魔搭 ModelScope](https://modelscope.cn) ⭐ - 阿里的开源模型与数据集社区，中文资源丰富 `国产`
- [lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness) ⭐ - 业界通用的评测框架，覆盖主流基准与模型
- [OpenCompass](https://opencompass.org.cn) - 上海 AI Lab 的评测平台，含中文榜单与工具链 `国产`
- [C-Eval](https://github.com/hkust-nlp/ceval) - 中文基础能力评测基准，覆盖多学科选择题 `国产`
- [CMMLU](https://github.com/haonan-li/CMMLU) - 中文多任务语言理解基准，覆盖 67 个学科 `国产`
- [SuperCLUE](https://www.superclueai.com) - 中文大模型综合评测榜单，按月更新 `国产`
- [FlagEval](https://flageval.baai.ac.cn) - 智源的评测平台，覆盖多维度与多模态 `国产`
- [Ragas](https://docs.ragas.io) - RAG 效果评测框架，指标覆盖检索与生成

## 应用与产品

*不想自己搭，直接用现成的。*

- [秘塔 AI 搜索](https://metaso.cn) ⭐ - 中文 AI 搜索，答案带可溯源引用、无广告 `国产`
- [通义听悟](https://tingwu.aliyun.com) ⭐ - 会议与课程录音的转写、摘要与问答 `国产` `语音`
- [讯飞听见](https://www.iflyrec.com) - 语音转文字与会议纪要，中文识别准确 `国产` `语音`
- [沉浸式翻译](https://immersivetranslate.com) - 浏览器双语翻译插件，可切换多种翻译引擎 `国产`
- [秘塔写作猫](https://xiezuocat.com) - 中文写作润色与校对的在线工具 `国产`
- [WPS AI](https://www.wps.cn) - 办公套件内置写作、表格与 PPT 辅助 `国产` `企业`
- [夸克](https://quark.cn) - 夸克浏览器，内置 AI 搜索、扫描与文档问答 `国产`
- [Notion AI](https://www.notion.com/product/ai) - Notion 内置 AI，写作、总结与数据库问答
- [Gamma](https://gamma.app) 🌐 - 一句话生成演示文稿与网页，排版自动完成

## MCP 与工具生态

*让模型能调你自己的工具，从这里接。*

- [Model Context Protocol](https://modelcontextprotocol.io) ⭐ - Anthropic 提出的模型上下文协议，统一工具与数据接入
- [官方 MCP Servers](https://github.com/modelcontextprotocol/servers) - 官方维护的 MCP Server 集合，开箱即可接入
- [Awesome MCP Servers](https://github.com/punkpeye/awesome-mcp-servers) - 社区整理的 MCP Server 大全，按场景分类
- [Smithery](https://smithery.ai) ⭐ - MCP Server 的托管与发现平台，可一键接入
- [FastMCP](https://github.com/jlowin/fastmcp) - 用 Python 快速编写 MCP Server 的框架
- [Playwright MCP](https://github.com/microsoft/playwright-mcp) - 微软的浏览器 MCP Server，让模型直接操作网页
- [mcp-use](https://github.com/mcp-use/mcp-use) - 在应用中接入 MCP 工具的客户端库
- [mcp.so](https://mcp.so) - MCP Server 的聚合目录，支持搜索与筛选

## 基础设施

*算力、向量库与观测，按需取用。*

- [Milvus](https://milvus.io) ⭐ - 开源向量数据库，支持十亿级向量检索 `国产`
- [Qdrant](https://qdrant.tech) - Rust 编写的向量数据库，过滤检索性能好
- [Weaviate](https://weaviate.io) - 带混合检索的向量数据库，模块化向量化
- [Chroma](https://www.trychroma.com) - 轻量嵌入式向量库，本地原型开发首选
- [Pinecone](https://www.pinecone.io) - 全托管向量数据库，免运维、弹性扩缩
- [Modal](https://modal.com) - Serverless GPU 平台，按秒计费跑推理任务
- [RunPod](https://www.runpod.io) - GPU 云主机与 Serverless 推理，价格透明
- [火山引擎](https://www.volcengine.com) - 字节的云平台，提供方舟大模型与 GPU 算力 `国产` `企业`
- [阿里云 PAI](https://www.aliyun.com/product/bigdata/learn) - 阿里云机器学习平台，覆盖训练到部署 `国产` `企业`
- [AutoDL](https://www.autodl.com) - 国内 GPU 租用平台，按小时计费适合实验 `国产`
- [Langfuse](https://langfuse.com) - 开源的 LLM 可观测平台，追踪调用与成本
- [LangSmith](https://www.langchain.com/langsmith) - LangChain 的调试与评测平台，链路追踪清晰
- [Helicone](https://www.helicone.ai) - LLM 网关与可观测服务，代理层一行接入

## 学习资源

*系统入门看课程，跟前沿看媒体。*

- [动手学深度学习](https://zh.d2l.ai) ⭐ - 中英文版教材与代码配套，适合系统入门 `国产`
- [Prompt Engineering Guide](https://www.promptingguide.ai) ⭐ - 提示词工程指南，含中文版与大量示例
- [DeepLearning.AI](https://www.deeplearning.ai) - 吴恩达团队的 AI 课程平台，以短课为主
- [fast.ai](https://www.fast.ai) - 实战导向的深度学习课程，配套代码完整
- [李宏毅机器学习](https://speech.ee.ntu.edu.tw/~hylee/ml/2023-spring.php) - 台大李宏毅的机器学习课，中文讲解通俗
- [李宏毅笔记](https://github.com/datawhalechina/leedl-tutorial) - 李宏毅课程的中文笔记，Datawhale 整理 `国产`
- [Awesome-LLM](https://github.com/Hannibal046/Awesome-LLM) - 大模型论文与资源清单，紧跟前沿
- [机器之心](https://www.jiqizhixin.com) - AI 行业媒体，覆盖论文解读与产业动态 `国产`
- [量子位](https://www.qbitai.com) - AI 科技媒体，跟进模型发布与产品动态 `国产`

## 收录说明

- 本文件由 [`scripts/build.ts`](scripts/build.ts) 自动生成，请勿直接编辑；修正内容请改 `data/` 下对应的 JSON，再运行 `npm run build`。
- 新增或修正条目请先读 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 字段定义、写作口吻与排序规则见 [docs/CONVENTIONS.md](docs/CONVENTIONS.md)。

## License

[MIT](LICENSE) © zhycn
