// 学术风卡通插画集合 - 使用内联 SVG

// 登录页插画 - 学生读书场景
export function LoginIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 背景装饰 - 书本堆叠 */}
      <rect x="50" y="220" width="80" height="15" rx="2" fill="#4A1A6B" opacity="0.8" />
      <rect x="60" y="205" width="70" height="18" rx="2" fill="#7B3F9E" opacity="0.7" />
      <rect x="55" y="185" width="65" height="22" rx="2" fill="#4A1A6B" opacity="0.6" />
      
      {/* 书桌 */}
      <rect x="120" y="230" width="200" height="8" rx="2" fill="#8B5CF6" opacity="0.3" />
      <rect x="130" y="238" width="6" height="40" rx="2" fill="#8B5CF6" opacity="0.3" />
      <rect x="300" y="238" width="6" height="40" rx="2" fill="#8B5CF6" opacity="0.3" />
      
      {/* 台灯 */}
      <rect x="270" y="140" width="4" height="90" rx="2" fill="#FFB300" opacity="0.6" />
      <path d="M250 140 L290 140 L280 120 L260 120 Z" fill="#FFB300" opacity="0.7" />
      <ellipse cx="270" cy="150" rx="18" ry="6" fill="#FFB300" opacity="0.3" />
      
      {/* 笔记本电脑 */}
      <rect x="150" y="170" width="100" height="60" rx="4" fill="#3366CC" opacity="0.8" />
      <rect x="155" y="175" width="90" height="45" rx="2" fill="#E0E7FF" />
      <rect x="140" y="228" width="120" height="6" rx="3" fill="#3366CC" opacity="0.8" />
      
      {/* 屏幕上的待办清单 */}
      <rect x="165" y="185" width="40" height="4" rx="2" fill="#4A1A6B" opacity="0.3" />
      <rect x="165" y="195" width="60" height="4" rx="2" fill="#4A1A6B" opacity="0.5" />
      <rect x="165" y="205" width="50" height="4" rx="2" fill="#4A1A6B" opacity="0.4" />
      
      {/* 咖啡杯 */}
      <ellipse cx="300" cy="225" rx="15" ry="5" fill="#E60033" opacity="0.2" />
      <rect x="287" y="200" width="26" height="25" rx="4" fill="#E60033" opacity="0.6" />
      <ellipse cx="300" cy="200" rx="13" ry="4" fill="#8B4513" opacity="0.5" />
      <path d="M313 208 Q322 208 322 215 Q322 222 313 222" stroke="#E60033" strokeWidth="3" fill="none" opacity="0.6" />
      
      {/* 热气 */}
      <path d="M295 192 Q293 185 297 180 Q295 175 298 170" stroke="#7F7F7F" strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d="M302 192 Q304 185 301 180 Q303 175 300 170" stroke="#7F7F7F" strokeWidth="2" fill="none" opacity="0.3" strokeLinecap="round" />
      
      {/* 笔筒 */}
      <rect x="135" y="195" width="25" height="35" rx="3" fill="#4A1A6B" opacity="0.5" />
      <line x1="142" y1="195" x2="140" y2="180" stroke="#FFB300" strokeWidth="3" strokeLinecap="round" />
      <line x1="148" y1="195" x2="150" y2="178" stroke="#3366CC" strokeWidth="3" strokeLinecap="round" />
      <line x1="153" y1="195" x2="155" y2="183" stroke="#E60033" strokeWidth="3" strokeLinecap="round" />
      
      {/* 装饰星星 */}
      <path d="M80 60 L83 68 L91 69 L85 75 L87 83 L80 79 L73 83 L75 75 L69 69 L77 68 Z" fill="#FFB300" opacity="0.6" />
      <path d="M340 80 L342 86 L348 87 L343 91 L345 97 L340 94 L335 97 L337 91 L332 87 L338 86 Z" fill="#4A1A6B" opacity="0.5" />
      
      {/* 日历图标 */}
      <rect x="320" y="150" width="35" height="40" rx="4" fill="#fff" stroke="#4A1A6B" strokeWidth="2" opacity="0.6" />
      <rect x="320" y="150" width="35" height="10" rx="4" fill="#4A1A6B" opacity="0.3" />
      <line x1="325" y1="170" x2="350" y2="170" stroke="#7F7F7F" strokeWidth="1" opacity="0.5" />
      <line x1="325" y1="178" x2="345" y2="178" stroke="#7F7F7F" strokeWidth="1" opacity="0.5" />
      <circle cx="337" cy="183" r="4" fill="#E60033" opacity="0.6" />
    </svg>
  );
}

