const axios = require("axios");

const sendPushNotification = async (req, res) => {
  const {
    token,
    tokens,
    title,
    body,
    avatar,
    data,
    categoryId
  } = req.body;

  if ((!token && !tokens) || !title || !body) {
    return res.status(400).json({
      error: "token ou tokens[], title et body obligatoires",
    });
  }

  const pushTokens = tokens && Array.isArray(tokens)
    ? tokens
    : [token];

  const messages = pushTokens.map((tk) => ({
    to: tk,
    sound: "default",
    title,
    body,
    channelId: "default",
    categoryId: categoryId || null,
    mutableContent: true,
    data: data || {},
    ...(avatar ? { richContent: { image: avatar } } : {}),
  }));

  try {
    const response = await axios.post(
      "https://exp.host/--/api/v2/push/send",
      messages,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    // 🔥 Gestion erreurs tokens
    const tickets = response.data.data;

    tickets.forEach((ticket, index) => {
      if (ticket.status === "error") {
        console.log("Token invalide:", pushTokens[index], ticket.details);

        // 👉 ici tu peux appeler Laravel pour supprimer le token
      }
    });

    return res.json({
      status: "ok",
      sent: messages.length,
    });

  } catch (error) {
    console.error(
      "Erreur push:",
      error.response ? error.response.data : error.message
    );

    return res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = { sendPushNotification };