// 个人网站/functions/api.js
/**
 * Cloudflare Pages Functions - 导航数据管理 API
 * 
 * 接口:
 *   GET  /api/data        获取链接配置（公开，无需密码）
 *   POST /api/data        更新链接配置（需要管理员密码）
 * 
 * 需要在 Cloudflare Pages 控制台配置：
 *   1. Workers & Pages → 你的项目 → Settings → Functions
 *      → KV namespace bindings
 *      → 变量名: NAV_DATA   命名空间: 随便创建一个叫 nav-data 的
 *   2. Environment variables → 添加变量:
 *      名称: ADMIN_PASSWORD   值: 你的密码（例如: niubi123）
 */

const DEFAULT_TOOLS = [
  { emoji: "🎨", name: "绘谜enazo", desc: "来玩你画我猜", url: "https://enazo.cn/" },
  { emoji: "💾", name: "netlify.com", desc: "好用", url: "https://app.netlify.com/" },
  { emoji: "✈️", name: "喵喵加速器", desc: "嘘~~~~~~~~~~~", url: "https://www.freeclash.top/ui/free_clash" },
  { emoji: "🐙", name: "GitHub", desc: "何意味", url: "https://github.com/Yotao-sama" },
  { emoji: "📺", name: "B 站", desc: "我的时间都去哪了", url: "https://www.bilibili.com/" },
  { emoji: "💬", name: "deepseek", desc: "凑数的", url: "https://chat.deepseek.com/" }
];

const DEFAULT_DATA = [
  { emoji: "📺", name: "Bilibili 主页", desc: "我的时间都去哪了？", url: "https://space.bilibili.com/532792677?spm_id_from=333.788.0.0", color: "#fb7299,#ff9eb5" },
  { emoji: "🐙", name: "GitHub", desc: "代码仓库 · 何意味", url: "https://github.com/Yotao-sama", color: "#2d3748,#4a5568" },
  { emoji: "🎭", name: "didQQ介绍网站", desc: "也算作是人生第一个网站", url: "https://xhq-eayoko.netlify.app/", color: "#764ba2,#667eea" },
  { emoji: "🎨", name: "绘谜 enazo", desc: "来玩你画我猜", url: "https://enazo.cn/", color: "#f6d365,#fda085" },
  { emoji: "✈️", name: "喵喵加速器", desc: "嘘~~~~~~~~~~~", url: "https://www.freeclash.top/ui/free_clash", color: "#00c6ff,#0072ff" },
  { emoji: "💬", name: "DeepSeek", desc: "凑数的 · AI 聊天", url: "https://chat.deepseek.com/", color: "#4facfe,#00f2fe" }
];

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}

// 验证密码
function checkAuth(request, env) {
  const adminPassword = env.ADMIN_PASSWORD || "admin123";
  const authHeader = request.headers.get("Authorization") || "";
  const submitted = authHeader.replace("Bearer ", "").trim();
  return submitted === adminPassword;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // 只处理 /api/data 路径（其他路径交给 Pages 静态文件处理）
  if (!path.endsWith("/api/data") && path !== "/api/data") {
    // 不是 API 请求，让 Pages 继续处理静态文件
    return context.next();
  }

  const KV = env.NAV_DATA;
  if (!KV) {
    return jsonResponse({
      error: "KV 未绑定！请在 Cloudflare Pages → Settings → Functions → KV namespace bindings 添加变量名 NAV_DATA"
    }, 500);
  }

  // ============ GET: 读取数据 ============
  if (request.method === "GET") {
    try {
      let tools = await KV.get("tools", "json");
      let data = await KV.get("data", "json");

      // KV 里没数据 → 用默认数据初始化
      if (!tools || !data) {
        tools = DEFAULT_TOOLS;
        data = DEFAULT_DATA;
        await KV.put("tools", JSON.stringify(DEFAULT_TOOLS));
        await KV.put("data", JSON.stringify(DEFAULT_DATA));
      }

      return jsonResponse({ tools, data });
    } catch (e) {
      return jsonResponse({ error: "读取失败: " + e.message }, 500);
    }
  }

  // ============ POST: 写入数据（密码保护） ============
  if (request.method === "POST") {
    if (!checkAuth(request, env)) {
      return jsonResponse({ error: "🔒 密码错误" }, 401);
    }

    try {
      const body = await request.json();
      const { tools, data } = body;

      if (!Array.isArray(tools) || !Array.isArray(data)) {
        return jsonResponse({ error: "数据格式错误" }, 400);
      }

      await KV.put("tools", JSON.stringify(tools));
      await KV.put("data", JSON.stringify(data));

      return jsonResponse({ success: true, message: "✅ 保存成功" });
    } catch (e) {
      return jsonResponse({ error: "写入失败: " + e.message }, 500);
    }
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
}