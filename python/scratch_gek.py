import json
import urllib.request
import urllib.error

# Let's examine what the extension's checkHealth function does
# It calls /mat/sm with token but from Chrome's background script context
# The key difference might be that Chrome sends additional implicit headers
# like: sec-fetch-site, sec-fetch-dest, sec-ch-ua, etc.

# Let's try adding browser-like headers that Chrome extension would send
cookies_str = "_pk_id.5.c5eb=b0b60f94f54c194c.1782419729.; _pk_ses.5.c5eb=1; PortalAlias=portal; saplb_*=(J2EE5496320)5496351; JSESSIONID=ZB85dMnoKBd0MXw_Me5bQfGTr0AFnwEf3lMA_SAPbSspT_LufXhM1rE7cLlUlKUN; SAPWP_active=1; JSESSIONMARKID=lChEUgYNnhuHvhgYgUqXu_XSNchHeRYlhg7B_eUwA"

# Get fresh token first
req = urllib.request.Request(
    "https://esube.gek.org.tr/MainService/api/rfc/gt",
    headers={'accept': 'application/json;charset=UTF-8', 'Cookie': cookies_str},
    method='GET'
)
with urllib.request.urlopen(req, timeout=10) as r:
    data = json.loads(r.read())
    token = data.get('token')

print(f"Token: {token[:40]}...")

# Now try the search with FULL browser headers that Chrome extension would send
# Chrome background script sends these by default:
tests = [
    {
        "name": "With Referer=irj/portal",
        "headers": {
            'accept': 'application/json;charset=UTF-8',
            'token': token,
            'Cookie': cookies_str,
            'Referer': 'https://esube.gek.org.tr/irj/portal/',
            'Origin': 'https://esube.gek.org.tr',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            'x-requested-with': 'XMLHttpRequest',
        }
    },
    {
        "name": "With X-Requested-With only",
        "headers": {
            'accept': 'application/json;charset=UTF-8',
            'token': token,
            'Cookie': cookies_str,
            'x-requested-with': 'XMLHttpRequest',
        }
    },
    {
        "name": "With sln header (from JWT payload)",
        "headers": {
            'accept': 'application/json;charset=UTF-8',
            'token': token,
            'sln': '1',
            'Cookie': cookies_str,
        }
    },
    {
        "name": "TYP=2",
        "headers": {
            'accept': 'application/json;charset=UTF-8',
            'token': token,
            'Cookie': cookies_str,
        },
        "url_suffix": "?ST=8699832090055&TYP=2"
    },
    {
        "name": "TYP=0",
        "headers": {
            'accept': 'application/json;charset=UTF-8',
            'token': token,
            'Cookie': cookies_str,
        },
        "url_suffix": "?ST=8699832090055&TYP=0"
    },
    {
        "name": "Different endpoint: /mat/ms (POST)",
        "method": "POST",
        "headers": {
            'accept': 'application/json;charset=UTF-8',
            'content-type': 'application/json',
            'token': token,
            'Cookie': cookies_str,
        },
        "url": "https://esube.gek.org.tr/MainService/api/rfc/mat/ms?MATNR=000000000004200069",
        "body": b'{}'
    },
]

base_url = "https://esube.gek.org.tr/MainService/api/rfc/mat/sm"
default_suffix = "?ST=8699832090055&TYP=3"

for t in tests:
    name = t['name']
    method = t.get('method', 'GET')
    url = t.get('url', base_url + t.get('url_suffix', default_suffix))
    headers = t['headers']
    body = t.get('body', None)
    
    print(f"\n--- {name} ---")
    req = urllib.request.Request(url, headers=headers, method=method)
    if body:
        req.data = body
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            raw = r.read()
            print(f"  Status: {r.status}, Body: {raw[:300]}")
    except urllib.error.HTTPError as e:
        print(f"  HTTPError: {e.code}")
        try:
            print(f"  Body: {e.read()[:200]}")
        except:
            pass
    except Exception as ex:
        print(f"  Error: {ex}")
