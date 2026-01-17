const RATING_API_URL = "https://my-rating-worker.liupanfengfreedom.workers.dev";
//const RATING_API_URL = "http://127.0.0.1:8787";

//const RATING_PAGE_ID = "page6"; // 实际使用可用 window.location.pathname
const RATING_PAGE_ID = window.location.pathname

const ratingStarsFill = document.getElementById('rating-stars-fill');
const ratingAvgText = document.getElementById('rating-avg-score');
const ratingCountText = document.getElementById('rating-vote-count');
const ratingStatusMsg = document.getElementById('rating-status-msg');

// 1. 加载分数并更新星星宽度
async function ratingFetchStats() {
    try {
        const res = await fetch(`${RATING_API_URL}?pageId=${RATING_PAGE_ID}`);
        const data = await res.json();
        
        const score = data.average || 0;
        const count = data.count || 0;

        ratingAvgText.innerText = score.toFixed(1);
        ratingCountText.innerText = count;

        // 核心逻辑：计算百分比。5分等于100%，则 2.1分 = (2.1/5)*100 = 42%
        const percentage = (score / 5) * 100;
        ratingStarsFill.style.width = percentage + "%";

         // 2. 新增：更新搜索引擎结构化数据
        updateSchema(score, count);
    } catch (err) {
        console.error("加载失败", err);
    }
}

let isSubmitting = false; // 状态锁
// 2. 提交评分
async function ratingSubmitRating(score) {
    if (isSubmitting) return; // 如果正在提交，直接返回
    isSubmitting = true;
    ratingStatusMsg.style.color = "#e74c3c";
    ratingStatusMsg.innerText = "正在提交...";
    try {
        const res = await fetch(`${RATING_API_URL}?pageId=${RATING_PAGE_ID}`, {
            method: 'POST',
            body: JSON.stringify({ score: parseInt(score) }),
            headers: { 'Content-Type': 'application/json' }
        });

        if (res.ok) {
            ratingStatusMsg.style.color = "green";
            ratingStatusMsg.innerText = `感谢您给出 ${score} 星的评价！`; 
            await ratingFetchStats(); 
        } else {
            const msg = res.status === 403 ? "您已经评过分了" : "提交失败";
            ratingStatusMsg.innerText = msg;
            // 刷新一下，确保星星回到平均分状态
            setTimeout(ratingFetchStats, 1500);
        }
    } catch (err) {
        ratingStatusMsg.innerText = "网络异常，请重试";
    }
     finally {
        isSubmitting = false; // 无论成功失败都解锁
    }
}
function updateSchema(score, count) {
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (!existingScript) return;
    try {
        const structuredData = JSON.parse(existingScript.textContent);
        const graph = structuredData["@graph"] || [structuredData];
        
        // 寻找包含 aggregateRating 的 SoftwareApplication 对象
        const appData = graph.find(item => item["@type"] === "SoftwareApplication");
        
        if (appData) {
            appData.aggregateRating = appData.aggregateRating || { "@type": "AggregateRating" };
            appData.aggregateRating.ratingValue = score.toFixed(1);
            appData.aggregateRating.ratingCount = count.toString();
            existingScript.textContent = JSON.stringify(structuredData, null, 2);
            console.log("Structured data updated");
        }
    } catch (error) {
        console.error("Error updating structured data:", error);
    }
}
// --- 交互处理 ---
document.querySelectorAll('.rating-hit-area').forEach(area => {
    // 鼠标移入：预览点击的分数
    area.addEventListener('mouseenter', () => {
        const val = area.getAttribute('data-v');
        ratingStarsFill.style.width = (val * 20) + "%";
    });

    // 点击提交
    area.addEventListener('click', () => {
        const val = area.getAttribute('data-v');
        ratingSubmitRating(val);
    });
});

// 鼠标离开容器：恢复到真实的平均分宽度
document.getElementById('star-container').addEventListener('mouseleave', () => {
    const currentAvg = parseFloat(ratingAvgText.innerText);
    ratingStarsFill.style.width = (currentAvg / 5 * 100) + "%";
});

// 初始化加载
ratingFetchStats();