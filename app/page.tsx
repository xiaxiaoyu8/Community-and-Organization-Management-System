//sysyem02\app\page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from 'next/navigation';

// 模拟的用户信息（可以通过接口调用替代）
const userDatabase = [
  { username: "admin", password: "password123" },
  { username: "user1", password: "12345" },
  { username: "user2", password: "password678" },
];

export default function LoginPage() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loggedIn, setLoggedIn] = useState<boolean>(false);

  // 使用 ref 保存登录状态
  const loginStatusRef = useRef(loggedIn);

  // 模拟登录请求
  const login = useCallback(() => {
    const user = userDatabase.find(
      (user) => user.username === username && user.password === password
    );
    if (user) {
      setLoggedIn(true);
      loginStatusRef.current = true;
      setError(""); // 清空错误信息
    } else {
      setError("用户名或密码错误");
    }
  }, [username, password]);

  // 键盘事件监听，用于提交表单（按Enter键）
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        login();
      }
    },
    [login]
  );

  // 按下键盘的事件监听
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // 如果用户已登录，跳转到主页面（这里模拟跳转）
  const router = useRouter();
  useEffect(() => {
  if (loggedIn) {
      router.push("/pages");
    }
    // 这里可以添加其他逻辑，比如获取用户信息等
    // 例如：获取用户信息
    // const userInfo = await fetchUserInfo();
    // setUserInfo(userInfo);
    // 这里可以使用 useRef 来保存登录状态
    // loginStatusRef.current = loggedIn;
    // console.log("登录状态:", loginStatusRef.current);
  }, [loggedIn]);


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white">
        社团管理系统 - 登录
      </h1>

      <div className="mb-4 w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        {/* 用户名输入框 */}
        <div className="mb-4">
          <label htmlFor="username" className="block text-gray-700 dark:text-gray-300">
            用户名
          </label>
          <input
            type="text"
            id="username"
            className="mt-2 p-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        {/* 密码输入框 */}
        <div className="mb-4">
          <label htmlFor="password" className="block text-gray-700 dark:text-gray-300">
            密码
          </label>
          <input
            type="password"
            id="password"
            className="mt-2 p-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* 错误提示 */}
        {error && <div className="text-red-500 mb-4">{error}</div>}

        {/* 登录按钮 */}
        <button
          onClick={login}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          登录
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p>操作说明:</p>
        <ul className="list-disc list-inside">
          <li>输入用户名和密码进行登录。</li>
          <li>按Enter键也可以提交登录表单。</li>
        </ul>
      </div>
    </div>
  );
}
