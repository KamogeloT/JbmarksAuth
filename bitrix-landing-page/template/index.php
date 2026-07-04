<?php
/**
 * JB Marks Digital Workplace Portal — Main Page Content
 * This file contains the dashboard content that goes between header.php and footer.php
 */
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();

$curUser = $GLOBALS['USER'];
$userName = $curUser->GetFirstName() ?: 'User';
?>
<!-- Welcome Banner -->
<div class="welcome-banner">
    <div class="welcome-text">
        <h2 class="welcome-greeting">Good Morning, <?= htmlspecialchars($userName) ?>! 👋</h2>
        <p class="welcome-sub">Welcome back to JB Marks Local Municipality</p>
        <p class="welcome-quote">"Together we build a better municipality."</p>
        <div class="welcome-meta">
            <span>📅 <?= date('l, j F Y') ?></span>
            <span>🕗 <?= date('h:i A') ?></span>
        </div>
    </div>
    <div class="welcome-weather">
        <div class="weather-temp">--°C</div>
        <div class="weather-desc">Loading...</div>
        <div class="weather-loc">Potchefstroom, NW</div>
        <a href="#" class="weather-link">View full forecast</a>
    </div>
</div>

<!-- Stat Cards -->
<div class="stats-row">
    <div class="stat-card"><div class="stat-icon blue">🎫</div><div class="stat-body"><div class="stat-value" id="stat-open">—</div><div class="stat-label">OPEN TICKETS</div><div class="stat-change up" id="stat-open-change"></div></div></div>
    <div class="stat-card"><div class="stat-icon red">⏰</div><div class="stat-body"><div class="stat-value" id="stat-overdue">—</div><div class="stat-label">OVERDUE TICKETS</div><div class="stat-change down" id="stat-overdue-change"></div></div></div>
    <div class="stat-card"><div class="stat-icon orange">📋</div><div class="stat-body"><div class="stat-value" id="stat-pending">—</div><div class="stat-label">PENDING APPROVALS</div><div class="stat-change" id="stat-pending-change"></div></div></div>
    <div class="stat-card"><div class="stat-icon purple">📄</div><div class="stat-body"><div class="stat-value" id="stat-today">—</div><div class="stat-label">TASKS TODAY</div><div class="stat-change" id="stat-today-change"></div></div></div>
    <div class="stat-card"><div class="stat-icon green">👥</div><div class="stat-body"><div class="stat-value" id="stat-online">—</div><div class="stat-label">USERS ONLINE</div><div class="stat-change" id="stat-online-change"></div></div></div>
    <div class="stat-card"><div class="stat-icon teal">📊</div><div class="stat-body"><div class="stat-value" id="stat-sla">—%</div><div class="stat-label">SLA COMPLIANCE</div><div class="stat-change" id="stat-sla-change"></div></div></div>
</div>

<!-- Middle Section: Apps + Tasks + Activity -->
<div class="middle-grid">
    <!-- Applications -->
    <div class="panel">
        <div class="panel-header"><h3>APPLICATIONS</h3><a href="/marketplace/" class="view-all">View all</a></div>
        <div class="apps-grid">
            <a href="https://zealous-sand-0050fce00.7.azurestaticapps.net" class="app-item" target="_blank"><div class="app-icon blue">🎫</div><span>ICT Service Desk</span></a>
            <a href="https://black-water-07331b400.7.azurestaticapps.net" class="app-item" target="_blank"><div class="app-icon indigo">🖥️</div><span>IT Support Dashboard</span></a>
            <a href="/docs/" class="app-item"><div class="app-icon green">📁</div><span>Records Management</span></a>
            <a href="/crm/" class="app-item"><div class="app-icon purple">💼</div><span>Asset Management</span></a>
            <a href="/company/personal/" class="app-item"><div class="app-icon orange">👥</div><span>Human Resources</span></a>
            <a href="/crm/deal/" class="app-item"><div class="app-icon gold">💰</div><span>Finance</span></a>
            <a href="/marketplace/" class="app-item"><div class="app-icon red">🛒</div><span>Procurement</span></a>
            <a href="/workgroups/" class="app-item"><div class="app-icon teal">🚛</div><span>Fleet Management</span></a>
            <a href="/workgroups/" class="app-item"><div class="app-icon indigo">📊</div><span>Projects</span></a>
            <a href="https://polite-tree-08ad84b00.7.azurestaticapps.net" class="app-item" target="_blank"><div class="app-icon pink">📈</div><span>Reports & Analytics</span></a>
            <a href="/workgroups/" class="app-item"><div class="app-icon cyan">👨‍👩‍👧‍👦</div><span>Workgroups</span></a>
        </div>
    </div>

    <!-- My Tasks -->
    <div class="panel">
        <div class="panel-header"><h3>MY TASKS</h3><a href="/company/personal/user/0/tasks/" class="view-all">View all</a></div>
        <div class="task-list" id="taskList">
            <div class="task-item"><div class="task-dot"></div><div class="task-body"><div class="task-title">Loading tasks...</div><div class="task-dept"></div></div></div>
        </div>
    </div>

    <!-- Recent Activity -->
    <div class="panel">
        <div class="panel-header"><h3>RECENT ACTIVITY</h3><a href="/stream/" class="view-all">View all</a></div>
        <div class="activity-list" id="activityList">
            <div class="activity-item"><div class="activity-icon blue">📋</div><div class="activity-body"><div class="activity-title">Loading activity...</div></div></div>
        </div>
    </div>
</div>

<!-- Newsletter + Announcements -->
<div class="bottom-grid">
    <div class="panel">
        <div class="panel-header"><h3>MUNICIPAL NEWSLETTER</h3><a href="/stream/" class="view-all">View all</a></div>
        <div class="news-list" id="newsList">
            <div class="news-item"><div class="news-body"><div class="news-title">Loading newsletters...</div></div></div>
        </div>
        <a href="/stream/" class="panel-link">View all newsletters</a>
    </div>
    <div class="panel">
        <div class="panel-header"><h3>ANNOUNCEMENTS</h3><a href="/stream/" class="view-all">View all</a></div>
        <div class="announce-list" id="announceList">
            <div class="announce-item"><div class="announce-icon blue">📋</div><div class="announce-body"><div class="announce-title">Loading announcements...</div></div></div>
        </div>
    </div>
</div>

<!-- Quick Actions -->
<div class="quick-actions">
    <h3 class="quick-actions-title">QUICK ACTIONS</h3>
    <div class="quick-actions-row">
        <a href="https://zealous-sand-0050fce00.7.azurestaticapps.net" class="quick-action" target="_blank"><span class="qa-icon">🎫</span> Log Ticket</a>
        <a href="/docs/?ACTION=ADD" class="quick-action"><span class="qa-icon">📤</span> Upload Document</a>
        <a href="/company/personal/user/0/tasks/task/edit/0/" class="quick-action"><span class="qa-icon">✅</span> Create Task</a>
        <a href="/docs/" class="quick-action"><span class="qa-icon">🔍</span> Search Records</a>
        <a href="/crm/contact/add/" class="quick-action"><span class="qa-icon">💼</span> Register Asset</a>
        <a href="/company/personal/user/0/absence/" class="quick-action"><span class="qa-icon">🏖️</span> Request Leave</a>
        <a href="/bizproc/processes/" class="quick-action"><span class="qa-icon">▶️</span> Start Workflow</a>
        <a href="https://polite-tree-08ad84b00.7.azurestaticapps.net" class="quick-action" target="_blank"><span class="qa-icon">📊</span> Generate Report</a>
    </div>
</div>
