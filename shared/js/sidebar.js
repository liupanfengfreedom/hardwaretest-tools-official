// Sidebar functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get required elements
    const menuButton = document.getElementById('menu-button');
    const closeButton = document.getElementById('close-button');
    const sidebar = document.getElementById('sidebar');
    const body = document.body;

    // Variables for hover functionality
    let hoverTimeout = null;
    const HOVER_OPEN_DELAY = 100; // ms delay before opening on hover
    const HOVER_CLOSE_DELAY = 300; // ms delay before closing on leave (to allow moving into sidebar)
    const HOVER_ZONE_WIDTH = 20; // Width of the hover zone at left edge in pixels

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
        clearTimeout(hoverTimeout); // Clear any pending hover timeouts
    });

    // 2. Close button click event (close)
    closeButton.addEventListener('click', function() {
        toggleSidebar(false);
        clearTimeout(hoverTimeout);
    });
    
    // 3. (Optional) Press Esc key to close sidebar
    document.addEventListener('keydown', function(event) {
        if (event.key === "Escape" && sidebar.classList.contains('open')) {
            toggleSidebar(false);
            clearTimeout(hoverTimeout);
        }
    });

    // 4. Hover to open functionality - when mouse moves to left edge
    document.addEventListener('mousemove', function(event) {
        // Check if mouse is near left edge (within hover zone) and sidebar is not open
        if (event.clientX <= HOVER_ZONE_WIDTH && 
            !sidebar.classList.contains('open') && 
            !body.classList.contains('sidebar-open')) {
            
            // Clear any existing timeout
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
            }
            
            // Set timeout to open sidebar after short delay (prevents accidental opening)
            hoverTimeout = setTimeout(() => {
                if (!sidebar.classList.contains('open')) {
                    toggleSidebar(true);
                }
            }, HOVER_OPEN_DELAY);
        } else if (event.clientX > HOVER_ZONE_WIDTH) {
            // If mouse moves away from hover zone before delay completes, cancel the opening
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }
        }
    });

    // 5. Auto-close when mouse leaves sidebar (only if it was opened by hover)
    sidebar.addEventListener('mouseleave', function(event) {
        // Check if sidebar is open and the mouse has actually left (not just moving within)
        if (sidebar.classList.contains('open')) {
            // Use a timeout to allow moving from edge to sidebar without closing
            hoverTimeout = setTimeout(() => {
                // Only close if mouse is not over sidebar or menu button
                const isMouseOverSidebar = sidebar.matches(':hover');
                const isMouseOverMenuButton = menuButton.matches(':hover');
                
                if (!isMouseOverSidebar && !isMouseOverMenuButton) {
                    toggleSidebar(false);
                }
            }, HOVER_CLOSE_DELAY);
        }
    });

    // 6. Cancel auto-close when mouse re-enters sidebar
    sidebar.addEventListener('mouseenter', function() {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
    });

    // 7. Also handle mouse entering menu button area
    menuButton.addEventListener('mouseenter', function() {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
    });

    // 8. Handle window blur (when user switches to another app)
    window.addEventListener('blur', function() {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
    });

    // 9. Prevent hover opening when sidebar is already open via click
    // This is already handled by checking !sidebar.classList.contains('open')
});