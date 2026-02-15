// 织梦手记 - 管理后台
import './style.css';
import { SUPABASE_URL, SERVICE_ROLE_KEY } from './config.js';

// 管理员账号配置
const ADMIN_USERS = {
  'tomtang': '123456'
};

let currentUser = null;

// HTML 模板
const html = `
  <div class="login-page" id="loginPage">
    <div class="login-container">
      <div class="login-header">
        <h1>🧶 织梦手记</h1>
        <p>管理后台</p>
      </div>
      <form id="loginForm">
        <div class="form-group">
          <label>用户名</label>
          <input type="text" id="username" placeholder="tomtang" required>
        </div>
        <div class="form-group">
          <label>密码</label>
          <input type="password" id="password" placeholder="123456" required>
        </div>
        <button type="submit" class="login-btn">登录</button>
        <p class="login-hint">演示账号: tomtang / 123456</p>
      </form>
    </div>
  </div>

  <div class="admin-page" id="adminPage" style="display: none;">
    <nav class="admin-nav">
      <div class="nav-brand">🧶 织梦手记管理后台</div>
      <div class="nav-user">
        <span id="welcomeUser">管理员</span>
        <button onclick="logout()">退出登录</button>
      </div>
    </nav>

    <div class="admin-container">
      <aside class="sidebar">
        <ul>
          <li class="active" onclick="showTab('dashboard')">📊 数据概览</li>
          <li onclick="showTab('users')">👥 用户管理</li>
          <li onclick="showTab('quests')">📋 任务模板</li>
          <li onclick="showTab('shop')">🏪 商店物品</li>
          <li onclick="showTab('levels')">🎚️ 等级配置</li>
          <li onclick="showTab('logs')">📝 操作日志</li>
        </ul>
      </aside>

      <main class="main-content">
        <section id="dashboard" class="tab-content">
          <h2>数据概览</h2>
          <div class="stats-grid">
            <div class="stat-card"><h3>👥 用户总数</h3><p id="statUsers">-</p></div>
            <div class="stat-card"><h3>📋 任务模板</h3><p id="statQuests">-</p></div>
            <div class="stat-card"><h3>🏪 商店物品</h3><p id="statShop">-</p></div>
            <div class="stat-card"><h3>📝 今日完成</h3><p id="statCompleted">-</p></div>
          </div>
        </section>

        <section id="users" class="tab-content" style="display: none;">
          <h2>👥 用户管理</h2>
          <div class="table-container">
            <table id="usersTable">
              <thead><tr><th>ID</th><th>昵称</th><th>等级</th><th>灵感值</th><th>织梦币</th><th>注册时间</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </section>

        <section id="quests" class="tab-content" style="display: none;">
          <div class="section-header">
            <h2>📋 任务模板</h2>
            <button class="btn primary" onclick="openQuestModal()">+ 添加任务</button>
          </div>
          <div class="table-container">
            <table id="questsTable">
              <thead><tr><th>ID</th><th>分类</th><th>标题</th><th>等级</th><th>灵感</th><th>金币</th><th>审核</th><th>操作</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </section>

        <section id="shop" class="tab-content" style="display: none;">
          <div class="section-header">
            <h2>🏪 商店物品</h2>
            <button class="btn primary" onclick="openShopModal()">+ 添加商品</button>
          </div>
          <div class="table-container">
            <table id="shopTable">
              <thead><tr><th>ID</th><th>标题</th><th>描述</th><th>价格</th><th>库存</th><th>状态</th><th>操作</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </section>

        <section id="levels" class="tab-content" style="display: none;">
          <h2>🎚️ 等级配置</h2>
          <div class="table-container">
            <table id="levelsTable">
              <thead><tr><th>等级</th><th>称号</th><th>英文名</th><th>所需灵感</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </section>

        <section id="logs" class="tab-content" style="display: none;">
          <h2>📝 操作日志</h2>
          <div class="logs-list" id="adminLogs"><p>暂无日志记录</p></div>
        </section>
      </main>
    </div>
  </div>

  <div class="modal" id="commonModal" style="display: none;">
    <div class="modal-content">
      <div class="modal-header">
        <h3 id="modalTitle">标题</h3>
        <span class="close" onclick="closeModal()">&times;</span>
      </div>
      <div class="modal-body" id="modalBody"></div>
    </div>
  </div>
`;

// 初始化
document.querySelector('#app').innerHTML = html;

document.addEventListener('DOMContentLoaded', () => {
  checkLogin();
  loadDashboard();
  renderLogs();
});

// 登录检查
function checkLogin() {
  const savedUser = localStorage.getItem('admin_user');
  if (savedUser) {
    currentUser = savedUser;
    showAdminPage();
  }
}

