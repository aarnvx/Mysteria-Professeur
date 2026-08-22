import asyncio
import os
from contextlib import asynccontextmanager

import discord
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

BOT_TOKEN = os.environ.get("DISCORD_BOT_TOKEN", "")
BOT_API_SECRET = os.environ.get("BOT_API_SECRET", "")
PORTAL_URL = os.environ.get(
    "PORTAL_URL",
    "https://aarnvx.github.io/Mysteria-Professeur/index.html",
)

intents = discord.Intents.none()
bot = discord.Client(intents=intents)
bot_task = None


class MissiveRecipient(BaseModel):
    discord_id: str = Field(min_length=17, max_length=20)
    name: str = "Professeur"


class MissiveRequest(BaseModel):
    recipients: list[MissiveRecipient]
    sender_name: str = "un professeur"
    sender_rank: str = "Professeur"
    sent_at: str = ""


@bot.event
async def on_ready():
    print(f"Discord connecté : {bot.user} ({bot.user.id})")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global bot_task
    if not BOT_TOKEN:
        raise RuntimeError("DISCORD_BOT_TOKEN est manquant")
    if not BOT_API_SECRET:
        raise RuntimeError("BOT_API_SECRET est manquant")
    bot_task = asyncio.create_task(bot.start(BOT_TOKEN))
    try:
        yield
    finally:
        await bot.close()
        if bot_task:
            await bot_task


app = FastAPI(title="Mysteria Discord Bot", lifespan=lifespan)


@app.get("/health")
async def health():
    return {
        "ok": True,
        "discord_ready": bot.is_ready(),
        "bot_id": str(bot.user.id) if bot.user else None,
    }


@app.post("/send-missive")
async def send_missive(payload: MissiveRequest, x_bot_secret: str | None = Header(default=None)):
    if not BOT_API_SECRET or x_bot_secret != BOT_API_SECRET:
        raise HTTPException(status_code=401, detail="Secret bot invalide")
    if not bot.is_ready():
        raise HTTPException(status_code=503, detail="Bot Discord pas encore connecté")

    embed = discord.Embed(
        title="Vous avez reçu un hibou",
        description=f"**{payload.sender_name}** vous a envoyé une missive.",
        color=discord.Color.from_rgb(201, 168, 76),
    )
    embed.add_field(name="Grade du professeur", value=payload.sender_rank, inline=True)
    embed.add_field(name="Heure de réception", value=payload.sent_at or "Maintenant", inline=True)
    embed.set_footer(text="Portail Académique Mysteria")
    view = discord.ui.View()
    view.add_item(discord.ui.Button(label="Portail académique", url=PORTAL_URL))

    sent = 0
    failures = []
    for recipient in payload.recipients:
        try:
            user = await bot.fetch_user(int(recipient.discord_id))
            await user.send(embed=embed, view=view)
            sent += 1
        except (discord.HTTPException, discord.Forbidden, ValueError) as error:
            failures.append({
                "name": recipient.name,
                "discord_id": recipient.discord_id,
                "error": str(error),
            })

    if failures:
        return {"ok": False, "sent": sent, "failures": failures}
    return {"ok": True, "sent": sent}
