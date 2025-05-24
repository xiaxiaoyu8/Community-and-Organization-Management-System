// postcss.config.mjs

const config = {
  plugins: {
    'tailwindcss': {},        // 标准的 Tailwind CSS 插件，它会自动查找 tailwind.config.js
    'autoprefixer': {},       // 自动添加CSS浏览器厂商前缀
    '@tailwindcss/typography': {}, // Tailwind排版插件
    
    // 2. 如果 "@tailwindcss/postcss" 是一个您确实需要并且已安装的、不同于 'tailwindcss' 的特定插件，
    //    您可以像下面这样添加它：
    // '@tailwindcss/postcss': {},
  },
};

export default config;