// 登录处理
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  if (ADMIN_USERS[username] && ADMIN_USERS[username] === password) {
    currentUser = username;
    localStorage.setItem('admin_user', username);
    showAdminPage();
    addLog('登录成功');
  } else {
    alert('用户名或密码错误！');
  }
});

// 退出登录
function logout() {
  addLog('退出登录');
  localStorage.removeItem('admin_user');
  currentUser = null;
  showLoginPage();
}

// 显示页面
function showLoginPage() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('adminPage').style.display = 'none';
}

function showAdminPage() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('adminPage').style.display = 'flex';
  document.getElementById('welcomeUser').textContent = currentUser;
  loadDashboard();
}

// 切换标签
function showTab(tabId) {
  document.querySelectorAll('.sidebar li').forEach(li => {
    li.classList.remove('active');
    if (li.textContent.includes(tabId === 'dashboard' ? '概览' : 
      tabId === 'users' ? '用户' : 
      tabId === 'quests' ? '任务' : 
      tabId === 'shop' ? '商店' : 
      tabId === 'levels' ? '等级' : '日志')) {
      li.classList.add('active');
    }
  });
  
  document.querySelectorAll('.tab-content').forEach(section => {
    section.style.display = 'none';
  });
  document.getElementById(tabId).style.display = 'block';
  
  switch(tabId) {
    case 'dashboard': loadDashboard(); break;
    case 'users': loadUsers(); break;
    case 'quests': loadQuests(); break;
    case 'shop': loadShop(); break;
    case 'levels': loadLevels(); break;
    case 'logs': renderLogs(); break;
  }
}

// API 请求
async function apiRequest(endpoint, options = {}) {
  const response = await fetch(SUPABASE_URL + '/rest/v1/' + endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Prefer': 'return=minimal',
      ...options.headers
    }
  });
  return response;
}

// 加载数据概览
async function loadDashboard() {
  try {
    const usersRes = await fetch(SUPABASE_URL + '/rest/v1/profiles?select=id&apikey=' + SERVICE_ROLE_KEY);
    const users = await usersRes.json();
    document.getElementById('statUsers').textContent = users.length || 0;
    
    const questsRes = await fetch(SUPABASE_URL + '/rest/v1/quest_templates?select=id&apikey=' + SERVICE_ROLE_KEY);
    const quests = await questsRes.json();
    document.getElementById('statQuests').textContent = quests.length || 0;
    
    const shopRes = await fetch(SUPABASE_URL + '/rest/v1/shop_items?select=id&apikey=' + SERVICE_ROLE_KEY);
    const shop = await shopRes.json();
    document.getElementById('statShop').textContent = shop.length || 0;
    
    const today = new Date().toISOString().split('T')[0];
    const completedRes = await fetch(SUPABASE_URL + '/rest/v1/user_quests?status=eq.completed&created_at=gte.' + today + '&select=id&apikey=' + SERVICE_ROLE_KEY);
    const completed = await completedRes.json();
    document.getElementById('statCompleted').textContent = completed.length || 0;
  } catch (error) {
    console.error('加载数据失败:', error);
  }
}

// 加载用户列表
async function loadUsers() {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/profiles?select=*&order=created_at.desc&apikey=' + SERVICE_ROLE_KEY);
    const users = await res.json();
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = users.length ? users.map(user => 
      '<tr><td>' + (user.id || '-') + '</td><td>' + (user.nickname || '未知') + '</td><td>Lv.' + (user.current_level || 1) + '</td><td>' + (user.inspiration || 0) + '</td><td>' + (user.yarn_coins || 0) + '</td><td>' + (user.created_at ? new Date(user.created_at).toLocaleDateString() : '-') + '</td></tr>'
    ).join('') : '<tr><td colspan="6" style="text-align:center;color:#999;">暂无用户数据</td></tr>';
  } catch (error) {
    console.error('加载用户失败:', error);
  }
}

// 加载任务列表
async function loadQuests() {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/quest_templates?select=*&order=min_level.asc,category.asc&apikey=' + SERVICE_ROLE_KEY);
    const quests = await res.json();
    const tbody = document.querySelector('#questsTable tbody');
    tbody.innerHTML = quests.length ? quests.map(q => 
      '<tr><td>' + q.id + '</td><td><span class="status-badge ' + (q.is_active ? 'active' : 'inactive') + '">' + q.category + '</span></td><td>' + q.title + '</td><td>Lv.' + q.min_level + '</td><td>' + q.reward_inspiration + '</td><td>' + q.reward_coins + '</td><td><span class="status-badge ' + (q.needs_verification ? 'yes' : 'no') + '">' + (q.needs_verification ? '是' : '否') + '</span></td><td><span class="action-link" onclick="editQuest(\'' + q.id + '\')">编辑</span><span class="action-link delete" onclick="deleteQuest(\'' + q.id + '\')">删除</span></td></tr>'
    ).join('') : '<tr><td colspan="8" style="text-align:center;color:#999;">暂无任务数据</td></tr>';
  } catch (error) {
    console.error('加载任务失败:', error);
  }
}

