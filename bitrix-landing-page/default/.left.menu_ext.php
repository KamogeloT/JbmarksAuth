<?php
/**
 * JB Marks — Custom Left Menu Items
 * Adds ICT Service Desk, IT Support Dashboard, and Reports links to the sidebar.
 * 
 * This file extends the default left menu with external app links.
 * Place in template root or site root to be auto-included by Bitrix menu component.
 */

if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();

// Prepend custom items to the menu
$aMenuLinks = array_merge(
    [
        [
            "ICT Service Desk",
            "https://zealous-sand-0050fce00.7.azurestaticapps.net",
            [],
            [
                "ICON" => "menu-item-icon-service",
                "TARGET" => "_blank",
                "CLASS" => "menu-item-external",
            ],
            ""
        ],
        [
            "IT Support Dashboard",
            "https://black-water-07331b400.7.azurestaticapps.net",
            [],
            [
                "ICON" => "menu-item-icon-dashboard",
                "TARGET" => "_blank",
                "CLASS" => "menu-item-external",
            ],
            ""
        ],
        [
            "Reports & Analytics",
            "https://polite-tree-08ad84b00.7.azurestaticapps.net",
            [],
            [
                "ICON" => "menu-item-icon-reports",
                "TARGET" => "_blank",
                "CLASS" => "menu-item-external",
            ],
            ""
        ],
    ],
    $aMenuLinks
);
