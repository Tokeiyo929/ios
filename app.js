// 摄入目标标准（根据中国居民平衡膳食宝塔）
const intakeTargets = {
    dairy: { min: 300, max: 500, unit: '克' },
    meat: { min: 120, max: 200, unit: '克' },
    vegetable: { min: 300, max: 500, unit: '克' },
    fruit: { min: 200, max: 350, unit: '克' },
    water: { min: 1500, max: 1700, unit: '毫升' }
};

// 特殊要求
const specialRequirements = {
    egg: { daily: true, target: 1, unit: '个' },
    seafood: { weekly: true, target: 2, unit: '天' }
};

// 全局变量
let selectedDate = new Date(); // 当前选中的日期
let intakeData = JSON.parse(localStorage.getItem('intakeData')) || {};
let lastUpdateTime = parseInt(localStorage.getItem('lastUpdateTime')) || Date.now();

// 初始化累积额度数据
function initializeAccumulatedData(dateData) {
    if (!dateData.accumulated) {
        dateData.accumulated = {
            dairy: 0,
            meat: 0,
            vegetable: 0,
            fruit: 0,
            water: 0
        };
    }
    return dateData;
}

// 计算每分钟累积的额度
function calculateAccumulationRates() {
    const rates = {};
    Object.keys(intakeTargets).forEach(type => {
        const target = intakeTargets[type];
        // 24小时 = 1440分钟，每分钟累积 max/1440
        rates[type] = target.max / 1440;
    });
    return rates;
}

// 更新累积额度
function updateAccumulatedQuotas() {
    const now = Date.now();
    const timeDiffMinutes = (now - lastUpdateTime) / (1000 * 60); // 转换为分钟
    
    if (timeDiffMinutes <= 0) return;
    
    const accumulationRates = calculateAccumulationRates();
    const todayKey = getDateKey(new Date());
    
    // 确保今天的数据存在并初始化累积数据
    if (!intakeData[todayKey]) {
        intakeData[todayKey] = {
            dairy: 0,
            meat: 0,
            vegetable: 0,
            fruit: 0,
            water: 0,
            egg: false,
            seafood: false,
            history: [],
            accumulated: {
                dairy: 0,
                meat: 0,
                vegetable: 0,
                fruit: 0,
                water: 0
            }
        };
    } else {
        // 确保累积数据存在
        intakeData[todayKey] = initializeAccumulatedData(intakeData[todayKey]);
    }
    
    // 更新累积额度
    Object.keys(accumulationRates).forEach(type => {
        const currentAccumulated = intakeData[todayKey].accumulated[type] || 0;
        const additional = accumulationRates[type] * timeDiffMinutes;
        const newAccumulated = Math.min(
            currentAccumulated + additional,
            intakeTargets[type].max
        );
        intakeData[todayKey].accumulated[type] = newAccumulated;
    });
    
    lastUpdateTime = now;
    localStorage.setItem('lastUpdateTime', lastUpdateTime.toString());
    localStorage.setItem('intakeData', JSON.stringify(intakeData));
}

// 获取本周的日期范围（周一到周日）
function getWeekDates() {
    const now = new Date();
    const currentDay = now.getDay(); // 0是周日，1是周一，...，6是周六
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // 计算周一的偏移量
    
    // 计算本周的周一
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    
    // 生成一周的日期（周一到周日）
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        weekDates.push(date);
    }
    
    return weekDates;
}

// 更新日期选择器
function updateDaySelector() {
    const weekDates = getWeekDates();
    const daySelector = document.getElementById('daySelector');
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    
    daySelector.innerHTML = weekDates.map((date, index) => {
        const isActive = date.toDateString() === selectedDate.toDateString();
        const dayName = dayNames[index];
        const dayDate = date.getDate();
        
        return `
            <div class="day-item ${isActive ? 'active' : ''}" data-date="${date.toISOString()}">
                <div class="day-name">${dayName}</div>
                <div class="day-date">${dayDate}</div>
            </div>
        `;
    }).join('');
    
    // 添加点击事件
    document.querySelectorAll('.day-item').forEach(item => {
        item.addEventListener('click', () => {
            selectedDate = new Date(item.getAttribute('data-date'));
            updateUI();
            updateDaySelector();
        });
    });
}

// 获取日期键（用于存储数据）
function getDateKey(date) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD格式
}

