const axios = require('axios');

// In-Memory Token Cache
let cachedAuthToken = "bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI5MS05MzAxOTM4NDc3Iiwib3RoZXIiOm51bGwsImlkIjoxMTYzMzcsInR5cGUiOjIsImV4cCI6MTc4NzQwMTk1MywiaWF0IjoxNzg3MzE1NTUzLCJhdXRob3JpdGllcyI6W10sImp0aSI6ImZlNWJkYzY1LWI1MWEtNDRmYy04MmQ0LTM1NjNhZDcyZmJlNyJ9.QdC11ZXvO5RxgBwvEq8o2iuzwJVGsV646hVy2FfjJY-6eyuss4AzYZfrYD7Cqq_4ZZ8PwYWWPFcfsUfBmq4r_RBByVOpPtgwoyvTVTAd8yE85W-0qKV-eBVO5L6dT9zvbnYyjvFV5ZupPKwmbKghKtasOVIUlZ5AORmOzZoqWhI";
let cachedXAuthToken = "bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI5MS05MzAxOTM4NDc3Iiwib3RoZXIiOm51bGwsImlkIjoxMTYzMzcsInR5cGUiOjIsImV4cCI6MTc4NzkyMDM1MywiaWF0IjoxNzg3MzE1NTUzLCJhdXRob3JpdGllcyI6W10sImp0aSI6IjM0ZDFkODQxLTNlNjktNGM1MS04ODA2LWE2ODBhNzk0NjIyZiJ9.INdktR96c419BFM2i2HwVrVV9aZ64x5cYLaLk4rXbZQAYaLDny4nspXIuZcPpPQ5a1Xp4FdWW4NrY8IzdrpSd6IVfRxpFUwltVl6Pa41L-zswSYMwhrAzaVp-rdtNbmPs6lcKM7iz8xRR-w-saELJL76qKmmeGgOixdyFazucb8";

// Function: Automatic Fresh Token Generator via Login API
async function refreshAuthTokens() {
    try {
        console.log("Fetching fresh tokens via login API...");
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
                console.log("Successfully generated and cached fresh tokens!");
                return { success: true };
            }
        }
        console.warn("Login response did not return token:", resData);
        return { success: false, data: resData };
    } catch (err) {
        console.error("Auto-login request failed:", err.message);
        return { success: false, error: err.message };
    }
}

// Main Vercel / Express Serverless Function Handler
module.exports = async (req, res) => {
    // CORS configuration
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

    // 1. Health Check System Endpoint (?action=health)
    if (action === 'health') {
        return res.status(200).json({
            status: "healthy",
            uptime: process.uptime ? process.uptime() : null,
            timestamp: new Date().toISOString(),
            tokenCached: !!cachedAuthToken,
            xTokenCached: !!cachedXAuthToken
        });
    }

    // 2. Force Refresh Token on Click Endpoint (?action=refresh / ?action=force_refresh)
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

    // 3. Dynamic payload support (Query params ya Body se kisi bhi mode/id ka data mangwa sakte hain)
    let payload = {
        "id": req.query.id ? Number(req.query.id) : 308,
        "gameId": req.query.gameId ? Number(req.query.gameId) : 142,
        "websiteId": req.query.websiteId ? Number(req.query.websiteId) : 15,
        "gameCode": req.query.gameCode !== undefined ? Number(req.query.gameCode) : 2,
        "timeCode": req.query.timeCode !== undefined ? Number(req.query.timeCode) : 0,
        "pageNo": req.query.pageNo ? Number(req.query.pageNo) : (req.query.pageIndex ? Number(req.query.pageIndex) : 1),
        "pageSize": req.query.pageSize ? Number(req.query.pageSize) : 10,
        "optionId": req.query.optionId || req.query.gameId || "291"
    };

    if (req.body && Object.keys(req.body).length > 0) {
        payload = { ...payload, ...req.body };
    }

    const executeRequest = async (authTkn, xAuthTkn) => {
        return await axios.post(TARGET_API, payload, {
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
        let targetResponse = await executeRequest(cachedAuthToken, cachedXAuthToken);

        // Automatic token refresh on expired code 1007
        if (targetResponse.data && targetResponse.data.code === 1007) {
            const loginSuccess = await refreshAuthTokens();
            if (loginSuccess.success) {
                targetResponse = await executeRequest(cachedAuthToken, cachedXAuthToken);
            }
        }

        return res.status(200).json(targetResponse.data);

    } catch (error) {
        // Automatic token refresh on HTTP 401 Unauthorized
        if (error.response && (error.response.status === 401 || (error.response.data && error.response.data.code === 1007))) {
            const loginSuccess = await refreshAuthTokens();
            if (loginSuccess.success) {
                try {
                    const retryResponse = await executeRequest(cachedAuthToken, cachedXAuthToken);
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