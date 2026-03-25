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

  const messages = pushTokens.map((tk) => {
    // Construire objet message
    const msg = {
      to: tk,
      sound: "default",
      title,
      body,
      channelId: "default",
      mutableContent: true,
      data: data || {},
    };

    // Ajouter categoryId uniquement si défini et non null
    if (categoryId) msg.categoryId = categoryId;

    // Ajouter avatar uniquement si défini
    if (avatar) msg.richContent = { image: avatar };

    return msg;
  });

  try {
    const response = await axios.post(
      "https://exp.host/--/api/v2/push/send",
      messages,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    // Gestion erreurs tokens
    const tickets = response.data.data || [];

    tickets.forEach((ticket, index) => {
      if (ticket.status === "error") {
        console.log("Token invalide:", pushTokens[index], ticket.details);
        // ici tu peux appeler Laravel pour supprimer le token
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