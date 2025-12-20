
//side bar

     document.addEventListener('DOMContentLoaded', function() {
            // 获取需要的元素
            const menuButton = document.getElementById('menu-button');
            const closeButton = document.getElementById('close-button');
            const sidebar = document.getElementById('sidebar');
            const body = document.body;

            // 统一的开关函数
            function toggleSidebar(isOpen) {
                if (isOpen) {
                    sidebar.classList.add('open');
                    body.classList.add('sidebar-open');
                } else {
                    sidebar.classList.remove('open');
                    body.classList.remove('sidebar-open');
                }
            }

            // 1. 汉堡菜单按钮点击事件 (打开)
            menuButton.addEventListener('click', function() {
                toggleSidebar(true);
            });

            // 2. 关闭按钮点击事件 (关闭)
            closeButton.addEventListener('click', function() {
                toggleSidebar(false);
            });
            
            // 3. (可选) 按下 Esc 键关闭侧边栏
            document.addEventListener('keydown', function(event) {
                if (event.key === "Escape" && sidebar.classList.contains('open')) {
                    toggleSidebar(false);
                }
            });
        });