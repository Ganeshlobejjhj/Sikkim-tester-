const axios = require('axios');

// In-Memory Token Cache
let cachedAuthToken = "bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI5MS05MzAxOTM4NDc3Iiwib3RoZXIiOm51bGwsImlkIjoxMTYzMzcsInR5cGUiOjIsImV4cCI6MTc4NzQwMTk1MywiaWF0IjoxNzg3MzE1NTUzLCJhdXRob3JpdGllcyI6W10sImp0aSI6ImZlNWJkYzY1LWI1MWEtNDRmYy04MmQ0LTM1NjNhZDcyZmJlNyJ9.QdC11ZXvO5RxgBwvEq8o2iuzwJVGsV646hVy2FfjJY-6eyuss4AzYZfrYD7Cqq_4ZZ8PwYWWPFcfsUfBmq4r_RBByVOpPtgwoyvTVTAd8yE85W-0qKV-eBVO5L6dT9zvbnYyjvFV5ZupPKwmbKghKtasOVIUlZ5AORmOzZoqWhI";
let cachedXAuthToken = "bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI5MS05MzAxOTM4NDc3Iiwib3RoZXIiOm51bGwsImlkIjoxMTYzMzcsInR5cGUiOjIsImV4cCI6MTc4NzkyMDM1MywiaWF0IjoxNzg3MzE1NTUzLCJhdXRob3JpdGllcyI6W10sImp0aSI6IjM0ZDFkODQxLTNlNjktNGM1MS04ODA2LWE2ODBhNzk0NjIyZiJ9.INdktR96c419BFM2i2HwVrVV9aZ64x5cYLaLk4rXbZQAYaLDny4nspXIuZcPpPQ5a1Xp4FdWW4NrY8IzdrpSd6IVfRxpFUwltVl6Pa41L-zswSYMwhrAzaVp-rdtNbmPs6lcKM7iz8xRR-w-saELJL76qKmmeGgOixdyFazucb8";

// Auto-Login Refresh Function
async function refreshAuthTokens() {
    try {
        console.log("Auto-refreshing tokens via 01k3.com login...");
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
                'accept-language': 'en',
                'content-type': 'application/json',
                'origin': 'https://01k3.com',
                'referer': 'https://01k3.com/',
                'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
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
                console.log("Tokens cached successfully!");
                return { success: true };
            }
        }
        return { success: false, data: resData };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-authorization'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const action = req.query.action || (req.body && req.body.action);

    // 1. Health System Endpoint
    if (action === 'health') {
        return res.status(200).json({
            status: "healthy",
            uptime: process.uptime ? process.uptime() : null,
            timestamp: new Date().toISOString(),
            tokenCached: !!cachedAuthToken,
            xTokenCached: !!cachedXAuthToken
        });
    }

    // 2. Force Refresh Token on Click
    if (action === 'refresh' || action === 'force_refresh') {
        const refreshResult = await refreshAuthTokens();
        if (refreshResult.success) {
            return res.status(200).json({ 
                success: true, 
                message: "Tokens refreshed successfully!", 
                timestamp: new Date().toISOString() 
            });
        } else {
            return res.status(500).json({ 
                success: false, 
                error: "Failed to force refresh token", 
                details: refreshResult 
            });
        }
    }

    const endpoint = req.query.endpoint || 'recordDetails';
    const TARGET_API = `https://01k3.com/api/game/plan/${endpoint}`;

    // 3. Clean Payload Builder (Strict schema to prevent Code 1000 Error)
    let payload;
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        payload = { ...req.body };
    } else {
        payload = {
            "id": Number(req.query.id || 308),
            "gameId": Number(req.query.gameId || (req.query.optionId === '291' ? 142 : (req.query.optionId ? Number(req.query.optionId) : 142))),
            "websiteId": Number(req.query.websiteId || 15),
            "gameCode": req.query.gameCode !== undefined ? Number(req.query.gameCode) : 2,
            "timeCode": req.query.timeCode !== undefined ? Number(req.query.timeCode) : 0,
            "pageNo": Number(req.query.pageNo || req.query.pageIndex || 1),
            "pageSize": Number(req.query.pageSize || 10)
        };
    }

    const executeRequest = async (authTkn, xAuthTkn, currentPayload) => {
        return await axios.post(TARGET_API, currentPayload, {
            headers: {
                'authority': '01k3.com',
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'en',
                'content-type': 'application/json;charset=UTF-8',
                'authorization': req.headers['authorization'] || authTkn,
                'x-authorization': req.headers['x-authorization'] || xAuthTkn,
                'origin': 'https://01k3.com',
                'referer': 'https://01k3.com/',
                'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });
    };

    try {
        let targetResponse = await executeRequest(cachedAuthToken, cachedXAuthToken, payload);

        // Auto-refresh if Code 1000 (System Abnormality) or Code 1007 (Token Expired)
        if (targetResponse.data && (targetResponse.data.code === 1007 || targetResponse.data.code === 1000)) {
            const loginSuccess = await refreshAuthTokens();
            if (loginSuccess.success) {
                targetResponse = await executeRequest(cachedAuthToken, cachedXAuthToken, payload);
            }
        }

        return res.status(200).json(targetResponse.data);

    } catch (error) {
        if (error.response && (error.response.status === 401 || (error.response.data && (error.response.data.code === 1007 || error.response.data.code === 1000)))) {
            const loginSuccess = await refreshAuthTokens();
            if (loginSuccess.success) {
                try {
                    const retryResponse = await executeRequest(cachedAuthToken, cachedXAuthToken, payload);
                    return res.status(200).json(retryResponse.data);
                } catch (retryErr) {
                    return res.status(500).json({ error: "Retry failed", message: retryErr.message });
                }
            }
        }

        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        return res.status(500).json({ error: "Proxy Execution Error", message: error.message });
    }
};
