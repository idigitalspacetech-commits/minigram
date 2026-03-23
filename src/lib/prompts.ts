// ── TRACK DETECTION ──────────────────────────────────────────────────────────
const BLOCKCHAIN_KEYWORDS = [
  'token','tokens','wallet','wallets','nft','nfts','crypto','blockchain',
  ' ton ','toncoin','jetton','jettons','web3','defi','staking','mining',
  'airdrop','coin','coins','smart contract','on-chain','dapp',
  'ton connect','tonconnect','ton-based','ton blockchain','ston.fi','dedust',
]

export function detectTrack(prompt: string): 1 | 2 {
  const padded = ' ' + prompt.toLowerCase() + ' '
  return BLOCKCHAIN_KEYWORDS.some(kw => padded.includes(kw)) ? 2 : 1
}

// ── SHARED BASE RULES ─────────────────────────────────────────────────────────
const BASE_RULES = `You are MiniGram, an expert Telegram Mini App developer. Follow every rule exactly.

MINI APP HTML RULES:
1. First script in <head>: <script src="https://telegram.org/js/telegram-web-app.js"></script>
2. Init: const tg = window.Telegram.WebApp; tg.ready(); tg.expand();
3. Theme: document.body.style.backgroundColor = tg.themeParams.bg_color || '#ffffff';
4. Use CSS variables for ALL colors: --tg-theme-bg-color, --tg-theme-text-color, --tg-theme-button-color, --tg-theme-button-text-color, --tg-theme-secondary-bg-color, --tg-theme-hint-color
5. Safe area: padding env(safe-area-inset-top/right/bottom/left)
6. User: const user = tg.initDataUnsafe?.user; const userName = user?.first_name || 'Friend';
7. Referral: const startParam = tg.initDataUnsafe?.start_param;
8. Use tg.MainButton for primary actions
9. Use tg.HapticFeedback.impactOccurred('light') on button taps
10. Use tg.BackButton for navigation between screens
11. localStorage for persistence with namespaced keys
12. Desktop responsive: max-width 640px centered, @media (min-width: 768px)
13. Loading, empty, and error states on ALL screens

BOT RULES:
1. python-telegram-bot v21+ fully async
2. All config via os.getenv(): BOT_TOKEN, MINI_APP_URL, OWNER_CHAT_ID
3. def app_keyboard(text='Open App'): return InlineKeyboardMarkup([[InlineKeyboardButton(text, web_app=WebAppInfo(url=MINI_APP_URL))]])
4. EVERY bot message includes reply_markup=app_keyboard()
5. /start: welcome + ReplyKeyboardMarkup + inline button + pin_chat_message()
6. Parse startapp= referral in /start context.args
7. Inline query handler for rich sharing
8. MessageHandler for filters.StatusUpdate.WEB_APP_DATA
9. Handle RetryAfter with exponential backoff
10. asyncio.sleep(1/25) between bulk sends
11. NEVER hardcode BOT_TOKEN

PAYMENTS: Telegram Stars only. openInvoice() in Mini App. sendInvoice() with provider_token='' in bot.`

// ── TON ADDITIONS ─────────────────────────────────────────────────────────────
const TON_RULES = `
TON BLOCKCHAIN RULES:
1. TON ONLY. No Ethereum, Solana, MetaMask, WalletConnect, BSC.
2. Add after Telegram SDK: <script src="https://unpkg.com/@tonconnect/ui@latest/dist/tonconnect-ui.min.js"></script>
3. Add to header: <div id="ton-connect-button"></div>
4. MANDATORY init after tg.ready():
   const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
     manifestUrl: window.location.origin + '/tonconnect-manifest.json',
     buttonRootId: 'ton-connect-button',
     uiPreferences: { theme: tg.colorScheme === 'dark' ? 'DARK' : 'LIGHT' }
   });
5. MANDATORY status listener:
   tonConnectUI.onStatusChange(function(wallet) {
     if (wallet) {
       const short = wallet.account.address.slice(0,6) + '...' + wallet.account.address.slice(-4);
       showWalletConnected(short, wallet.account.chain);
     } else { showWalletDisconnected(); }
   });
6. MANDATORY sendTON helper:
   async function sendTON(toAddress, amountInTON) {
     const nanoAmount = String(Math.floor(amountInTON * 1000000000));
     try {
       const r = await tonConnectUI.sendTransaction({ validUntil: Math.floor(Date.now()/1000)+300, messages: [{ address: toAddress, amount: nanoAmount }] });
       return r;
     } catch(err) { showError(err.message); return null; }
   }
7. MANDATORY formatter: function formatTON(nanotons) { return (Number(nanotons) / 1000000000).toFixed(4) + ' TON'; }
8. 3 wallet states: A=disconnected(Connect button), B=connecting(spinner), C=connected(short address+disconnect)
9. Transaction flow: preview(amount+fee+recipient) → confirming(spinner) → success(txHash+tonscan link) → error(retry)
10. Chain: wallet.account.chain === '-3' = testnet. Show red banner.
11. Explorer: isTestnet ? 'https://testnet.tonscan.org/tx/' : 'https://tonscan.org/tx/' + txHash`

