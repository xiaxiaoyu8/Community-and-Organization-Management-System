"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function DashboardPage() {
  const [started, setStarted]   = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore]       = useState(0);
  const [player, setPlayer]     = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 绘制并控制游戏循环
  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const GRID = 20;
    const SIZE = 20;
    let snake = [{ x: 10, y: 10 }];
    let food  = { x: 5, y: 5 };
    let dx = 1, dy = 0;
    let timer: number;

    const drawFrame = () => {
      // 移动
      const head = { x: snake[0].x + dx, y: snake[0].y + dy };
      // 碰撞检测
      if (
        head.x < 0 || head.x === GRID ||
        head.y < 0 || head.y === GRID ||
        snake.some(seg => seg.x === head.x && seg.y === head.y)
      ) {
        setGameOver(true);
        clearInterval(timer);
        return;
      }
      snake.unshift(head);
      // 吃到食物
      if (head.x === food.x && head.y === food.y) {
        setScore(s => s + 1);
        food = {
          x: Math.floor(Math.random() * GRID),
          y: Math.floor(Math.random() * GRID),
        };
      } else {
        snake.pop();
      }
      // 渲染
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, GRID * SIZE, GRID * SIZE);
      ctx.fillStyle = "lime";
      snake.forEach(seg => ctx.fillRect(seg.x * SIZE, seg.y * SIZE, SIZE - 2, SIZE - 2));
      ctx.fillStyle = "red";
      ctx.fillRect(food.x * SIZE, food.y * SIZE, SIZE - 2, SIZE - 2);
    };

    // 键盘控制
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":    if (dy === 0) { dx = 0; dy = -1; } break;
        case "ArrowDown":  if (dy === 0) { dx = 0; dy = 1;  } break;
        case "ArrowLeft":  if (dx === 0) { dx = -1; dy = 0; } break;
        case "ArrowRight": if (dx === 0) { dx = 1;  dy = 0; } break;
      }
    };

    document.addEventListener("keydown", onKey);
    timer = window.setInterval(drawFrame, 200);

    return () => {
      clearInterval(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [started]);

  // 游戏结束后提交分数
  const saveScore = async () => {
    try {
      await axios.post("/api/save-score", { player_name: player, score });
      alert("分数已保存！");
    } catch {
      alert("保存失败，请稍后重试！");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-6">贪吃蛇游戏</h1>

      {!started && !gameOver && (
        <button
          onClick={() => setStarted(true)}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          开始游戏
        </button>
      )}

      {started && (
        <>
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="border mt-4"
          />
          <p className="mt-2 text-lg">当前分数：{score}</p>
        </>
      )}

      {gameOver && (
        <div className="mt-6 flex flex-col items-center">
          <p className="text-xl text-red-600 mb-4">游戏结束！请保存成绩。</p>
          <input
            type="text"
            placeholder="请输入用户名"
            value={player}
            onChange={e => setPlayer(e.target.value)}
            className="mb-3 p-2 border rounded-lg"
          />
          <button
            disabled={!player}
            onClick={saveScore}
            className="px-5 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
          >
            保存记录
          </button>
        </div>
      )}
    </div>
  );
}
