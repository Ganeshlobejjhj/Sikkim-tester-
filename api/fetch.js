const axios = require('axios');

// Default Tokens (Fallback / In-Memory Cache)
let cachedAuthToken = "bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI5MS05MzAxOTM4NDc3Iiwib3RoZXIiOm51bGwsImlkIjoxMTYzMzcsInR5cGUiOjIsImV4cCI6MTc4NjcxMDIzOCwiaWF0IjoxNzg2NjIzODM4LCJhdXRob3JpdGllcyI6W10sImp0aSI6IjQxZTdlZWE4LTM4ZjgtNGY4OS1hYWY1LTMxZTE0MzA4YmE5YSJ9.b84CVhLdwRtsVcNS_MQlyt7XjlFDMQ_UomTb-5PHoeovS9lmryf24okIcGqxEq_2wc66JD5elDnvXhxI05leNTZJDOGO4_xds90ThR6jks_c3ZkRcBF6AqjiTuzpynvetbuH4m7Pit4Wd0ScbBIuO00DyW8EXfqqZx_EuHe8Wuk";
let cachedXAuthToken = "bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI5MS05MzAxOTM4NDc3Iiwib3RoZXIiOm51bGwsImlkIjoxMTYzMzcsInR5cGUiOjIsImV4cCI6MTc3MjI4ODYzOCwiaWF0IjoxNzg2NjIzODM4LCJhdXRob3JpdGllcyI6W10sImp0aSI6ImQyY2QzMzUwLWY1MTMtNGNkOC1hY2FlLWRkYjVhOGMxZTdjNyJ9.DPPCmKs8hrun7dv_gMfiDgH9oSYWatK5S3dLckABjRcYaw7SoaFgALQeOIVIvnVn73GRa604j1CTZdJTXS-g1NvlK7AUbk_q8RNTnsjiFRyzOtwL3jdbf0adU2LFWEuQ5cFjNZ-A2g7Nvsci2kijxlTdO0JG47dHAdV6TxIY3kA";

// Instant Token Refresh via Login API
async function refreshAuthTokens() {
    try {
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
                return { success: true, message: "Token refreshed successfully!" };
            }
        }
        return { success: false, message: "Login did not return valid token", data: resData };
    } catch (err) {
        return { success: false, message: err.message };
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

    // 1. Health Check System (?action=health)
    if (action === 'health') {
        return res.status(200).json({
            status: "ok",
            timestamp: new Date().toISOString(),
            hasCachedAuthToken: !!cachedAuthToken,
            hasCachedXAuthToken: !!cachedXAuthToken
        });
    }

    // 2. Force Refresh Token on Click (?action=force_refresh)
    if (action === 'refresh' || action === 'force_refresh') {
        const refreshResult = await refreshAuthTokens();
        if (refreshResult.success) {
            return res.status(200).json({ success: true, message: "Fresh token generated successfully!" });
        } else {
            return res.status(500).json({ success: false, error: refreshResult.message });
        }
    }

    const TARGET_API = 'https://01k3.com/api/game/plan/recordDetails';

    // 3. Dynamic payload support (kisi bhi mode/gameId/id ka data switch karne ke liye)
    const PAYLOAD = {
        "id": req.query.id ? Number(req.query.id) : (req.body && req.body.id ? Number(req.body.id) : 308),
        "gameId": req.query.gameId ? Number(req.query.gameId) : (req.body && req.body.gameId ? Number(req.body.gameId) : 142),
        "websiteId": req.query.websiteId ? Number(req.query.websiteId) : (req.body && req.body.websiteId ? Number(req.body.websiteId) : 15),
        "gameCode": req.query.gameCode !== undefined ? Number(req.query.gameCode) : (req.body && req.body.gameCode !== undefined ? Number(req.body.gameCode) : 2),
        "timeCode": req.query.timeCode !== undefined ? Number(req.query.timeCode) : (req.body && req.body.timeCode !== undefined ? Number(req.body.timeCode) : 0),
        "pageNo": req.query.pageNo ? Number(req.query.pageNo) : (req.body && req.body.pageNo ? Number(req.body.pageNo) : 1),
        "pageSize": req.query.pageSize ? Number(req.query.pageSize) : (req.body && req.body.pageSize ? Number(req.body.pageSize) : 10)
    };

    const executeReq = async () => {
        return await axios.post(TARGET_API, PAYLOAD, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cachedAuthToken,
                'x-authorization': cachedXAuthToken,
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
            },
            timeout: 8000
        });
    };

    try {
        let response = await executeReq();

        // Automatic Token Refresh if Expired (Error Code 1007)
        if (response.data && response.data.code === 1007) {
            const refreshed = await refreshAuthTokens();
            if (refreshed.success) {
                response = await executeReq();
            }
        }

        res.status(200).json(response.data);
    } catch (error) {
        // Automatic Token Refresh if HTTP 401 Unauthorized
        if (error.response && error.response.status === 401) {
            const refreshed = await refreshAuthTokens();
            if (refreshed.success) {
                try {
                    const retryRes = await executeReq();
                    return res.status(200).json(retryRes.data);
                } catch (retryErr) {
                    return res.status(500).json({ error: "Retry Failed", details: retryErr.message });
                }
            }
        }
        res.status(500).json({ error: "Fetch Failed", details: error.message });
    }
};
