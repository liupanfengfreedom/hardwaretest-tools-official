lucide.createIcons();

document.addEventListener('DOMContentLoaded', function() {
    document.body.classList.add('loaded');

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
                countElement.textContent = `${visibleInSection} outils`;
            }

            if (visibleInSection === 0 && term.length > 0) {
                section.style.display = 'none';
            } else {
                section.style.display = 'block';
            }
        });

        const resultsHint = document.querySelector('.search-hint');
        if (resultsHint) {
            if (term.length > 0) {
                resultsHint.textContent = "J'ai trouvé {count} outils correspondants".replace('{count}', visibleCardsCount);
            } else {
                resultsHint.textContent = "Tapez un mot-clé pour trouver rapidement l'outil dont vous avez besoin";
            }
        }

        if (term.length === 0) {
            sections.forEach(section => {
                section.style.display = 'block';
            });
        }
    });

    cards.forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            const targetUrl = this.getAttribute('href');
            this.style.transform = 'translateY(-4px) scale(0.95)';
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 150);
        });
    });

    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchBar.focus();
        }
        if (e.key === 'Escape' && document.activeElement === searchBar) {
            searchBar.value = '';
            searchBar.dispatchEvent(new Event('input'));
            searchBar.blur();
        }
    });

    const searchHint = document.querySelector('.search-hint');
    const originalHint = searchHint.textContent;
    searchBar.addEventListener('focus', function() {
        searchHint.textContent = "Appuyez sur ESC pour effacer • Ctrl+K pour rechercher rapidement";
    });

    searchBar.addEventListener('blur', function() {
        if (this.value === '') {
            searchHint.textContent = originalHint;
        }
    });
});
