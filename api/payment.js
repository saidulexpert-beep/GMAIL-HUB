export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, api-key, API-KEY, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 🔴 এখানে আপনার NagorikPay মার্চেন্ট প্যানেলের লাইভ API Key বসান
  const API_KEY = 'hRECFjf99Y57Gl0wcs2pjeVaEWDPZCqU5WL85uYmaU5EVdEY3m';
  const BASE_URL = 'https://secure-pay.nagorikpay.com/api/payment';
  
  const action = req.query.action;

  // Body Parsing
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  body = body || {};

  try {
    // ১. পেমেন্ট তৈরি (Create Payment)
    if (action === 'create') {
      const amountVal = String(parseInt(body.amount, 10) || 10);
      
      const host = req.headers.host;
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const siteUrl = `${protocol}://${host}`;

      let successUrl = body.success_url || `${siteUrl}?status=success`;
      let cancelUrl = body.cancel_url || `${siteUrl}?status=cancel`;
      let webhookUrl = body.webhook_url || `${siteUrl}?status=webhook`;

      // NagorikPay Official Payload Format
      const payload = {
        amount: amountVal,
        success_url: successUrl,
        cancel_url: cancelUrl,
        webhook_url: webhookUrl,
        metadata: {
          phone: (body.metadata && body.metadata.phone) ? String(body.metadata.phone) : "01700000000"
        }
      };

      const response = await fetch(`${BASE_URL}/create`, {
        method: 'POST',
        headers: {
          'API-KEY': API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (err) {
        data = { message: rawText };
      }

      return res.status(response.status || 200).json(data);

    // ২. পেমেন্ট ভেরিফিকেশন (Verify Payment)
    } else if (action === 'verify') {
      const trxId = body.transaction_id || body.trx_id || body.order_id;

      if (!trxId) {
        return res.status(400).json({ 
          status: 'ERROR', 
          message: 'Transaction ID is required' 
        });
      }

      const response = await fetch(`${BASE_URL}/verify`, {
        method: 'POST',
        headers: {
          'API-KEY': API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ transaction_id: String(trxId).trim() })
      });
      
      const data = await response.json();
      return res.status(response.status || 200).json(data);

    } else {
      return res.status(400).json({ error: 'Invalid Action. Use ?action=create or ?action=verify' });
    }
  } catch (error) {
    console.error("NagorikPay API Error:", error);
    return res.status(500).json({ error: error.message || 'Server Connection Failed' });
  }
}
