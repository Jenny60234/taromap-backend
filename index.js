import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get('/ping', (req, res) => {
  res.json({ ok: true });
});

app.post("/api/ai/reading", async (req, res) => {
  try {
    const {
      name = "", birth = "", btime = "", topic = "general", question = "",
      pillars = [], five = { count:{}, lack:[] },
      cards = [], long_mode = false
    } = req.body || {};

    const topicText = ({general:'一般指引',love:'感情關係',career:'事業財運',healing:'療癒情緒'})[topic] || "一般指引";
    const cardList = cards.map((c,i)=>{
      const pos = ["過去","現在","未來"][i] || `第${i+1}張`;
      return `${pos}: ${c.name} (${c.upright?"正位":"逆位"})`;
    }).join("\n");

    const baziSummary = `姓名: ${name}
生日: ${birth} ${btime||""}
主題: ${topicText}
問題: ${question || "未提供"}
四柱: ${(pillars||[]).map(([s,b])=>`${s}${b}`).join(" | ") || "—"}
五行分佈: ${Object.entries(five.count||{}).map(([k,v])=>`${k}${v}`).join("、") || "—"}
相對弱勢: ${(five.lack||[]).join("、") || "—"}`;

    const systemMsg = long_mode ? 
      "你是專業占卜師，提供詳細的900字以上解讀，用HTML格式輸出" : 
      "你是專業占卜師，提供簡潔的200-300字解讀，用HTML格式輸出";

    const userPrompt = `基本資料:\n${baziSummary}\n\n抽到的牌:\n${cardList}`;

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: userPrompt }
      ]
    });

    const html = resp.choices?.[0]?.message?.content?.trim() || "";
    res.json({ ok: true, html });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "ai_failed" });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log("AI server on http://localhost:" + PORT));
