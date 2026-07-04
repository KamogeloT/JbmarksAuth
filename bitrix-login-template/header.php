<?
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) { die(); }
?><!DOCTYPE html>
<html lang="en">
<head>
    <title><?$APPLICATION->ShowTitle();?></title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <?$APPLICATION->ShowHead();?>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; width: 100%; overflow-x: hidden; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            background: #fff url('/local/templates/login/images/LOGO.jpg') no-repeat center center !important;
            background-size: cover !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-height: 100vh !important;
            padding: 16px !important;
        }

        /* === HIDE UNWANTED === */
        
        
        .log-popup-form-qr,
        .login-wrapper-qr,
        [class*="qr"],
        .login-links,
        .b_line_gray,
        div.login-btn.login-btn-transparent { display: none !important; }

        /* === KILL WRAPPERS === */
        .login-wrapper { all: unset !important; display: contents !important; }
        .log-popup-form-input { display: block !important; width: 100% !important; }

        /* === CARD === */
        .login-card {
            background: rgba(255,255,255,0.95) !important;
            backdrop-filter: blur(10px) !important;
            -webkit-backdrop-filter: blur(10px) !important;
            border-radius: 24px !important;
            padding: 48px 40px 36px !important;
            width: 100% !important;
            max-width: 400px !important;
            box-shadow: 0 20px 60px rgba(0,0,0,0.12) !important;
            position: relative !important;
            z-index: 10 !important;
        }
        @media (max-width: 440px) {
            .login-card { padding: 36px 24px 28px !important; }
        }

        /* === FORM ITEMS === */
        .login-item.--auth { margin-bottom: 16px !important; display: block !important; }
        .login-text.login-item { display: block !important; }

        /* === INPUTS === */
        input.login-inp {
            width: 100% !important;
            height: 52px !important;
            padding: 0 18px !important;
            border: none !important;
            border-radius: 14px !important;
            font-size: 16px !important;
            color: #1a1a1a !important;
            background: #f4f4f5 !important;
            outline: none !important;
            transition: all 0.2s ease !important;
            -webkit-appearance: none !important;
            appearance: none !important;
            display: block !important;
            box-shadow: none !important;
        }
        input.login-inp:focus {
            background: #eef7ee !important;
            box-shadow: 0 0 0 2.5px #1B5E20 !important;
        }
        input.login-inp::placeholder {
            color: #999 !important;
            font-size: 15px !important;
            font-weight: 400 !important;
        }

        /* === SUBMIT BUTTON === */
        input[type="submit"].login-btn {
            width: 100% !important;
            height: 52px !important;
            padding: 0 !important;
            background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%) !important;
            color: #fff !important;
            border: none !important;
            border-radius: 14px !important;
            font-size: 16px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            -webkit-appearance: none !important;
            appearance: none !important;
            margin-top: 20px !important;
            display: block !important;
            box-shadow: 0 4px 14px rgba(27,94,32,0.3) !important;
            letter-spacing: 0.3px !important;
            transition: all 0.2s ease !important;
        }
        input[type="submit"].login-btn:hover {
            box-shadow: 0 8px 24px rgba(27,94,32,0.4) !important;
            transform: translateY(-1px) !important;
        }
        input[type="submit"].login-btn:active {
            transform: scale(0.98) !important;
        }

        /* === REMEMBER ME === */
        .login-text.login-item.--user-remember {
            margin-top: 16px !important;
            display: flex !important;
            align-items: center !important;
        }
        .login-checkbox-user-remember {
            width: 18px !important; height: 18px !important;
            accent-color: #1B5E20 !important;
            margin-right: 8px !important;
        }
        .login-item-checkbox-label {
            font-size: 13px !important;
            font-weight: 400 !important;
            color: #666 !important;
            cursor: pointer !important;
        }

        /* === FORGOT PASSWORD === */
        a.login-link-forgot-pass {
            display: block !important;
            text-align: center !important;
            margin-top: 16px !important;
            color: #1B5E20 !important;
            text-decoration: none !important;
            font-size: 13px !important;
            font-weight: 500 !important;
        }
        a.login-link-forgot-pass:hover { text-decoration: underline !important; }

        /* === FOOTER === */
        .login-footer {
            text-align: center !important;
            margin-top: 28px !important;
            font-size: 11px !important;
            color: #bbb !important;
            letter-spacing: 0.3px !important;
        }

        .log-popup-footer { display: block !important; padding: 0 !important; margin: 0 !important; border: none !important; background: none !important; }
        .log-popup-header { display: block !important; font-size: 24px !important; font-weight: 700 !important; color: #1B5E20 !important; text-align: center !important; margin-bottom: 28px !important; padding: 0 !important; border: none !important; background: none !important; }
        /* === BRAND === */
        .brand { text-align: center; margin-bottom: 12px; }
    </style>
</head>
<body>
<div class="login-card">
    <div class="brand"></div>
