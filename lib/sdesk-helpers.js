'use strict';
/**
 * Pure, dependency-light helpers extracted from server-simple.js so they can be
 * unit-tested without booting the HTTP server or touching Bitrix/Postgres/APNs.
 *
 * Everything here is deterministic given its inputs (the JWT helpers take the
 * secret/ttl as arguments instead of reading module-level globals). server-simple.js
 * requires this module and delegates to it, so there is a single source of truth.
 */
const crypto = require('crypto');

function b64url(buf) {
    return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlJson(obj) { return b64url(JSON.stringify(obj)); }

/** Sign an HS256 JWT. `secret` and `ttlSeconds` are passed in (no globals). */
function signJwt(payload, secret, ttlSeconds) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const body = { ...payload, iat: now, exp: now + ttlSeconds };
    const data = `${b64urlJson(header)}.${b64urlJson(body)}`;
    const sig = b64url(crypto.createHmac('sha256', secret).update(data).digest());
    return `${data}.${sig}`;
}

/** Verify an HS256 JWT signature + expiry. Returns the payload or null. */
function verifyJwt(token, secret) {
    try {
        const [h, p, s] = String(token).split('.');
        if (!h || !p || !s) return null;
        const expected = b64url(crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest());
        if (s.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null;
        const payload = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
        if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
        return payload;
    } catch { return null; }
}

/**
 * Parse a "Label: value" line out of a ticket description. Returns '' when the
 * label is absent or its value is the "Not provided" placeholder.
 */
function parseDescField(description, label) {
    if (!description) return '';
    const re = new RegExp(`^${label}:\\s*(.+)`, 'im');
    for (const line of String(description).split('\n')) {
        const m = re.exec(line.trim());
        if (m && m[1] && m[1].trim() && m[1].trim() !== 'Not provided') return m[1].trim();
    }
    return '';
}

/** Strip Bitrix BBCode / [USER=..] tags / :hex: emoji codes for clean display. */
function cleanBitrixText(text) {
    return String(text)
        .replace(/\[USER=\d+\]([^\[]*)\[\/USER\]/gi, '$1')
        .replace(/\[\/?[A-Z]+(=[^\]]*)?\]/gi, '')
        .replace(/:[0-9a-f]{8}:/gi, '')
        .trim();
}

/** Human label for a Bitrix task status code. */
function ticketStatusLabel(code) {
    return ({ '2': 'New', '3': 'In Progress', '4': 'Awaiting User', '5': 'Resolved', '6': 'Deferred' })[String(code)] || 'Open';
}

/** Parse an Azure Communication Services connection string. */
function parseConnectionString(connStr) {
    const parts = {};
    String(connStr).split(';').forEach(part => {
        const [key, ...valueParts] = part.split('=');
        parts[key.trim()] = valueParts.join('=').trim();
    });
    return { endpoint: parts['endpoint'], accessKey: parts['accesskey'] };
}

/**
 * Given an escalation chain and a ticket's age (minutes) and the set of levels
 * already recorded, pick the highest chain step whose threshold has been passed
 * and that has not yet been escalated. Returns the step or null.
 *
 * @param {Array<{level:number, afterMinutes:number}>} chain
 * @param {number} ageMinutes  ticket age (now - created), in minutes
 * @param {Set<number>|Array<number>} alreadyLevels  levels already escalated
 */
function pickEscalationStep(chain, ageMinutes, alreadyLevels) {
    if (!Array.isArray(chain) || chain.length === 0) return null;
    const done = alreadyLevels instanceof Set ? alreadyLevels : new Set(alreadyLevels || []);
    const sorted = [...chain]
        .filter(s => Number.isFinite(s.afterMinutes) && Number.isFinite(s.level))
        .sort((a, b) => b.afterMinutes - a.afterMinutes); // highest threshold first
    for (const step of sorted) {
        if (ageMinutes >= step.afterMinutes && !done.has(step.level)) return step;
    }
    return null;
}

module.exports = {
    b64url,
    b64urlJson,
    signJwt,
    verifyJwt,
    parseDescField,
    cleanBitrixText,
    ticketStatusLabel,
    parseConnectionString,
    pickEscalationStep,
};
