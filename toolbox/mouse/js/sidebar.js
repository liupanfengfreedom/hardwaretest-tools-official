// Sidebar functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get required elements
    const menuButton = document.getElementById('menu-button');
    const closeButton = document.getElementById('close-button');
    const sidebar = document.getElementById('sidebar');
    const body = document.body;

    // Unified toggle function
    function toggleSidebar(isOpen) {
        if (isOpen) {
            sidebar.classList.add('open');
            body.classList.add('sidebar-open');
        } else {
            sidebar.classList.remove('open');
            body.classList.remove('sidebar-open');
        }
    }

    // 1. Hamburger menu button click event (open)
    menuButton.addEventListener('click', function() {
        toggleSidebar(true);
    });

    // 2. Close button click event (close)
    closeButton.addEventListener('click', function() {
        toggleSidebar(false);
    });
    
    // 3. (Optional) Press Esc key to close sidebar
    document.addEventListener('keydown', function(event) {
        if (event.key === "Escape" && sidebar.classList.contains('open')) {
            toggleSidebar(false);
        }
    });
});