// 加载商店列表
async function loadShop() {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/shop_items?select=*&order=created_at.desc&apikey=' + SERVICE_ROLE_KEY);
    const items = await res.json();
    const tbody = document.querySelector('#shopTable tbody');
    tbody.innerHTML = items.length ? items.map(item => 
      '<tr><td>' + item.id + '</td><td>' + item.title + '</td><td>' + (item.description || '-') + '</td><td>' + item.cost_coins + '</td><td>' + item.stock + '</td><td><span class="status-badge ' + (item.is_active ? 'active' : 'inactive') + '">' + (item.is_active ? '上架' : '下架') + '</span></td><td><span class="action-link" onclick="editShop(\'' + item.id + '\')">编辑</span><span class="action-link delete" onclick="deleteShop(\'' + item.id + '\')">删除</span></td></tr>'
    ).join('') : '<tr><td colspan="7" style="text-align:center;color:#999;">暂无商品数据</td></tr>';
  } catch (error) {
    console.error('加载商店失败:', error);
  }
}

// 加载等级配置
async function loadLevels() {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/levels?select=*&order=level.asc&apikey=' + SERVICE_ROLE_KEY);
    const levels = await res.json();
    const tbody = document.querySelector('#levelsTable tbody');
    tbody.innerHTML = levels.length ? levels.map(l => 
      '<tr><td>Lv.' + l.level + '</td><td>' + l.title + '</td><td>' + (l.title_en || '-') + '</td><td>' + l.required_inspiration + '</td></tr>'
    ).join('') : '<tr><td colspan="4" style="text-align:center;color:#999;">暂无等级数据</td></tr>';
  } catch (error) {
    console.error('加载等级失败:', error);
  }
}

// 日志功能
function addLog(action) {
  const logs = JSON.parse(localStorage.getItem('admin_logs') || '[]');
  logs.unshift({ time: new Date().toLocaleString(), user: currentUser, action: action });
  if (logs.length > 50) logs.pop();
  localStorage.setItem('admin_logs', JSON.stringify(logs));
  renderLogs();
}

function renderLogs() {
  const logs = JSON.parse(localStorage.getItem('admin_logs') || '[]');
  const container = document.getElementById('adminLogs');
  container.innerHTML = logs.length ? logs.map(log => 
    '<div class="log-item"><span class="log-user">' + log.user + '</span><span class="log-action">' + log.action + '</span><span class="log-time">' + log.time + '</span></div>'
  ).join('') : '<p style="text-align:center;color:#999;">暂无日志记录</p>';
}

// 模态框
function openQuestModal(quest = null) {
  document.getElementById('modalTitle').textContent = quest ? '编辑任务' : '添加任务';
  const selectedCat = quest ? quest.category : 'daily';
  document.getElementById('modalBody').innerHTML = 
    '<form class="modal-form" onsubmit="saveQuest(event, \'' + (quest ? quest.id : '') + '\')">' +
    '<div class="form-group"><label>分类</label><select id="qCategory" required><option value="daily"' + (selectedCat === 'daily' ? ' selected' : '') + '>每日任务</option><option value="bounty"' + (selectedCat === 'bounty' ? ' selected' : '') + '>赏金任务</option><option value="milestone"' + (selectedCat === 'milestone' ? ' selected' : '') + '>里程碑</option></select></div>' +
    '<div class="form-group"><label>标题</label><input type="text" id="qTitle" value="' + (quest ? quest.title : '') + '" required></div>' +
    '<div class="form-group"><label>描述</label><textarea id="qDesc">' + (quest ? quest.description : '') + '</textarea></div>' +
    '<div class="form-group"><label>等级要求</label><input type="number" id="qMinLevel" value="' + (quest ? quest.min_level : 1) + '" min="1" max="10" required></div>' +
    '<div class="form-group"><label>灵感奖励</label><input type="number" id="qInspiration" value="' + (quest ? quest.reward_inspiration : 0) + '" min="0" required></div>' +
    '<div class="form-group"><label>金币奖励</label><input type="number" id="qCoins" value="' + (quest ? quest.reward_coins : 0) + '" min="0" required></div>' +
    '<div class="form-group"><label><input type="checkbox" id="qVerify"' + (quest && quest.needs_verification ? ' checked' : '') + '> 需要审核</label></div>' +
    '<div class="form-actions"><button type="button" class="btn" onclick="closeModal()">取消</button><button type="submit" class="btn primary">保存</button></div></form>';
  document.getElementById('commonModal').style.display = 'flex';
}

