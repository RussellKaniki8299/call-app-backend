const axios = require("axios");

const sendPushNotification = async (req, res) => {
  const { token, title, body, avatar, data } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({ error: "token, title et body obligatoires" });
  }

  const payload = {
    to: token,
    sound: "default",
    title,
    body,
    channelId: "default",
    mutableContent: true,
    data: data || {},
    // Optionnel : image
    ...(avatar ? { richContent: { image: avatar } } : {}),
  };

  try {
    const response = await axios.post(
      "https://exp.host/--/api/v2/push/send",
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("Push envoyé :", response.data);
    return res.json({ status: "ok", response: response.data });
  } catch (error) {
    console.error("Erreur push :", error.response ? error.response.data : error.message);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = { sendPushNotification };