// 获取当前选中日期的数据
function getCurrentDateData() {
    const dateKey = getDateKey(selectedDate);
    if (!intakeData[dateKey]) {
        intakeData[dateKey] = {
            dairy: 0,
            meat: 0,
            vegetable: 0,
            fruit: 0,
            water: 0,
            egg: false,
            seafood: false,
            history: [],
            accumulated: {
                dairy: 0,
                meat: 0,
                vegetable: 0,
                fruit: 0,
                water: 0
            }
        };
    } else {
        // 确保累积数据存在
        intakeData[dateKey] = initializeAccumulatedData(intakeData[dateKey]);
    }
    return intakeData[dateKey];
}

// 计算可用额度（累积额度 - 已使用额度）
function calculateAvailableQuota(type, dateData) {
    const target = intakeTargets[type];
    const accumulated = (dateData.accumulated && dateData.accumulated[type]) ? dateData.accumulated[type] : 0;
    const consumed = dateData[type] || 0;
    
    return Math.max(0, accumulated - consumed);
}

// 计算进度条百分比（基于累积额度）
function calculateProgressPercentage(type, dateData) {
    const target = intakeTargets[type];
    const accumulated = (dateData.accumulated && dateData.accumulated[type]) ? dateData.accumulated[type] : 0;
    
    // 进度条显示累积额度占最大值的百分比
    return Math.min((accumulated / target.max) * 100, 100);
}

// 获取状态
function getQuotaStatus(type, dateData) {
    const target = intakeTargets[type];
    const accumulated = (dateData.accumulated && dateData.accumulated[type]) ? dateData.accumulated[type] : 0;
    const consumed = dateData[type] || 0;
    const available = calculateAvailableQuota(type, dateData);
    
    if (consumed <= target.min) {
        return { status: 'normal', text: '正常' };
    } else if (consumed <= target.max && available > 0) {
        return { status: 'warning', text: '注意' };
    } else {
        return { status: 'danger', text: '超量' };
    }
}

// 获取进度条颜色类
function getProgressBarClass(status) {
    return `bar-${status}`;
}

// 更新配额显示
function updateQuotaDisplay(type, dateData) {
    const target = intakeTargets[type];
    const available = calculateAvailableQuota(type, dateData);
    const percentage = calculateProgressPercentage(type, dateData);
    const status = getQuotaStatus(type, dateData);
    const accumulated = (dateData.accumulated && dateData.accumulated[type]) ? dateData.accumulated[type] : 0;
    
    // 更新进度条
    const bar = document.getElementById(`${type}Bar`);
    bar.style.width = `${percentage}%`;
    bar.className = `quota-progress ${getProgressBarClass(status.status)}`;
    
    // 更新可用额度显示
    document.getElementById(`${type}Remaining`).textContent = Math.round(available);
    
    // 更新状态
    const statusElement = document.getElementById(`${type}Status`);
    statusElement.textContent = status.text;
    statusElement.className = `intake-status status-${status.status}`;
    
    // 更新最小值标记位置（基于累积额度计算）
    const minMarker = document.getElementById(`${type}MinMarker`);
    const minPercentage = (target.min / target.max) * 100;
    minMarker.style.left = `${minPercentage}%`;
}

// 更新特殊要求状态
function updateSpecialRequirements() {
    const dateData = getCurrentDateData();
    
    // 更新鸡蛋状态
    const eggStatus = document.getElementById('eggStatus');
    if (dateData.egg) {
        eggStatus.textContent = '已完成';
        eggStatus.className = 'requirement-status status-normal';
    } else {
        eggStatus.textContent = '未完成';
        eggStatus.className = 'requirement-status status-warning';
    }
    
    // 更新水产品状态
    const seafoodStatus = document.getElementById('seafoodStatus');
    const seafoodDays = getSeafoodDaysThisWeek();
    if (seafoodDays >= specialRequirements.seafood.target) {
        seafoodStatus.textContent = `本周已${seafoodDays}天`;
        seafoodStatus.className = 'requirement-status status-normal';
    } else {
        seafoodStatus.textContent = `本周已${seafoodDays}天`;
        seafoodStatus.className = 'requirement-status status-warning';
    }
}

// 获取本周已摄入水产品的天数
function getSeafoodDaysThisWeek() {
    const weekDates = getWeekDates();
    let seafoodDays = 0;
    
    weekDates.forEach(date => {
        const dateKey = getDateKey(date);
        if (intakeData[dateKey] && intakeData[dateKey].seafood) {
            seafoodDays++;
        }
    });
    
    return seafoodDays;
}

