// Initialize icons
lucide.createIcons();

// Add loaded class after DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    document.body.classList.add('loaded');
    
    // Basic search filtering logic
    const searchBar = document.querySelector('.search-bar');
    const cards = document.querySelectorAll('.tool-card');
    const sections = document.querySelectorAll('.category-section');
    
    searchBar.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        let visibleCardsCount = 0;
        
        cards.forEach(card => {
            const title = card.querySelector('h3').innerText.toLowerCase();
            const desc = card.querySelector('p').innerText.toLowerCase();
            const tag = card.querySelector('.tool-tag').innerText.toLowerCase();
            
            if (title.includes(term) || desc.includes(term) || tag.includes(term)) {
                card.style.display = 'flex';
                visibleCardsCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        // Update category counts
        sections.forEach(section => {
            const sectionCards = section.querySelectorAll('.tool-card');
            const countElement = section.querySelector('.category-count');
            let visibleInSection = 0;
            
            sectionCards.forEach(card => {
                if (card.style.display !== 'none') {
                    visibleInSection++;
                }
            });
            
            if (countElement) {
                countElement.textContent = `${visibleInSection} tools`;
            }
            
            // Hide entire category if no visible tools
            if (visibleInSection === 0 && term.length > 0) {
                section.style.display = 'none';
            } else {
                section.style.display = 'block';
            }
        });
        
        // Show search result hint
        if (term.length > 0) {
            const resultsHint = document.querySelector('.search-hint');
            if (resultsHint) {
                resultsHint.textContent = `Found ${visibleCardsCount} matching tools`;
            }
        } else {
            const resultsHint = document.querySelector('.search-hint');
            if (resultsHint) {
                resultsHint.textContent = 'Type a keyword to quickly find the tool you need';
            }
            
            // Reset all category visibility
            sections.forEach(section => {
                section.style.display = 'block';
            });
        }
    });
    
    // Card click effect
    cards.forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetUrl = this.getAttribute('href');
            
            // Add click feedback
            this.style.transform = 'translateY(-4px) scale(0.95)';
            
            // Navigate after a short delay
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 150);
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchBar.focus();
        }
        
        // ESC to clear search
        if (e.key === 'Escape' && document.activeElement === searchBar) {
            searchBar.value = '';
            searchBar.dispatchEvent(new Event('input'));
            searchBar.blur();
        }
    });
    
    // Add search box shortcut hint
    const searchHint = document.querySelector('.search-hint');
    const originalHint = searchHint.textContent;
    searchBar.addEventListener('focus', function() {
        searchHint.textContent = 'Press ESC to clear • Ctrl+K to search quickly';
    });
    
    searchBar.addEventListener('blur', function() {
        if (this.value === '') {
            searchHint.textContent = originalHint;
        }
    });
});