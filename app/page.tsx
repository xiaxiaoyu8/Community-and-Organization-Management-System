// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import Head from 'next/head'; // Next.js Head 组件，用于管理 <head> 标签
import { useRouter } from 'next/navigation'; // 导入 useRouter Hook
import LoginWidget from "@/components/LoginWidget";
import ArticleUpload from "@/components/ArticleUpload";
import ArticleList from "@/components/ArticleList";

type HotItem = {
  title: string
  hot: string
  url: string
}

// 导入您的本地图片
import HomepageBackgroundImage from './source/images/gugong_zhanlan01.jpg'; // 确保此路径相对于当前文件 app/page.tsx 是正确的
// 日期和农历助手函数 (简化版)
const getCurrentDateInfo = () => {
  const now = new Date(); // 为演示目的，可固定到当前日期
  const days = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const dayOfWeek = days[now.getDay()];
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  // 农历日期占位符 - 真实应用中请使用库以确保准确性
  // 注意: "乙巳年 蛇" 是一个基于特定年份的示例，如果需要动态显示，需要更复杂的农历转换逻辑
  const lunarYearAnimal = "农历四月廿七"; // 示例, 实际农历日期会变化，这里是固定值,无调用

  return `${dayOfWeek} ${year}年${month}月${day}日 ${lunarYearAnimal}`;
};

// 用户接口定义
interface User {
  id: number;
  username: string;
  // 如果需要，可添加其他用户属性
}

// 访客统计接口定义
interface VisitorStats {
    dailyVisits: number;
    totalVisits: number;
}

