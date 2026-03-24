import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>نظام عروض الأسعار</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
        {/* jsPDF + html2canvas loaded dynamically in app.js */}
        <script dangerouslySetInnerHTML={{ __html: `
          tailwind.config = {
            theme: {
              extend: {
                fontFamily: { sans: ['IBM Plex Sans Arabic', 'sans-serif'] },
                colors: {
                  primary: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' }
                }
              }
            }
          }
        `}} />
        <style dangerouslySetInnerHTML={{ __html: `
          * { font-family: 'IBM Plex Sans Arabic', sans-serif; }
          .fade-in { animation: fadeIn 0.25s ease-in; }
          @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
          .spinner { border:3px solid #f3f4f6; border-top:3px solid #3b82f6; border-radius:50%; width:24px; height:24px; animation:spin .8s linear infinite; }
          @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
          input:focus,select:focus,textarea:focus { outline:none; border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.1); }
          .kanban-col { min-height: 200px; }
          .kanban-card { cursor: grab; }
          .kanban-card:active { cursor: grabbing; }
          .drag-over { background: #eff6ff; border-color: #3b82f6; }
          @media print { nav, #toast-container, .no-print { display: none !important; } }
        `}} />
      </head>
      <body class="bg-gray-50 text-gray-900 min-h-screen">
        <div id="app">{children}</div>
        <script src="/static/app.js"></script>
      </body>
    </html>
  )
})
