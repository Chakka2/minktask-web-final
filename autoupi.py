import os
import logging
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from telegram import Update, BotCommand, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Updater, CommandHandler, CallbackQueryHandler, CallbackContext

# --- ROBUST PATH LOGIC ---
BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

def resolve_json_file() -> Path:
    # 1) explicit env override
    raw = os.environ.get("FIREBASE_ADMIN_JSON", "").strip()
    if raw:
        p = Path(raw)
        if not p.is_absolute():
            p = BASE_DIR / p
        return p

    # 2) auto-detect any firebase admin sdk json in project root
    matches = sorted(BASE_DIR.glob("*firebase-adminsdk*.json"))
    if matches:
        return matches[0]

    # 3) fallback old expected name for clear error output
    return BASE_DIR / "mintytask1-firebase-adminsdk-fbsvc-e2896d3a9f.json"

def load_env_file(path: Path) -> None:
    if not path.exists(): return
    try:
        with open(path, "r", encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line: continue
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip().strip('"').strip("'")
    except Exception as e:
        print(f"Error loading .env: {e}")

load_env_file(ENV_FILE)
JSON_FILE = resolve_json_file()

# =========================
# CONFIG & CONSTANTS
# =========================
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
ADMIN_CHAT_ID = os.environ.get("TELEGRAM_ADMIN_CHAT_ID", "")

REEL_BUNDLE_PRICE = 49
REEL_REFERRAL_COMMISSION = 25
ENTRY_REFERRAL_AMOUNTS = [20, 3, 2, 1]

logging.basicConfig(format="%(asctime)s - %(levelname)s - %(message)s", level=logging.INFO)
log = logging.getLogger("earnhub-admin-bot")

if not TELEGRAM_BOT_TOKEN or not ADMIN_CHAT_ID:
    log.error("CRITICAL: Missing credentials in .env file.")
    exit(1)

# --- FIREBASE STARTUP ---
try:
    if not firebase_admin._apps:
        if not JSON_FILE.exists():
            log.error(f"FILE NOT FOUND: {JSON_FILE}")
            exit(1)
        cred = credentials.Certificate(str(JSON_FILE))
        firebase_admin.initialize_app(cred)
        log.info("Firebase connected successfully!")
except Exception as e:
    log.error(f"Firebase Crash: {e}")
    exit(1)

db = firestore.client()

# --- HELPERS ---
def safe_amount(v) -> float:
    try: return float(v or 0)
    except: return 0.0


def resolve_entry_referrer_chain(payer_id: str) -> list:
    chain = []
    walk = str(payer_id)
    for _ in range(4):
        s = db.collection("users").document(walk).get()
        d = s.to_dict() or {}
        ref = d.get("referredBy")
        if not ref:
            break
        ref = str(ref).strip()
        if not ref or ref == str(payer_id) or ref in chain:
            break
        chain.append(ref)
        walk = ref
    return chain

def is_admin(update: Update) -> bool:
    return str(update.effective_chat.id) == str(ADMIN_CHAT_ID)

# --- CORE BUSINESS LOGIC ---

def approve_token(token: str):
    ref = db.collection("entryPayPending").document(token)
    snap = ref.get()
    if not snap.exists: return False, "Request expired or invalid"
    
    data = snap.to_dict() or {}
    if data.get("status") != "pending": return False, "Already handled"
    
    user_id = str(data.get("userId", ""))
    amount = safe_amount(data.get("amount"))
    kind = str(data.get("kind", "entry"))
    
    batch = db.batch()
    batch.update(ref, {"status": "approved", "decidedAt": firestore.SERVER_TIMESTAMP})
    
    if kind == "reel_bundle":
        buyer_id = str(data.get("buyerId", user_id))
        referrer_id = data.get("referrerId")
        bundle_id = str(data.get("bundleId", ""))
        sale_ref = db.collection("reelSales").document()
        
        batch.set(sale_ref, {
            "buyerId": buyer_id,
            "referrerId": referrer_id if referrer_id else None,
            "bundleId": bundle_id,
            "price": REEL_BUNDLE_PRICE,
            "referralCommission": REEL_REFERRAL_COMMISSION if referrer_id else 0,
            "adminProfit": REEL_BUNDLE_PRICE - REEL_REFERRAL_COMMISSION if referrer_id else REEL_BUNDLE_PRICE,
            "createdAt": firestore.SERVER_TIMESTAMP,
        })
        batch.set(db.collection("users").document(buyer_id), {"isLocked": False}, merge=True)
        batch.set(db.collection("payments").document(f"reel_{sale_ref.id}"), {
            "userId": buyer_id, "amount": REEL_BUNDLE_PRICE, "status": "confirmed",
            "type": "reel_bundle", "bundleId": bundle_id, "confirmedAt": firestore.SERVER_TIMESTAMP,
            "source": "admin_bot_v2"
        })
        if referrer_id:
            batch.set(db.collection("users").document(str(referrer_id)), {"walletBalance": firestore.Increment(REEL_REFERRAL_COMMISSION)}, merge=True)
            batch.set(db.collection("transactions").document(), {
                "userId": str(referrer_id), "type": "reel_commission", "amount": REEL_REFERRAL_COMMISSION,
                "sourceId": sale_ref.id, "createdAt": firestore.SERVER_TIMESTAMP
            })
    elif kind == "reel_landing":
        user_snap = db.collection("users").document(user_id).get()
        user_data = user_snap.to_dict() or {}
        already = user_data.get("reelLandingReferralPaid") is True
        ref_raw = user_data.get("referredBy")
        referred_by = str(ref_raw).strip() if ref_raw else ""

        batch.set(db.collection("reelAccessPayments").document(user_id), {
            "userId": user_id,
            "amount": amount,
            "status": "confirmed",
            "confirmedAt": firestore.SERVER_TIMESTAMP,
            "source": "admin_bot_v2",
        }, merge=True)

        payer_patch = {}
        if not already and referred_by and referred_by != user_id:
            batch.set(db.collection("users").document(referred_by), {"walletBalance": firestore.Increment(REEL_REFERRAL_COMMISSION)}, merge=True)
            batch.set(db.collection("transactions").document(), {
                "userId": referred_by,
                "type": "reel_landing_referral",
                "amount": REEL_REFERRAL_COMMISSION,
                "level": 1,
                "sourceId": user_id,
                "createdAt": firestore.SERVER_TIMESTAMP,
            })
            payer_patch["reelLandingReferralPaid"] = True
        if payer_patch:
            batch.set(db.collection("users").document(user_id), payer_patch, merge=True)
    else:
        user_snap = db.collection("users").document(user_id).get()
        user_data = user_snap.to_dict() or {}
        
        batch.set(db.collection("payments").document(user_id), {
            "userId": user_id, "amount": amount, "status": "confirmed",
            "confirmedAt": firestore.SERVER_TIMESTAMP, "source": "admin_bot_v2"
        })
        user_patch = {"isLocked": False}
        if not user_data.get("entryReferralPaid"):
            chain = resolve_entry_referrer_chain(user_id)
            for i, ref_id in enumerate(chain):
                if i >= len(ENTRY_REFERRAL_AMOUNTS):
                    break
                amt = ENTRY_REFERRAL_AMOUNTS[i]
                if amt <= 0:
                    break
                batch.set(db.collection("users").document(ref_id), {"walletBalance": firestore.Increment(amt)}, merge=True)
                batch.set(db.collection("transactions").document(), {
                    "userId": ref_id, "type": "entry_referral", "amount": amt, "level": i + 1,
                    "sourceId": user_id, "createdAt": firestore.SERVER_TIMESTAMP
                })
            user_patch["entryReferralPaid"] = True
        batch.set(db.collection("users").document(user_id), user_patch, merge=True)
            
    batch.commit()
    return True, f"✅ APPROVED ({kind})\nUser: {user_id}\nAmount: ₹{amount:.2f}"

def deny_token(token: str):
    ref = db.collection("entryPayPending").document(token)
    snap = ref.get()
    if not snap.exists: return False, "Invalid token"
    
    data = snap.to_dict() or {}
    user_id = str(data.get("userId", ""))
    kind = str(data.get("kind", "entry"))
    
    batch = db.batch()
    batch.update(ref, {"status": "denied", "decidedAt": firestore.SERVER_TIMESTAMP})
    
    payment_doc_id = user_id if kind not in ("reel_bundle", "reel_landing") else f"reel_denied_{token}"
    batch.set(db.collection("payments").document(payment_doc_id), {
        "userId": user_id, "status": "denied", "type": kind, "deniedAt": firestore.SERVER_TIMESTAMP
    }, merge=True)
    
    if kind not in ("reel_bundle", "reel_landing"):
        batch.set(db.collection("users").document(user_id), {"isLocked": True}, merge=True)
    elif kind == "reel_landing":
        batch.set(db.collection("reelAccessPayments").document(user_id), {
            "userId": user_id,
            "amount": safe_amount(data.get("amount")),
            "status": "denied",
            "deniedAt": firestore.SERVER_TIMESTAMP,
            "source": "admin_bot_v2",
        }, merge=True)
        
    batch.commit()
    return True, f"❌ DENIED ({kind})\nUser: {user_id}"

# --- TELEGRAM HANDLERS ---

def cmd_stats(update: Update, context: CallbackContext):
    if not is_admin(update): return
    users = db.collection("users").get()
    payments = db.collection("payments").where(filter=FieldFilter("status", "==", "confirmed")).get()
    
    total_users = len(list(users))
    confirmed = list(payments)
    revenue = sum(safe_amount(d.to_dict().get("amount")) for d in confirmed)
    
    update.message.reply_text(f"📊 *EarnHub Stats*\n\nUsers: {total_users}\nConfirmed Rev: ₹{revenue:.2f}", parse_mode="Markdown")

def handle_callback(update: Update, context: CallbackContext):
    q = update.callback_query
    q.answer("Processing...")
    if str(q.message.chat.id) != str(ADMIN_CHAT_ID): return
    
    data = q.data
    if data.startswith("eap:"):
        ok, msg = approve_token(data[4:])
        q.edit_message_text(msg)
    elif data.startswith("edn:"):
        ok, msg = deny_token(data[4:])
        q.edit_message_text(msg)

def alert_loop(bot):
    log.info("Monitoring entryPayPending collection...")
    while True:
        try:
            docs = db.collection("entryPayPending").where(filter=FieldFilter("status", "==", "pending")).stream()
            for doc in docs:
                data = doc.to_dict() or {}
                if data.get("alertSent"): continue

                token = doc.id
                kind = data.get("kind", "entry")
                txt = f"💰 *{kind.replace('_', ' ').title()} Request*\nUser: `{data.get('userId')}`\nAmt: *₹{data.get('amount')}*"
                
                kb = InlineKeyboardMarkup([[
                    InlineKeyboardButton("Approve", callback_data=f"eap:{token}"),
                    InlineKeyboardButton("Deny", callback_data=f"edn:{token}")
                ]])
                
                bot.send_message(chat_id=ADMIN_CHAT_ID, text=txt, parse_mode="Markdown", reply_markup=kb)
                db.collection("entryPayPending").document(token).update({"alertSent": True})
        except Exception as e:
            log.error(f"Loop error: {e}")
        time.sleep(10)

def main():
    updater = Updater(token=TELEGRAM_BOT_TOKEN, use_context=True)
    dp = updater.dispatcher

    dp.add_handler(CommandHandler("start", lambda u, c: u.message.reply_text("Admin Bot Live")))
    dp.add_handler(CommandHandler("stats", cmd_stats))
    dp.add_handler(CallbackQueryHandler(handle_callback))

    threading.Thread(target=alert_loop, args=(updater.bot,), daemon=True).start()

    log.info("Bot is now polling...")
    updater.start_polling(drop_pending_updates=True)
    updater.idle()

if __name__ == "__main__":
    main()