// 空状态插画 - 空的待办列表
export function EmptyTasksIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 250"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 空白清单板 */}
      <rect x="80" y="40" width="140" height="180" rx="8" fill="#fff" stroke="#E5E5E5" strokeWidth="2" />
      
      {/* 夹子 */}
      <rect x="130" y="32" width="40" height="16" rx="4" fill="#4A1A6B" opacity="0.6" />
      <rect x="135" y="36" width="30" height="8" rx="2" fill="#fff" opacity="0.3" />
      
      {/* 对勾框 - 空 */}
      <rect x="95" y="70" width="16" height="16" rx="3" stroke="#7F7F7F" strokeWidth="1.5" fill="none" />
      <rect x="120" y="75" width="80" height="6" rx="3" fill="#E5E5E5" />
      
      <rect x="95" y="100" width="16" height="16" rx="3" stroke="#7F7F7F" strokeWidth="1.5" fill="none" />
      <rect x="120" y="105" width="60" height="6" rx="3" fill="#E5E5E5" />
      
      <rect x="95" y="130" width="16" height="16" rx="3" stroke="#7F7F7F" strokeWidth="1.5" fill="none" />
      <rect x="120" y="135" width="70" height="6" rx="3" fill="#E5E5E5" />
      
      <rect x="95" y="160" width="16" height="16" rx="3" stroke="#7F7F7F" strokeWidth="1.5" fill="none" />
      <rect x="120" y="165" width="50" height="6" rx="3" fill="#E5E5E5" />
      
      {/* 小鸟 - 提示灵感 */}
      <ellipse cx="230" cy="120" rx="20" ry="15" fill="#4A1A6B" opacity="0.7" />
      <circle cx="240" cy="115" r="5" fill="#4A1A6B" opacity="0.7" />
      <circle cx="242" cy="114" r="1.5" fill="#fff" />
      <path d="M245 117 L250 115 L248 120 Z" fill="#FFB300" />
      <path d="M210 118 Q200 100 215 95 Q210 105 215 115" fill="#7B3F9E" opacity="0.6" />
      
      {/* 对话气泡 */}
      <path d="M250 80 L270 70 L270 90 L260 95 Z" fill="#f5f0f9" stroke="#4A1A6B" strokeWidth="1" opacity="0.8" />
      <text x="255" y="86" fontSize="10" fill="#4A1A6B" textAnchor="middle" fontWeight="600">+</text>
    </svg>
  );
}

// 加载插画 - 翻书动画
export function LoadingIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 150"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 书本底部 */}
      <rect x="50" y="80" width="100" height="50" rx="4" fill="#4A1A6B" opacity="0.2" />
      
      {/* 书页 - 左 */}
      <rect x="50" y="30" width="50" height="55" rx="2" fill="#fff" stroke="#4A1A6B" strokeWidth="1.5" />
      <line x1="60" y1="45" x2="90" y2="45" stroke="#E5E5E5" strokeWidth="2" />
      <line x1="60" y1="55" x2="85" y2="55" stroke="#E5E5E5" strokeWidth="2" />
      <line x1="60" y1="65" x2="88" y2="65" stroke="#E5E5E5" strokeWidth="2" />
      
      {/* 书页 - 右 - 翻页动画 */}
      <g className="animate-pulse-subtle">
        <path d="M100 30 L130 25 L135 80 L100 85 Z" fill="#f5f0f9" stroke="#4A1A6B" strokeWidth="1.5" />
        <line x1="108" y1="42" x2="125" y2="40" stroke="#7F7F7F" strokeWidth="1" />
        <line x1="108" y1="52" x2="122" y2="50" stroke="#7F7F7F" strokeWidth="1" />
        <line x1="108" y1="62" x2="126" y2="60" stroke="#7F7F7F" strokeWidth="1" />
      </g>
      
      {/* 装饰点 */}
      <circle cx="30" cy="50" r="4" fill="#FFB300" opacity="0.5" />
      <circle cx="170" cy="60" r="3" fill="#3366CC" opacity="0.5" />
      <circle cx="160" cy="30" r="2" fill="#E60033" opacity="0.5" />
    </svg>
  );
}

// Logo 图标 - 南雍待办
export function AppLogo({ className = '', size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 外框 - 圆角方形 */}
      <rect width="48" height="48" rx="12" fill="#4A1A6B" />
      
      {/* 书本图案 */}
      <rect x="10" y="14" width="12" height="22" rx="2" fill="#fff" opacity="0.9" />
      <rect x="26" y="14" width="12" height="22" rx="2" fill="#fff" opacity="0.7" />
      
      {/* 书脊 */}
      <rect x="22" y="14" width="4" height="22" rx="1" fill="#fff" opacity="0.5" />
      
      {/* 勾选标记 */}
      <path d="M14 22 L18 26 L22 20" stroke="#4A1A6B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* 顶部装饰 */}
      <circle cx="34" cy="22" r="2" fill="#FFB300" />
    </svg>
  );
}

// 成功/对勾插画
export function SuccessIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 外圈 */}
      <circle cx="100" cy="100" r="80" fill="#4A1A6B" opacity="0.1" />
      <circle cx="100" cy="100" r="65" fill="#4A1A6B" opacity="0.2" />
      <circle cx="100" cy="100" r="50" fill="#4A1A6B" opacity="0.9" />
      
      {/* 对勾 */}
      <path
        d="M75 100 L92 115 L125 85"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* 装饰星星 */}
      <path d="M40 50 L43 58 L51 59 L45 65 L47 73 L40 69 L33 73 L35 65 L29 59 L37 58 Z" fill="#FFB300" opacity="0.6" />
      <path d="M160 45 L162 51 L168 52 L163 56 L165 62 L160 58 L155 62 L157 56 L152 52 L158 51 Z" fill="#4A1A6B" opacity="0.4" />
      <path d="M170 130 L172 136 L178 137 L173 141 L175 147 L170 143 L165 147 L167 141 L162 137 L168 136 Z" fill="#FFB300" opacity="0.4" />
    </svg>
  );
}
