import crypto from "crypto";

// NetSuite sandbox account IDs (e.g. 4129158_SB3) use hyphens and lowercase in URLs
// but the original format (with underscore) is kept for the OAuth realm header.
function nsUrlAccountId(): string {
  return process.env.NS_ACCOUNT_ID!.toLowerCase().replace(/_/g, "-");
}

const NS_BASE = `https://${nsUrlAccountId()}.suitetalk.api.netsuite.com`;
const NS_RESTLET_BASE = `https://${nsUrlAccountId()}.restlets.api.netsuite.com`;

interface OAuthParams {
  oauth_consumer_key: string;
  oauth_token: string;
  oauth_signature_method: string;
  oauth_timestamp: string;
  oauth_nonce: string;
  oauth_version: string;
  oauth_signature?: string;
}

function buildAuthHeader(method: string, url: string): string {
  const params: OAuthParams = {
    oauth_consumer_key: process.env.NS_CONSUMER_KEY!,
    oauth_token: process.env.NS_TOKEN_ID!,
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_version: "1.0",
  };

  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encode(k)}=${encode(v)}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    encode(url),
    encode(sortedParams),
  ].join("&");

  const signingKey = `${encode(process.env.NS_CONSUMER_SECRET!)}&${encode(process.env.NS_TOKEN_SECRET!)}`;

  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(baseString)
    .digest("base64");

  params.oauth_signature = signature;

  const headerParts = Object.entries(params)
    .map(([k, v]) => `${k}="${encode(v!)}"`)
    .join(", ");

  return `OAuth realm="${process.env.NS_ACCOUNT_ID}", ${headerParts}`;
}

function encode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export async function suiteQL<T>(query: string): Promise<T[]> {
  const url = `${NS_BASE}/services/rest/query/v1/suiteql`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: buildAuthHeader("POST", url),
      "Content-Type": "application/json",
      prefer: "transient",
    },
    body: JSON.stringify({ q: query }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SuiteQL error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return (data.items ?? []) as T[];
}

export async function nsPatch(path: string, body: object): Promise<void> {
  const url = `${NS_BASE}/services/rest/record/v1${path}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: buildAuthHeader("PATCH", url),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NS PATCH error ${res.status}: ${text}`);
  }
}

export async function nsGet<T>(path: string): Promise<T> {
  const url = `${NS_BASE}/services/rest/record/v1${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: buildAuthHeader("GET", url),
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NS GET error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function callRestlet<TReq, TRes>(
  scriptId: string,
  deployId: string,
  payload: TReq
): Promise<TRes> {
  const url = `${NS_RESTLET_BASE}/app/site/hosting/restlet.nl?script=${scriptId}&deploy=${deployId}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: buildAuthHeader("POST", url),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Restlet error ${res.status}: ${text}`);
  }

  return res.json();
}