// ── PROMPT BUILDERS ───────────────────────────────────────────────────────────
export function buildMiniAppPrompt(track: 1 | 2): string {
  const base = BASE_RULES + (track === 2 ? TON_RULES : '\nNo blockchain. Telegram Stars only for payments.')
  return base + '\n\nReturn ONLY the complete raw HTML file. Start with <!DOCTYPE html>. No JSON. No markdown fences.'
}

export function buildBotPrompt(track: 1 | 2): string {
  const tonBot = track === 2 ? `
TON BOT ADDITIONS:
- TON_WALLET_ADDRESS = os.getenv('TON_WALLET_ADDRESS')
- TON_API_KEY = os.getenv('TON_API_KEY', '')
- TESTNET = os.getenv('TESTNET', 'true').lower() == 'true'
- async def verify_ton_payment(expected_nano: int) -> bool:
    base = 'https://testnet.toncenter.com/api/v2' if TESTNET else 'https://toncenter.com/api/v2'
    async with aiohttp.ClientSession() as s:
      async with s.get(f'{base}/getTransactions', params={'address': TON_WALLET_ADDRESS, 'limit': 20, 'api_key': TON_API_KEY}) as r:
        data = await r.json()
        for tx in data.get('result', []):
          if int(tx.get('in_msg',{}).get('value',0)) >= expected_nano: return True
    return False` : ''
  return BASE_RULES + tonBot + '\n\nReturn ONLY the complete raw Python file. Start with import statements. No JSON. No markdown fences.'
}

export function buildManifestPrompt(appName: string): string {
  return `Generate a TON Connect manifest JSON for app: "${appName}". Use MINI_APP_URL_PLACEHOLDER for all URLs. Include: url, name, iconUrl (/icon-192.png), termsOfUseUrl (/terms), privacyPolicyUrl (/privacy). Return only the raw JSON.`
}

export function buildSupportPrompt(track: 1 | 2): string {
  const tonNote = track === 2
    ? ' TON extras: requirements.txt add aiohttp==3.9.5. env_example add TON_WALLET_ADDRESS, TON_API_KEY, TESTNET=true. setup_md include testnet steps and tonconnect-manifest.json CORS checklist.'
    : ''
  return `Generate Telegram bot support files. Return ONLY valid JSON with exactly 4 keys: scheduler_py, requirements_txt, env_example, setup_md. No markdown fences. Every newline in a value MUST be escaped as \\n.
scheduler_py: APScheduler AsyncIOScheduler, 24hr per-user rate limit dict, send 17-19 UTC, personalized first_name, 25msg/sec asyncio.sleep(1/25), handle Forbidden and RetryAfter.
requirements_txt: python-telegram-bot==21.6, python-dotenv==1.0.1, APScheduler==3.10.4, pytz==2024.1, aiohttp==3.9.5
env_example: BOT_TOKEN, MINI_APP_URL, OWNER_CHAT_ID, OG_IMAGE_URL, NOTIFICATION_HOUR=17, NOTIFICATION_TIMEZONE=UTC${tonNote}
setup_md: Complete numbered plain-English guide. BotFather /newbot /setcommands /setmenubutton emoji /setinline. Deploy miniapp.html to Vercel. Set MINI_APP_URL. pip install. python bot.py. Test.
Return: {"scheduler_py":"...","requirements_txt":"...","env_example":"...","setup_md":"..."}`
}
