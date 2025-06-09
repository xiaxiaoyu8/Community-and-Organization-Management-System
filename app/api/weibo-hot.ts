// app/api/weibo-hot.ts
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://weibo.com/ajax/statuses/hot_band', {
      headers: {
        'Referer': 'https://weibo.com/',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!res.ok) {
      return NextResponse.json({ error: '微博接口请求失败' }, { status: 500 });
    }

    const data = await res.json();

    const hotList = data.data.band_list.map((item: any) => ({
      title: item.word,
      hot: item.num,
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word)}`
    }));

    return NextResponse.json({ list: hotList });
  } catch (error) {
    return NextResponse.json({ error: '服务错误', detail: error }, { status: 500 });
  }
}
