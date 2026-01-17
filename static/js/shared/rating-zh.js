const RATING_API_URL = "https://my-rating-worker.liupanfengfreedom.workers.dev";
//const RATING_API_URL = "http://127.0.0.1:8787";
//const RATING_PAGE_ID = "page1";
const RATING_PAGE_ID = window.location.pathname;
let selectedScore = 0; 
let isSubmitting = false;

const ratingStarsFill = document.getElementById('rating-stars-fill');
const ratingAvgText = document.getElementById('rating-avg-score');
const ratingCountText = document.getElementById('rating-vote-count');
const ratingStatusMsg = document.getElementById('rating-status-msg');
const commentTextarea = document.getElementById('rating-comment-text');
const submitBtn = document.getElementById('submit-rating-btn');
const commentsList = document.getElementById('comments-list');
const formArea = document.getElementById('rating-form-area');

// --- 核心修复：防止点击输入框触发鼠标测试脚本 ---
// 阻止点击、按下等事件向上传递给全局监听器
['mousedown', 'mouseup', 'click', 'contextmenu'].forEach(eventType => {
    commentTextarea.addEventListener(eventType, (e) => {
        e.stopPropagation();
    }, true);
});

// 让输入框点击时自动获取焦点（双重保险）
commentTextarea.addEventListener('click', function() {
    this.focus();
});

// 1. 加载数据
async function ratingFetchData() {
    try {
        const res = await fetch(`${RATING_API_URL}?pageId=${RATING_PAGE_ID}`);
        const data = await res.json();
        
        const avg = data.average || 0;
        const count = data.count || 0;
        const comments = data.comments || [];

        ratingAvgText.innerText = avg.toFixed(1);
        ratingCountText.innerText = count;

        if (selectedScore === 0) {
            ratingStarsFill.style.width = (avg / 5 * 100) + "%";
        }
        renderComments(comments);
        updateSchema(avg, count);
    } catch (err) {
        console.error("加载失败", err);
    }
}

function renderComments(comments) {
    if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<div class="rating-info" style="text-align:center">暂无评论</div>';
        return;
    }
    commentsList.innerHTML = comments.map(item => `
        <div class="comment-item">
            <div class="comment-meta">
                <span class="comment-user-stars">${'★'.repeat(item.score)}${'☆'.repeat(5 - item.score)}</span>
                <span>${new Date(item.time || Date.now()).toLocaleDateString()}</span>
            </div>
            <div class="comment-text">${escapeHtml(item.comment || '无文字评价')}</div>
        </div>
    `).join('');
}

// 2. 提交逻辑
submitBtn.addEventListener('click', async (e) => {
    e.stopPropagation(); // 同样阻止冒泡
    
    if (selectedScore === 0) {
        ratingStatusMsg.style.color = "#e74c3c";
        ratingStatusMsg.innerText = "请先点击星星评分";
        return;
    }

    if (isSubmitting) return;
    isSubmitting = true;
    submitBtn.disabled = true;
    ratingStatusMsg.innerText = "正在提交...";

    const payload = {
        score: parseInt(selectedScore),
        comment: commentTextarea.value.trim()
    };

    try {
        const res = await fetch(`${RATING_API_URL}?pageId=${RATING_PAGE_ID}`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        if (res.ok) {
            localStorage.setItem(`rated_${RATING_PAGE_ID}`, selectedScore);
            ratingStatusMsg.style.color = "#27ae60";
            ratingStatusMsg.innerText = `感谢您给予 ${selectedScore} 星的评分！`;
            formArea.style.display = 'none';
            await ratingFetchData();
        } else {
            ratingStatusMsg.innerText = "提交失败";
            submitBtn.disabled = false;
        }
    } catch (err) {
        ratingStatusMsg.innerText = "网络错误";
        submitBtn.disabled = false;
    } finally {
        isSubmitting = false;
    }
});

// 3. 星星交互
document.querySelectorAll('.rating-hit-area').forEach(area => {
    area.addEventListener('mouseenter', () => {
        if (localStorage.getItem(`rated_${RATING_PAGE_ID}`)) return;
        const val = area.getAttribute('data-v');
        ratingStarsFill.style.width = (val * 20) + "%";
    });

    area.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止点击星星时触发鼠标测试
        if (localStorage.getItem(`rated_${RATING_PAGE_ID}`)) return;
        selectedScore = area.getAttribute('data-v');
        ratingStarsFill.style.width = (selectedScore * 20) + "%";
        ratingStatusMsg.style.color = "#f39c12";
        ratingStatusMsg.innerText = `已选 ${selectedScore} 星`;
    });
});

document.getElementById('star-container').addEventListener('mouseleave', () => {
    if (selectedScore > 0) {
        ratingStarsFill.style.width = (selectedScore * 20) + "%";
    } else {
        const currentAvg = parseFloat(ratingAvgText.innerText) || 0;
        ratingStarsFill.style.width = (currentAvg / 5 * 100) + "%";
    }
});

function checkUserStatus() {
    const userRated = localStorage.getItem(`rated_${RATING_PAGE_ID}`);
    if (userRated) {
        formArea.style.display = 'none';
        ratingStatusMsg.innerText = `您已评分 (${userRated}星)`;
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function updateSchema(score, count) {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (let script of scripts) {
        try {
            const json = JSON.parse(script.textContent);
            let target = json["@graph"] ? json["@graph"].find(i => i["@type"] === "SoftwareApplication") : (json["@type"] === "SoftwareApplication" ? json : null);
            if (target) {
                target.aggregateRating = {
                    "@type": "AggregateRating",
                    "ratingValue": score.toFixed(1),
                    "ratingCount": count.toString(),
                    "bestRating": "5",
                    "worstRating": "1"
                };
                script.textContent = JSON.stringify(json, null, 2);
                break;
            }
        } catch (e) {}
    }
}

(async function init() {
    await ratingFetchData();
    checkUserStatus();
})();