// 更新仪表板标题
function updateDashboardTitle() {
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();
    const title = isToday ? '今日摄入情况' : `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日摄入情况`;
    document.getElementById('dashboardTitle').textContent = title;
}

// 更新历史记录
function updateHistoryList(history) {
    const historyList = document.getElementById('historyList');
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <div class="empty-text">暂无摄入记录</div>
            </div>
        `;
        return;
    }
    
    // 按时间倒序排列
    const sortedHistory = [...history].reverse();
    
    historyList.innerHTML = sortedHistory.map((item, index) => {
        let categoryDisplay = '';
        if (item.type === 'meat' && item.category && item.category !== '其他') {
            categoryDisplay = `<span class="history-category">(${item.category})</span>`;
        }
        
        return `
        <div class="history-item">
            <div class="history-name">${item.name}${categoryDisplay}</div>
            <div class="history-amount">${item.amount}${getUnit(item.type)}</div>
            <button class="delete-btn" data-index="${sortedHistory.length - 1 - index}">删除</button>
        </div>
        `;
    }).join('');
    
    // 添加删除按钮事件
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            deleteHistoryItem(index);
        });
    });
}

// 删除历史记录项
function deleteHistoryItem(index) {
    const dateData = getCurrentDateData();
    const item = dateData.history[index];
    
    // 从总量中减去
    dateData[item.type] -= item.amount;
    
    // 如果删除的是鸡蛋或水产品，更新特殊要求状态
    if (item.category === '鸡蛋') {
        dateData.egg = false;
    } else if (item.category === '水产品') {
        dateData.seafood = false;
    }
    
    // 从历史记录中删除
    dateData.history.splice(index, 1);
    
    // 更新UI
    updateUI();
}

// 获取单位
function getUnit(type) {
    return intakeTargets[type].unit;
}

// 检查并显示警报
function checkAlerts(dateData) {
    const alerts = [];
    
    // 检查是否超过可用额度
    Object.keys(intakeTargets).forEach(type => {
        const available = calculateAvailableQuota(type, dateData);
        const consumed = dateData[type] || 0;
        
        if (available <= 0 && consumed > 0) {
            alerts.push(`${getTypeName(type)}已超过可用额度，请等待额度累积`);
        }
    });
    
    // 检查鸡蛋
    if (!dateData.egg) {
        alerts.push(`今日尚未摄入鸡蛋，建议每天吃一个鸡蛋`);
    }
    
    // 检查水产品
    const seafoodDays = getSeafoodDaysThisWeek();
    if (seafoodDays < specialRequirements.seafood.target) {
        alerts.push(`本周水产品摄入不足，建议每周吃${specialRequirements.seafood.target}天水产品`);
    }
    
    // 显示警报
    const alertBanner = document.getElementById('alertBanner');
    if (alerts.length > 0) {
        alertBanner.innerHTML = alerts.join('<br>');
        alertBanner.style.display = 'block';
    } else {
        alertBanner.style.display = 'none';
    }
}

// 获取类型名称
function getTypeName(type) {
    const names = {
        dairy: '奶制品',
        meat: '动物性食物',
        vegetable: '蔬菜类',
        fruit: '水果类',
        water: '水'
    };
    return names[type] || type;
}

// 更新UI
function updateUI() {
    // 先更新累积额度
    updateAccumulatedQuotas();
    
    const dateData = getCurrentDateData();
    
    // 更新奶制品摄入
    updateQuotaDisplay('dairy', dateData);
    
    // 更新动物性食物摄入
    updateQuotaDisplay('meat', dateData);
    
    // 更新蔬菜类摄入
    updateQuotaDisplay('vegetable', dateData);
    
    // 更新水果类摄入
    updateQuotaDisplay('fruit', dateData);
    
    // 更新水摄入
    updateQuotaDisplay('water', dateData);
    
    // 更新特殊要求状态
    updateSpecialRequirements();
    
    // 更新历史记录
    updateHistoryList(dateData.history);
    
    // 更新标题
    updateDashboardTitle();
    
    // 检查并显示警报
    checkAlerts(dateData);
    
    // 保存到localStorage
    localStorage.setItem('intakeData', JSON.stringify(intakeData));
}

// 模态框控制
const modal = document.getElementById('intakeModal');
const closeModalBtn = document.getElementById('closeModal');
const intakeForm = document.getElementById('intakeForm');
const quickAddBtn = document.getElementById('quickAddBtn');
const quickAddBtns = document.querySelectorAll('.quick-add-btn');
const intakeTypeSelect = document.getElementById('intakeType');
const meatCategoryGroup = document.getElementById('meatCategoryGroup');
const meatCategorySelect = document.getElementById('meatCategory');
const unitLabel = document.getElementById('unitLabel');
const modalTitle = document.getElementById('modalTitle');

// 打开模态框
function openModal(type = 'dairy') {
    intakeTypeSelect.value = type;
    updateUnitLabel(type);
    updateModalTitle(type);
    
    // 显示或隐藏肉源分类
    if (type === 'meat') {
        meatCategoryGroup.style.display = 'block';
    } else {
        meatCategoryGroup.style.display = 'none';
    }
    
    modal.style.display = 'flex';
}

// 关闭模态框
function closeModal() {
    modal.style.display = 'none';
    intakeForm.reset();
    // 重置肉源分类为默认值
    meatCategorySelect.value = '其他';
}

// 更新单位标签
function updateUnitLabel(type) {
    unitLabel.textContent = getUnit(type);
}

// 更新模态框标题
function updateModalTitle(type) {
    const titles = {
        dairy: '添加奶制品',
        meat: '添加动物性食物',
        vegetable: '添加蔬菜类',
        fruit: '添加水果类',
        water: '添加水'
    };
    modalTitle.textContent = titles[type] || '添加摄入';
}

// 检查是否有足够额度
function hasEnoughQuota(type, amount, dateData) {
    const available = calculateAvailableQuota(type, dateData);
    return available >= amount;
}

// 事件监听
closeModalBtn.addEventListener('click', closeModal);

quickAddBtn.addEventListener('click', () => openModal());

quickAddBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        openModal(type);
    });
});

// 摄入类型改变时更新单位
intakeTypeSelect.addEventListener('change', (e) => {
    const type = e.target.value;
    updateUnitLabel(type);
    updateModalTitle(type);
    
    // 显示或隐藏肉源分类
    if (type === 'meat') {
        meatCategoryGroup.style.display = 'block';
    } else {
        meatCategoryGroup.style.display = 'none';
    }
});

// 点击模态框外部关闭
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// 表单提交
intakeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const type = intakeTypeSelect.value;
    const name = document.getElementById('itemName').value;
    const amount = parseInt(document.getElementById('amount').value);
    const category = type === 'meat' ? meatCategorySelect.value : null;
    
    // 检查额度
    const dateData = getCurrentDateData();
    if (!hasEnoughQuota(type, amount, dateData)) {
        const available = calculateAvailableQuota(type, dateData);
        alert(`额度不足！可用额度: ${Math.round(available)}${getUnit(type)}，需要: ${amount}${getUnit(type)}`);
        return;
    }
    
    // 添加摄入数据
    dateData[type] += amount;
    dateData.history.push({
        type: type,
        name: name,
        amount: amount,
        category: category,
        timestamp: new Date().toISOString()
    });
    
    // 更新特殊要求状态
    if (category === '鸡蛋') {
        dateData.egg = true;
    } else if (category === '水产品') {
        dateData.seafood = true;
    }
    
    // 更新UI
    updateUI();
    
    // 关闭模态框
    closeModal();
    
    // 显示添加成功提示
    let message = `成功记录 ${name}: ${amount}${getUnit(type)}`;
    if (category && category !== '其他') {
        message += ` (${category})`;
    }
    alert(message);
});

// 每分钟更新一次额度
setInterval(() => {
    updateAccumulatedQuotas();
    if (selectedDate.toDateString() === new Date().toDateString()) {
        updateUI();
    }
}, 60000); // 每分钟更新一次

// 初始化UI
updateDaySelector();
updateUI();

// 添加示例数据（首次使用时）
if (Object.keys(intakeData).length === 0) {
    const todayKey = getDateKey(new Date());
    intakeData[todayKey] = {
        dairy: 0,
        meat: 0,
        vegetable: 0,
        fruit: 0,
        water: 0,
        egg: false,
        seafood: false,
        history: [],
        accumulated: {
            dairy: intakeTargets.dairy.max, // 初始给满额度
            meat: intakeTargets.meat.max,
            vegetable: intakeTargets.vegetable.max,
            fruit: intakeTargets.fruit.max,
            water: intakeTargets.water.max
        }
    };
    
    updateUI();
}
