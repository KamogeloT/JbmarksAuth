<?php
/**
 * JB Marks Digital Workplace Portal — Bitrix Template Header
 * Template ID: jbmarks_portal
 * 
 * This replaces the default Bitrix header when applied as a site template.
 * The portal content loads via landing.js using BX.rest API calls.
 */
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();

$curUser = $GLOBALS['USER'];
$userName = $curUser->GetFirstName() ?: 'User';
$userLastName = $curUser->GetLastName() ?: '';
$userInitials = mb_substr($userName, 0, 1) . mb_substr($userLastName, 0, 1);
$userPosition = $curUser->GetParam('WORK_POSITION') ?: 'Team Member';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php $APPLICATION->ShowTitle(); ?> — JB Marks Digital Workplace</title>
    <link rel="icon" href="<?= SITE_TEMPLATE_PATH ?>/images/logo.png">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= SITE_TEMPLATE_PATH ?>/landing.css">
    <?php $APPLICATION->ShowHead(); ?>
</head>
<body>
<div class="layout">
    <!-- Sidebar -->
    <aside class="sidebar">
        <div class="sidebar-logo">
            <img src="<?= SITE_TEMPLATE_PATH ?>/images/logo.png" alt="JB Marks" class="sidebar-logo-img">
            <div>
                <div class="sidebar-title">JB MARKS</div>
                <div class="sidebar-subtitle">LOCAL MUNICIPALITY</div>
            </div>
        </div>
        <nav class="sidebar-nav">
            <a href="/" class="nav-item active"><span class="nav-icon">🏠</span> Home</a>
            <a href="https://zealous-sand-0050fce00.7.azurestaticapps.net" class="nav-item" target="_blank"><span class="nav-icon">🎫</span> ICT Service Desk</a>
            <a href="https://black-water-07331b400.7.azurestaticapps.net" class="nav-item" target="_blank"><span class="nav-icon">🖥️</span> IT Support Dashboard</a>
            <a href="/docs/" class="nav-item"><span class="nav-icon">📁</span> Records Management</a>
            <a href="/crm/" class="nav-item"><span class="nav-icon">💼</span> Asset Management</a>
            <a href="/company/personal/" class="nav-item"><span class="nav-icon">👥</span> Human Resources</a>
            <a href="/crm/deal/" class="nav-item"><span class="nav-icon">💰</span> Finance</a>
            <a href="/marketplace/" class="nav-item"><span class="nav-icon">🛒</span> Procurement</a>
            <a href="/workgroups/" class="nav-item"><span class="nav-icon">🚛</span> Fleet Management</a>
            <a href="/workgroups/" class="nav-item"><span class="nav-icon">📊</span> Projects</a>
            <a href="https://polite-tree-08ad84b00.7.azurestaticapps.net" class="nav-item" target="_blank"><span class="nav-icon">📈</span> Reports & Analytics</a>
            <a href="/workgroups/" class="nav-item"><span class="nav-icon">👨‍👩‍👧‍👦</span> Workgroups</a>
            <a href="/docs/" class="nav-item"><span class="nav-icon">📚</span> Document Library</a>
            <a href="/knowledge/" class="nav-item"><span class="nav-icon">💡</span> Knowledge Base</a>
            <a href="/calendar/" class="nav-item"><span class="nav-icon">📅</span> Calendar</a>
            <a href="/company/personal/user/0/tasks/" class="nav-item"><span class="nav-icon">✅</span> Tasks</a>
            <a href="/stream/" class="nav-item more"><span class="nav-icon">•••</span> More</a>
        </nav>
        <div class="sidebar-section">
            <div class="sidebar-section-title">QUICK SEARCH</div>
            <div class="sidebar-search"><input type="text" placeholder="Search..." class="search-input" id="sidebarSearch"><span class="search-icon">🔍</span></div>
        </div>
        <div class="sidebar-section">
            <div class="sidebar-section-title">FAVOURITES</div>
            <a href="https://zealous-sand-0050fce00.7.azurestaticapps.net" class="fav-item" target="_blank"><span class="fav-dot green"></span> ICT Service Desk <span class="fav-star">⭐</span></a>
            <a href="/docs/" class="fav-item"><span class="fav-dot blue"></span> Records Team <span class="fav-star">⭐</span></a>
            <a href="/crm/deal/" class="fav-item"><span class="fav-dot purple"></span> Finance Approvals <span class="fav-star">⭐</span></a>
        </div>
    </aside>

    <!-- Main Content -->
    <main class="main">
        <!-- Top Bar -->
        <header class="topbar">
            <div class="topbar-left">
                <button class="menu-toggle" onclick="document.querySelector('.sidebar').classList.toggle('open')">☰</button>
                <h1 class="topbar-title">Digital Workplace Portal</h1>
            </div>
            <div class="topbar-center">
                <div class="global-search">
                    <input type="text" placeholder="Search for anything (documents, tickets, records, people)..." class="global-search-input" id="globalSearch">
                    <span class="global-search-icon">🔍</span>
                </div>
            </div>
            <div class="topbar-right">
                <a href="/timeman/timeman.php" class="topbar-btn">🔔<span class="badge" id="notifBadge">0</span></a>
                <a href="/online/" class="topbar-btn">💬<span class="badge red" id="msgBadge">0</span></a>
                <a href="/company/personal/user/0/tasks/" class="topbar-btn">📋</a>
                <div class="user-profile" onclick="window.location='/company/personal/'">
                    <div class="user-avatar"><?= htmlspecialchars($userInitials) ?></div>
                    <div class="user-info">
                        <span class="user-name"><?= htmlspecialchars($userName) ?></span>
                        <span class="user-role"><?= htmlspecialchars($userPosition) ?></span>
                    </div>
                    <span class="user-chevron">▾</span>
                </div>
            </div>
        </header>

        <!-- Content Area (Bitrix #workarea) -->
        <div class="content" id="workarea">
