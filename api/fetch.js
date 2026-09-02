const axios = require('axios');

// In-Memory Token Cache
let cachedAuthToken = "bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI5MS05MzAxOTM4NDc3Iiwib3RoZXIiOm51bGwsImlkIjoxMTYzMzcsInR5cGUiOjIsImV4cCI6MTc4NzQwMTk1MywiaWF0IjoxNzg3MzE1NTUzLCJhdXRob3JpdGllcyI6W10sImp0aSI6ImZlNWJkYzY1LWI1MWEtNDRmYy04MmQ0LTM1NjNhZDcyZmJlNyJ9.QdC11ZXvO5RxgBwvEq8o2iuzwJVGsV646hVy2FfjJY-6eyuss4AzYZfrYD7Cqq_4ZZ8PwYWWPFcfsUfBmq4r_RBByVOpPtgwoyvTVTAd8yE85W-0qKV-eBVO5L6dT9zvbnYyjvFV5ZupPKwmbKghKtasOVIUlZ5AORmOzZoqWhI";
let cachedXAuthToken = "bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI5MS05MzAxOTM4NDc3Iiwib3RoZXIiOm51bGwsImlkIjoxMTYzMzcsInR5cGUiOjIsImV4cCI6MTc4NzkyMDM1MywiaWF0IjoxNzg3MzE1NTUzLCJhdXRob3JpdGllcyI6W10sImp0aSI6IjM0ZDFkODQxLTNlNjktNGM1MS04ODA2LWE2ODBhNzk0NjIyZiJ9.INdktR96c419BFM2i2HwVrVV9aZ64x5cYLaLk4rXbZQAYaLDny4nspXIuZcPpPQ5a1Xp4FdWW4NrY8IzdrpSd6IVfRxpFUwltVl6Pa41L-zswSYMwhrAzaVp-rdtNbmPs6lcKM7iz8xRR-w-saELJL76qKmmeGgOixdyFazucb8";

// Instant Auto-Login Refresh Function
async function refreshAuthTokens() {
    try {
        console.log("Refreshing fresh tokens via 01k3.com login API...");
        const loginUrl = 'https://01k3.com/api/member/auth/login';
        const loginPayload = {
            "account": "91-9301938477",
            "password": "VVmTyPK3O8zk+j8dmnMF5IR/x4P5IYdmlQ7V7Tqw4b+o2k+50euYwOSaeCYJsTbEjvwNcE/eSUNWb11By30waNNFHxxcTieEkNKD3GaBkNPDd8znN0SfxaKDnNs/VaYmMTkZAx0VD/IOqqHPPROM1WZfB0AwxLNHXjkqHPi/HSc=",
            "code": "",
            "key": ""
        };

        const res = await axios.post(loginUrl, loginPayload, {
            headers: {
                'authority': '01k3.com',
                'accept': 'application/json, text/plain, */*',
                'content-type': 'application/json',
                'origin': 'https://01k3.com',
                'referer': 'https://01k3.com/',
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
            },
            timeout: 10000
        });

        const resData = res.data;
        if (resData && (resData.code === 0 || resData.data)) {
            const dataObj = resData.data || {};
            const token = dataObj.token || dataObj.accessToken || res.headers['authorization'];
            const xToken = dataObj.x_token || dataObj.xAuthorization || res.headers['x-authorization'] || token;

            if (token) {
                cachedAuthToken = token.startsWith('bearer ') || token.startsWith('Bearer ') ? token : `bearer ${token}`;
                cachedXAuthToken = xToken.startsWith('bearer ') || xToken.startsWith('Bearer ') ? xToken : `bearer ${xToken}`;
                return { success: true };
            }
        }
        return { success: false, data: resData };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const action = req.query.action || (req.body && req.body.action);

    // 1. Health Check
    if (action === 'health') {
        return res.status(200).json({
            status: "ok",
            timestamp: new Date().toISOString(),
            hasCachedAuthToken: !!cachedAuthToken,
            hasCachedXAuthToken: !!cachedXAuthToken
        });
    }

    // 2. Force Refresh Token on Click
    if (action === 'refresh' || action === 'force_refresh') {
        const refreshResult = await refreshAuthTokens();
        if (refreshResult.success) {
            return res.status(200).json({ success: true, message: "Fresh token generated successfully!" });
        } else {
            return res.status(500).json({ success: false, error: refreshResult.error || "Login Failed" });
        }
    }

    const TARGET_API = 'https://01k3.com/api/game/plan/recordDetails';

    // 3. Clean and exact payload schema for 01k3.com
    const PAYLOAD = {
        "id": req.query.id ? Number(req.query.id) : (req.body && req.body.id ? Number(req.body.id) : 308),
        "gameId": req.query.gameId ? Number(req.query.gameId) : (req.body && req.body.gameId ? Number(req.body.gameId) : 142),
        "websiteId": req.query.websiteId ? Number(req.query.websiteId) : (req.body && req.body.websiteId ? Number(req.body.websiteId) : 15),
        "gameCode": req.query.gameCode !== undefined ? Number(req.query.gameCode) : (req.body && req.body.gameCode !== undefined ? Number(req.body.gameCode) : 2),
        "timeCode": req.query.timeCode !== undefined ? Number(req.query.timeCode) : (req.body && req.body.timeCode !== undefined ? Number(req.body.timeCode) : 0),
        "pageNo": req.query.pageNo ? Number(req.query.pageNo) : (req.query.pageIndex ? Number(req.query.pageIndex) : 1),
        "pageSize": req.query.pageSize ? Number(req.query.pageSize) : 10
    };

    const executeReq = async (authTkn, xAuthTkn) => {
        return await axios.post(TARGET_API, PAYLOAD, {
            headers: {
                'authority': '01k3.com',
                'accept': 'application/json, text/plain, */*',
                'content-type': 'application/json;charset=UTF-8',
                'Authorization': req.headers['authorization'] || authTkn,
                'x-authorization': req.headers['x-authorization'] || xAuthTkn,
                'origin': 'https://01k3.com',
                'referer': 'https://01k3.com/',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
            },
            timeout: 10000
        });
    };

    try {
        let response = await executeReq(cachedAuthToken, cachedXAuthToken);

        // Auto-fix if Code 1000 or Code 1007 detected
        if (response.data && (response.data.code === 1007 || response.data.code === 1000)) {
            const refreshed = await refreshAuthTokens();
            if (refreshed.success) {
                response = await executeReq(cachedAuthToken, cachedXAuthToken);
            }
        }

        res.status(200).json(response.data);
    } catch (error) {
        if (error.response && (error.response.status === 401 || (error.response.data && (error.response.data.code === 1007 || error.response.data.code === 1000)))) {
            const refreshed = await refreshAuthTokens();
            if (refreshed.success) {
                try {
                    const retryRes = await executeReq(cachedAuthToken, cachedXAuthToken);
                    return res.status(200).json(retryRes.data);
                } catch (retryErr) {
                    return res.status(500).json({ error: "Retry Failed", details: retryErr.message });
                }
            }
        }
        res.status(500).json({ error: "Fetch Failed", details: error.message });
    }
};