export default function BlogHomePage() {
  const router = useRouter(); // 初始化 router
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [dateInfo, setDateInfo] = useState<string>("");
  const [showUploadForm, setShowUploadForm] = useState<boolean>(false);
  const [refreshArticleTrigger, setRefreshArticleTrigger] = useState<number>(0);
  const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null); // 用于存储访客统计的状态
  //微博热搜列表
  const [hotList, setHotList] = useState<HotItem[]>([])
  const [error, setError] = useState<string | null>(null)

  

  useEffect(() => {
    setDateInfo(getCurrentDateInfo());
    const storedUser = localStorage.getItem("loggedInUser");
    if (storedUser) {
      setLoggedInUser(JSON.parse(storedUser));
    }
    

    // 获取初始统计数据并增加访问次数
    const fetchAndIncrementStats = async () => {
        try {
            // 增加访问次数
            fetch('/api/stats', { method: 'POST' })
                .then(res => {
                    if (!res.ok) throw new Error(`POST /api/stats failed with status ${res.status}`);
                    return res.json();
                })
                .then(data => {
                    if (data.dailyVisits !== undefined && data.totalVisits !== undefined) {
                        setVisitorStats({ dailyVisits: data.dailyVisits, totalVisits: data.totalVisits });
                    } else {
                        console.warn("POST /api/stats did not return stats, fetching via GET.");
                        fetchVisitorStats();
                    }
                })
                .catch(err => {
                    console.error("增加统计数据时出错，将尝试正常获取:", err);
                    fetchVisitorStats();
                });
        } catch (err) {
            console.error("fetchAndIncrementStats 函数出错:", err);
            fetchVisitorStats();
        }
    };

    // 单独的获取统计数据的函数
    const fetchVisitorStats = async () => {
        try {
            console.log("正在获取访客统计 (GET /api/stats)...");
            const response = await fetch('/api/stats');
            if (response.ok) {
                const data: VisitorStats = await response.json();
                setVisitorStats(data);
                console.log("访客统计数据已获取:", data);
            } else {
                console.error("获取访客统计失败，状态码:", response.status);
            }
        } catch (err) {
            console.error("获取访客统计时出错:", err);
        }
    };

    fetchAndIncrementStats(); // 组件挂载时执行一次

  }, []); // 空依赖数组表示此 effect 只在组件挂载和卸载时运行一次

  const handleLoginSuccess = (user: User) => {
    setLoggedInUser(user);
    localStorage.setItem("loggedInUser", JSON.stringify(user));
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem("loggedInUser");
    setShowUploadForm(false);
  };

  const handleArticleUploaded = () => {
    setShowUploadForm(false);
    setRefreshArticleTrigger(prev => prev + 1);
  };

  // 新增：处理进入评分系统按钮点击事件
  const handleGoToScoringSystem = () => {
    router.push('/scoring-system-page'); // 假设评分系统的路径是 /scoring-system，请根据您的实际路径修改
  };

  return (
    <>
      <Head>
        <title>个人博客</title>
        <meta name="description" content="我的个人博客空间" />
      </Head>

      <div className="min-h-screen bg-gray-100 flex flex-col">
        <header
          className="h-[400px] bg-cover bg-center flex items-center justify-center text-white relative"
          style={{ backgroundImage: `url(${HomepageBackgroundImage.src})` }} // 注意：如果图片不显示，请检查导入路径或考虑将图片移至 public 目录
        >
          <div className="relative z-10 text-center">
            <h1 className="text-6xl font-bold leading-tight" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
              {dateInfo.split(" ")[0]} {/* 显示星期 */}
            </h1>
            <p className="text-xl mt-2" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
              {dateInfo.substring(dateInfo.indexOf(" ") + 1)} {/* 显示日期和农历 */}
            </p>
          </div>
        </header>

        <main className="flex-grow container mx-auto px-2 py-4 md:px-4 md:py-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <aside className="w-full lg:w-1/4 space-y-6 order-2 lg:order-1">
              {/* 导航占位符 */}
              <div className="bg-white p-4 rounded-lg shadow">
                   <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">导航</h3>
                   <ul className="space-y-2 text-sm text-gray-600">
                     {["首页", "文章", "笔记", "留言", "反馈", "订阅", "关于", "更多"].map(item => (
                       <li key={item}><a href="#" className="hover:text-blue-600">{item}</a></li>
                     ))}
                   </ul>
              </div>

              {/* 登录小部件区域 */}
              <div className="sticky bottom-4 space-y-2"> {/* 使用 space-y-2 为小部件之间提供垂直间距 */}
                {!loggedInUser ? (
                  <LoginWidget onLoginSuccess={handleLoginSuccess} />
                ) : (
                  // 已登录用户操作区域
                  <div className="p-3 bg-white bg-opacity-80 backdrop-blur-sm rounded-lg shadow-md text-xs">
                    <p className="text-sm text-gray-700">已登录: <strong>{loggedInUser.username}</strong></p>
                    <button
                        onClick={() => setShowUploadForm(prev => !prev)}
                        className="mt-2 w-full py-1.5 px-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition text-xs mb-1"
                    >
                        {showUploadForm ? "关闭上传" : "上传文章"}
                    </button>
                    {/* 新增：进入评分系统按钮 */}
                    <button
                        onClick={handleGoToScoringSystem}
                        className="mt-1 w-full py-1.5 px-3 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition text-xs mb-1" // 使用 sky 颜色作为示例，并添加 mb-1
                    >
                        进入评分系统
                    </button>
                    <button
                      onClick={handleLogout}
                      className="mt-1 w-full py-1.5 px-3 bg-red-500 text-white rounded-md hover:bg-red-600 transition text-xs" // 如果上面按钮有 mb-1，这里也用 mt-1
                    >
                      退出登录
                    </button>
                  </div>
                )}

                {/* 访客统计小部件 */}
                <div className="p-3 bg-white bg-opacity-80 backdrop-blur-sm rounded-lg shadow-md text-xs text-gray-700">
                    <h4 className="font-semibold text-sm mb-2 border-b pb-1">访客统计</h4>
                    {visitorStats ? (
                        <>
                            <p>今日访问: {visitorStats.dailyVisits.toLocaleString()} 人/次</p>
                            <p>总访问量: {visitorStats.totalVisits.toLocaleString()} 人/次</p>
                            <br />
                            <p className="font-semibold text-sm mb-2 border-b pb-1">联系电话: 15872469989（微信同号）</p>
                        </>
                    ) : (
                        <p>加载中...</p> // 加载状态提示
                    )}
                </div>
              </div>
            </aside>

            {/* 中央内容 (文章) */}
            <section className="w-full lg:w-1/2 space-y-6 order-1 lg:order-2">
                {showUploadForm && loggedInUser && (
                    <div className="mb-8"> {/* 为上传表单添加一些底部边距 */}
                        <ArticleUpload loggedInUser={loggedInUser} onUploadSuccess={handleArticleUploaded} />
                    </div>
                )}
                <ArticleList refreshTrigger={refreshArticleTrigger} />
            </section>

            {/* 右侧边栏 (占位符) */}
            <aside className="w-full lg:w-1/4 space-y-6 order-3 lg:order-3">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-center mb-3 border-b pb-2">
                    <h3 className="font-semibold text-gray-700">微博热搜榜</h3>
                    <button className="text-xs text-gray-400 hover:text-gray-600">🔄</button> {/* 刷新图标 */}
                </div>
                <ul className="space-y-2 text-sm">
                  {[ // 示例热搜项
                    "1. 王健林再卖万达广场",
                    "2. 娱乐主播收入排行榜",
                    "3. 蛋 宁碎不翻",
                    "4. 新说唱",
                    "5. 手串 辐射",
                  ].map((item, index) => (
                    <li key={index} className="flex items-center">
                      <span className={`mr-2 w-5 text-center font-bold ${index < 3 ? 'text-red-500' : 'text-orange-400'}`}>{index + 1}</span>
                      <a href="#" className="text-gray-600 hover:text-blue-600 truncate" title={item.substring(item.indexOf(" ") + 1)}>{item.substring(item.indexOf(" ") + 1)}</a>
                    </li>
                  ))}
                </ul>
              </div>
                {/* 图片中的其他占位符块 */}
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">夏小雨的个人主页</h3>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <a href="https://space.bilibili.com/473139017?spm_id_from=333.788.0.0/" target="_blank" rel="noopener noreferrer" className="block rounded-md hover:text-blue-600">
                      <h3 className="font-semibold text-green-500 mb-1">📺 夏小雨_bilibili</h3>
                      <p className="text-xs text-gray-600">嵌入式学习记录，感谢三连支持。</p>
                    </a>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <a href="https://github.com/xiaxiaoyu8/" target="_blank" rel="noopener noreferrer" className="block rounded-md hover:text-blue-600">
                      <h3 className="font-semibold text-red-500 mb-1">🐈︎ 夏小雨_GitHub</h3>
                      <p className="text-xs text-gray-600">展示了本网页的主要代码，以及其他的个人项目 Star。</p>
                    </a>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <a href="https://gitee.com/xiaxiaoyu8" target="_blank" rel="noopener noreferrer" className="block rounded-md hover:text-blue-600"> {/* 修正了 Gitee 链接 */}
                      <h3 className="font-semibold text-orange-500 mb-1">❤ 夏小雨_Gitee</h3>
                      <p className="text-xs text-gray-600">展示了我的其他个人项目 Star。</p>
                    </a>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" className="block rounded-md hover:text-blue-600"> {/* 修正了 Gitee 链接 */}
                      <h3 className="font-semibold text-orange-500 mb-1">🔗 ChatGPT</h3>
                      <p className="text-xs text-gray-600">友情链接</p>
                    </a>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" className="block rounded-md hover:text-blue-600"> {/* 修正了 Gitee 链接 */}
                      <h3 className="font-semibold text-orange-500 mb-1">🔗 Gemini</h3>
                      <p className="text-xs text-gray-600">友情链接</p>
                    </a>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <a href="https://grok.com/" target="_blank" rel="noopener noreferrer" className="block rounded-md hover:text-blue-600"> {/* 修正了 Gitee 链接 */}
                      <h3 className="font-semibold text-orange-500 mb-1">🔗 Grok</h3>
                      <p className="text-xs text-gray-600">友情链接</p>
                    </a>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <a href="https://claude.ai/new" target="_blank" rel="noopener noreferrer" className="block rounded-md hover:text-blue-600"> {/* 修正了 Gitee 链接 */}
                      <h3 className="font-semibold text-orange-500 mb-1">🔗 Claude</h3>
                      <p className="text-xs text-gray-600">友情链接</p>
                    </a>
                  </div>
            </aside>
          </div>
        </main>

        {/* 页脚 */}
        <footer className="text-center p-4 text-xs text-gray-500 border-t">
          © {new Date().getFullYear()} <span className="text-[13px] text-[#0055ff]">夏小雨</span>  的个人博客  版权所有
          <p className="text-[10px]">测试QQ联系管理员: 2739381256 | 禁止非法用途</p>
        </footer>
      </div>
    </>
  );
}