function openShopModal(item = null) {
  document.getElementById('modalTitle').textContent = item ? '编辑商品' : '添加商品';
  document.getElementById('modalBody').innerHTML = 
    '<form class="modal-form" onsubmit="saveShop(event, \'' + (item ? item.id : '') + '\')">' +
    '<div class="form-group"><label>商品名称</label><input type="text" id="sTitle" value="' + (item ? item.title : '') + '" required></div>' +
    '<div class="form-group"><label>描述</label><textarea id="sDesc">' + (item ? item.description : '') + '</textarea></div>' +
    '<div class="form-group"><label>价格</label><input type="number" id="sCost" value="' + (item ? item.cost_coins : 0) + '" min="0" required></div>' +
    '<div class="form-group"><label>库存</label><input type="number" id="sStock" value="' + (item ? item.stock : 999) + '" min="0" required></div>' +
    '<div class="form-group"><label>状态</label><select id="sActive"><option value="true"' + (item && item.is_active ? ' selected' : '') + '>上架</option><option value="false"' + (item && !item.is_active ? ' selected' : '') + '>下架</option></select></div>' +
    '<div class="form-actions"><button type="button" class="btn" onclick="closeModal()">取消</button><button type="submit" class="btn primary">保存</button></div></form>';
  document.getElementById('commonModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('commonModal').style.display = 'none';
}

// 保存任务
async function saveQuest(e, id) {
  e.preventDefault();
  const data = {
    category: document.getElementById('qCategory').value,
    title: document.getElementById('qTitle').value,
    description: document.getElementById('qDesc').value,
    min_level: parseInt(document.getElementById('qMinLevel').value),
    reward_inspiration: parseInt(document.getElementById('qInspiration').value),
    reward_coins: parseInt(document.getElementById('qCoins').value),
    needs_verification: document.getElementById('qVerify').checked,
    is_active: true
  };
  const method = id ? 'PATCH' : 'POST';
  const url = id ? 'quest_templates?id=eq.' + id : 'quest_templates';
  const res = await apiRequest(url, { method, body: JSON.stringify(data) });
  if (res.ok || res.status === 204) {
    closeModal();
    addLog((id ? '修改任务: ' : '添加任务: ') + data.title);
    loadQuests();
    alert('保存成功！');
  } else {
    alert('保存失败');
  }
}

// 保存商店
async function saveShop(e, id) {
  e.preventDefault();
  const data = {
    title: document.getElementById('sTitle').value,
    description: document.getElementById('sDesc').value,
    cost_coins: parseInt(document.getElementById('sCost').value),
    stock: parseInt(document.getElementById('sStock').value),
    is_active: document.getElementById('sActive').value === 'true'
  };
  const method = id ? 'PATCH' : 'POST';
  const url = id ? 'shop_items?id=eq.' + id : 'shop_items';
  const res = await apiRequest(url, { method, body: JSON.stringify(data) });
  if (res.ok || res.status === 204) {
    closeModal();
    addLog((id ? '修改商品: ' : '添加商品: ') + data.title);
    loadShop();
    alert('保存成功！');
  } else {
    alert('保存失败');
  }
}

// 删除任务
async function deleteQuest(id) {
  if (!confirm('确定删除此任务？')) return;
  const res = await apiRequest('quest_templates?id=eq.' + id, { method: 'DELETE' });
  if (res.ok || res.status === 204) {
    addLog('删除任务: ' + id);
    loadQuests();
    alert('删除成功！');
  } else {
    alert('删除失败');
  }
}

// 删除商店
async function deleteShop(id) {
  if (!confirm('确定删除此商品？')) return;
  const res = await apiRequest('shop_items?id=eq.' + id, { method: 'DELETE' });
  if (res.ok || res.status === 204) {
    addLog('删除商品: ' + id);
    loadShop();
    alert('删除成功！');
  } else {
    alert('删除失败');
  }
}

// 编辑任务
async function editQuest(id) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/quest_templates?id=eq.' + id + '&select=*&apikey=' + SERVICE_ROLE_KEY);
  const quests = await res.json();
  if (quests.length > 0) openQuestModal(quests[0]);
}

// 编辑商店
async function editShop(id) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/shop_items?id=eq.' + id + '&select=*&apikey=' + SERVICE_ROLE_KEY);
  const items = await res.json();
  if (items.length > 0) openShopModal(items[0]);
}

// Expose functions to global scope for inline onclick handlers
window.showTab = showTab;
window.logout = logout;
window.openQuestModal = openQuestModal;
window.openShopModal = openShopModal;
window.closeModal = closeModal;
window.saveQuest = saveQuest;
window.saveShop = saveShop;
window.deleteQuest = deleteQuest;
window.deleteShop = deleteShop;
window.editQuest = editQuest;
window.editShop = editShop;
