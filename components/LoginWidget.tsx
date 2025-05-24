// components/LoginWidget.tsx
"use client";

import { useState, useEffect } from "react";

interface LoginWidgetProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginWidget({ onLoginSuccess }: LoginWidgetProps) {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "登录失败");
      } else {
        setError("");
        onLoginSuccess(data.user); // 调用父组件的回调函数
      }
    } catch (err) {
      setError("发生意外错误。");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-3 bg-white bg-opacity-80 backdrop-blur-sm rounded-lg shadow-md text-xs">
      <h3 className="font-semibold mb-2 text-sm text-gray-700">人员评分系统 - 登录</h3>
      <form onSubmit={handleLogin}>
        <div className="mb-2">
          <label htmlFor="widget-username" className="block text-gray-600 sr-only">
            用户名
          </label>
          <input
            type="text"
            id="widget-username"
            className="p-1.5 w-full border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="mb-2">
          <label htmlFor="widget-password" className="block text-gray-600 sr-only">
            密码
          </label>
          <input
            type="password"
            id="widget-password"
            className="p-1.5 w-full border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="text-red-500 text-xs mb-2">{error}</div>}
        <button
          type="submit"
          className="w-full py-1.5 px-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition text-xs"
          disabled={isLoading}
        >
          {isLoading ? "登录中..." : "登录"}
        </button>
      </form>
      <p className="mt-2 text-gray-500 text-[10px]">
      </p>
    </div>
  );
}